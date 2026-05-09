import test from "node:test";
import assert from "node:assert/strict";
import { relationGroupToGraph } from "./hydraTenantGraph.ts";

test("joins a Hydra relation group to its source document", () => {
  const graph = relationGroupToGraph(
    {
      source: {
        name: "pr-79045",
        type: "PROJECT",
        namespace: "projects",
        entity_id: "source-entity-id",
        identifier: "pr-79045"
      },
      target: {
        name: "pr-78612",
        type: "PROJECT",
        namespace: "projects",
        entity_id: "target-entity-id",
        identifier: "pr-78612"
      },
      relations: [
        {
          canonical_predicate: "RELATED_TO",
          context: "The pull request references pr-78612.",
          confidence: 0.91
        }
      ]
    },
    "document-id"
  );

  assert.deepEqual(
    graph.nodes.map((node) => ({ id: node.id, label: node.label, type: node.type })),
    [
      { id: "source-entity-id", label: "pr-79045", type: "PROJECT" },
      { id: "target-entity-id", label: "pr-78612", type: "PROJECT" }
    ]
  );
  assert.deepEqual(
    graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      sourceDocumentId: edge.sourceDocumentId
    })),
    [
      {
        source: "source-entity-id",
        target: "target-entity-id",
        type: "related_to",
        sourceDocumentId: "document-id"
      },
      {
        source: "document-id",
        target: "source-entity-id",
        type: "mentions",
        sourceDocumentId: "document-id"
      },
      {
        source: "document-id",
        target: "target-entity-id",
        type: "mentions",
        sourceDocumentId: "document-id"
      }
    ]
  );
});
