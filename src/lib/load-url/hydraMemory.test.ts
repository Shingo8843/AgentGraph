import test from "node:test";
import assert from "node:assert/strict";
import { buildHydraMemoryItem } from "./hydraMemory.ts";
import type { GitHubItem } from "./types.ts";

test("builds a stable HydraDB memory item for a GitHub issue", () => {
  const item: GitHubItem = {
    source: {
      provider: "github",
      owner: "openclaw",
      repo: "openclaw",
      type: "issue",
      number: 12,
      url: "https://github.com/openclaw/openclaw/issues/12"
    },
    title: "Fix startup crash",
    body: "The app crashes on startup.",
    state: "open",
    labels: ["bug"],
    author: "alice",
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-02T00:00:00Z"
  };

  assert.deepEqual(buildHydraMemoryItem(item), {
    id: "github:openclaw/openclaw:issue:12",
    title: "openclaw/openclaw issue #12: Fix startup crash",
    text:
      "# openclaw/openclaw issue #12: Fix startup crash\n\n" +
      "URL: https://github.com/openclaw/openclaw/issues/12\n" +
      "State: open\n" +
      "Author: alice\n" +
      "Labels: bug\n" +
      "Created: 2026-05-01T00:00:00Z\n" +
      "Updated: 2026-05-02T00:00:00Z\n\n" +
      "## Body\n\n" +
      "The app crashes on startup.",
    is_markdown: true,
    infer: true,
    metadata: {
      provider: "github",
      repo: "openclaw/openclaw",
      type: "issue"
    },
    additional_metadata: {
      number: 12,
      url: "https://github.com/openclaw/openclaw/issues/12",
      state: "open",
      labels: ["bug"],
      author: "alice"
    }
  });
});
