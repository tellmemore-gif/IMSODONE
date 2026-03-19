import { promises as fs } from "fs";
import path from "path";

import { parseCsvToObjects } from "@/lib/csv";
import { formatDate, formatZipDisplay } from "@/lib/format";
import { normalizeCityState, normalizeEmployer, normalizeName, normalizeZip, canonicalNameKey } from "@/lib/normalize";
import type {
  CandidateConfig,
  CandidateKey,
  DocumentRecord,
  DonorAggregateRow,
  DonorRecord,
  EvidenceRecord,
  ExpenditureRecord,
  MatchLabel,
  MediaRecord,
  SocialPostRecord,
  NetworkLink,
  NetworkNode,
  OverlapRow,
  PacRecord,
  ProcessedCandidateData,
  ReceiptRecord,
  SankeyGraphData,
  TransactionRecord,
  YearFilter
} from "@/lib/types";
import { extractYear, monthKey } from "@/lib/year";

const DATA_ROOT = path.join(process.cwd(), "data");

const DATASETS = ["donors", "pacs", "transactions", "expenditures", "media", "social", "receipts", "documents"] as const;

const CORE_AIPAC_COMMITTEE_PATTERNS = [
  "UNITED DEMOCRACY PROJECT",
  "AMERICAN ISRAEL PUBLIC AFFAIRS COMMITTEE",
  "AIPAC PAC"
] as const;

type DatasetName = (typeof DATASETS)[number];

type RawBundle = {
  config: CandidateConfig;
  donors: DonorRecord[];
  pacs: PacRecord[];
  transactions: TransactionRecord[];
  expenditures: ExpenditureRecord[];
  media: MediaRecord[];
  social: SocialPostRecord[];
  receipts: ReceiptRecord[];
  documents: DocumentRecord[];
};

type AipacReferenceRow = {
  name: string;
  employer: string;
  zip: string;
  committee: string;
  receiptId: string;
  filingUrl: string;
  date: string;
  amount: number;
  memoText: string;
  normalizedName: string;
  nameKey: string;
  normalizedEmployer: string;
  normalizedZip: string;
};

type MatchOutcome = {
  label: MatchLabel;
  confidence: number;
  matchedName: string;
  matchedRef: AipacReferenceRow | null;
};

type WatchlistReceiptRow = {
  donorName: string;
  donorZip: string;
  committeeName: string;
  committeeId: string;
  amount: number;
  date: string;
  filingUrl: string;
  receiptId: string;
  memoText: string;
  watchlistName: string;
};

type WatchlistIndex = {
  byNameZip: Map<string, WatchlistReceiptRow[]>;
  byName: Map<string, WatchlistReceiptRow[]>;
};

type WatchlistMatchResult = {
  rows: WatchlistReceiptRow[];
  matchType: "name_zip" | "name" | "none";
};

type RawCacheEntry = {
  version: number;
  raw: RawBundle;
};

type ProcessedCacheEntry = {
  version: number;
  data: ProcessedCandidateData;
};

const rawCache = new Map<CandidateKey, RawCacheEntry>();
const processedCache = new Map<string, ProcessedCacheEntry>();
let watchlistCache: { version: number; index: WatchlistIndex } | null = null;

export async function loadCandidateData(candidateKey: CandidateKey, yearFilter: YearFilter = "all"): Promise<ProcessedCandidateData> {
  const version = await getCandidateDataVersion(candidateKey);
  const processedKey = `${candidateKey}:${yearFilter}`;
  const cachedProcessed = processedCache.get(processedKey);
  if (cachedProcessed && cachedProcessed.version === version) {
    return cachedProcessed.data;
  }

  const raw = await loadRawBundle(candidateKey, version);
  const watchlistIndex = candidateKey === "maxine" ? await loadWatchlistIndex() : null;

  const donors = filterByYear(raw.donors, (row) => row.date, yearFilter);
  const transactions = filterByYear(raw.transactions, (row) => row.date, yearFilter);
  const expenditures = filterByYear(raw.expenditures, (row) => row.date, yearFilter);
  const media = filterByYear(raw.media, (row) => row.date, yearFilter);
  const social = filterByYear(raw.social, (row) => row.date, yearFilter);
  const documents = filterByYear(raw.documents, (row) => row.date, yearFilter);
  const receipts = filterByYear(raw.receipts, (row) => row.date, yearFilter);

  const receiptById = new Map(receipts.map((row) => [row.id, row]));
  const aipacPacIds = new Set(raw.pacs.filter((pac) => pac.isAipacAligned).map((pac) => pac.id));
  const aipacPacNames = new Set(raw.pacs.filter((pac) => pac.isAipacAligned).map((pac) => normalizeName(pac.name)));
  raw.config.aipacCommitteeIds.forEach((id) => aipacPacIds.add(id));
  raw.config.aipacCommitteeNames.forEach((name) => aipacPacNames.add(normalizeName(name)));

  const directRows = donors.filter((row) => isDirectContribution(row, raw.config));
  const directDonorRowsRaw = directRows.filter((row) => !isPacType(row.donorType));

  const transactionPacToCandidate = transactions.filter(
    (row) => row.category === "pac_to_candidate" && isTargetCommittee(row.toCommitteeId, row.toName, raw.config)
  );

  const directPacRowsRaw = directRows.filter((row) => isPacType(row.donorType));
  const directCampaignReceipts = sumAmounts(directRows) + sumAmounts(transactionPacToCandidate);

  const aipacReferenceRows: AipacReferenceRow[] = transactions
    .filter(
      (row) =>
        row.category === "donor_to_pac" &&
        row.fromType === "donor" &&
        ((row.toCommitteeId && aipacPacIds.has(row.toCommitteeId)) || aipacPacNames.has(normalizeName(row.toName)))
    )
    .map((row) => ({
      name: row.fromName,
      employer: row.fromEmployer,
      zip: row.fromZip,
      committee: row.toName,
      receiptId: row.receiptId,
      filingUrl: row.filingUrl,
      date: row.date,
      amount: row.amount,
      memoText: row.memoText,
      normalizedName: normalizeName(row.fromName),
      nameKey: canonicalNameKey(row.fromName),
      normalizedEmployer: normalizeEmployer(row.fromEmployer),
      normalizedZip: normalizeZip(row.fromZip)
    }));

  const directDonorRows = aggregateDirectDonors(directDonorRowsRaw, aipacReferenceRows, receiptById, watchlistIndex);
  const directCommitteeRows = aggregateDirectCommittees(directPacRowsRaw, receiptById);
  const overlapRows = buildOverlapRows(directDonorRows);

  const outsideRelated = expenditures.filter((row) => isRelatedToCandidateRace(row, raw.config));

  const outsideSupportCandidate = sumAmounts(
    outsideRelated.filter((row) => row.supportOppose === "Support" && includesCandidate(row.targetCandidate, raw.config.candidateName))
  );
  const outsideOpposeCandidate = sumAmounts(
    outsideRelated.filter((row) => row.supportOppose === "Oppose" && includesCandidate(row.targetCandidate, raw.config.candidateName))
  );
  const outsideForRivals = sumAmounts(
    outsideRelated.filter((row) => !includesCandidate(row.targetCandidate, raw.config.candidateName))
  );

  const totalDirectDonors = directDonorRows.length;
  const totalDirectAmount = sumAmounts(directDonorRowsRaw);
  const aipacDonorCount = overlapRows.length;
  const aipacDonorAmount = overlapRows.reduce((sum, row) => sum + row.totalToCandidate, 0);
  const outsideSpendingTotal = sumAmounts(outsideRelated);

  const stats = {
    totalDirectDonors,
    totalDirectAmount,
    aipacDonorCount,
    aipacDonorAmount,
    outsideSpendingTotal
  };

  const directTimeline = buildTimeline(directRows, raw.config.candidateName);

  const directFundingSankey = buildDirectFundingSankey({
    config: raw.config,
    directDonorAmount: totalDirectAmount,
    directPacAmount: sumAmounts(directPacRowsRaw) + sumAmounts(transactionPacToCandidate),
    directCampaignReceipts,
    outsideSupportCandidate,
    outsideOpposeCandidate
  });

  const raceSpendingSummary = [
    {
      label: "Direct Campaign Receipts",
      amount: directCampaignReceipts,
      evidence: makeEvidence({
        id: `summary-direct-${candidateKey}-${yearFilter}`,
        label: "Direct Campaign Receipts",
        type: "summary",
        why: "Direct contributions received by the candidate committee.",
        amount: directCampaignReceipts,
        notes: "Includes individual and PAC direct contributions to the candidate committee.",
        tags: ["direct-funding"]
      })
    },
    {
      label: `Outside Spending Supporting ${raw.config.candidateName}`,
      amount: outsideSupportCandidate,
      evidence: makeEvidence({
        id: `summary-outside-support-${candidateKey}-${yearFilter}`,
        label: `Outside Spending Supporting ${raw.config.candidateName}`,
        type: "summary",
        why: "Independent expenditures supporting the candidate.",
        amount: outsideSupportCandidate,
        tags: ["outside-spending", "support"]
      })
    },
    {
      label: `Outside Spending Opposing ${raw.config.candidateName}`,
      amount: outsideOpposeCandidate,
      evidence: makeEvidence({
        id: `summary-outside-oppose-${candidateKey}-${yearFilter}`,
        label: `Outside Spending Opposing ${raw.config.candidateName}`,
        type: "summary",
        why: "Independent expenditures opposing the candidate.",
        amount: outsideOpposeCandidate,
        tags: ["outside-spending", "oppose"]
      })
    },
    {
      label: "Outside Spending Around Major Rivals",
      amount: outsideForRivals,
      evidence: makeEvidence({
        id: `summary-outside-rivals-${candidateKey}-${yearFilter}`,
        label: "Outside Spending Around Major Rivals",
        type: "summary",
        why: "Independent expenditures targeting other major candidates in the same race.",
        amount: outsideForRivals,
        tags: ["outside-spending", "rivals"]
      })
    }
  ];

  const contributionClusters = buildContributionClusters(directDonorRowsRaw, raw.config.candidateName);
  const pacTransfers = buildPacTransfers(transactions);
  const indirectFlowSankey = buildIndirectFlowSankey(transactions);
  const expenditureNetwork = buildExpenditureNetwork(outsideRelated, raw.config.candidateName);
  const committeeAipacNetwork = buildCommitteeAipacNetwork({
    candidateName: raw.config.candidateName,
    directCommitteeRows,
    transactions,
    watchlistIndex,
    receiptById
  });

  const outsideSpendingRows = outsideRelated.map((row) => ({
    ...row,
    evidence: [buildEvidenceFromReceipt({
      id: `${row.id}-outside`,
      label: `${row.committeeName} ${row.supportOppose.toLowerCase()} ${row.targetCandidate}`,
      type: "expenditure",
      why: "Independent expenditure entry tied to race spending analysis.",
      amount: row.amount,
      dates: [row.date],
      committeeId: row.committeeId,
      supportOppose: row.supportOppose,
      memoText: row.purpose,
      receiptId: row.receiptId,
      filingUrl: row.filingUrl,
      notes: row.notes,
      tags: ["outside-spending", row.supportOppose.toLowerCase()],
      receiptById
    })]
  }));

  const outsideTrend = buildOutsideTrend(outsideRelated);

  const mediaRows = media
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((row) => ({
      ...row,
      evidence: makeEvidence({
        id: `media-${row.id}`,
        label: row.title,
        type: "article",
        why: "Media archive item for campaign finance context.",
        dates: [row.date],
        sourceType: "Media",
        sourceTitle: row.source,
        sourceUrl: row.url,
        tags: row.tags
      })
    }));

  const aipacSocialPosts = social
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((row) => ({
      ...row,
      evidence: makeEvidence({
        id: `social-${row.id}`,
        label: `${row.platform} post by ${row.account}`,
        type: "article",
        why: "AIPAC-linked social media post included for public context.",
        dates: row.date ? [row.date] : undefined,
        sourceType: row.platform,
        sourceTitle: row.account,
        sourceUrl: row.url,
        notes: row.preview,
        tags: row.tags
      })
    }));

  const documentRows = documents
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((row) => ({
      ...row,
      evidence: makeEvidence({
        id: `document-${row.id}`,
        label: row.title,
        type: "document",
        why: "Official filing or supporting record.",
        dates: [row.date],
        sourceType: row.type,
        sourceTitle: row.title,
        sourceUrl: row.url,
        committeeId: row.committeeId,
        tags: row.tags,
        notes: row.description
      })
    }));

  const result: ProcessedCandidateData = {
    candidateKey,
    config: raw.config,
    yearFilter,
    stats,
    directDonorRows,
    directCommitteeRows,
    topDirectDonors: directDonorRows.slice().sort((a, b) => b.totalToCandidate - a.totalToCandidate).slice(0, 30),
    overlapRows,
    directTimeline,
    directFundingSankey,
    raceSpendingSummary,
    contributionClusters,
    pacTransfers,
    indirectFlowSankey,
    expenditureNetwork,
    committeeAipacNetwork,
    outsideSpendingRows,
    outsideTrend,
    media: mediaRows,
    aipacSocialPosts,
    documents: documentRows,
    receipts,
    metadata: {
      generatedAt: new Date().toISOString(),
      totals: {
        donors: donors.length,
        transactions: transactions.length,
        expenditures: expenditures.length,
        receipts: receipts.length
      }
    }
  };

  processedCache.set(processedKey, { version, data: result });
  return result;
}

