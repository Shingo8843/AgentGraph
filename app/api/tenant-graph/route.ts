import { NextResponse } from "next/server";
import { loadDotEnvVars } from "@/src/lib/env/loadDotEnvVars";
import { loadTenantGraph } from "@/src/lib/tenant-graph/hydraTenantGraph";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  loadDotEnvVars();

  try {
    const url = new URL(request.url);
    const maxSources = Number(url.searchParams.get("maxSources") ?? "50");
    const graph = await loadTenantGraph(
      Number.isInteger(maxSources) && maxSources > 0 ? Math.min(maxSources, 200) : 50
    );

    return NextResponse.json({ data: graph });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load tenant graph";

    return NextResponse.json(
      {
        error: {
          code: "tenant_graph_failed",
          message
        }
      },
      { status: 422 }
    );
  }
}
