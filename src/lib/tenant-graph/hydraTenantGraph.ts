import type { TenantGraph, TenantGraphEdge, TenantGraphNode } from "./types.ts";

const HYDRA_API_BASE = "https://api.hydradb.com";
const DEFAULT_MAX_SOURCES = 50;

type HydraSource = {
  id?: string;
  source_id?: string;
  title?: string;
  type?: string;
  url?: string;
};

type HydraEntity = {
  name?: string;
  type?: string;
  namespace?: string;
  entity_id?: string;
  identifier?: string;
};

type HydraRelationFact = {
  canonical_predicate?: string;
  raw_predicate?: string;
  context?: string;
  confidence?: number;
  relationship_id?: string;
  chunk_id?: string;
};

type HydraRelationGroup = {
  source?: HydraEntity | string;
  target?: HydraEntity | string;
  relations?: HydraRelationFact[];
  chunk_id?: string;
};

export async function loadTenantGraph(maxSources = DEFAULT_MAX_SOURCES): Promise<TenantGraph> {
  const apiKey = process.env.HYDRADB_API_KEY;
  const tenantId = process.env.HYDRADB_TENANT_ID;
  const subTenantId = process.env.HYDRADB_SUB_TENANT_ID || undefined;

  if (!apiKey || !tenantId) {
    throw new Error("Set HYDRADB_API_KEY and HYDRADB_TENANT_ID before loading the tenant graph.");
  }

  const sources = await listHydraSources({ apiKey, tenantId, subTenantId, maxSources });
  const nodes = new Map<string, TenantGraphNode>();
  const edges = new Map<string, TenantGraphEdge>();
  let relationSourceCount = 0;

  for (const source of sources) {
    const sourceId = sourceIdOf(source);

    if (!sourceId) {
      continue;
    }

    nodes.set(sourceId, {
      id: sourceId,
      label: source.title ?? sourceId,
      type: source.type ?? "source",
      url: source.url
    });

    const relations = await listHydraRelations({ apiKey, tenantId, subTenantId, sourceId });

    if (relations.length > 0) {
      relationSourceCount += 1;
    }

    for (const relation of relations) {
      const graph = relationGroupToGraph(relation, sourceId);

      for (const node of graph.nodes) {
        if (!nodes.has(node.id)) {
          nodes.set(node.id, node);
        }
      }

      for (const edge of graph.edges) {
        edges.set(edgeKey(edge), edge);
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    meta: {
      tenantId,
      subTenantId,
      sourceCount: sources.length,
      relationSourceCount,
      maxSources
    }
  };
}

async function listHydraSources({
  apiKey,
  tenantId,
  subTenantId,
  maxSources
}: {
  apiKey: string;
  tenantId: string;
  subTenantId?: string;
  maxSources: number;
}) {
  const response = await fetch(`${HYDRA_API_BASE}/list/data`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      sub_tenant_id: subTenantId,
      kind: "knowledge",
      page: 1,
      page_size: maxSources,
      include_fields: ["title", "type", "url", "timestamp", "document_metadata", "tenant_metadata"]
    }),
    cache: "no-store"
  });

  const json = await parseHydraJson(response);

  if (!response.ok) {
    throw new Error(hydraErrorMessage(json, `HydraDB list/data returned ${response.status}`));
  }

  if (!isRecord(json) || !Array.isArray(json.sources)) {
    return [];
  }

  return json.sources as HydraSource[];
}

async function listHydraRelations({
  apiKey,
  tenantId,
  subTenantId,
  sourceId
}: {
  apiKey: string;
  tenantId: string;
  subTenantId?: string;
  sourceId: string;
}) {
  const url = new URL(`${HYDRA_API_BASE}/list/graph_relations_by_id`);
  url.searchParams.set("source_id", sourceId);
  url.searchParams.set("tenant_id", tenantId);
  url.searchParams.set("limit", "500");

  if (subTenantId) {
    url.searchParams.set("sub_tenant_id", subTenantId);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    cache: "no-store"
  });

  const json = await parseHydraJson(response);

  if (!response.ok) {
    console.warn("[tenant-graph] relation fetch failed", {
      sourceId,
      status: response.status,
      message: hydraErrorMessage(json, response.statusText)
    });
    return [];
  }

  if (!isRecord(json) || !Array.isArray(json.relations)) {
    return [];
  }

  return json.relations as HydraRelationGroup[];
}

export function relationGroupToGraph(
  relation: HydraRelationGroup,
  sourceDocumentId: string
): { nodes: TenantGraphNode[]; edges: TenantGraphEdge[] } {
  const sourceNode = entityToNode(relation.source);
  const targetNode = entityToNode(relation.target);

  if (!sourceNode || !targetNode) {
    return { nodes: [], edges: [] };
  }

  const facts = Array.isArray(relation.relations) && relation.relations.length > 0 ? relation.relations : [{}];
  const edges = facts.map((fact) => ({
    source: sourceNode.id,
    target: targetNode.id,
    type: normalizePredicate(fact.canonical_predicate ?? fact.raw_predicate ?? "RELATED_TO"),
    evidence: fact.context,
    confidence: typeof fact.confidence === "number" ? fact.confidence : undefined,
    sourceDocumentId
  }));

  return {
    nodes: [sourceNode, targetNode],
    edges: [
      ...edges,
      {
        source: sourceDocumentId,
        target: sourceNode.id,
        type: "mentions",
        sourceDocumentId
      },
      {
        source: sourceDocumentId,
        target: targetNode.id,
        type: "mentions",
        sourceDocumentId
      }
    ]
  };
}

function sourceIdOf(source: HydraSource) {
  return source.id ?? source.source_id ?? null;
}

function entityToNode(entity: HydraEntity | string | undefined): TenantGraphNode | null {
  if (typeof entity === "string") {
    return {
      id: entity,
      label: entity.replace(/[_:-]/g, " "),
      type: "entity"
    };
  }

  if (!entity) {
    return null;
  }

  const identity =
    entity.entity_id ??
    scopedEntityId(entity.namespace, entity.identifier) ??
    scopedEntityId(entity.namespace, entity.name) ??
    entity.identifier ??
    entity.name;

  if (!identity) {
    return null;
  }

  return {
    id: identity,
    label: entity.name ?? entity.identifier ?? identity,
    type: entity.type ?? entity.namespace ?? "entity",
    sourceId: entity.entity_id
  };
}

function edgeKey(edge: TenantGraphEdge) {
  return `${edge.source}\u0000${edge.type}\u0000${edge.target}\u0000${edge.sourceDocumentId ?? ""}`;
}

function scopedEntityId(namespace?: string, value?: string) {
  if (!namespace || !value) {
    return null;
  }

  return `${namespace}:${value}`;
}

function normalizePredicate(predicate: string) {
  return predicate.trim().toLowerCase();
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