export async function loadBothCandidates(yearFilter: YearFilter = "all") {
  const [maxine, jessica] = await Promise.all([loadCandidateData("maxine", yearFilter), loadCandidateData("jessica", yearFilter)]);
  return { maxine, jessica };
}

async function loadRawBundle(candidateKey: CandidateKey, version: number): Promise<RawBundle> {
  const cached = rawCache.get(candidateKey);
  if (cached && cached.version === version) {
    return cached.raw;
  }

  const basePath = path.join(DATA_ROOT, candidateKey);

  const [configRaw, ...datasetRows] = await Promise.all([
    readConfig(basePath),
    ...DATASETS.map((name) => readDatasetRows(basePath, name))
  ]);

  const [donorsRows, pacRows, transactionRows, expenditureRows, mediaRows, socialRows, receiptRows, documentRows] = datasetRows;

  const raw: RawBundle = {
    config: parseConfig(configRaw, candidateKey),
    donors: parseDonors(donorsRows),
    pacs: parsePacs(pacRows),
    transactions: parseTransactions(transactionRows),
    expenditures: parseExpenditures(expenditureRows),
    media: parseMedia(mediaRows),
    social: parseSocial(socialRows),
    receipts: parseReceipts(receiptRows),
    documents: parseDocuments(documentRows)
  };

  rawCache.set(candidateKey, { version, raw });
  return raw;
}

async function readConfig(basePath: string): Promise<Record<string, unknown>> {
  const jsonPath = path.join(basePath, "config.json");
  const csvPath = path.join(basePath, "config.csv");

  if (await fileExists(jsonPath)) {
    return JSON.parse(await fs.readFile(jsonPath, "utf8")) as Record<string, unknown>;
  }

  if (await fileExists(csvPath)) {
    const rows = parseCsvToObjects(await fs.readFile(csvPath, "utf8"));
    return rows[0] ?? {};
  }

  return {};
}

async function getCandidateDataVersion(candidateKey: CandidateKey): Promise<number> {
  const basePath = path.join(DATA_ROOT, candidateKey);
  const candidates = [
    path.join(basePath, "config.json"),
    path.join(basePath, "config.csv"),
    ...DATASETS.flatMap((dataset) => [path.join(basePath, `${dataset}.json`), path.join(basePath, `${dataset}.csv`)])
  ];

  const stats = await Promise.all(
    candidates.map(async (filePath) => {
      try {
        return await fs.stat(filePath);
      } catch {
        return null;
      }
    })
  );

  return stats.reduce((latest, stat) => Math.max(latest, stat?.mtimeMs ?? 0), 0);
}

