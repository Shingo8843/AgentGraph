import { NextResponse } from "next/server";
import { loadDotEnvVars } from "@/src/lib/env/loadDotEnvVars";
import { loadAndConnectUrl } from "@/src/lib/load-url/loadAndConnect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  loadDotEnvVars();

  try {
    const body = (await request.json()) as { url?: unknown };

    if (typeof body.url !== "string") {
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

    const data = await loadAndConnectUrl(body.url);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load URL";

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
