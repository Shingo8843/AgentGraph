"use client";

import { FormEvent, useState } from "react";

type LoadResponse =
  | {
      data: {
        source: {
          owner: string;
          repo: string;
          type: "issue" | "pr";
          number: number;
          url: string;
        };
        memory: {
          id: string;
          title: string;
        };
        stages: Array<{
          name: string;
          status: string;
          note?: string;
        }>;
      };
    }
  | {
      error: {
        message: string;
      };
    };

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoadResponse | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/load-and-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });
      const json = (await response.json()) as LoadResponse;
      setResult(json);
    } catch (error) {
      setResult({
        error: {
          message: error instanceof Error ? error.message : "Request failed"
        }
      });
    } finally {
      setLoading(false);
    }
  }

  const succeeded = result && "data" in result;
  const failed = result && "error" in result;

  return (
    <main className="shell">
      <section className="panel">
        <div>
          <h1>AgentGraph</h1>
          <p>
            Paste an OpenClaw GitHub issue or pull request URL. AgentGraph loads it into
            HydraDB, then marks LLM edge enrichment as the next backend stage.
          </p>
        </div>

        <form onSubmit={onSubmit} className="form">
          <input
            aria-label="GitHub issue or pull request URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://github.com/openclaw/openclaw/issues/1234"
          />
          <button type="submit" disabled={loading || !url.trim()}>
            {loading ? "Loading..." : "Load and Connect"}
          </button>
        </form>

        {succeeded ? (
          <div className="result success">
            <h2>{result.data.memory.title}</h2>
            <p className="mono">{result.data.memory.id}</p>
            <ol>
              {result.data.stages.map((stage) => (
                <li key={stage.name}>
                  <span>{stage.name}</span>
                  <strong>{stage.status}</strong>
                  {stage.note ? <p>{stage.note}</p> : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {failed ? (
          <div className="result error">
            <h2>Load failed</h2>
            <p>{result.error.message}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
