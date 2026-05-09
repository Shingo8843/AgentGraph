import test from "node:test";
import assert from "node:assert/strict";
import { validateProposedEdges } from "./edgeValidator.ts";
import type { GraphEdge, SourceRecord } from "./types.ts";

const records: SourceRecord[] = [
  {
    id: "github:openclaw/openclaw:issue:12",
    provider: "github",
    repo: "openclaw/openclaw",
    type: "issue",
    number: 12,
    title: "Session state is lost",
    text: "The same root cause appears in #34 because the token cache is cleared."
  },
  {
    id: "github:openclaw/openclaw:issue:34",
    provider: "github",
    repo: "openclaw/openclaw",
    type: "issue",
    number: 34,
    title: "Token cache clears on reload",
    text: "Reload clears token cache."
  }
];

const validEdge: GraphEdge = {
  source: "github:openclaw/openclaw:issue:12",
  target: "github:openclaw/openclaw:issue:34",
  type: "same_root_cause_as",
  confidence: 0.82,
  deterministic: false,
  evidence: {
    sourceRecordId: "github:openclaw/openclaw:issue:12",
    quote: "same root cause appears in #34"
  }
};

test("accepts valid semantic edges with evidence above threshold", () => {
  const result = validateProposedEdges({
    records,
    proposedEdges: [validEdge],
    existingEdges: []
  });

  assert.equal(result.approved.length, 1);
  assert.equal(result.rejected.length, 0);
});

test("rejects semantic edges when evidence quote is not in the loaded source text", () => {
  const result = validateProposedEdges({
    records,
    proposedEdges: [
      {
        ...validEdge,
        evidence: {
          sourceRecordId: "github:openclaw/openclaw:issue:12",
          quote: "this quote does not exist"
        }
      }
    ],
    existingEdges: []
  });

  assert.deepEqual(result.approved, []);
  assert.equal(result.rejected[0]?.reason, "evidence_quote_not_found");
});

test("rejects unknown semantic edge types", () => {
  const result = validateProposedEdges({
    records,
    proposedEdges: [
      {
        ...validEdge,
        type: "guesses_about"
      }
    ],
    existingEdges: []
  });

  assert.equal(result.rejected[0]?.reason, "unknown_edge_type");
});

test("rejects duplicate edges", () => {
  const result = validateProposedEdges({
    records,
    proposedEdges: [validEdge],
    existingEdges: [validEdge]
  });

  assert.deepEqual(result.approved, []);
  assert.equal(result.rejected[0]?.reason, "duplicate_edge");
});
