import type { HydraMemoryItem } from "./types.ts";

const HYDRA_API_BASE = "https://api.hydradb.com";

type AddMemoryResult = {
  success?: boolean;
  message?: string;
  results?: Array<{
    source_id?: string;
    title?: string;
    status?: string;
    infer?: boolean;
    error?: string | null;
  }>;
  success_count?: number;
  failed_count?: number;
};

export type VerifyHydraProcessingResult = {
  sourceId: string;
  status: string;
  errorCode?: string | null;
  message?: string;
  raw: unknown;
};

export async function addMemoryToHydra(memory: HydraMemoryItem): Promise<AddMemoryResult> {
  const apiKey = process.env.HYDRADB_API_KEY;
  const tenantId = process.env.HYDRADB_TENANT_ID;
  const subTenantId = process.env.HYDRADB_SUB_TENANT_ID ?? "";

  if (!apiKey || !tenantId) {
    throw new Error("Set HYDRADB_API_KEY and HYDRADB_TENANT_ID before loading URLs.");
  }

  const response = await fetch(`${HYDRA_API_BASE}/memories/add_memory`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      memories: [memory],
      tenant_id: tenantId,
      sub_tenant_id: subTenantId,
      upsert: true
    }),
    cache: "no-store"
  });

  const json = (await response.json()) as AddMemoryResult & {
    detail?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(json.detail?.message ?? `HydraDB returned ${response.status}`);
  }

  return json;
}

export function getHydraDocumentId(result: AddMemoryResult): string | null {
  return result.results?.[0]?.source_id ?? null;
}

export async function verifyHydraProcessing(
  sourceId: string
): Promise<VerifyHydraProcessingResult> {
  const apiKey = process.env.HYDRADB_API_KEY;
  const tenantId = process.env.HYDRADB_TENANT_ID;

  if (!apiKey || !tenantId) {
    throw new Error("Set HYDRADB_API_KEY and HYDRADB_TENANT_ID before checking HydraDB processing.");
  }

  const url = new URL(`${HYDRA_API_BASE}/ingestion/verify_processing`);
  url.searchParams.set("file_ids", sourceId);
  url.searchParams.set("tenant_id", tenantId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    cache: "no-store"
  });

  const json = await parseHydraJson(response);

  if (!response.ok) {
    throw new Error(hydraErrorMessage(json, `HydraDB verify returned ${response.status}`));
  }

  return normalizeVerifyResult(sourceId, json);
}

async function parseHydraJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function normalizeVerifyResult(sourceId: string, raw: unknown): VerifyHydraProcessingResult {
  const candidate = firstRecord(raw);

  return {
    sourceId,
    status:
      stringField(candidate, "indexing_status") ??
      stringField(candidate, "status") ??
      stringField(raw, "indexing_status") ??
      stringField(raw, "status") ??
      "unknown",
    errorCode: stringField(candidate, "error_code") ?? stringField(raw, "error_code") ?? undefined,
    message:
      stringField(candidate, "error_message") ??
      stringField(candidate, "message") ??
      stringField(raw, "error_message") ??
      stringField(raw, "message") ??
      stringField(raw, "detail") ??
      undefined,
    raw
  };
}

function firstRecord(value: unknown): unknown {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of ["results", "files", "statuses", "data"]) {
    const field = value[key];

    if (Array.isArray(field) && field.length > 0) {
      return field[0];
    }
  }

  const byId = value[sourceIdLikeKey(value)];

  if (isRecord(byId)) {
    return byId;
  }

  return value;
}

function sourceIdLikeKey(value: Record<string, unknown>) {
  return Object.keys(value).find((key) => /^[a-f0-9]{16,}$/i.test(key)) ?? "";
}

function stringField(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];
  return typeof field === "string" ? field : null;
}

function hydraErrorMessage(value: unknown, fallback: string) {
  if (!isRecord(value)) {
    return fallback;
  }

  const detail = value.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (isRecord(detail) && typeof detail.message === "string") {
    return detail.message;
  }

  return typeof value.message === "string" ? value.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
