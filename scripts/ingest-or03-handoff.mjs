import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const DATA_ROOT = path.join(ROOT, "data");

const OUT_MAXINE = path.join(ROOT, "data", "maxine");
const OUT_JESSICA = path.join(ROOT, "data", "jessica");

const MAXINE_COMMITTEE_ID = "C00859108";
const JESSICA_COMMITTEE_ID = "C00923581";

const AIPAC_PATTERNS = [
  /AMERICAN ISRAEL PUBLIC AFFAIRS COMMITTEE/i,
  /AIPAC PAC/i,
  /UNITED DEMOCRACY PROJECT/i
];
const YEAR_START = 2023;
const YEAR_END = 2026;

async function main() {
  const handoffRoot = await resolveHandoffRoot();
  const fullMaxineRoot = path.join(handoffRoot, "maxine_dexter", "full_2023_2026");

  await fs.mkdir(OUT_MAXINE, { recursive: true });
  await fs.mkdir(OUT_JESSICA, { recursive: true });

  const committees = await readCsv(path.join(handoffRoot, "committees.csv"));
  const baseMaxineReceipts = dedupeCsvRows(
    await readCsv(path.join(fullMaxineRoot, "base_maxine_receipts_2023_2026.csv")),
    (row) =>
      clean(row.sub_id) ||
      clean(row.transaction_id) ||
      [
        toIsoDate(row.contribution_receipt_date),
        normalizeKey(row.donor_name),
        toAmount(row.contribution_receipt_amount),
        clean(row.committee_id),
        normalizeKey(row.memo_text)
      ].join("|"),
    scoreSourceRow
  );
  const donorToPac = dedupeCsvRows(
    await readCsv(path.join(fullMaxineRoot, "donor_to_pac_2023_2026.csv")),
    (row) =>
      clean(row.sub_id) ||
      clean(row.transaction_id) ||
      [
        toIsoDate(row.contribution_receipt_date),
        normalizeKey(row.contributor_name || row.root_donor_name),
        toAmount(row.contribution_receipt_amount),
        clean(row.recipient_committee_id),
        normalizeKey(row.memo_text)
      ].join("|"),
    scoreSourceRow
  );
  const pacIncoming = dedupeCsvRows(
    await readCsv(path.join(handoffRoot, "maxine_pac_incoming_edges.csv")),
    (row) =>
      clean(row.sub_id) ||
      clean(row.transaction_id) ||
      [
        toIsoDate(row.date),
        clean(row.edge_type),
        clean(row.source_committee_id),
        clean(row.target_committee_id),
        toAmount(row.amount),
        normalizeKey(row.memo_text)
      ].join("|"),
    scoreSourceRow
  );
  const outsideSpendingSource = await resolveOutsideSpendingSource(handoffRoot);
  const outsideSpending = dedupeCsvRows(
    await readCsv(outsideSpendingSource),
    (row) =>
      clean(row.sub_id) ||
      clean(row.transaction_id) ||
      [
        toIsoDate(row.expenditure_date),
        normalizeKey(row.spender),
        normalizeKey(row.candidate),
        clean(row.support_oppose),
        toAmount(row.amount),
        normalizeKey(row.description)
      ].join("|"),
    scoreSourceRow
  );
  const directCommitteeSource = await resolveDirectCommitteeSource(handoffRoot);
  const directCommitteeToMaxine = directCommitteeSource
    ? dedupeCsvRows(
      await readCsv(directCommitteeSource),
      (row) =>
        clean(row.sub_id) ||
        clean(row.transaction_id) ||
        [
          toIsoDate(row.contribution_receipt_date),
          normalizeKey(row.contributor_name),
          toAmount(row.contribution_receipt_amount),
          clean(row.committee_id),
          normalizeKey(row.memo_text)
        ].join("|"),
      scoreSourceRow
    )
    : [];
  const attachedPacs = await readCsv(path.join(fullMaxineRoot, "maxine_attached_pacs_exhaustive_2023_2026.csv"));
  const jessicaReceipts = dedupeCsvRows(
    await readCsv(path.join(handoffRoot, "jessica_salas_receipts_2026.csv")),
    (row) =>
      clean(row.sub_id) ||
      clean(row.transaction_id) ||
      [toIsoDate(row.date), normalizeKey(row.contributor_name), toAmount(row.amount), clean(row.committee_id)].join("|"),
    scoreSourceRow
  );

  const committeeById = new Map(committees.map((row) => [clean(row.committee_id), row]));
  const existingMaxineMedia = await readJsonArray(path.join(OUT_MAXINE, "media.json"));
  const existingJessicaMedia = await readJsonArray(path.join(OUT_JESSICA, "media.json"));
  const committeeIdByName = new Map(
    committees.map((row) => [normalizeKey(clean(row.committee_name)), clean(row.committee_id)])
  );

  const maxineCommitteeName =
    clean(committeeById.get(MAXINE_COMMITTEE_ID)?.committee_name) || "MAXINE FOR CONGRESS";
  const jessicaCommitteeName =
    clean(committeeById.get(JESSICA_COMMITTEE_ID)?.committee_name) || "J SAL FOR OREGON";

  const baseMaxineDonors = baseMaxineReceipts
    .map((row, index) => ({
    id: `mx-direct-${index + 1}`,
    name: clean(row.donor_name),
    amount: toAmount(row.contribution_receipt_amount),
    date: toIsoDate(row.contribution_receipt_date),
    employer: clean(row.donor_employer),
    donorType: mapEntityType(row.entity_type),
    city: clean(row.donor_city),
    state: clean(row.donor_state),
    zip: clean(row.donor_zip),
    recipientCommitteeId: clean(row.committee_id) || MAXINE_COMMITTEE_ID,
    recipientCommitteeName: maxineCommitteeName,
    memoText: clean(row.memo_text),
    filingUrl: clean(row.pdf_url),
    receiptId: clean(row.sub_id) || clean(row.transaction_id)
    }))
    .filter((row) => isYearInScope(row.date));
  const existingBaseReceiptIds = new Set(
    baseMaxineReceipts.map((row) => clean(row.sub_id) || clean(row.transaction_id)).filter(Boolean)
  );
  const directCommitteeRowsOnly = directCommitteeToMaxine
    .filter((row) => {
      const id = clean(row.sub_id) || clean(row.transaction_id);
      return !id || !existingBaseReceiptIds.has(id);
    })
    .map((row, index) => ({
      id: `mx-direct-committee-${index + 1}`,
      name: clean(row.contributor_name),
      amount: toAmount(row.contribution_receipt_amount),
      date: toIsoDate(row.contribution_receipt_date),
      employer: "",
      donorType: mapEntityType(row.entity_type),
      city: clean(row.contributor_city),
      state: clean(row.contributor_state),
      zip: clean(row.contributor_zip),
      recipientCommitteeId: clean(row.committee_id) || MAXINE_COMMITTEE_ID,
      recipientCommitteeName: maxineCommitteeName,
      memoText: clean(row.memo_text),
      filingUrl: clean(row.pdf_url),
      receiptId: clean(row.sub_id) || clean(row.transaction_id)
    }))
    .filter((row) => isYearInScope(row.date));
  const maxineDonors = dedupeRows(
    [...baseMaxineDonors, ...directCommitteeRowsOnly],
    (row) =>
      clean(row.receiptId) ||
      [toIsoDate(row.date), normalizeKey(row.name), toAmount(row.amount), row.recipientCommitteeId, normalizeKey(row.memoText)].join("|")
  ).map((row, index) => ({ ...row, id: `mx-direct-${index + 1}` }));

  const maxineTransactions = [];

  for (let i = 0; i < donorToPac.length; i += 1) {
    const row = donorToPac[i];
    const date = toIsoDate(row.contribution_receipt_date);
    if (!isYearInScope(date)) continue;
    maxineTransactions.push({
      id: `mx-d2p-${i + 1}`,
      fromType: "donor",
      fromName: clean(row.contributor_name) || clean(row.root_donor_name),
      fromCommitteeId: "",
      fromEmployer: clean(row.contributor_employer) || clean(row.root_donor_employer),
      fromZip: clean(row.contributor_zip) || clean(row.root_donor_zip),
      toType: "pac",
      toName: clean(row.recipient_committee_name),
      toCommitteeId: clean(row.recipient_committee_id),
      amount: toAmount(row.contribution_receipt_amount),
      date,
      category: "donor_to_pac",
      memoText: clean(row.memo_text),
      filingUrl: clean(row.pdf_url),
      receiptId: clean(row.sub_id) || clean(row.transaction_id)
    });
  }

  let pacToPacIndex = 0;
  for (const row of pacIncoming) {
    if (clean(row.edge_type).toLowerCase() !== "pac_to_pac") continue;
    const date = toIsoDate(row.date);
    if (!isYearInScope(date)) continue;
    pacToPacIndex += 1;
    maxineTransactions.push({
      id: `mx-p2p-${pacToPacIndex}`,
      fromType: "pac",
      fromName: clean(row.source_committee_name),
      fromCommitteeId: clean(row.source_committee_id),
      fromEmployer: "",
      fromZip: clean(row.root_donor_zip),
      toType: "pac",
      toName: clean(row.target_committee_name),
      toCommitteeId: clean(row.target_committee_id),
      amount: toAmount(row.amount),
      date,
      category: "pac_to_pac",
      memoText: clean(row.memo_text),
      filingUrl: clean(row.pdf_url),
      receiptId: clean(row.sub_id) || clean(row.transaction_id)
    });
  }

  for (let i = 0; i < outsideSpending.length; i += 1) {
    const row = outsideSpending[i];
    const date = toIsoDate(row.expenditure_date);
    if (!isYearInScope(date)) continue;
    const spenderName = clean(row.spender);
    const committeeId = committeeIdByName.get(normalizeKey(spenderName)) || "";
    maxineTransactions.push({
      id: `mx-p2s-${i + 1}`,
      fromType: "pac",
      fromName: spenderName,
      fromCommitteeId: committeeId,
      fromEmployer: "",
      fromZip: "",
      toType: "spender",
      toName: `${clean(row.candidate)} race expenditure`,
      toCommitteeId: MAXINE_COMMITTEE_ID,
      amount: toAmount(row.amount),
      date,
      category: "pac_to_spender",
      memoText: clean(row.description),
      filingUrl: clean(row.pdf_url),
      receiptId: clean(row.sub_id) || clean(row.transaction_id)
    });
  }

  const pacMap = new Map();
  for (const row of committees) {
    const id = clean(row.committee_id);
    const name = clean(row.committee_name);
    if (!id || !name) continue;
    if (id === MAXINE_COMMITTEE_ID || id === JESSICA_COMMITTEE_ID) continue;
    pacMap.set(id, {
      id,
      name,
      type: committeeTypeToPacType(clean(row.committee_type)),
      isAipacAligned: isAipacName(name)
    });
  }

  for (const row of attachedPacs) {
    const id = clean(row.committee_id);
    const name = clean(row.pac_name);
    if (!id || !name || id === MAXINE_COMMITTEE_ID || id === JESSICA_COMMITTEE_ID) continue;

    const existing = pacMap.get(id);
    if (!existing) {
      pacMap.set(id, {
        id,
        name,
        type: "pac",
        isAipacAligned: isAipacName(name)
      });
    } else if (isAipacName(name)) {
      existing.isAipacAligned = true;
    }
  }

  for (const row of donorToPac) {
    const id = clean(row.recipient_committee_id);
    const name = clean(row.recipient_committee_name);
    if (!id || !name || id === MAXINE_COMMITTEE_ID) continue;
    if (!pacMap.has(id)) {
      pacMap.set(id, { id, name, type: "pac", isAipacAligned: isAipacName(name) });
    } else if (isAipacName(name)) {
      pacMap.get(id).isAipacAligned = true;
    }
  }

  const maxinePacs = Array.from(pacMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const aipacCommitteeIds = maxinePacs.filter((row) => row.isAipacAligned).map((row) => row.id);
  const aipacCommitteeNames = maxinePacs.filter((row) => row.isAipacAligned).map((row) => row.name);

  const maxineExpenditures = outsideSpending
    .map((row, index) => {
    const date = toIsoDate(row.expenditure_date);
    const spenderName = clean(row.spender);
    const committeeId = committeeIdByName.get(normalizeKey(spenderName)) || "";

    return {
      id: `mx-exp-${index + 1}`,
      committeeId,
      committeeName: spenderName,
      targetCandidate: clean(row.candidate),
      supportOppose: clean(row.support_oppose).toUpperCase() === "O" ? "Oppose" : "Support",
      purpose: clean(row.description) || "Independent expenditure",
      amount: toAmount(row.amount),
      date,
      race: clean(row.race_bucket).toUpperCase().includes("OR03") ? "OR-03" : clean(row.race_bucket),
      filingUrl: clean(row.pdf_url),
      receiptId: clean(row.sub_id) || clean(row.transaction_id),
      notes: [clean(row.spender_bucket), clean(row.report_type), clean(row.filing_form)].filter(Boolean).join(" | ")
    };
    })
    .filter((row) => isYearInScope(row.date));

  const maxineReceipts = dedupeById([
    ...baseMaxineReceipts
      .map((row, index) =>
      buildReceipt({
        id: clean(row.sub_id) || clean(row.transaction_id) || `mx-receipt-direct-${index + 1}`,
        title: `${clean(row.donor_name) || "Donor"} -> ${maxineCommitteeName}`,
        sourceType: "FEC Candidate Receipt",
        sourceTitle: "base_maxine_receipts_2023_2026.csv",
        sourceUrl: clean(row.pdf_url),
        filingUrl: clean(row.pdf_url),
        fecDocumentId: clean(row.image_number),
        committeeId: clean(row.committee_id) || MAXINE_COMMITTEE_ID,
        contributorName: clean(row.donor_name),
        recipientName: maxineCommitteeName,
        amount: toAmount(row.contribution_receipt_amount),
        date: toIsoDate(row.contribution_receipt_date),
        memoText: clean(row.memo_text),
        supportOppose: "",
        tags: ["direct-receipt", "maxine"],
        notes: [clean(row.report_type), clean(row.election_type), clean(row.filing_form)].filter(Boolean).join(" | ")
      })
    )
      .filter((row) => isYearInScope(row.date)),
    ...directCommitteeRowsOnly
      .map((row, index) =>
      buildReceipt({
        id: row.receiptId || `mx-receipt-direct-committee-${index + 1}`,
        title: `${row.name || "Committee"} -> ${maxineCommitteeName}`,
        sourceType: "FEC Candidate Receipt (Committee/PAC)",
        sourceTitle: directCommitteeSource ? path.basename(directCommitteeSource) : "direct_committee_to_maxine_2023_2026.csv",
        sourceUrl: row.filingUrl,
        filingUrl: row.filingUrl,
        fecDocumentId: "",
        committeeId: row.recipientCommitteeId || MAXINE_COMMITTEE_ID,
        contributorName: row.name,
        recipientName: maxineCommitteeName,
        amount: row.amount,
        date: row.date,
        memoText: row.memoText,
        supportOppose: "",
        tags: ["direct-receipt", "maxine", "direct-committee"],
        notes: "Committee/PAC direct contribution from direct_committee_to_maxine source."
      })
    )
      .filter((row) => isYearInScope(row.date)),
    ...donorToPac
      .map((row, index) =>
      buildReceipt({
        id: clean(row.sub_id) || clean(row.transaction_id) || `mx-receipt-d2p-${index + 1}`,
        title: `${clean(row.contributor_name)} -> ${clean(row.recipient_committee_name)}`,
        sourceType: "FEC Donor to PAC",
        sourceTitle: "donor_to_pac_2023_2026.csv",
        sourceUrl: clean(row.pdf_url),
        filingUrl: clean(row.pdf_url),
        fecDocumentId: clean(row.image_number),
        committeeId: clean(row.recipient_committee_id),
        contributorName: clean(row.contributor_name),
        recipientName: clean(row.recipient_committee_name),
        amount: toAmount(row.contribution_receipt_amount),
        date: toIsoDate(row.contribution_receipt_date),
        memoText: clean(row.memo_text),
        supportOppose: "",
        tags: ["donor-to-pac", isAipacName(clean(row.recipient_committee_name)) ? "aipac-related" : "network"],
        notes: [clean(row.report_type), clean(row.election_type), clean(row.filing_form)].filter(Boolean).join(" | ")
      })
    )
      .filter((row) => isYearInScope(row.date)),
    ...pacIncoming
      .filter((row) => clean(row.edge_type).toLowerCase() === "pac_to_pac")
      .map((row, index) =>
        buildReceipt({
          id: clean(row.sub_id) || clean(row.transaction_id) || `mx-receipt-p2p-${index + 1}`,
          title: `${clean(row.source_committee_name)} -> ${clean(row.target_committee_name)}`,
          sourceType: "FEC PAC Transfer",
          sourceTitle: "maxine_pac_incoming_edges.csv",
          sourceUrl: clean(row.pdf_url),
          filingUrl: clean(row.pdf_url),
          fecDocumentId: "",
          committeeId: clean(row.target_committee_id),
          contributorName: clean(row.source_committee_name),
          recipientName: clean(row.target_committee_name),
          amount: toAmount(row.amount),
          date: toIsoDate(row.date),
          memoText: clean(row.memo_text),
          supportOppose: "",
          tags: ["pac-transfer", "network"],
          notes: clean(row.edge_type)
        })
      )
      .filter((row) => isYearInScope(row.date)),
    ...outsideSpending
      .map((row, index) =>
      buildReceipt({
        id: clean(row.sub_id) || clean(row.transaction_id) || `mx-receipt-outside-${index + 1}`,
        title: `${clean(row.spender)} ${clean(row.support_oppose).toUpperCase() === "O" ? "opposing" : "supporting"} ${clean(row.candidate)}`,
        sourceType: "FEC Independent Expenditure",
        sourceTitle: "outside_spending.csv",
        sourceUrl: clean(row.pdf_url),
        filingUrl: clean(row.pdf_url),
        fecDocumentId: clean(row.image_number),
        committeeId: committeeIdByName.get(normalizeKey(clean(row.spender))) || "",
        contributorName: clean(row.spender),
        recipientName: clean(row.candidate),
        amount: toAmount(row.amount),
        date: toIsoDate(row.expenditure_date),
        memoText: clean(row.description),
        supportOppose: clean(row.support_oppose).toUpperCase() === "O" ? "Oppose" : "Support",
        tags: ["outside-spending", clean(row.support_oppose).toUpperCase() === "O" ? "oppose" : "support"],
        notes: [clean(row.report_type), clean(row.filing_form)].filter(Boolean).join(" | ")
      })
    )
      .filter((row) => isYearInScope(row.date))
  ]);

  const maxineDocuments = buildDocumentsFromReceipts(maxineReceipts, "maxine");
  const maxineTransactionsDeduped = dedupeRows(maxineTransactions, (row) =>
    [
      row.category,
      row.fromType,
      normalizeKey(row.fromName),
      row.fromCommitteeId,
      row.toType,
      normalizeKey(row.toName),
      row.toCommitteeId,
      toIsoDate(row.date),
      toAmount(row.amount),
      row.receiptId,
      normalizeKey(row.memoText)
    ].join("|")
  ).map((row, index) => ({ ...row, id: makeTxId(row.category, index + 1) }));

  const maxineConfig = {
    candidateName: "Maxine Dexter",
    committeeName: maxineCommitteeName,
    committeeIds: [MAXINE_COMMITTEE_ID],
    aipacCommitteeIds,
    aipacCommitteeNames,
    years: [2023, 2024, 2025, 2026],
    raceLabel: "OR-03",
    cycleLabel: "2023-2026",
    opponentName: "Jessica Salas",
    notes:
      `Ingested from handoff source: ${path.relative(ROOT, handoffRoot)} (maxine_dexter/full_2023_2026 + outside spending source: ${path.relative(ROOT, outsideSpendingSource)}${directCommitteeSource ? ` + direct committee source: ${path.relative(ROOT, directCommitteeSource)}` : ""}).`
  };

  await writeJson(path.join(OUT_MAXINE, "config.json"), maxineConfig);
  await writeJson(path.join(OUT_MAXINE, "donors.json"), maxineDonors);
  await writeJson(path.join(OUT_MAXINE, "pacs.json"), maxinePacs);
  await writeJson(path.join(OUT_MAXINE, "transactions.json"), maxineTransactionsDeduped);
  await writeJson(path.join(OUT_MAXINE, "expenditures.json"), maxineExpenditures);
  await writeJson(path.join(OUT_MAXINE, "media.json"), existingMaxineMedia);
  await writeJson(path.join(OUT_MAXINE, "receipts.json"), maxineReceipts);
  await writeJson(path.join(OUT_MAXINE, "documents.json"), maxineDocuments);

  const jessicaDonors = jessicaReceipts
    .map((row, index) => ({
    id: `js-direct-${index + 1}`,
    name: clean(row.contributor_name),
    amount: toAmount(row.amount),
    date: toIsoDate(row.date),
    employer: clean(row.contributor_employer),
    donorType: mapEntityType(row.entity_type),
    city: clean(row.contributor_city),
    state: clean(row.contributor_state),
    zip: clean(row.contributor_zip),
    recipientCommitteeId: clean(row.committee_id) || JESSICA_COMMITTEE_ID,
    recipientCommitteeName: jessicaCommitteeName,
    memoText: clean(row.memo_text),
    filingUrl: clean(row.pdf_url),
    receiptId: clean(row.sub_id) || clean(row.transaction_id)
    }))
    .filter((row) => isYearInScope(row.date));

  const jessicaReceiptsOut = dedupeById(
    jessicaReceipts
      .map((row, index) =>
      buildReceipt({
        id: clean(row.sub_id) || clean(row.transaction_id) || `js-receipt-${index + 1}`,
        title: `${clean(row.contributor_name)} -> ${jessicaCommitteeName}`,
        sourceType: "FEC Candidate Receipt",
        sourceTitle: "jessica_salas_receipts_2026.csv",
        sourceUrl: clean(row.pdf_url),
        filingUrl: clean(row.pdf_url),
        fecDocumentId: clean(row.image_number),
        committeeId: clean(row.committee_id) || JESSICA_COMMITTEE_ID,
        contributorName: clean(row.contributor_name),
        recipientName: jessicaCommitteeName,
        amount: toAmount(row.amount),
        date: toIsoDate(row.date),
        memoText: clean(row.memo_text),
        supportOppose: "",
        tags: ["direct-receipt", "jessica"],
        notes: [clean(row.report_type), clean(row.election_type), clean(row.source_file)].filter(Boolean).join(" | ")
      })
    )
      .filter((row) => isYearInScope(row.date))
  );

  const jessicaConfig = {
    candidateName: "Jessica Salas",
    committeeName: jessicaCommitteeName,
    committeeIds: [JESSICA_COMMITTEE_ID],
    aipacCommitteeIds: [],
    aipacCommitteeNames: [],
    years: [2023, 2024, 2025, 2026],
    raceLabel: "OR-03",
    cycleLabel: "2023-2026",
    opponentName: "Maxine Dexter",
    notes: `Ingested from handoff source: ${path.relative(ROOT, handoffRoot)} (jessica_salas_receipts_2026.csv).`
  };

  await writeJson(path.join(OUT_JESSICA, "config.json"), jessicaConfig);
  await writeJson(path.join(OUT_JESSICA, "donors.json"), jessicaDonors);
  await writeJson(path.join(OUT_JESSICA, "pacs.json"), []);
  await writeJson(path.join(OUT_JESSICA, "transactions.json"), []);
  await writeJson(path.join(OUT_JESSICA, "expenditures.json"), []);
  await writeJson(path.join(OUT_JESSICA, "media.json"), existingJessicaMedia);
  await writeJson(path.join(OUT_JESSICA, "receipts.json"), jessicaReceiptsOut);
  await writeJson(path.join(OUT_JESSICA, "documents.json"), buildDocumentsFromReceipts(jessicaReceiptsOut, "jessica"));

  await syncWatchlistFiles(handoffRoot);

  console.log("Ingestion complete.");
  console.log(
    JSON.stringify(
      {
        maxine: {
          donors: maxineDonors.length,
          pacs: maxinePacs.length,
          transactions: maxineTransactionsDeduped.length,
          expenditures: maxineExpenditures.length,
          receipts: maxineReceipts.length,
          documents: maxineDocuments.length,
          aipacCommittees: aipacCommitteeIds.length
        },
        jessica: {
          donors: jessicaDonors.length,
          receipts: jessicaReceiptsOut.length
        }
      },
      null,
      2
    )
  );
}

async function resolveHandoffRoot() {
  const handoffCandidates = await buildHandoffCandidates();

  for (const candidate of handoffCandidates) {
    const required = path.join(candidate, "maxine_dexter", "full_2023_2026", "base_maxine_receipts_2023_2026.csv");
    if (await exists(required)) {
      return candidate;
    }
  }

  throw new Error(
    `No valid handoff source found. Tried: ${handoffCandidates.join(", ")}`
  );
}

async function resolveOutsideSpendingSource(handoffRoot) {
  const candidates = [
    path.join(handoffRoot, "shared", "outside_spending_deduped.csv"),
    path.join(handoffRoot, "outside_spending_deduped.csv"),
    path.join(handoffRoot, "shared", "outside_spending.csv"),
    path.join(handoffRoot, "outside_spending.csv")
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }

  throw new Error(`No outside spending source found in ${handoffRoot}`);
}

async function resolveDirectCommitteeSource(handoffRoot) {
  const candidates = [
    path.join(handoffRoot, "maxine_dexter", "upstream_network_to_maxine", "direct_committee_to_maxine_2023_2026.csv"),
    path.join(handoffRoot, "maxine_dexter", "watchlist_pac_check", "pac_to_pac_to_maxine", "direct_committee_to_maxine_2023_2026.csv"),
    path.join(handoffRoot, "direct_committee_to_maxine_2023_2026.csv")
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }

  return "";
}

async function buildHandoffCandidates() {
  const candidates = [];
  const seen = new Set();
  const push = (value) => {
    if (!value) return;
    const absolute = path.resolve(value);
    if (seen.has(absolute)) return;
    seen.add(absolute);
    candidates.push(absolute);
  };

  const envRoot = process.env.HANDOFF_ROOT ? path.resolve(process.env.HANDOFF_ROOT) : "";
  if (envRoot) {
    push(envRoot);
    push(path.join(envRoot, "or03_site_handoff"));
  }

  try {
    const entries = await fs.readdir(DATA_ROOT, { withFileTypes: true });
    const dragDrop = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("OR03_DRAG_DROP_PACKAGE_"))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const folder of dragDrop) {
      const base = path.join(DATA_ROOT, folder);
      push(base);
      push(path.join(base, "or03_site_handoff"));
    }
  } catch {
    // no-op
  }

  push(path.join(DATA_ROOT, "HANDOFF", "or03_site_handoff"));
  push(path.join(DATA_ROOT, "HANDOFF"));
  push(path.join(DATA_ROOT, "Maxine data", "or03_site_handoff"));

  return candidates;
}

