import test from "node:test";
import assert from "node:assert/strict";
import { deriveDeterministicEdges } from "./deterministicEdges.ts";
import type { SourceRecord } from "./types.ts";

const issue: SourceRecord = {
  id: "github:openclaw/openclaw:issue:12",
  provider: "github",
  repo: "openclaw/openclaw",
  type: "issue",
  number: 12,
  title: "Session state is lost",
  text: "This is related to #34 and see #56 for the earlier report.",
  labels: ["bug", "session"]
};

test("creates mention edges from stored issue text references", () => {
  const edges = deriveDeterministicEdges([issue]);

  assert.deepEqual(
    edges
      .filter((edge) => edge.type === "mentions")
      .map((edge) => [edge.source, edge.target, edge.evidence.quote]),
    [
      [
        "github:openclaw/openclaw:issue:12",
        "github:openclaw/openclaw:issue:34",
        "related to #34"
      ],
      [
        "github:openclaw/openclaw:issue:12",
        "github:openclaw/openclaw:issue:56",
        "see #56"
      ]
    ]
  );
});

test("creates closes edges from stored PR closing syntax", () => {
  const pr: SourceRecord = {
    id: "github:openclaw/openclaw:pr:88",
    provider: "github",
    repo: "openclaw/openclaw",
    type: "pr",
    number: 88,
    title: "Fix session state",
    text: "Fixes #12 and closes #34."
  };

  const edges = deriveDeterministicEdges([pr]);

  assert.deepEqual(
    edges.map((edge) => [edge.type, edge.target, edge.evidence.quote]),
    [
      ["closes", "github:openclaw/openclaw:issue:12", "Fixes #12"],
      ["closes", "github:openclaw/openclaw:issue:34", "closes #34"]
    ]
  );
});

test("creates label and touched-file edges from stored metadata", () => {
  const pr: SourceRecord = {
    id: "github:openclaw/openclaw:pr:88",
    provider: "github",
    repo: "openclaw/openclaw",
    type: "pr",
    number: 88,
    title: "Fix session state",
    text: "",
    labels: ["bug"],
    changedFiles: ["src/auth/session.ts"]
  };

  const edges = deriveDeterministicEdges([pr]);

  assert.deepEqual(
    edges.map((edge) => [edge.type, edge.target]),
    [
      ["has_label", "github:openclaw/openclaw:label:bug"],
      ["touches_file", "github:openclaw/openclaw:file:src/auth/session.ts"]
    ]
  );
});
