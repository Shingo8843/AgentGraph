export type TenantGraphNode = {
  id: string;
  label: string;
  type: string;
  url?: string;
  sourceId?: string;
};

export type TenantGraphEdge = {
  source: string;
  target: string;
  type: string;
  evidence?: string;
  sourceDocumentId?: string;
  confidence?: number;
};

export type TenantGraph = {
  nodes: TenantGraphNode[];
  edges: TenantGraphEdge[];
  meta: {
    tenantId: string;
    subTenantId?: string;
    sourceCount: number;
    relationSourceCount: number;
    maxSources: number;
  };
};
