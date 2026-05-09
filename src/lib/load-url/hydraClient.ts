import type { HydraMemoryItem } from "./types.ts";

const HYDRA_API_BASE = "https://api.hydradb.com";

type AddMemoryResult = {
  success?: boolean;
  message?: string;
  results?: unknown[];
  success_count?: number;
  failed_count?: number;
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
