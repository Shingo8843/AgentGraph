import type { EdgeValidationResult, GraphEdge, RejectedEdgeReason, SourceRecord } from "./types.ts";

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

const allowedSemanticEdgeTypes = new Set([
  "same_root_cause_as",
  "blocked_by",
  "duplicates",
  "constrained_by",
  "implements",
  "explained_by",
  "supersedes",
  "related_to"
]);

type ValidateProposedEdgesInput = {
  records: SourceRecord[];
  proposedEdges: GraphEdge[];
  existingEdges: GraphEdge[];
  confidenceThreshold?: number;
};

export function validateProposedEdges({
  records,
  proposedEdges,
  existingEdges,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD
}: ValidateProposedEdgesInput): EdgeValidationResult {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const knownIds = new Set(records.map((record) => record.id));
  const existingKeys = new Set(existingEdges.map(edgeKey));
  const approved: GraphEdge[] = [];
  const rejected: EdgeValidationResult["rejected"] = [];

  for (const edge of proposedEdges) {
    const reason = rejectReason(edge, recordsById, knownIds, existingKeys, confidenceThreshold);

    if (reason) {
      rejected.push({ edge, reason });
      continue;
    }

    existingKeys.add(edgeKey(edge));
    approved.push(edge);
  }

  return { approved, rejected };
}

function rejectReason(
  edge: GraphEdge,
  recordsById: Map<string, SourceRecord>,
  knownIds: Set<string>,
  existingKeys: Set<string>,
  confidenceThreshold: number
): RejectedEdgeReason | null {
  if (!edge.source || !knownIds.has(edge.source)) {
    return "missing_source";
  }

  if (!edge.target || !knownIds.has(edge.target)) {
    return "missing_target";
  }

  if (!allowedSemanticEdgeTypes.has(edge.type)) {
    return "unknown_edge_type";
  }

  if (edge.confidence < confidenceThreshold) {
    return "low_confidence";
  }

  if (!edge.evidence?.sourceRecordId || !edge.evidence.quote) {
    return "missing_evidence";
  }

  const evidenceRecord = recordsById.get(edge.evidence.sourceRecordId);

  if (!evidenceRecord) {
    return "evidence_source_not_loaded";
  }

  if (!evidenceRecord.text.includes(edge.evidence.quote)) {
    return "evidence_quote_not_found";
  }

  if (existingKeys.has(edgeKey(edge))) {
    return "duplicate_edge";
  }

  return null;
}

function edgeKey(edge: GraphEdge) {
  return `${edge.source}\u0000${edge.type}\u0000${edge.target}`;
}
