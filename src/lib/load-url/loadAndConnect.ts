import { parseGitHubUrl } from "./githubUrl.ts";
import { fetchGitHubItem } from "./githubFetch.ts";
import { buildHydraMemoryItem } from "./hydraMemory.ts";
import { addMemoryToHydra } from "./hydraClient.ts";

export async function loadAndConnectUrl(rawUrl: string) {
  const source = parseGitHubUrl(rawUrl);
  const githubItem = await fetchGitHubItem(source);
  const memory = buildHydraMemoryItem(githubItem);
  const hydra = await addMemoryToHydra(memory);

  return {
    source,
    memory: {
      id: memory.id,
      title: memory.title
    },
    stages: [
      { name: "parse_url", status: "completed" },
      { name: "fetch_github", status: "completed" },
      { name: "write_hydradb", status: "completed" },
      {
        name: "llm_edge_enrichment",
        status: "pending",
        note: "Next step: retrieve HydraDB neighborhood, use LLM to propose edges, validate evidence, and write approved edges."
      }
    ],
    hydra
  };
}
