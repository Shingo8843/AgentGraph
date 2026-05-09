"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraph3DInstance } from "3d-force-graph";
import type { LinkObject, NodeObject } from "three-forcegraph";
import type { SpriteMaterial } from "three";

type TenantNode = {
  id: string;
  label: string;
  type: string;
  url?: string;
};

type TenantEdge = {
  source: string;
  target: string;
  type: string;
  evidence?: string;
  sourceDocumentId?: string;
  confidence?: number;
};

type GraphNode = NodeObject & TenantNode & { color: string };
type GraphLink = LinkObject<GraphNode> & TenantEdge;

type Tenant3DGraphProps = {
  nodes: TenantNode[];
  edges: TenantEdge[];
};

const TYPE_COLORS = new Map<string, string>([
  ["document", "#2563eb"],
  ["PROJECT", "#0f766e"],
  ["PRODUCT", "#7c3aed"],
  ["CONCEPT", "#b45309"],
  ["TECHNOLOGY", "#be123c"],
  ["PERSON", "#047857"],
  ["ORGANIZATION", "#4338ca"]
]);

export function Tenant3DGraph({ nodes, edges }: Tenant3DGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraph3DInstance<GraphNode, GraphLink> | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((node) => ({
        ...node,
        color: TYPE_COLORS.get(node.type) ?? "#475569"
      })),
      links: edges.map((edge) => ({ ...edge }))
    }),
    [edges, nodes]
  );

  useEffect(() => {
    let graph: ForceGraph3DInstance<GraphNode, GraphLink> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    async function mountGraph() {
      const element = containerRef.current;

      if (!element) {
        return;
      }

      const [{ default: ForceGraph3D }, { default: SpriteText }] = await Promise.all([
        import("3d-force-graph"),
        import("three-spritetext")
      ]);

      if (cancelled || !containerRef.current) {
        return;
      }

      const GraphConstructor = ForceGraph3D as unknown as {
        new (
          element: HTMLElement,
          options: { rendererConfig: { antialias: boolean; alpha: boolean; preserveDrawingBuffer: boolean } }
        ): ForceGraph3DInstance<GraphNode, GraphLink>;
      };

      graph = new GraphConstructor(element, {
        rendererConfig: { antialias: true, alpha: true, preserveDrawingBuffer: true }
      });
      graphRef.current = graph;

      graph
        .backgroundColor("#ffffff")
        .showNavInfo(false)
        .nodeAutoColorBy("type")
        .nodeLabel((node) => `${node.label} (${node.type})`)
        .linkLabel((link) => `${link.type}${link.evidence ? `: ${link.evidence}` : ""}`)
        .nodeThreeObject((node) => {
          const sprite = new SpriteText(compactLabel(node.label));
          (sprite.material as SpriteMaterial).depthWrite = false;
          sprite.color = node.color;
          sprite.textHeight = node.type === "document" ? 5.4 : 4.2;
          sprite.center.y = -0.62;
          return sprite;
        })
        .nodeThreeObjectExtend(true)
        .nodeRelSize(3.8)
        .linkOpacity(0.34)
        .linkWidth((link) => (link.type === "mentions" ? 0.25 : 0.85))
        .linkColor((link) => (link.type === "mentions" ? "rgba(148, 163, 184, 0.42)" : "#64748b"))
        .linkDirectionalParticles((link) => (link.type === "mentions" ? 0 : 1))
        .linkDirectionalParticleWidth(1.4)
        .onNodeClick((node) => {
          setSelectedNode(node);

          const distance = 90;
          const distRatio = 1 + distance / Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1);
          graph?.cameraPosition(
            {
              x: (node.x ?? 0) * distRatio,
              y: (node.y ?? 0) * distRatio,
              z: (node.z ?? 0) * distRatio
            },
            {
              x: node.x ?? 0,
              y: node.y ?? 0,
              z: node.z ?? 0
            },
            900
          );
        })
        .graphData(graphData);

      graph.d3Force("charge")?.strength(-110);
      resizeGraph();
      window.setTimeout(() => graph?.zoomToFit(700, 48), 350);

      resizeObserver = new ResizeObserver(resizeGraph);
      resizeObserver.observe(element);
    }

    function resizeGraph() {
      const element = containerRef.current;

      if (!graph || !element) {
        return;
      }

      graph.width(element.clientWidth);
      graph.height(element.clientHeight);
    }

    void mountGraph();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      graph?._destructor();
      graphRef.current = null;
    };
  }, [graphData]);

  return (
    <div className="graph-3d-shell">
      <div ref={containerRef} className="graph-3d-canvas" />
      <div className="graph-3d-legend">
        {Array.from(new Set(nodes.map((node) => node.type))).slice(0, 8).map((type) => (
          <span key={type}>
            <i style={{ background: TYPE_COLORS.get(type) ?? "#475569" }} />
            {type}
          </span>
        ))}
      </div>
      {selectedNode ? (
        <div className="graph-3d-selection">
          <strong>{selectedNode.label}</strong>
          <span>{selectedNode.type}</span>
          <code>{selectedNode.id}</code>
        </div>
      ) : null}
    </div>
  );
}

function compactLabel(label: string) {
  return label.length > 32 ? `${label.slice(0, 29)}...` : label;
}
