# AgentGraph Architecture

## Product Thesis

AgentGraph gives coding agents shared organizational memory.

Coding agents already have repo context, user context, and static instruction files. They do not reliably have cross-user organizational context: historical decisions, implementation intent, architecture debates, unresolved questions, and team constraints.

AgentGraph turns organizational activity into a queryable memory graph, enriches that graph with explicit relationships, then compiles minimal task-specific context packs for coding agents.

For the hackathon build, OpenClaw is the initial source corpus and its data is already ingested into HydraDB. AgentGraph is the content and context layer over the OpenClaw repository: it resolves OpenClaw issues and PRs from HydraDB, enriches their relationships, and compiles agent-ready context.

## System Overview

```txt
OpenClaw data already ingested in HydraDB
                |
                v
 edge enrichment + context compiler
                |
                v
             .agent/
        AGENTS.md
        tasks/*.md
        decisions.md
        constraints.md
```

The `.agent/` directory is a compiled artifact. HydraDB is the actual memory layer.

For the hackathon, OpenClaw is the first datasource already loaded into HydraDB:

```txt
selected OpenClaw issue or PR
        |
        v
resolve source in HydraDB
        |
        v
retrieve context neighborhood
        |
        v
edge enrichment + context compiler
        |
        v
compiled .agent/ context
```

## Core Components

- HydraDB source resolution maps a selected OpenClaw issue or PR number to the stored source record.
- Context retrieval loads the selected source and its existing HydraDB neighborhood.
- Extraction uses stored source records to identify decisions, constraints, open questions, implementation intent, and missing relationships.
- HydraDB stores existing context and remains the durable memory graph.
- An automated edge validator constrains LLM-generated relationships before they are written to HydraDB.
- The context compiler generates minimal issue-specific `.agent` packs.
- The Next.js UI visualizes issues, PRs, discussions, decisions, and constraints in a 3D graph using `react-force-graph-3d`.

## OpenClaw Content Layer

OpenClaw should be used as the initial datasource and demo corpus already present in HydraDB:

- Resolve OpenClaw GitHub issues, PRs, comments, and repo docs from existing HydraDB records.
- Add Discord discussions later if that source is available and ingested.
- Extract the decisions, constraints, open questions, implementation intent, and missing relationships embedded in stored records.
- Present the extracted graph as a content layer over the OpenClaw repository.
- Compile issue-specific `.agent` context packs for work on OpenClaw tasks.

OpenClaw is not an architectural dependency or runtime layer for AgentGraph. It is the first repository whose organizational memory AgentGraph makes queryable and agent-readable.

## Memory Model

AgentGraph should preserve relationships between:

- issues
- pull requests
- Discord threads
- documentation changes
- decisions
- constraints
- open questions
- implementation plans

The graph should answer questions like:

- What decisions led to this implementation?
- Which PRs are related to this issue?
- What constraints should an agent know before editing this area?
- Which discussions explain the intent behind this code?

## Edge Extraction

AgentGraph should not rely on already-ingested issues and PRs passively connecting in HydraDB. It should enrich the graph through a two-stage pipeline that starts from stored records:

```txt
selected OpenClaw issue or PR
        |
        v
resolve source in HydraDB
        |
        v
retrieve existing context neighborhood
        |
        v
derive deterministic edges from stored records
        |
        v
candidate context retrieval
        |
        v
LLM proposes semantic edges
        |
        v
automated validator
        |
        v
write approved edges + evidence back to HydraDB
```

Deterministic extraction should create hard edges from stored source metadata and text:

- `PR #88 -- closes --> Issue #12`
- `Issue #12 -- mentions --> Issue #34`
- `PR #88 -- touches_file --> src/auth/session.ts`
- `Issue #12 -- has_label --> bug`

The LLM should create semantic edges autonomously, but only through a constrained schema:

- `Issue #12 -- same_root_cause_as --> Issue #34`
- `Issue #12 -- constrained_by --> Decision: keep local-first gateway`
- `PR #88 -- implements --> Decision: use pairing policy for unknown DMs`
- `Issue #12 -- blocked_by --> Issue #56`

Every LLM-created edge must include source, target, type, confidence, and evidence. The automated validator should reject or downgrade edges when source or target IDs do not exist, the edge type is outside the schema, evidence is missing, the evidence quote does not appear in the loaded source text, confidence is below threshold, the edge duplicates an existing edge, or the edge contradicts a stronger deterministic edge.

## Context Compilation

Context packs must be task-specific and minimal.

A compiled `.agent` pack may include:

- `AGENTS.md` for agent-facing instructions
- `tasks/issue-123.md` for issue-specific context
- `decisions.md` for relevant historical decisions
- `constraints.md` for active architectural or product constraints

The compiler should avoid dumping broad organizational memory into agent context. The output should include only the context needed for the selected issue, PR, or task.

## Demo Flow

1. User clicks a GitHub issue.
2. AgentGraph shows related OpenClaw PRs, Discord discussions, docs, decisions, constraints, and questions in a 3D graph.
3. User clicks `Compile Context`.
4. AgentGraph generates `.agent/tasks/issue-123.md` and related minimal context files for that OpenClaw task.
5. The generated context is used directly by Claude Code, Codex, Cursor, or another coding agent working on OpenClaw.

## Initial Tech Stack

- HydraDB: memory graph
- Pipeshift: extraction and summarization
- Render: deployment for frontend, backend, and workers
- Next.js: web application
- `react-force-graph-3d`: graph visualization

## Initial Dataset

- OpenClaw repository: first source corpus for issues, PRs, comments, docs, and related discussions
- HydraDB: source of already-ingested OpenClaw records and destination for approved enriched edges

## Product Principles

- HydraDB is both the existing context source and durable memory layer.
- OpenClaw is the first datasource, not the architecture.
- `.agent/` is generated output.
- V1 context runs do not require live GitHub retrieval.
- LLMs may create semantic edges autonomously, but only through schema and evidence validation.
- Context should be minimal, issue-specific, and agent-readable.
- The system should preserve implementation intent, not just summarize activity.
- The UI should make relationships inspectable before context is compiled.
