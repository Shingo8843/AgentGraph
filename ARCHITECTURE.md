# AgentGraph Architecture

## Product Thesis

AgentGraph gives coding agents shared organizational memory.

Coding agents already have repo context, user context, and static instruction files. They do not reliably have cross-user organizational context: historical decisions, implementation intent, architecture debates, unresolved questions, and team constraints.

AgentGraph turns organizational activity into a queryable memory graph, then compiles minimal task-specific context packs for coding agents.

For the hackathon build, AgentGraph should use OpenClaw as the agent runtime and workflow surface. OpenClaw should not replace the memory graph or context compiler; it should orchestrate ingestion, compilation, and demo actions around them.

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

For the hackathon, OpenClaw sits beside the compiler as the agent-facing control plane:

```txt
GitHub / Discord / docs
        |
        v
   OpenClaw workflows
        |
        v
extraction + memory graph + context compiler
        |
        v
      .agent/
```

## Core Components

- Event ingestion collects GitHub webhook events, Discord discussions, and documentation changes.
- Extraction uses Pipeshift to identify decisions, constraints, open questions, implementation intent, and relationships.
- HydraDB stores the memory graph as the source of truth.
- OpenClaw runs the hackathon workflow layer for agent actions, channel interaction, and demo orchestration.
- The context compiler generates minimal issue-specific `.agent` packs.
- The Next.js UI visualizes issues, PRs, discussions, decisions, and constraints in a 3D graph using `react-force-graph-3d`.

## Hackathon OpenClaw Role

OpenClaw should be used as the fastest path to a working agent-facing demo:

- Trigger workflows from GitHub issues, Discord discussions, and manual demo commands.
- Run extraction and summarization skills that produce candidate decisions, constraints, questions, and links.
- Invoke the context compiler for a selected issue or PR.
- Deliver the generated `.agent` pack back to the user through the demo flow.

OpenClaw should not own durable memory. AgentGraph should store durable organizational context in HydraDB so the graph can be queried, visualized, audited, and recompiled independent of any one agent runtime.

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
2. AgentGraph shows related PRs, Discord discussions, docs, decisions, constraints, and questions in a 3D graph.
3. User clicks `Compile Context`.
4. AgentGraph generates `.agent/tasks/issue-123.md` and related minimal context files.
5. The generated context is used directly by Claude Code, Codex, Cursor, or another coding agent.

## Initial Tech Stack

- OpenClaw: hackathon agent runtime, channel surface, and workflow orchestration
- HydraDB: memory graph
- Pipeshift: extraction and summarization
- Render: deployment for frontend, backend, and workers
- Next.js: web application
- `react-force-graph-3d`: graph visualization

## Product Principles

- HydraDB is the durable memory layer.
- OpenClaw is the demo and workflow runtime, not the source of truth.
- `.agent/` is generated output.
- Context should be minimal, issue-specific, and agent-readable.
- The system should preserve implementation intent, not just summarize activity.
- The UI should make relationships inspectable before context is compiled.
