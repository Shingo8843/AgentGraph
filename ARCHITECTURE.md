# AgentGraph Architecture

## Product Thesis

AgentGraph gives coding agents shared organizational memory.

Coding agents already have repo context, user context, and static instruction files. They do not reliably have cross-user organizational context: historical decisions, implementation intent, architecture debates, unresolved questions, and team constraints.

AgentGraph turns organizational activity into a queryable memory graph, then compiles minimal task-specific context packs for coding agents.

For the hackathon build, OpenClaw is the initial source corpus. AgentGraph is the content and context layer over the OpenClaw repository: it reads OpenClaw issues, PRs, discussions, and docs, then turns that activity into structured memory and compiled agent context.

## System Overview

```txt
GitHub issues + PRs + Discord threads + docs
                |
                v
        context compiler
                |
                v
             .agent/
        AGENTS.md
        tasks/*.md
        decisions.md
        constraints.md
```

The `.agent/` directory is a compiled artifact. HydraDB is the actual memory layer.

For the hackathon, OpenClaw is the datasource:

```txt
OpenClaw repo activity
GitHub issues + PRs + Discord threads + docs
        |
        v
extraction + memory graph
        |
        v
content layer + context compiler
        |
        v
compiled .agent/ context
```

## Core Components

- Event ingestion collects GitHub webhook events, Discord discussions, and documentation changes.
- Extraction uses Pipeshift to identify decisions, constraints, open questions, implementation intent, and relationships.
- HydraDB stores the memory graph as the source of truth.
- The context compiler generates minimal issue-specific `.agent` packs.
- The Next.js UI visualizes issues, PRs, discussions, decisions, and constraints in a 3D graph using `react-force-graph-3d`.

## OpenClaw Content Layer

OpenClaw should be used as the initial datasource and demo corpus:

- Ingest OpenClaw GitHub issues, PRs, comments, and repo docs.
- Add Discord discussions if the source is available during the hackathon.
- Extract the decisions, constraints, open questions, implementation intent, and relationships embedded in that activity.
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

## Product Principles

- HydraDB is the durable memory layer.
- OpenClaw is the first datasource, not the architecture.
- `.agent/` is generated output.
- Context should be minimal, issue-specific, and agent-readable.
- The system should preserve implementation intent, not just summarize activity.
- The UI should make relationships inspectable before context is compiled.
