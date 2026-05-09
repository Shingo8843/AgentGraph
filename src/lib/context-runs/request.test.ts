import test from "node:test";
import assert from "node:assert/strict";
import { parseContextRunRequest } from "./request.ts";

test("defaults context run repo to openclaw/openclaw", () => {
  const result = parseContextRunRequest({
    source: {
      provider: "github",
      type: "issue",
      number: 1234
    },
    mode: "edge_enrichment"
  });

  assert.deepEqual(result, {
    source: {
      provider: "github",
      repo: "openclaw/openclaw",
      type: "issue",
      number: 1234
    },
    mode: "edge_enrichment"
  });
});

test("rejects unsupported context run source type", () => {
  assert.throws(
    () =>
      parseContextRunRequest({
        source: {
          provider: "github",
          type: "discussion",
          number: 1234
        },
        mode: "edge_enrichment"
      }),
    /source.type must be issue or pr/
  );
});

test("rejects context run request without a positive source number", () => {
  assert.throws(
    () =>
      parseContextRunRequest({
        source: {
          provider: "github",
          type: "issue"
        },
        mode: "edge_enrichment"
      }),
    /source.number must be a positive integer/
  );
});

test("rejects unsupported context run modes", () => {
  assert.throws(
    () =>
      parseContextRunRequest({
        source: {
          provider: "github",
          type: "pr",
          number: 88
        },
        mode: "compile_only"
      }),
    /mode must be edge_enrichment/
  );
});
