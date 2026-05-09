import { parseGitHubUrl } from "./githubUrl.ts";
import { fetchGitHubItem } from "./githubFetch.ts";
import { buildHydraMemoryItem } from "./hydraMemory.ts";
import {
  addMemoryToHydra,
  getHydraDocumentId,
  verifyHydraProcessing
} from "./hydraClient.ts";
import { deriveDeterministicEdges } from "@/src/lib/context-runs/deterministicEdges.ts";
import type { SourceRecord } from "@/src/lib/context-runs/types.ts";
import { proposeSemanticEdgesWithPipeshift } from "./pipeshiftEdges.ts";

type LoadAndConnectOptions = {
  runId?: string;
};

export async function loadAndConnectUrl(rawUrl: string, options: LoadAndConnectOptions = {}) {
  const log = createRunLogger(options.runId);

  log("parse_url:start", { inputLength: rawUrl.length });
  const source = parseGitHubUrl(rawUrl);
  log("parse_url:complete", {
    repo: `${source.owner}/${source.repo}`,
    type: source.type,
    number: source.number
  });

  log("fetch_github:start");
  const githubItem = await fetchGitHubItem(source);
  log("fetch_github:complete", {
    title: githubItem.title,
    state: githubItem.state,
    labels: githubItem.labels.length
  });

  const memory = buildHydraMemoryItem(githubItem);
  log("write_hydradb:start", { memoryId: memory.id });
  const hydra = await addMemoryToHydra(memory);
  const hydraDocumentId = getHydraDocumentId(hydra);
  log("write_hydradb:complete", {
    documentId: hydraDocumentId,
    successCount: hydra.success_count,
    failedCount: hydra.failed_count
  });

  const hydraProcessing = hydraDocumentId ? await verifyHydraProcessing(hydraDocumentId) : null;
  log("verify_hydradb_processing:complete", {
    documentId: hydraDocumentId,
    status: hydraProcessing?.status,
    errorCode: hydraProcessing?.errorCode
  });

  const sourceRecord = githubItemToSourceRecord(githubItem, memory.id);
  log("deterministic_edges:start");
  const deterministicEdges = deriveDeterministicEdges([sourceRecord]);
  log("deterministic_edges:complete", { count: deterministicEdges.length });

  log("llm_edge_enrichment:start", { model: "moonshotai/Kimi-K2.6" });
  const semanticEdges = await proposeSemanticEdgesWithPipeshift({
    record: sourceRecord,
    deterministicEdges
  });
  log("llm_edge_enrichment:complete", { proposedCount: semanticEdges.length });

  return {
    source,
    memory: {
      id: memory.id,
      title: memory.title,
      documentId: hydraDocumentId
    },
    hydraProcessing,
    edges: {
      deterministic: deterministicEdges,
      proposed: semanticEdges
    },
    stages: [
      { name: "parse_url", status: "completed" },
      { name: "fetch_github", status: "completed" },
      { name: "write_hydradb", status: "completed" },
      {
        name: "verify_hydradb_processing",
        status: hydraProcessing?.status ?? "unknown",
        note:
          hydraProcessing?.status === "completed"
            ? "HydraDB reports the document is indexed."
            : "HydraDB accepted the memory, but it may still be queued, processing, or building graph relations."
      },
      {
        name: "llm_edge_enrichment",
        status: "completed",
        note: `Pipeshift proposed ${semanticEdges.length} semantic edge candidates. Next step: validate against retrieved HydraDB neighborhood and write approved edges.`
      }
    ],
    hydra
  };
}

function createRunLogger(runId?: string) {
  const prefix = runId ? `[load-and-connect:${runId}]` : "[load-and-connect]";

  return (stage: string, details?: Record<string, unknown>) => {
    console.log(prefix, stage, details ?? {});
  };
}

function githubItemToSourceRecord(
  githubItem: Awaited<ReturnType<typeof fetchGitHubItem>>,
  memoryId: string
): SourceRecord {
  return {
    id: memoryId,
    provider: "github",
    repo: `${githubItem.source.owner}/${githubItem.source.repo}`,
    type: githubItem.source.type,
    number: githubItem.source.number,
    title: githubItem.title,
    text: githubItem.body,
    labels: githubItem.labels
  };
}
