import type { ContextRunRequest, SourceType } from "./types.ts";

const DEFAULT_REPO = "openclaw/openclaw";

export function parseContextRunRequest(input: unknown): ContextRunRequest {
  if (!isRecord(input)) {
    throw new Error("request body must be an object");
  }

  const source = input.source;

  if (!isRecord(source)) {
    throw new Error("source must be an object");
  }

  if (source.provider !== "github") {
    throw new Error("source.provider must be github");
  }

  if (!isSourceType(source.type)) {
    throw new Error("source.type must be issue or pr");
  }

  const sourceNumber = source.number;

  if (typeof sourceNumber !== "number" || !Number.isInteger(sourceNumber) || sourceNumber <= 0) {
    throw new Error("source.number must be a positive integer");
  }

  if (input.mode !== "edge_enrichment") {
    throw new Error("mode must be edge_enrichment");
  }

  return {
    source: {
      provider: "github",
      repo: typeof source.repo === "string" && source.repo.trim() ? source.repo : DEFAULT_REPO,
      type: source.type,
      number: sourceNumber
    },
    mode: "edge_enrichment"
  };
}

function isSourceType(value: unknown): value is SourceType {
  return value === "issue" || value === "pr";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
