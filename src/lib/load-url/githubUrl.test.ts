import test from "node:test";
import assert from "node:assert/strict";
import { parseGitHubUrl } from "./githubUrl.ts";

test("parses GitHub issue URLs", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/openclaw/openclaw/issues/1234"), {
    provider: "github",
    owner: "openclaw",
    repo: "openclaw",
    type: "issue",
    number: 1234,
    url: "https://github.com/openclaw/openclaw/issues/1234"
  });
});

test("parses GitHub pull request URLs", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/openclaw/openclaw/pull/88"), {
    provider: "github",
    owner: "openclaw",
    repo: "openclaw",
    type: "pr",
    number: 88,
    url: "https://github.com/openclaw/openclaw/pull/88"
  });
});

test("rejects non-GitHub URLs", () => {
  assert.throws(() => parseGitHubUrl("https://example.com/openclaw/openclaw/issues/1"), /GitHub/);
});

test("rejects unsupported GitHub paths", () => {
  assert.throws(() => parseGitHubUrl("https://github.com/openclaw/openclaw/discussions/1"), /issue or pull request/);
});