async function loadWatchlistIndex(): Promise<WatchlistIndex> {
  const watchlistPath = path.join(DATA_ROOT, "matched_donor_to_watchlist_pacs.csv");
  const summaryPath = path.join(DATA_ROOT, "watchlist_donor_summary.csv");
  const [watchlistVersion, summaryVersion] = await Promise.all([getFileMtime(watchlistPath), getFileMtime(summaryPath)]);
  const version = Math.max(watchlistVersion, summaryVersion);

  if (watchlistCache && watchlistCache.version === version) {
    return watchlistCache.index;
  }

  if (watchlistVersion === 0 && summaryVersion === 0) {
    const empty: WatchlistIndex = { byNameZip: new Map(), byName: new Map() };
    watchlistCache = { version, index: empty };
    return empty;
  }

  const parsed: WatchlistReceiptRow[] = [];

  if (watchlistVersion > 0) {
    const raw = await fs.readFile(watchlistPath, "utf8");
    const rows = parseCsvToObjects(raw.replace(/^\uFEFF/, ""));
    parsed.push(
      ...rows.map((row) => ({
        donorName: toStr(row.root_donor_name || row.contributor_name),
        donorZip: normalizeZip(toStr(row.root_donor_zip || row.contributor_zip)),
        committeeName: toStr(row.recipient_committee_name || row.watchlist_name),
        committeeId: toStr(row.recipient_committee_id),
        amount: toNum(row.contribution_receipt_amount || row.amount),
        date: toStr(row.contribution_receipt_date || row.date),
        filingUrl: toStr(row.pdf_url || row.receipt_url || row.sourceUrl),
        receiptId: toStr(row.sub_id || row.transaction_id),
        memoText: toStr(row.memo_text || row.memoText),
        watchlistName: toStr(row.watchlist_name)
      }))
    );
  }

  if (summaryVersion > 0) {
    const rawSummary = await fs.readFile(summaryPath, "utf8");
    const summaryRows = parseCsvToObjects(rawSummary.replace(/^\uFEFF/, ""));
    const existingKeys = new Set(
      parsed.map((row) => `${normalizeName(row.donorName)}|${normalizeZip(row.donorZip)}`).filter((key) => !key.startsWith("|"))
    );

    for (let index = 0; index < summaryRows.length; index += 1) {
      const row = summaryRows[index];
      const donorName = toStr(row.donor_name || row.root_donor_name || row.contributor_name);
      const donorZip = normalizeZip(toStr(row.donor_zip || row.root_donor_zip || row.contributor_zip));
      const donorKey = `${normalizeName(donorName)}|${donorZip}`;
      if (!donorName || existingKeys.has(donorKey)) continue;
      existingKeys.add(donorKey);

      const committeeName = toStr(firstSemicolonItem(toStr(row.pac_names))) || "AIPAC network committee";
      const committeeId = toStr(firstSemicolonItem(toStr(row.pac_committee_ids)));
      const filingUrl =
        toStr(firstSemicolonItem(toStr(row.donor_to_pac_receipt_urls))) || toStr(firstSemicolonItem(toStr(row.root_maxine_receipt_urls)));

      parsed.push({
        donorName,
        donorZip,
        committeeName,
        committeeId,
        amount: toNum(row.total_amount),
        date: "",
        filingUrl,
        receiptId: `summary-${index + 1}`,
        memoText: "Summary-derived watchlist fallback record.",
        watchlistName: committeeName
      });
    }
  }

  const byNameZip = new Map<string, WatchlistReceiptRow[]>();
  const byName = new Map<string, WatchlistReceiptRow[]>();

  for (const row of parsed) {
    const normalizedName = normalizeName(row.donorName);
    if (!normalizedName) continue;

    const nameBucket = byName.get(normalizedName) ?? [];
    nameBucket.push(row);
    byName.set(normalizedName, nameBucket);

    if (row.donorZip) {
      const key = `${normalizedName}|${row.donorZip}`;
      const zipBucket = byNameZip.get(key) ?? [];
      zipBucket.push(row);
      byNameZip.set(key, zipBucket);
    }
  }

  const index: WatchlistIndex = { byNameZip, byName };
  watchlistCache = { version, index };
  return index;
}

function firstSemicolonItem(value: string): string {
  return value
    .split(";")
    .map((item) => item.trim())
    .find(Boolean) || "";
}

async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

async function readDatasetRows(basePath: string, dataset: DatasetName): Promise<Record<string, unknown>[]> {
  const jsonPath = path.join(basePath, `${dataset}.json`);
  const csvPath = path.join(basePath, `${dataset}.csv`);

  if (await fileExists(jsonPath)) {
    const parsed = JSON.parse(await fs.readFile(jsonPath, "utf8"));
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    return [];
  }

  if (await fileExists(csvPath)) {
    return parseCsvToObjects(await fs.readFile(csvPath, "utf8"));
  }

  return [];
}

function parseConfig(raw: Record<string, unknown>, candidateKey: CandidateKey): CandidateConfig {
  return {
    candidateName: toStr(raw.candidateName) || (candidateKey === "maxine" ? "Maxine Dexter" : "Jessica Salas"),
    committeeName: toStr(raw.committeeName) || (candidateKey === "maxine" ? "Dexter for Congress" : "Jessica for Congress"),
    committeeIds: toStringArray(raw.committeeIds),
    aipacCommitteeIds: toStringArray(raw.aipacCommitteeIds),
    aipacCommitteeNames: toStringArray(raw.aipacCommitteeNames),
    years: toNumberArray(raw.years).length > 0 ? toNumberArray(raw.years) : [2023, 2024, 2025, 2026],
    raceLabel: toStr(raw.raceLabel) || "OR-03",
    cycleLabel: toStr(raw.cycleLabel) || "2023-2026",
    opponentName: toStr(raw.opponentName) || "Jessica Salas",
    notes: toStr(raw.notes)
  };
}

function parseDonors(rows: Record<string, unknown>[]): DonorRecord[] {
  return rows.map((row, index) => {
    const name = toStr(row.name || row.donorName || row.contributorName);
    const employer = toStr(row.employer || row.contributorEmployer || "Unknown");

    return {
      id: toStr(row.id) || `donor-${index}`,
      name,
      amount: toNum(row.amount),
      date: toStr(row.date),
      employer,
      donorType: toStr(row.donorType || row.type || "individual"),
      city: toStr(row.city || row.contributorCity),
      state: toStr(row.state || row.contributorState),
      zip: normalizeZip(toStr(row.zip || row.contributorZip)),
      recipientCommitteeId: toStr(row.recipientCommitteeId || row.committeeId || row.recipientId),
      recipientCommitteeName: toStr(row.recipientCommitteeName || row.recipientCommittee || row.committeeName),
      memoText: toStr(row.memoText || row.memo),
      filingUrl: toStr(row.filingUrl || row.sourceUrl),
      receiptId: toStr(row.receiptId),
      normalizedName: normalizeName(name),
      normalizedEmployer: normalizeEmployer(employer)
    };
  });
}

function parsePacs(rows: Record<string, unknown>[]): PacRecord[] {
  return rows.map((row, index) => ({
    id: toStr(row.id || row.committeeId) || `pac-${index}`,
    name: toStr(row.name || row.committeeName),
    type: toStr(row.type || "other"),
    isAipacAligned: toBool(row.isAipacAligned)
  }));
}

function parseTransactions(rows: Record<string, unknown>[]): TransactionRecord[] {
  return rows.map((row, index) => {
    const fromName = toStr(row.fromName || row.contributorName || row.senderName);
    const fromEmployer = toStr(row.fromEmployer || row.contributorEmployer || "");

    return {
      id: toStr(row.id) || `tx-${index}`,
      fromType: toStr(row.fromType).toLowerCase() === "pac" ? "pac" : "donor",
      fromName,
      fromCommitteeId: toStr(row.fromCommitteeId || row.fromId),
      fromEmployer,
      fromZip: normalizeZip(toStr(row.fromZip || row.zip)),
      toType: normalizeToType(toStr(row.toType || "pac")),
      toName: toStr(row.toName || row.recipientName),
      toCommitteeId: toStr(row.toCommitteeId || row.toId),
      amount: toNum(row.amount),
      date: toStr(row.date),
      category: normalizeCategory(toStr(row.category || "donor_to_pac")),
      memoText: toStr(row.memoText || row.memo),
      filingUrl: toStr(row.filingUrl || row.sourceUrl),
      receiptId: toStr(row.receiptId),
      normalizedFromName: normalizeName(fromName),
      normalizedFromEmployer: normalizeEmployer(fromEmployer)
    };
  });
}

function parseExpenditures(rows: Record<string, unknown>[]): ExpenditureRecord[] {
  return rows.map((row, index) => ({
    id: toStr(row.id) || `exp-${index}`,
    committeeId: toStr(row.committeeId),
    committeeName: toStr(row.committeeName),
    targetCandidate: toStr(row.targetCandidate),
    supportOppose: toStr(row.supportOppose).toLowerCase() === "oppose" ? "Oppose" : "Support",
    purpose: toStr(row.purpose || "Independent expenditure"),
    amount: toNum(row.amount),
    date: toStr(row.date),
    race: toStr(row.race),
    filingUrl: toStr(row.filingUrl || row.sourceUrl),
    receiptId: toStr(row.receiptId),
    notes: toStr(row.notes)
  }));
}

function parseMedia(rows: Record<string, unknown>[]): MediaRecord[] {
  return rows.map((row, index) => ({
    id: toStr(row.id) || `media-${index}`,
    title: toStr(row.title),
    source: toStr(row.source),
    date: toStr(row.date),
    url: toStr(row.url || row.link),
    summary: toStr(row.summary),
    tags: toStringArray(row.tags)
  }));
}

