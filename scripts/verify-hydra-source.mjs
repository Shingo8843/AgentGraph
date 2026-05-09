import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

loadDotEnvVars();

const sourceId = process.argv[2];

if (!sourceId) {
  console.error("Usage: node scripts/verify-hydra-source.mjs <source_id>");
  process.exit(1);
}

const apiKey = process.env.HYDRADB_API_KEY;
const tenantId = process.env.HYDRADB_TENANT_ID;
const subTenantId = process.env.HYDRADB_SUB_TENANT_ID;

if (!apiKey || !tenantId) {
  console.error("Missing HYDRADB_API_KEY or HYDRADB_TENANT_ID in .env.vars/process env.");
  process.exit(1);
}

const body = {
  tenant_id: tenantId,
  sub_tenant_id: subTenantId,
  kind: "knowledge",
  source_ids: [sourceId],
  page: 1,
  page_size: 50,
  include_fields: [
    "title",
    "type",
    "url",
    "timestamp",
    "description",
    "document_metadata",
    "tenant_metadata"
  ]
};

const response = await fetch("https://api.hydradb.com/list/data", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

const text = await response.text();
let json;

try {
  json = text ? JSON.parse(text) : {};
} catch {
  json = { raw: text };
}

console.log(
  JSON.stringify(
    {
      ok: response.ok,
      status: response.status,
      sourceId,
      tenantId,
      subTenantId: subTenantId || null,
      response: json
    },
    null,
    2
  )
);

function loadDotEnvVars() {
  const envPath = join(process.cwd(), ".env.vars");

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
