export type CandidateKey = "maxine" | "jessica";

export type YearFilter = "all" | 2023 | 2024 | 2025 | 2026;

export type MatchLabel = "exact" | "probable" | "possible" | "network" | "none";

export type EvidenceRecord = {
  id: string;
  label: string;
  type:
    | "donor"
    | "pac"
    | "transfer"
    | "expenditure"
    | "overlap"
    | "article"
    | "document"
    | "receipt"
    | "summary"
    | "cluster";
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
};

export type DonorRecord = {
  id: string;
  name: string;
  amount: number;
  date: string;
  employer: string;
  donorType: string;
  city: string;
  state: string;
  zip: string;
  recipientCommitteeId: string;
  recipientCommitteeName: string;
  memoText: string;
  filingUrl: string;
  receiptId: string;
  normalizedName: string;
  normalizedEmployer: string;
};

export type PacRecord = {
  id: string;
  name: string;
  type: string;
  isAipacAligned: boolean;
};

export type TransactionRecord = {
  id: string;
  fromType: "donor" | "pac";
  fromName: string;
  fromCommitteeId: string;
  fromEmployer: string;
  fromZip: string;
  toType: "pac" | "candidate" | "spender";
  toName: string;
  toCommitteeId: string;
  amount: number;
  date: string;
  category: "donor_to_pac" | "pac_to_pac" | "pac_to_spender" | "pac_to_candidate";
  memoText: string;
  filingUrl: string;
  receiptId: string;
  normalizedFromName: string;
  normalizedFromEmployer: string;
};

export type ExpenditureRecord = {
  id: string;
  committeeId: string;
  committeeName: string;
  targetCandidate: string;
  supportOppose: "Support" | "Oppose";
  purpose: string;
  amount: number;
  date: string;
  race: string;
  filingUrl: string;
  receiptId: string;
  notes: string;
};

export type MediaRecord = {
  id: string;
  title: string;
  source: string;
  date: string;
  url: string;
  summary: string;
  tags: string[];
};

export type SocialPostRecord = {
  id: string;
  platform: string;
  account: string;
  date: string;
  url: string;
  preview: string;
  previewImageUrl?: string;
  tags: string[];
};

export type DocumentRecord = {
  id: string;
  title: string;
  type: string;
  date: string;
  url: string;
  tags: string[];
  committeeId: string;
  description: string;
};

export type ReceiptRecord = {
  id: string;
  title: string;
  sourceType: string;
  sourceTitle: string;
  sourceUrl: string;
  filingUrl: string;
  fecDocumentId: string;
  committeeId: string;
  contributorName: string;
  recipientName: string;
  amount: number;
  date: string;
  memoText: string;
  supportOppose: string;
  tags: string[];
  notes: string;
};

export type CandidateConfig = {
  candidateName: string;
  committeeName: string;
  committeeIds: string[];
  aipacCommitteeIds: string[];
  aipacCommitteeNames: string[];
  years: number[];
  raceLabel: string;
  cycleLabel: string;
  opponentName?: string;
  notes?: string;
};

export type OverlapRow = {
  donorId: string;
  donorName: string;
  donorEmployer: string;
  donorZip: string;
  donorCityState: string;
  totalToCandidate: number;
  aipacAlignmentTier: "core" | "network";
  matchLabel: MatchLabel;
  matchConfidence: number;
  matchedAipacDonor: string;
  aipacCommittee: string;
  evidence: EvidenceRecord[];
};

export type DonorAggregateRow = {
  donorName: string;
  donorType: string;
  totalToCandidate: number;
  employer: string;
  city: string;
  state: string;
  zip: string;
  contributionCount: number;
  firstDate: string;
  lastDate: string;
  aipacAlignmentTier: "none" | "core" | "network";
  overlapStatus: boolean;
  matchLabel: MatchLabel;
  matchConfidence: number;
  receipts: string[];
  evidence: EvidenceRecord[];
};

export type SankeyNode = {
  id: string;
  name: string;
  type: string;
  evidence: EvidenceRecord;
};

export type SankeyLink = {
  source: number;
  target: number;
  value: number;
  evidence: EvidenceRecord;
};

export type SankeyGraphData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

export type NetworkNode = {
  id: string;
  label: string;
  group: "donor" | "aipac" | "pac" | "spender" | "candidate";
  value: number;
  evidence: EvidenceRecord;
};

export type NetworkLink = {
  source: string;
  target: string;
  value: number;
  evidence: EvidenceRecord;
};

export type ProcessedCandidateData = {
  candidateKey: CandidateKey;
  config: CandidateConfig;
  yearFilter: YearFilter;
  stats: {
    totalDirectDonors: number;
    totalDirectAmount: number;
    aipacDonorCount: number;
    aipacDonorAmount: number;
    outsideSpendingTotal: number;
  };
  directDonorRows: DonorAggregateRow[];
  directCommitteeRows: DonorAggregateRow[];
  topDirectDonors: DonorAggregateRow[];
  overlapRows: OverlapRow[];
  directTimeline: Array<{ month: string; total: number; count: number; evidence: EvidenceRecord }>;
  directFundingSankey: SankeyGraphData;
  raceSpendingSummary: Array<{ label: string; amount: number; evidence: EvidenceRecord }>;
  contributionClusters: {
    sameDay: Array<{ day: string; contributions: number; total: number; evidence: EvidenceRecord }>;
    sameEmployer: Array<{ employer: string; contributors: number; total: number; evidence: EvidenceRecord }>;
    geography: Array<{ geography: string; contributors: number; total: number; evidence: EvidenceRecord }>;
    repeatHighDollar: Array<{ donor: string; contributions: number; total: number; evidence: EvidenceRecord }>;
  };
  pacTransfers: Array<{ from: string; to: string; amount: number; date: string; evidence: EvidenceRecord }>;
  indirectFlowSankey: SankeyGraphData;
  expenditureNetwork: {
    nodes: NetworkNode[];
    links: NetworkLink[];
  };
  committeeAipacNetwork: {
    nodes: NetworkNode[];
    links: NetworkLink[];
  };
  outsideSpendingRows: Array<ExpenditureRecord & { evidence: EvidenceRecord[] }>;
  outsideTrend: Array<{ month: string; total: number; evidence: EvidenceRecord }>;
  media: Array<MediaRecord & { evidence: EvidenceRecord }>;
  aipacSocialPosts: Array<SocialPostRecord & { evidence: EvidenceRecord }>;
  documents: Array<DocumentRecord & { evidence: EvidenceRecord }>;
  receipts: ReceiptRecord[];
  metadata: {
    generatedAt: string;
    totals: {
      donors: number;
      transactions: number;
      expenditures: number;
      receipts: number;
    };
  };
};