function parseSocial(rows: Record<string, unknown>[]): SocialPostRecord[] {
  return rows.map((row, index) => ({
    id: toStr(row.id) || `social-${index}`,
    platform: toStr(row.platform || row.source || "Social"),
    account: toStr(row.account || row.handle || "AIPAC"),
    date: toStr(row.date || row.postDate),
    url: toStr(row.url || row.postUrl || row.link),
    preview: toStr(row.preview || row.textPreview || row.summary),
    previewImageUrl: toStr(row.previewImageUrl || row.imageUrl || row.thumbnailUrl),
    tags: toStringArray(row.tags)
  }));
}

function parseDocuments(rows: Record<string, unknown>[]): DocumentRecord[] {
  return rows.map((row, index) => ({
    id: toStr(row.id) || `doc-${index}`,
    title: toStr(row.title),
    type: toStr(row.type || "Filing"),
    date: toStr(row.date),
    url: toStr(row.url || row.link),
    tags: toStringArray(row.tags),
    committeeId: toStr(row.committeeId),
    description: toStr(row.description)
  }));
}

function parseReceipts(rows: Record<string, unknown>[]): ReceiptRecord[] {
  return rows.map((row, index) => ({
    id: toStr(row.id) || `receipt-${index}`,
    title: toStr(row.title || "Receipt"),
    sourceType: toStr(row.sourceType),
    sourceTitle: toStr(row.sourceTitle),
    sourceUrl: toStr(row.sourceUrl),
    filingUrl: toStr(row.filingUrl),
    fecDocumentId: toStr(row.fecDocumentId),
    committeeId: toStr(row.committeeId),
    contributorName: toStr(row.contributorName),
    recipientName: toStr(row.recipientName),
    amount: toNum(row.amount),
    date: toStr(row.date),
    memoText: toStr(row.memoText),
    supportOppose: toStr(row.supportOppose),
    tags: toStringArray(row.tags),
    notes: toStr(row.notes)
  }));
}