async function syncWatchlistFiles(handoffRoot) {
  const preferredDir = path.join(handoffRoot, "maxine_dexter", "watchlist_pac_check");
  const fallbackDir = handoffRoot;

  const candidates = [
    {
      from: path.join(preferredDir, "matched_donor_to_watchlist_pacs.csv"),
      to: path.join(DATA_ROOT, "matched_donor_to_watchlist_pacs.csv")
    },
    {
      from: path.join(preferredDir, "watchlist_donor_summary.csv"),
      to: path.join(DATA_ROOT, "watchlist_donor_summary.csv")
    },
    {
      from: path.join(fallbackDir, "matched_donor_to_watchlist_pacs.csv"),
      to: path.join(DATA_ROOT, "matched_donor_to_watchlist_pacs.csv")
    },
    {
      from: path.join(fallbackDir, "watchlist_donor_summary.csv"),
      to: path.join(DATA_ROOT, "watchlist_donor_summary.csv")
    }
  ];

  const copied = new Set();
  for (const entry of candidates) {
    if (copied.has(entry.to)) continue;
    if (!(await exists(entry.from))) continue;
    await fs.copyFile(entry.from, entry.to);
    copied.add(entry.to);
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildDocumentsFromReceipts(receipts, prefix) {
  const byUrl = new Map();

  for (const row of receipts) {
    if (!row.filingUrl) continue;
    const key = row.filingUrl;
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, {
        id: `${prefix}-doc-${byUrl.size + 1}`,
        title: row.title || "FEC Filing",
        type: inferDocumentType(row.tags || []),
        date: row.date,
        url: row.filingUrl,
        tags: dedupe((row.tags || []).slice(0, 8)),
        committeeId: row.committeeId || "",
        description: row.notes || row.memoText || row.sourceTitle || "FEC filing record"
      });
    } else if (!existing.date && row.date) {
      existing.date = row.date;
    }
  }

  return Array.from(byUrl.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function inferDocumentType(tags) {
  if (tags.includes("outside-spending")) return "Outside Expenditure Filing";
  if (tags.includes("pac-transfer")) return "PAC Transfer Filing";
  if (tags.includes("donor-to-pac")) return "PAC Contribution Filing";
  return "Contribution Filing";
}

function buildReceipt(input) {
  return {
    id: clean(input.id),
    title: clean(input.title),
    sourceType: clean(input.sourceType),
    sourceTitle: clean(input.sourceTitle),
    sourceUrl: clean(input.sourceUrl),
    filingUrl: clean(input.filingUrl),
    fecDocumentId: clean(input.fecDocumentId),
    committeeId: clean(input.committeeId),
    contributorName: clean(input.contributorName),
    recipientName: clean(input.recipientName),
    amount: Number.isFinite(input.amount) ? input.amount : 0,
    date: toIsoDate(input.date),
    memoText: clean(input.memoText),
    supportOppose: clean(input.supportOppose),
    tags: dedupe((input.tags || []).filter(Boolean)),
    notes: clean(input.notes)
  };
}

function dedupeById(rows) {
  const seen = new Set();
  const output = [];

  for (const row of rows) {
    let id = clean(row.id);
    if (!id) {
      id = `generated-${output.length + 1}`;
    }

    if (seen.has(id)) {
      const fallback = `${id}-${output.length + 1}`;
      if (seen.has(fallback)) continue;
      row.id = fallback;
      seen.add(fallback);
      output.push(row);
      continue;
    }

    row.id = id;
    seen.add(id);
    output.push(row);
  }

  return output;
}

function dedupeRows(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = clean(keyFn(row));
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, row);
      continue;
    }
    const current = map.get(key);
    map.set(key, scoreTransactionRow(row) > scoreTransactionRow(current) ? row : current);
  }
  return Array.from(map.values());
}

