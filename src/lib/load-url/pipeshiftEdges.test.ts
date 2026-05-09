import test from "node:test";
import assert from "node:assert/strict";
import { parsePipeshiftEdges } from "./pipeshiftEdges.ts";

test("parses semantic edges from a Pipeshift chat completion", () => {
  const edges = parsePipeshiftEdges({
    choices: [
      {
        message: {
          content: JSON.stringify({
            edges: [
              {
                source: "github:openclaw/openclaw:issue:12",
                target: "github:openclaw/openclaw:issue:34",
                type: "same_root_cause_as",
                confidence: 0.82,
                evidence: {
                  sourceRecordId: "github:openclaw/openclaw:issue:12",
                  quote: "same root cause"
                }
              }
            ]
          })
        }
      }
    ]
  });

  assert.deepEqual(edges, [
    {
      source: "github:openclaw/openclaw:issue:12",
      target: "github:openclaw/openclaw:issue:34",
      type: "same_root_cause_as",
      confidence: 0.82,
      deterministic: false,
      evidence: {
        sourceRecordId: "github:openclaw/openclaw:issue:12",
        quote: "same root cause"
      }
    }
  ]);
});

test("parses semantic edges from fenced JSON", () => {
  const edges = parsePipeshiftEdges({
    choices: [
      {
        message: {
          content:
            "```json\n" +
            JSON.stringify({
              edges: [
                {
                  source: "a",
                  target: "b",
                  type: "related_to",
                  confidence: 0.7,
                  evidence: { sourceRecordId: "a", quote: "because" }
                }
              ]
            }) +
            "\n```"
        }
      }
    ]
  });

  assert.equal(edges.length, 1);
  assert.equal(edges[0]?.type, "related_to");
});