function aggregateDirectDonors(
  rows: DonorRecord[],
  aipacReferences: AipacReferenceRow[],
  receiptById: Map<string, ReceiptRecord>,
  watchlistIndex: WatchlistIndex | null
): DonorAggregateRow[] {
  const grouped = new Map<string, DonorRecord[]>();
  const matchLookup = buildAipacMatchLookup(aipacReferences);

  for (const row of rows) {
    // Keep donor records distinct by normalized name + ZIP so AIPAC network evidence
    // reflects all matched donor identities from watchlist data.
    const key = `${row.normalizedName}|${row.zip || ""}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  return Array.from(grouped.values())
    .map((donorRows) => {
      const head = donorRows[0];
      const totalToCandidate = donorRows.reduce((sum, row) => sum + row.amount, 0);
      const contributionCount = donorRows.length;
      const sortedDates = donorRows.map((row) => row.date).sort();
      const receipts = donorRows.map((row) => row.receiptId).filter(Boolean);
      const match = classifyAipacMatch(head, matchLookup);
      const matchedRefs = collectAipacRefsForMatch(head, match, matchLookup);
      const watchlistMatch = collectWatchlistRowsForDonor(head, watchlistIndex);
      const watchlistRows = watchlistMatch.rows;
      const hasStrictMatch = match.label !== "none";
      const hasWatchlistMatch = watchlistRows.length > 0;
      const useWatchlistAuthority = watchlistIndex !== null;
      const overlapStatus = useWatchlistAuthority ? hasWatchlistMatch : hasStrictMatch;
      const hasCoreAipacCommittee =
        matchedRefs.some((row) => isCoreAipacCommitteeName(row.committee)) ||
        watchlistRows.some((row) => isCoreAipacCommitteeName(row.committeeName));
      const aipacAlignmentTier: DonorAggregateRow["aipacAlignmentTier"] = !overlapStatus
        ? "none"
        : hasCoreAipacCommittee
          ? "core"
          : "network";
      const effectiveMatchLabel: MatchLabel = !overlapStatus ? "none" : hasStrictMatch ? match.label : "network";
      const effectiveConfidence = hasStrictMatch ? match.confidence : hasWatchlistMatch ? (watchlistMatch.matchType === "name_zip" ? 0.78 : 0.65) : 0;

      const evidence: EvidenceRecord[] = donorRows.map((row, index) =>
        buildEvidenceFromReceipt({
          id: `${row.id}-direct-${index}`,
          label: `${row.name} direct contribution`,
          type: "donor",
          why: "Direct contribution to the candidate committee.",
          amount: row.amount,
          dates: [row.date],
          committeeId: row.recipientCommitteeId,
          contributorName: row.name,
          recipientName: row.recipientCommitteeName,
          memoText: row.memoText,
          receiptId: row.receiptId,
          filingUrl: row.filingUrl,
          matchConfidence: effectiveConfidence,
          tags: ["direct-funding", overlapStatus ? "aipac-overlap" : "no-overlap"],
          receiptById
        })
      );

      for (let index = 0; index < matchedRefs.length; index += 1) {
        const matchedRef = matchedRefs[index];
        evidence.push(
          buildEvidenceFromReceipt({
            id: `${head.id}-aipac-reference-${index + 1}`,
            label: `${head.name} matched AIPAC record`,
            type: "overlap",
            why: "Donor appears in documented AIPAC PAC contribution records under matching rules.",
            amount: matchedRef.amount,
            dates: [matchedRef.date],
            contributorName: matchedRef.name,
            recipientName: matchedRef.committee,
            memoText: matchedRef.memoText,
            receiptId: matchedRef.receiptId,
            filingUrl: matchedRef.filingUrl,
            matchConfidence: effectiveConfidence,
            notes: `Match classification: ${effectiveMatchLabel}`,
            tags: ["aipac-overlap", effectiveMatchLabel],
            receiptById
          })
        );
      }

      if (watchlistRows.length > 0) {
        const seen = new Set(
          evidence
            .filter((item) => item.type === "overlap")
            .map((item) => `${item.filingUrl || ""}|${item.recipientName || ""}|${item.amount ?? ""}|${item.dates?.[0] || ""}`)
        );

        for (let index = 0; index < watchlistRows.length; index += 1) {
          const row = watchlistRows[index];
          const key = `${row.filingUrl}|${row.committeeName}|${row.amount}|${row.date}`;
          if (seen.has(key)) continue;
          seen.add(key);

          evidence.push(
            buildEvidenceFromReceipt({
              id: `${head.id}-watchlist-reference-${index + 1}`,
              label: `${head.name} -> ${row.committeeName}`,
              type: "overlap",
              why: "Donor-to-PAC watchlist receipt linked to this donor in network analysis.",
              amount: row.amount,
              dates: row.date ? [row.date] : undefined,
              contributorName: row.donorName,
              recipientName: row.committeeName,
              committeeId: row.committeeId,
              receiptId: row.receiptId,
              filingUrl: row.filingUrl,
              memoText: row.memoText,
              matchConfidence: effectiveConfidence,
              notes: row.watchlistName ? `Watchlist: ${row.watchlistName}` : undefined,
              tags: ["watchlist-pac", "donor-to-pac", effectiveMatchLabel],
              receiptById
            })
          );
        }
      }

      return {
        donorName: head.name,
        donorType: head.donorType,
        totalToCandidate,
        employer: head.employer,
        city: head.city,
        state: head.state,
        zip: head.zip,
        contributionCount,
        firstDate: sortedDates[0] || "",
        lastDate: sortedDates[sortedDates.length - 1] || "",
        aipacAlignmentTier,
        overlapStatus,
        matchLabel: effectiveMatchLabel,
        matchConfidence: effectiveConfidence,
        receipts,
        evidence
      };
    })
    .sort((a, b) => b.totalToCandidate - a.totalToCandidate);
}

function aggregateDirectCommittees(rows: DonorRecord[], receiptById: Map<string, ReceiptRecord>): DonorAggregateRow[] {
  const grouped = new Map<string, DonorRecord[]>();

  for (const row of rows) {
    const key = row.normalizedName || normalizeName(row.name);
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  return Array.from(grouped.values())
    .map((committeeRows) => {
      const head = committeeRows[0];
      const totalToCandidate = committeeRows.reduce((sum, row) => sum + row.amount, 0);
      const contributionCount = committeeRows.length;
      const sortedDates = committeeRows.map((row) => row.date).sort();
      const receipts = committeeRows.map((row) => row.receiptId).filter(Boolean);

      const evidence: EvidenceRecord[] = committeeRows.map((row, index) =>
        buildEvidenceFromReceipt({
          id: `${row.id}-direct-committee-${index}`,
          label: `${row.name} direct committee contribution`,
          type: "pac",
          why: "Direct committee or PAC-style contribution to Maxine's campaign committee.",
          amount: row.amount,
          dates: [row.date],
          committeeId: row.recipientCommitteeId,
          contributorName: row.name,
          recipientName: row.recipientCommitteeName,
          memoText: row.memoText,
          receiptId: row.receiptId,
          filingUrl: row.filingUrl,
          tags: ["direct-funding", "direct-committee"],
          receiptById
        })
      );

      return {
        donorName: head.name,
        donorType: head.donorType || "committee",
        totalToCandidate,
        employer: head.employer,
        city: head.city,
        state: head.state,
        zip: head.zip,
        contributionCount,
        firstDate: sortedDates[0] || "",
        lastDate: sortedDates[sortedDates.length - 1] || "",
        aipacAlignmentTier: "none" as const,
        overlapStatus: false,
        matchLabel: "none" as const,
        matchConfidence: 0,
        receipts,
        evidence
      };
    })
    .sort((a, b) => b.totalToCandidate - a.totalToCandidate);
}

function buildAipacMatchLookup(rows: AipacReferenceRow[]) {
  const byExactName = new Map<string, AipacReferenceRow[]>();
  const byNameKeyZip = new Map<string, AipacReferenceRow[]>();
  const byNameKeyEmployer = new Map<string, AipacReferenceRow[]>();
  const fuzzyBuckets = new Map<string, AipacReferenceRow[]>();

  for (const row of rows) {
    const exactBucket = byExactName.get(row.normalizedName) ?? [];
    exactBucket.push(row);
    byExactName.set(row.normalizedName, exactBucket);

    if (row.nameKey && row.normalizedZip) {
      const zipKey = `${row.nameKey}|${row.normalizedZip}`;
      const zipBucket = byNameKeyZip.get(zipKey) ?? [];
      zipBucket.push(row);
      byNameKeyZip.set(zipKey, zipBucket);
    }

    if (row.nameKey && row.normalizedEmployer) {
      const employerKey = `${row.nameKey}|${row.normalizedEmployer}`;
      const employerBucket = byNameKeyEmployer.get(employerKey) ?? [];
      employerBucket.push(row);
      byNameKeyEmployer.set(employerKey, employerBucket);
    }

    const initial = row.normalizedName.charAt(0) || "_";
    const bucket = fuzzyBuckets.get(initial) ?? [];
    bucket.push(row);
    fuzzyBuckets.set(initial, bucket);
  }

  return {
    byExactName,
    byNameKeyZip,
    byNameKeyEmployer,
    fuzzyBuckets
  };
}

function classifyAipacMatch(
  donor: Pick<DonorRecord, "name" | "employer" | "zip">,
  lookup: ReturnType<typeof buildAipacMatchLookup>
): MatchOutcome {
  const normalizedName = normalizeName(donor.name);
  const sourceNameKey = canonicalNameKey(donor.name);
  const sourceZip = normalizeZip(donor.zip || "");
  const sourceEmployer = normalizeEmployer(donor.employer || "");

  const exactRef = lookup.byExactName.get(normalizedName)?.[0] || null;
  if (exactRef) {
    return { label: "exact", confidence: 1, matchedName: exactRef.name, matchedRef: exactRef };
  }

  if (sourceNameKey && sourceZip) {
    const probableByZip = lookup.byNameKeyZip.get(`${sourceNameKey}|${sourceZip}`)?.[0] || null;
    if (probableByZip) {
      return { label: "probable", confidence: 0.88, matchedName: probableByZip.name, matchedRef: probableByZip };
    }
  }

  if (sourceNameKey && sourceEmployer) {
    const probableByEmployer = lookup.byNameKeyEmployer.get(`${sourceNameKey}|${sourceEmployer}`)?.[0] || null;
    if (probableByEmployer) {
      return { label: "probable", confidence: 0.82, matchedName: probableByEmployer.name, matchedRef: probableByEmployer };
    }
  }

  const initial = normalizedName.charAt(0) || "_";
  const pool = lookup.fuzzyBuckets.get(initial) ?? [];
  let bestScore = 0;
  let bestRef: AipacReferenceRow | null = null;

  for (const candidate of pool) {
    if (Math.abs(candidate.normalizedName.length - normalizedName.length) > 4) continue;
    const score = similarity(normalizedName, candidate.normalizedName);
    if (score > bestScore) {
      bestScore = score;
      bestRef = candidate;
    }
  }

  if (bestRef && bestScore >= 0.88) {
    return {
      label: "possible",
      confidence: Number(bestScore.toFixed(2)),
      matchedName: bestRef.name,
      matchedRef: bestRef
    };
  }

  return { label: "none", confidence: 0, matchedName: "", matchedRef: null };
}

function collectAipacRefsForMatch(
  donor: Pick<DonorRecord, "name" | "employer" | "zip">,
  match: MatchOutcome,
  lookup: ReturnType<typeof buildAipacMatchLookup>
): AipacReferenceRow[] {
  if (match.label === "none") return [];

  const normalizedName = normalizeName(donor.name);
  const sourceNameKey = canonicalNameKey(donor.name);
  const sourceZip = normalizeZip(donor.zip || "");
  const sourceEmployer = normalizeEmployer(donor.employer || "");

  if (match.label === "exact") {
    return dedupeAipacRefs(lookup.byExactName.get(normalizedName) ?? []);
  }

  if (match.label === "probable" && sourceNameKey && sourceZip) {
    const probableByZip = lookup.byNameKeyZip.get(`${sourceNameKey}|${sourceZip}`) ?? [];
    if (probableByZip.length > 0) return dedupeAipacRefs(probableByZip);
  }

  if (match.label === "probable" && sourceNameKey && sourceEmployer) {
    return dedupeAipacRefs(lookup.byNameKeyEmployer.get(`${sourceNameKey}|${sourceEmployer}`) ?? []);
  }

  return match.matchedRef ? [match.matchedRef] : [];
}

function dedupeAipacRefs(rows: AipacReferenceRow[]): AipacReferenceRow[] {
  const seen = new Set<string>();
  const unique: AipacReferenceRow[] = [];

  for (const row of rows) {
    const key = `${row.receiptId}|${row.filingUrl}|${row.date}|${row.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}

function collectWatchlistRowsForDonor(
  donor: Pick<DonorRecord, "name" | "zip">,
  watchlistIndex: WatchlistIndex | null
): WatchlistMatchResult {
  if (!watchlistIndex) return { rows: [], matchType: "none" };

  const normalizedName = normalizeName(donor.name);
  const normalizedZip = normalizeZip(donor.zip || "");
  const byNameZip = normalizedZip ? watchlistIndex.byNameZip.get(`${normalizedName}|${normalizedZip}`) ?? [] : [];
  const byName = watchlistIndex.byName.get(normalizedName) ?? [];
  const merged = normalizedZip ? byNameZip : byName;
  const matchType: WatchlistMatchResult["matchType"] = normalizedZip
    ? byNameZip.length > 0
      ? "name_zip"
      : "none"
    : byName.length > 0
      ? "name"
      : "none";

  const seen = new Set<string>();
  const unique: WatchlistReceiptRow[] = [];
  for (const row of merged) {
    const key = `${row.filingUrl}|${row.committeeName}|${row.amount}|${row.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return {
    rows: unique.sort((a, b) => b.date.localeCompare(a.date)),
    matchType
  };
}

function buildOverlapRows(rows: DonorAggregateRow[]): OverlapRow[] {
  return rows
    .filter((row) => row.overlapStatus)
    .map((row) => {
      const overlapEvidence =
        row.evidence.find((item) => item.type === "overlap" && isCoreAipacCommitteeName(item.recipientName || "")) ||
        row.evidence.find((item) => item.type === "overlap");

      return {
        donorId: `${normalizeName(row.donorName)}-${row.zip}`,
        donorName: row.donorName,
        donorEmployer: row.employer,
        donorZip: row.zip,
        donorCityState: normalizeCityState(row.city, row.state),
        totalToCandidate: row.totalToCandidate,
        aipacAlignmentTier: row.aipacAlignmentTier === "none" ? "network" : row.aipacAlignmentTier,
        matchLabel: row.matchLabel,
        matchConfidence: row.matchConfidence,
        matchedAipacDonor: overlapEvidence?.contributorName || row.donorName,
        aipacCommittee: overlapEvidence?.recipientName || "AIPAC-aligned committee",
        evidence: row.evidence
      };
    })
    .sort((a, b) => b.totalToCandidate - a.totalToCandidate);
}

function buildTimeline(rows: DonorRecord[], candidateName: string) {
  const buckets = new Map<string, { total: number; count: number }>();

  rows.forEach((row) => {
    const month = monthKey(row.date);
    const bucket = buckets.get(month) ?? { total: 0, count: 0 };
    bucket.total += row.amount;
    bucket.count += 1;
    buckets.set(month, bucket);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bucket]) => ({
      month,
      total: bucket.total,
      count: bucket.count,
      evidence: makeEvidence({
        id: `timeline-${candidateName}-${month}`,
        label: `${candidateName} direct contributions in ${month}`,
        type: "summary",
        why: "Monthly rollup of direct contributions.",
        amount: bucket.total,
        dates: [month],
        tags: ["timeline", "direct-funding"]
      })
    }));
}

function buildContributionClusters(rows: DonorRecord[], candidateName: string) {
  const sameDay = buildSameDayClusters(rows, candidateName);
  const sameEmployer = buildEmployerClusters(rows, candidateName);
  const geography = buildGeographyClusters(rows, candidateName);
  const repeatHighDollar = buildRepeatHighDollar(rows);

  return {
    sameDay,
    sameEmployer,
    geography,
    repeatHighDollar
  };
}

function buildSameDayClusters(rows: DonorRecord[], candidateName: string) {
  const grouped = new Map<string, DonorRecord[]>();

  rows.forEach((row) => {
    const day = row.date;
    const bucket = grouped.get(day) ?? [];
    bucket.push(row);
    grouped.set(day, bucket);
  });

  return Array.from(grouped.entries())
    .map(([day, bucket]) => ({
      day,
      contributions: bucket.length,
      total: sumAmounts(bucket),
      evidence: makeEvidence({
        id: `cluster-day-${day}`,
        label: `${candidateName} same-day cluster ${formatDate(day)}`,
        type: "cluster",
        why: "Multiple direct contributions occurred on the same day.",
        amount: sumAmounts(bucket),
        dates: [day],
        notes: `Contribution count: ${bucket.length}`,
        tags: ["bundling", "same-day"]
      })
    }))
    .filter((row) => row.contributions >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 40);
}

function buildEmployerClusters(rows: DonorRecord[], candidateName: string) {
  const grouped = new Map<string, DonorRecord[]>();

  rows.forEach((row) => {
    const key = row.normalizedEmployer || "UNKNOWN";
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries())
    .map(([employerKey, bucket]) => ({
      employer: bucket[0]?.employer || employerKey,
      contributors: new Set(bucket.map((row) => row.normalizedName)).size,
      total: sumAmounts(bucket),
      evidence: makeEvidence({
        id: `cluster-employer-${employerKey}`,
        label: `${candidateName} employer cluster ${bucket[0]?.employer || employerKey}`,
        type: "cluster",
        why: "Direct contributions grouped by employer.",
        amount: sumAmounts(bucket),
        dates: bucket.map((row) => row.date),
        notes: `Unique contributors: ${new Set(bucket.map((row) => row.normalizedName)).size}`,
        tags: ["bundling", "employer"]
      })
    }))
    .filter((row) => row.contributors >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);
}

function buildGeographyClusters(rows: DonorRecord[], candidateName: string) {
  const grouped = new Map<string, DonorRecord[]>();

  rows.forEach((row) => {
    const zipDisplay = formatZipDisplay(row.zip || "");
    const key = zipDisplay || `${row.city},${row.state}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries())
    .map(([geo, bucket]) => ({
      geography: geo,
      contributors: new Set(bucket.map((row) => row.normalizedName)).size,
      total: sumAmounts(bucket),
      evidence: makeEvidence({
        id: `cluster-geo-${geo}`,
        label: `${candidateName} geography cluster ${geo}`,
        type: "cluster",
        why: "Direct contributions grouped by shared ZIP or city/state concentration.",
        amount: sumAmounts(bucket),
        dates: bucket.map((row) => row.date),
        notes: `Unique contributors: ${new Set(bucket.map((row) => row.normalizedName)).size}`,
        tags: ["bundling", "geography"]
      })
    }))
    .filter((row) => row.contributors >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);
}

function buildRepeatHighDollar(rows: DonorRecord[]) {
  const grouped = new Map<string, DonorRecord[]>();

  rows.forEach((row) => {
    const bucket = grouped.get(row.normalizedName) ?? [];
    bucket.push(row);
    grouped.set(row.normalizedName, bucket);
  });

  return Array.from(grouped.values())
    .map((bucket) => ({
      donor: bucket[0].name,
      contributions: bucket.length,
      total: sumAmounts(bucket),
      evidence: makeEvidence({
        id: `cluster-repeat-${bucket[0].normalizedName}`,
        label: `${bucket[0].name} repeat pattern`,
        type: "cluster",
        why: "Repeated direct contributions by the same donor.",
        amount: sumAmounts(bucket),
        dates: bucket.map((row) => row.date),
        notes: `Contribution count: ${bucket.length}`,
        tags: ["bundling", "repeat"]
      })
    }))
    .filter((row) => row.contributions >= 2 || row.total >= 3000)
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);
}

function buildDirectFundingSankey(params: {
  config: CandidateConfig;
  directDonorAmount: number;
  directPacAmount: number;
  directCampaignReceipts: number;
  outsideSupportCandidate: number;
  outsideOpposeCandidate: number;
}): SankeyGraphData {
  const nodes = [
    {
      id: "individual-donors",
      name: "Individual Donors",
      type: "donor",
      evidence: makeEvidence({
        id: "node-individual-donors",
        label: "Individual Donors",
        type: "donor",
        why: "Aggregate direct individual donor contributions.",
        amount: params.directDonorAmount,
        tags: ["direct-funding"]
      })
    },
    {
      id: "pac-contributions",
      name: "PAC Contributions",
      type: "pac",
      evidence: makeEvidence({
        id: "node-pac-contributions",
        label: "PAC Contributions",
        type: "pac",
        why: "Aggregate direct PAC contributions.",
        amount: params.directPacAmount,
        tags: ["direct-funding"]
      })
    },
    {
      id: "candidate-committee",
      name: params.config.committeeName,
      type: "candidate",
      evidence: makeEvidence({
        id: "node-candidate-committee",
        label: params.config.committeeName,
        type: "summary",
        why: "Candidate committee receiving direct contributions.",
        amount: params.directCampaignReceipts,
        committeeId: params.config.committeeIds[0],
        tags: ["direct-funding", "committee"]
      })
    },
    {
      id: "outside-support",
      name: "Outside Spending (Support)",
      type: "spender",
      evidence: makeEvidence({
        id: "node-outside-support",
        label: "Outside Spending (Support)",
        type: "expenditure",
        why: "Independent expenditures supporting the candidate.",
        amount: params.outsideSupportCandidate,
        tags: ["outside-spending", "support"]
      })
    },
    {
      id: "outside-oppose",
      name: "Outside Spending (Oppose)",
      type: "spender",
      evidence: makeEvidence({
        id: "node-outside-oppose",
        label: "Outside Spending (Oppose)",
        type: "expenditure",
        why: "Independent expenditures opposing the candidate.",
        amount: params.outsideOpposeCandidate,
        tags: ["outside-spending", "oppose"]
      })
    },
    {
      id: "race-environment",
      name: `${params.config.raceLabel} Race Environment`,
      type: "summary",
      evidence: makeEvidence({
        id: "node-race-environment",
        label: `${params.config.raceLabel} Race Environment`,
        type: "summary",
        why: "Summary node for direct receipts and outside spending context.",
        amount: params.directCampaignReceipts + params.outsideSupportCandidate + params.outsideOpposeCandidate,
        tags: ["race-summary"]
      })
    }
  ];

  const links = [
    {
      source: 0,
      target: 2,
      value: Math.max(params.directDonorAmount, 0),
      evidence: makeEvidence({
        id: "link-individual-to-committee",
        label: "Individual donors -> candidate committee",
        type: "summary",
        why: "Direct donor funds to candidate committee.",
        amount: params.directDonorAmount,
        tags: ["direct-funding"]
      })
    },
    {
      source: 1,
      target: 2,
      value: Math.max(params.directPacAmount, 0),
      evidence: makeEvidence({
        id: "link-pac-to-committee",
        label: "PACs -> candidate committee",
        type: "summary",
        why: "Direct PAC funds to candidate committee.",
        amount: params.directPacAmount,
        tags: ["direct-funding"]
      })
    },
    {
      source: 2,
      target: 5,
      value: Math.max(params.directCampaignReceipts, 0),
      evidence: makeEvidence({
        id: "link-committee-to-race",
        label: "Candidate committee -> race environment",
        type: "summary",
        why: "Direct campaign receipts represented in race context.",
        amount: params.directCampaignReceipts,
        tags: ["direct-funding", "race-summary"]
      })
    },
    {
      source: 3,
      target: 5,
      value: Math.max(params.outsideSupportCandidate, 0),
      evidence: makeEvidence({
        id: "link-outside-support-to-race",
        label: "Outside support -> race environment",
        type: "summary",
        why: "Outside support spending represented in race context.",
        amount: params.outsideSupportCandidate,
        tags: ["outside-spending", "support"]
      })
    },
    {
      source: 4,
      target: 5,
      value: Math.max(params.outsideOpposeCandidate, 0),
      evidence: makeEvidence({
        id: "link-outside-oppose-to-race",
        label: "Outside opposition -> race environment",
        type: "summary",
        why: "Outside opposition spending represented in race context.",
        amount: params.outsideOpposeCandidate,
        tags: ["outside-spending", "oppose"]
      })
    }
  ];

  return { nodes, links };
}

function buildPacTransfers(rows: TransactionRecord[]) {
  return rows
    .filter((row) => row.category === "pac_to_pac")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 160)
    .map((row) => ({
      from: row.fromName,
      to: row.toName,
      amount: row.amount,
      date: row.date,
      evidence: makeEvidence({
        id: `${row.id}-transfer`,
        label: `${row.fromName} -> ${row.toName}`,
        type: "transfer",
        why: "PAC-to-PAC transfer in indirect network analysis.",
        amount: row.amount,
        dates: [row.date],
        receiptId: row.receiptId,
        filingUrl: row.filingUrl,
        memoText: row.memoText,
        tags: ["pac-transfer", "indirect"]
      })
    }));
}