function dedupeCsvRows(rows, keyFn, scoreFn) {
  const map = new Map();
  for (const row of rows) {
    const key = clean(keyFn(row));
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, row);
      continue;
    }
    const current = map.get(key);
    map.set(key, scoreFn(row) > scoreFn(current) ? row : current);
  }
  return Array.from(map.values());
}

function scoreSourceRow(row) {
  let score = 0;
  if (clean(row.sub_id)) score += 8;
  if (clean(row.transaction_id)) score += 6;
  if (clean(row.pdf_url)) score += 4;
  if (clean(row.image_number)) score += 2;
  if (clean(row.memo_text)) score += 1;
  if (clean(row.report_type)) score += 1;
  return score;
}

function scoreTransactionRow(row) {
  let score = 0;
  if (clean(row.receiptId)) score += 8;
  if (clean(row.filingUrl)) score += 4;
  if (clean(row.memoText)) score += 1;
  return score;
}

function makeTxId(category, index) {
  const prefix = category === "donor_to_pac" ? "mx-d2p" : category === "pac_to_pac" ? "mx-p2p" : "mx-p2s";
  return `${prefix}-${index}`;
}

function committeeTypeToPacType(committeeType) {
  if (!committeeType) return "pac";
  if (committeeType === "W") return "super_pac";
  if (committeeType === "Q") return "qualified_pac";
  if (committeeType === "O") return "outside_group";
  return "pac";
}

