import type { GraphEdge, SourceRecord } from "@/src/lib/context-runs/types.ts";

const DEFAULT_PIPESHIFT_CHAT_COMPLETIONS_URL =
  "https://api.pipeshift.com/api/v0/chat/completions";
const DEFAULT_PIPESHIFT_MODEL = "moonshotai/Kimi-K2.6";

type PipeshiftChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type EdgeProposalInput = {
  record: SourceRecord;
  deterministicEdges: GraphEdge[];
};

export async function proposeSemanticEdgesWithPipeshift({
  record,
  deterministicEdges
}: EdgeProposalInput): Promise<GraphEdge[]> {
  const apiKey = process.env.PIPESHIFT_API_KEY;

  if (!apiKey) {
    throw new Error("Set PIPESHIFT_API_KEY before running LLM edge enrichment.");
  }

  const endpoint = process.env.PIPESHIFT_CHAT_COMPLETIONS_URL ?? DEFAULT_PIPESHIFT_CHAT_COMPLETIONS_URL;
  const model = process.env.PIPESHIFT_MODEL ?? DEFAULT_PIPESHIFT_MODEL;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You extract engineering graph edges from GitHub issue and PR records. " +
            "Return only JSON with an edges array. Do not include markdown or explanation."
        },
        {
          role: "user",
          content: buildEdgePrompt(record, deterministicEdges)
        }
      ],
      temperature: 0.2,
      stream: false
    }),
    cache: "no-store"
  });

  const json = (await parseJsonResponse(response)) as PipeshiftChatCompletion & {
    error?: string | { message?: string };
    message?: string;
    detail?: string | { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      [
        `Pipeshift returned ${response.status}`,
        `endpoint=${endpoint}`,
        `model=${model}`,
        `message=${pipeshiftErrorMessage(json, response.statusText)}`
      ].join(" ")
    );
  }

  return parsePipeshiftEdges(json);
}

async function parseJsonResponse(response: Response): Promise<unknown> {
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

function pipeshiftErrorMessage(
  json: {
    error?: string | { message?: string };
    message?: string;
    detail?: string | { message?: string };
  },
  statusText: string
) {
  if (typeof json.error === "string") {
    return json.error;
  }

  if (json.error?.message) {
    return json.error.message;
  }

  if (typeof json.detail === "string") {
    return json.detail;
  }

  if (json.detail?.message) {
    return json.detail.message;
  }

  return json.message ?? statusText;
}

export function parsePipeshiftEdges(response: unknown): GraphEdge[] {
  if (!isRecord(response)) {
    return [];
  }

  const choices = response.choices;

  if (!Array.isArray(choices)) {
    return [];
  }

  const content = choices
    .map((choice) => (isRecord(choice) && isRecord(choice.message) ? choice.message.content : null))
    .find((value): value is string => typeof value === "string");

  if (!content) {
    return [];
  }

  const parsed = JSON.parse(stripJsonFence(content)) as unknown;

  if (!isRecord(parsed) || !Array.isArray(parsed.edges)) {
    return [];
  }

  return parsed.edges.flatMap((edge) => normalizeEdge(edge));
}

function buildEdgePrompt(record: SourceRecord, deterministicEdges: GraphEdge[]) {
  return JSON.stringify(
    {
      task:
        "Propose semantic edges for this GitHub source record. Use exact evidence quotes from text. " +
        "Only use edge types: same_root_cause_as, blocked_by, duplicates, constrained_by, implements, explained_by, supersedes, related_to. " +
        "Targets may be referenced GitHub issue or PR IDs when present in the text. Return {\"edges\": [...]}.",
      source_record: record,
      deterministic_edges: deterministicEdges,
      output_schema: {
        edges: [
          {
            source: record.id,
            target: "string",
            type: "same_root_cause_as | blocked_by | duplicates | constrained_by | implements | explained_by | supersedes | related_to",
            confidence: "number between 0 and 1",
            evidence: {
              sourceRecordId: record.id,
              quote: "exact substring from source_record.text"
            }
          }
        ]
      }
    },
    null,
    2
  );
}

function normalizeEdge(edge: unknown): GraphEdge[] {
  if (!isRecord(edge) || !isRecord(edge.evidence)) {
    return [];
  }

  if (
    typeof edge.source !== "string" ||
    typeof edge.target !== "string" ||
    typeof edge.type !== "string" ||
    typeof edge.confidence !== "number" ||
    typeof edge.evidence.sourceRecordId !== "string" ||
    typeof edge.evidence.quote !== "string"
  ) {
    return [];
  }

  return [
    {
      source: edge.source,
      target: edge.target,
      type: edge.type,
      confidence: edge.confidence,
      deterministic: false,
      evidence: {
        sourceRecordId: edge.evidence.sourceRecordId,
        quote: edge.evidence.quote
      }
    }
  ];
}

function stripJsonFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
