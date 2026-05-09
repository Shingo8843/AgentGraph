import test from "node:test";
import assert from "node:assert/strict";
import { getHydraDocumentId } from "./hydraClient.ts";

test("extracts the HydraDB source id returned by add_memory", () => {
  assert.equal(
    getHydraDocumentId({
      success: true,
      results: [
        {
          source_id: "9c3901821304c0a063fb2db1d2c67b79",
          title: "My Document",
          status: "queued",
          infer: true,
          error: null
        }
      ],
      success_count: 1,
      failed_count: 0
    }),
    "9c3901821304c0a063fb2db1d2c67b79"
  );
});

test("returns null when HydraDB does not include a source id", () => {
  assert.equal(getHydraDocumentId({ success: true, results: [] }), null);
});