function buildIndirectFlowSankey(rows: TransactionRecord[]): SankeyGraphData {
  const topRows = rows
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 220);

  const nodeNames = new Set<string>();
  topRows.forEach((row) => {
    nodeNames.add(row.fromName);
    nodeNames.add(row.toName);
  });

  const nodes = Array.from(nodeNames).map((name) => ({
    id: name,
    name,
    type: "network",
    evidence: makeEvidence({
      id: `node-indirect-${normalizeName(name)}`,
      label: name,
      type: "summary",
      why: "Entity in indirect money movement network.",
      tags: ["indirect-network"]
    })
  }));

  const index = new Map(nodes.map((node, idx) => [node.name, idx]));

  const links = topRows
    .map((row) => {
      const source = index.get(row.fromName);
      const target = index.get(row.toName);
      if (source == null || target == null) return null;

      return {
        source,
        target,
        value: row.amount,
        evidence: makeEvidence({
          id: `${row.id}-indirect-link`,
          label: `${row.fromName} -> ${row.toName}`,
          type: row.category === "pac_to_pac" ? "transfer" : "summary",
          why: "Indirect network relationship from transaction data.",
          amount: row.amount,
          dates: [row.date],
          receiptId: row.receiptId,
          filingUrl: row.filingUrl,
          memoText: row.memoText,
          tags: ["indirect-network", row.category]
        })
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  return { nodes, links };
}

function buildExpenditureNetwork(rows: ExpenditureRecord[], candidateName: string): { nodes: NetworkNode[]; links: NetworkLink[] } {
  const committeeTotals = new Map<string, number>();

  rows.forEach((row) => {
    committeeTotals.set(row.committeeName, (committeeTotals.get(row.committeeName) ?? 0) + row.amount);
  });

  const committeeNodes: NetworkNode[] = Array.from(committeeTotals.entries()).map(([committee, total]) => ({
    id: `committee-${normalizeName(committee)}`,
    label: committee,
    group: "pac",
    value: total,
    evidence: makeEvidence({
      id: `node-committee-${normalizeName(committee)}`,
      label: committee,
      type: "pac",
      why: "Committee spending in races involving the candidate.",
      amount: total,
      tags: ["expenditure-network"]
    })
  }));

  const candidateTotals = new Map<string, number>();
  rows.forEach((row) => {
    candidateTotals.set(row.targetCandidate, (candidateTotals.get(row.targetCandidate) ?? 0) + row.amount);
  });

  const candidateNodes: NetworkNode[] = Array.from(candidateTotals.entries()).map(([target, total]) => ({
    id: `candidate-${normalizeName(target)}`,
    label: target,
    group: normalizeName(target) === normalizeName(candidateName) ? "candidate" : "spender",
    value: total,
    evidence: makeEvidence({
      id: `node-target-${normalizeName(target)}`,
      label: target,
      type: "summary",
      why: "Target candidate impacted by independent expenditures.",
      amount: total,
      tags: ["expenditure-network", "outside-spending"]
    })
  }));

  const links: NetworkLink[] = rows.map((row) => ({
    source: `committee-${normalizeName(row.committeeName)}`,
    target: `candidate-${normalizeName(row.targetCandidate)}`,
    value: row.amount,
    evidence: makeEvidence({
      id: `${row.id}-exp-network-link`,
      label: `${row.committeeName} -> ${row.targetCandidate}`,
      type: "expenditure",
      why: "Outside spending relationship for race impact analysis.",
      amount: row.amount,
      dates: [row.date],
      supportOppose: row.supportOppose,
      memoText: row.purpose,
      receiptId: row.receiptId,
      filingUrl: row.filingUrl,
      tags: ["outside-spending", "indirect-network", row.supportOppose.toLowerCase()]
    })
  }));

  return {
    nodes: [...committeeNodes, ...candidateNodes],
    links
  };
}

function buildCommitteeAipacNetwork(params: {
  candidateName: string;
  directCommitteeRows: DonorAggregateRow[];
  transactions: TransactionRecord[];
  watchlistIndex: WatchlistIndex | null;
  receiptById: Map<string, ReceiptRecord>;
}): { nodes: NetworkNode[]; links: NetworkLink[] } {
  const committeeByKey = new Map(
    params.directCommitteeRows.map((row) => [normalizeName(row.donorName), row] as const)
  );
  if (committeeByKey.size === 0) {
    return { nodes: [], links: [] };
  }

  const donorToCommitteeRaw = params.transactions.filter(
    (row) => row.category === "donor_to_pac" && committeeByKey.has(normalizeName(row.toName))
  );

  const donorEdgeMap = new Map<
    string,
    {
      donorName: string;
      donorZip: string;
      committeeName: string;
      amount: number;
      sample: TransactionRecord;
      watchlistRows: WatchlistReceiptRow[];
    }
  >();

  for (const row of donorToCommitteeRaw) {
    const watchlistMatch = collectWatchlistRowsForDonor(
      {
        name: row.fromName,
        zip: row.fromZip
      },
      params.watchlistIndex
    );
    if (watchlistMatch.rows.length === 0) continue;

    const donorKey = `${normalizeName(row.fromName)}|${normalizeZip(row.fromZip)}`;
    const committeeKey = normalizeName(row.toName);
    const edgeKey = `${donorKey}|${committeeKey}`;

    const existing = donorEdgeMap.get(edgeKey);
    if (!existing) {
      donorEdgeMap.set(edgeKey, {
        donorName: row.fromName,
        donorZip: normalizeZip(row.fromZip),
        committeeName: row.toName,
        amount: row.amount,
        sample: row,
        watchlistRows: watchlistMatch.rows
      });
      continue;
    }

    existing.amount += row.amount;
    if (row.amount > existing.sample.amount) {
      existing.sample = row;
    }
  }

  const donorEdges = Array.from(donorEdgeMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 140);
  if (donorEdges.length === 0) {
    return { nodes: [], links: [] };
  }

  const committeeKeysInPlay = new Set(donorEdges.map((edge) => normalizeName(edge.committeeName)));
  const committeeRowsInPlay = params.directCommitteeRows.filter((row) => committeeKeysInPlay.has(normalizeName(row.donorName)));

  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const nodeIds = new Set<string>();

  const candidateId = `candidate-${normalizeName(params.candidateName)}`;
  nodes.push({
    id: candidateId,
    label: params.candidateName,
    group: "candidate",
    value: committeeRowsInPlay.reduce((sum, row) => sum + row.totalToCandidate, 0),
    evidence: makeEvidence({
      id: `node-committee-network-candidate-${normalizeName(params.candidateName)}`,
      label: params.candidateName,
      type: "summary",
      why: "Candidate endpoint for direct committee contributions with AIPAC-linked donor inflow context.",
      tags: ["aipac-network", "direct-committee", "indirect-context"]
    })
  });
  nodeIds.add(candidateId);

  for (const row of committeeRowsInPlay) {
    const committeeId = `committee-${normalizeName(row.donorName)}`;
    if (!nodeIds.has(committeeId)) {
      nodes.push({
        id: committeeId,
        label: row.donorName,
        group: "pac",
        value: row.totalToCandidate,
        evidence: row.evidence[0] || makeEvidence({
          id: `node-committee-network-${normalizeName(row.donorName)}`,
          label: row.donorName,
          type: "pac",
          why: "Committee that gave directly to Maxine and has AIPAC-linked donor connections.",
          amount: row.totalToCandidate,
          tags: ["direct-committee", "aipac-network"]
        })
      });
      nodeIds.add(committeeId);
    }

    links.push({
      source: committeeId,
      target: candidateId,
      value: row.totalToCandidate,
      evidence: row.evidence[0] || makeEvidence({
        id: `link-committee-to-candidate-${normalizeName(row.donorName)}`,
        label: `${row.donorName} -> ${params.candidateName}`,
        type: "pac",
        why: "Direct committee contribution to the candidate.",
        amount: row.totalToCandidate,
        tags: ["direct-committee", "candidate-receipt"]
      })
    });
  }

  for (const edge of donorEdges) {
    const donorId = `aipac-donor-${normalizeName(edge.donorName)}-${edge.donorZip || "NA"}`;
    const committeeId = `committee-${normalizeName(edge.committeeName)}`;
    const watchlistRef = edge.watchlistRows[0];

    if (!nodeIds.has(donorId)) {
      nodes.push({
        id: donorId,
        label: edge.donorName,
        group: "aipac",
        value: edge.amount,
        evidence: buildEvidenceFromReceipt({
          id: `node-aipac-donor-${normalizeName(edge.donorName)}-${edge.donorZip || "na"}`,
          label: `${edge.donorName} (AIPAC network-linked donor)`,
          type: "overlap",
          why: "Donor appears in watchlist PAC records and also funded a committee that gave directly to Maxine.",
          amount: edge.amount,
          dates: watchlistRef?.date ? [watchlistRef.date] : undefined,
          contributorName: edge.donorName,
          recipientName: watchlistRef?.committeeName || edge.committeeName,
          committeeId: watchlistRef?.committeeId,
          receiptId: watchlistRef?.receiptId,
          filingUrl: watchlistRef?.filingUrl,
          memoText: watchlistRef?.memoText,
          tags: ["aipac-network", "donor-overlap", "upstream-to-direct-committee"],
          receiptById: params.receiptById
        })
      });
      nodeIds.add(donorId);
    }

    if (!nodeIds.has(committeeId)) continue;

    links.push({
      source: donorId,
      target: committeeId,
      value: edge.amount,
      evidence: buildEvidenceFromReceipt({
        id: `link-aipac-donor-to-committee-${normalizeName(edge.donorName)}-${normalizeName(edge.committeeName)}`,
        label: `${edge.donorName} -> ${edge.committeeName}`,
        type: "transfer",
        why: "AIPAC-network-linked donor contribution to a committee that directly contributed to Maxine.",
        amount: edge.amount,
        dates: [edge.sample.date],
        contributorName: edge.sample.fromName,
        recipientName: edge.sample.toName,
        committeeId: edge.sample.toCommitteeId,
        receiptId: edge.sample.receiptId,
        filingUrl: edge.sample.filingUrl,
        memoText: edge.sample.memoText,
        tags: ["aipac-network", "donor-to-pac", "upstream-to-direct-committee"],
        receiptById: params.receiptById
      })
    });
  }

  return { nodes, links };
}

function buildOutsideTrend(rows: ExpenditureRecord[]) {
  const grouped = new Map<string, number>();

  rows.forEach((row) => {
    const month = monthKey(row.date);
    grouped.set(month, (grouped.get(month) ?? 0) + row.amount);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month,
      total,
      evidence: makeEvidence({
        id: `outside-trend-${month}`,
        label: `Outside spending in ${month}`,
        type: "summary",
        why: "Monthly trend of independent expenditures.",
        amount: total,
        dates: [month],
        tags: ["outside-spending", "trend"]
      })
    }));
}

function buildEvidenceFromReceipt(params: {
  id: string;
  label: string;
  type: EvidenceRecord["type"];
  why: string;
  amount?: number;
  dates?: string[];
  sourceType?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  receiptId?: string;
  fecDocumentId?: string;
  filingUrl?: string;
  committeeId?: string;
  contributorName?: string;
  recipientName?: string;
  memoText?: string;
  supportOppose?: string;
  matchConfidence?: number;
  notes?: string;
  tags?: string[];
  receiptById?: Map<string, ReceiptRecord>;
}): EvidenceRecord {
  const receipt = params.receiptId && params.receiptById ? params.receiptById.get(params.receiptId) : null;

  return makeEvidence({
    id: params.id,
    label: params.label,
    type: params.type,
    why: params.why,
    amount: params.amount ?? receipt?.amount,
    dates: params.dates ?? (receipt?.date ? [receipt.date] : undefined),
    sourceType: params.sourceType ?? receipt?.sourceType,
    sourceTitle: params.sourceTitle ?? receipt?.sourceTitle,
    sourceUrl: params.sourceUrl ?? receipt?.sourceUrl,
    receiptId: params.receiptId ?? receipt?.id,
    fecDocumentId: params.fecDocumentId ?? receipt?.fecDocumentId,
    filingUrl: params.filingUrl ?? receipt?.filingUrl,
    committeeId: params.committeeId ?? receipt?.committeeId,
    contributorName: params.contributorName ?? receipt?.contributorName,
    recipientName: params.recipientName ?? receipt?.recipientName,
    memoText: params.memoText ?? receipt?.memoText,
    supportOppose: params.supportOppose ?? receipt?.supportOppose,
    matchConfidence: params.matchConfidence,
    notes: params.notes ?? receipt?.notes,
    tags: params.tags ?? receipt?.tags
  });
}

function makeEvidence(partial: Partial<EvidenceRecord> & Pick<EvidenceRecord, "id" | "label" | "type" | "why">): EvidenceRecord {
  return {
    id: partial.id,
    label: partial.label,
    type: partial.type,
    why: partial.why,
    amount: partial.amount,
    dates: partial.dates,
    sourceType: partial.sourceType,
    sourceTitle: partial.sourceTitle,
    sourceUrl: partial.sourceUrl,
    receiptId: partial.receiptId,
    fecDocumentId: partial.fecDocumentId,
    filingUrl: partial.filingUrl,
    committeeId: partial.committeeId,
    contributorName: partial.contributorName,
    recipientName: partial.recipientName,
    memoText: partial.memoText,
    supportOppose: partial.supportOppose,
    matchConfidence: partial.matchConfidence,
    notes: partial.notes,
    tags: partial.tags || []
  };
}

function isDirectContribution(row: DonorRecord, config: CandidateConfig): boolean {
  return isTargetCommittee(row.recipientCommitteeId, row.recipientCommitteeName, config);
}

function isTargetCommittee(committeeId: string, committeeName: string, config: CandidateConfig): boolean {
  if (committeeId && config.committeeIds.includes(committeeId)) return true;
  if (committeeName && normalizeName(committeeName) === normalizeName(config.committeeName)) return true;
  return false;
}

function isRelatedToCandidateRace(row: ExpenditureRecord, config: CandidateConfig): boolean {
  if (includesCandidate(row.targetCandidate, config.candidateName)) return true;
  if (row.race && normalizeName(row.race).includes(normalizeName(config.raceLabel))) return true;
  return false;
}

function includesCandidate(target: string, candidateName: string): boolean {
  return normalizeName(target).includes(normalizeName(candidateName));
}

function isPacType(type: string): boolean {
  const normalized = normalizeName(type);
  return normalized.includes("PAC") || normalized.includes("COMMITTEE");
}

function filterByYear<T>(rows: T[], getDate: (row: T) => string, year: YearFilter): T[] {
  if (year === "all") return rows;

  return rows.filter((row) => {
    const rowYear = extractYear(getDate(row));
    return rowYear === year;
  });
}

function normalizeToType(value: string): TransactionRecord["toType"] {
  const v = value.toLowerCase();
  if (v === "spender") return "spender";
  if (v === "candidate") return "candidate";
  return "pac";
}

function normalizeCategory(value: string): TransactionRecord["category"] {
  const v = value.toLowerCase();
  if (v === "pac_to_pac") return "pac_to_pac";
  if (v === "pac_to_spender") return "pac_to_spender";
  if (v === "pac_to_candidate") return "pac_to_candidate";
  return "donor_to_pac";
}

function toStr(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function toNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["1", "true", "yes", "y"].includes(value.toLowerCase().trim());
  return false;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toStr(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    if (value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map((item) => toStr(item)).filter(Boolean);
      } catch {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
      }
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toNumberArray(value: unknown): number[] {
  return toStringArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function isCoreAipacCommitteeName(name: string): boolean {
  const normalized = normalizeName(name);
  return CORE_AIPAC_COMMITTEE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function sumAmounts<T extends { amount: number }>(rows: T[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[a.length][b.length];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function matchLabelToRank(label: MatchLabel): number {
  switch (label) {
    case "exact":
      return 3;
    case "probable":
      return 2;
    case "possible":
      return 1;
    case "network":
      return 1;
    default:
      return 0;
  }
}
