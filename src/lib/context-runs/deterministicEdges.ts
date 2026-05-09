import type { GraphEdge, SourceRecord } from "./types.ts";

const closingReferencePattern = /\b(?:fixes|fixed|fix|closes|closed|close|resolves|resolved|resolve)\s+#(\d+)\b/gi;
const mentionReferencePattern = /\b(?:related to|see|refs?|references?)\s+#(\d+)\b/gi;

export function deriveDeterministicEdges(records: SourceRecord[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    for (const edge of [
      ...deriveReferenceEdges(record),
      ...deriveLabelEdges(record),
      ...deriveTouchedFileEdges(record)
    ]) {
      const key = edgeKey(edge);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      edges.push(edge);
    }
  }

  return edges;
}

function deriveReferenceEdges(record: SourceRecord): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (const match of record.text.matchAll(closingReferencePattern)) {
    edges.push(referenceEdge(record, "closes", match));
  }

  for (const match of record.text.matchAll(mentionReferencePattern)) {
    edges.push(referenceEdge(record, "mentions", match));
  }

  return edges;
}

function referenceEdge(record: SourceRecord, type: string, match: RegExpMatchArray): GraphEdge {
  const number = Number(match[1]);

  return {
    source: record.id,
    target: `github:${record.repo}:issue:${number}`,
    type,
    confidence: 1,
    deterministic: true,
    evidence: {
      sourceRecordId: record.id,
      quote: match[0]
    }
  };
}

function deriveLabelEdges(record: SourceRecord): GraphEdge[] {
  return (record.labels ?? []).map((label) => ({
    source: record.id,
    target: `github:${record.repo}:label:${label}`,
    type: "has_label",
    confidence: 1,
    deterministic: true,
    evidence: {
      sourceRecordId: record.id,
      quote: `label:${label}`
    }
  }));
}

function deriveTouchedFileEdges(record: SourceRecord): GraphEdge[] {
  return (record.changedFiles ?? []).map((filePath) => ({
    source: record.id,
    target: `github:${record.repo}:file:${filePath}`,
    type: "touches_file",
    confidence: 1,
    deterministic: true,
    evidence: {
      sourceRecordId: record.id,
      quote: filePath
    }
  }));
}

function edgeKey(edge: GraphEdge) {
  return `${edge.source}\u0000${edge.type}\u0000${edge.target}`;
}