function isAipacName(name) {
  if (!name) return false;
  return AIPAC_PATTERNS.some((pattern) => pattern.test(name));
}

function mapEntityType(entityType) {
  const value = clean(entityType).toUpperCase();
  if (value === "COM" || value === "PAC") return "pac";
  if (value === "ORG" || value === "PTY") return "committee";
  return "individual";
}

function toAmount(value) {
  const str = clean(value).replace(/[$,]/g, "");
  if (!str) return 0;
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value) {
  const raw = clean(value);
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  if (/^\d{8}$/.test(raw)) {
    const mm = raw.slice(0, 2);
    const dd = raw.slice(2, 4);
    const yyyy = raw.slice(4, 8);
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clean(value) {
  if (value == null) return "";
  return String(value).replace(/\uFEFF/g, "").trim();
}

function normalizeKey(value) {
  return clean(value).toUpperCase().replace(/\s+/g, " ");
}

function dedupe(values) {
  return Array.from(new Set(values));
}

function isYearInScope(dateValue) {
  const year = extractYear(dateValue);
  if (year == null) return false;
  return year >= YEAR_START && year <= YEAR_END;
}

function extractYear(value) {
  const iso = toIsoDate(value);
  if (!iso) return null;
  const year = Number(String(iso).slice(0, 4));
  if (!Number.isFinite(year)) return null;
  return year;
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const input = raw.replace(/^\uFEFF/, "");
  return parseCsvToObjects(input);
}

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseCsvToObjects(input) {
  const rows = parseCsvRows(input);
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  const keys = header.map((cell) => clean(cell));

  return dataRows
    .filter((row) => row.some((cell) => clean(cell).length > 0))
    .map((row) => {
      const obj = {};
      keys.forEach((key, index) => {
        obj[key] = clean(row[index] ?? "");
      });
      return obj;
    });
}

function parseCsvRows(input) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
