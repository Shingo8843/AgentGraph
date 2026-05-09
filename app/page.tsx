"use client";

import { useEffect, useState } from "react";
import { Tenant3DGraph } from "./Tenant3DGraph";

type TenantGraphResponse =
  | {
      data: {
        nodes: Array<{
          id: string;
          label: string;
          type: string;
          url?: string;
          sourceId?: string;
        }>;
        edges: Array<{
          source: string;
          target: string;
          type: string;
          evidence?: string;
          sourceDocumentId?: string;
          confidence?: number;
        }>;
        meta: {
          tenantId: string;
          subTenantId?: string;
          sourceCount: number;
          relationSourceCount: number;
          maxSources: number;
        };
      };
    }
  | {
      error: {
        message: string;
      };
    };

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [tenantGraph, setTenantGraph] = useState<TenantGraphResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      setLoading(true);

      try {
        const response = await fetch("/api/tenant-graph?maxSources=10", {
          cache: "no-store"
        });
        const json = (await response.json()) as TenantGraphResponse;

        if (!cancelled) {
          setTenantGraph(json);
        }
      } catch (error) {
        if (!cancelled) {
          setTenantGraph({
            error: {
              message: error instanceof Error ? error.message : "Graph request failed"
            }
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGraph();

    return () => {
      cancelled = true;
    };
  }, []);

  const graphSucceeded = tenantGraph && "data" in tenantGraph;
  const graphFailed = tenantGraph && "error" in tenantGraph;

  return (
    <main className="graph-page">
      <header className="graph-header">
        <div>
          <h1>AgentGraph</h1>
          <p>OpenClaw tenant memory graph from HydraDB.</p>
        </div>

        {graphSucceeded ? (
          <div className="edge-summary">
            <span>Sources: {tenantGraph.data.meta.sourceCount}</span>
            <span>Nodes: {tenantGraph.data.nodes.length}</span>
            <span>Edges: {tenantGraph.data.edges.length}</span>
            <span>Relation sources: {tenantGraph.data.meta.relationSourceCount}</span>
          </div>
        ) : null}
      </header>

      <section className="graph-stage" aria-busy={loading}>
        {loading ? <div className="graph-state">Loading HydraDB graph...</div> : null}

        {graphSucceeded ? (
          <Tenant3DGraph nodes={tenantGraph.data.nodes} edges={tenantGraph.data.edges} />
        ) : null}

        {graphFailed ? (
          <div className="result error">
            <h2>Graph load failed</h2>
            <p>{tenantGraph.error.message}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
