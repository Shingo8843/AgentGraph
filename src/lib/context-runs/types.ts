export type SourceType = "issue" | "pr";

export type ContextRunMode = "edge_enrichment";

export type SourceRef = {
  provider: "github";
  repo: string;
  type: SourceType;
  number: number;
};

export type ContextRunRequest = {
  source: SourceRef;
  mode: ContextRunMode;
};

export type SourceRecord = {
  id: string;
  provider: "github";
  repo: string;
  type: SourceType | "comment" | "document" | "label" | "file";
  number?: number;
  title: string;
  text: string;
  labels?: string[];
  changedFiles?: string[];
};

export type EdgeEvidence = {
  sourceRecordId: string;
  quote: string;
  url?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: string;
  confidence: number;
  deterministic: boolean;
  evidence: EdgeEvidence;
};

export type RejectedEdgeReason =
  | "missing_source"
  | "missing_target"
  | "unknown_edge_type"
  | "missing_evidence"
  | "evidence_source_not_loaded"
  | "evidence_quote_not_found"
  | "low_confidence"
  | "duplicate_edge";

export type RejectedEdge = {
  edge: GraphEdge;
  reason: RejectedEdgeReason;
};

export type EdgeValidationResult = {
  approved: GraphEdge[];
  rejected: RejectedEdge[];
};
