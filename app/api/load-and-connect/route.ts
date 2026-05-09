import { NextResponse } from "next/server";
import { loadDotEnvVars } from "@/src/lib/env/loadDotEnvVars";
import { loadAndConnectUrl } from "@/src/lib/load-url/loadAndConnect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const runId = crypto.randomUUID();

  loadDotEnvVars();
  console.log(`[load-and-connect:${runId}] request:start`);

  try {
    const body = (await request.json()) as { url?: unknown };

    if (typeof body.url !== "string") {
      console.warn(`[load-and-connect:${runId}] request:validation_failed`, {
        reason: "url must be a string"
      });

      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "url must be a string"
          }
        },
        { status: 400 }
      );
    }

    const data = await loadAndConnectUrl(body.url, { runId });
    console.log(`[load-and-connect:${runId}] request:complete`, {
      documentId: data.memory.documentId,
      deterministicEdges: data.edges.deterministic.length,
      proposedEdges: data.edges.proposed.length
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load URL";
    console.error(`[load-and-connect:${runId}] request:failed`, { message });

    return NextResponse.json(
      {
        error: {
          code: "load_failed",
          message
        }
      },
      { status: 422 }
    );
  }
}
