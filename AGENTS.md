# Arcavy

The quiet home for everything you own and love: books, vinyl, board games, and whatever comes next. Household-first collection manager, usable through a webapp, AI agents (MCP, CalDAV) and plugins.

Status: early. Nothing is scaffolded yet. Keep this file short and grow it only when something real needs to be written down.

## Principles

- Small, easy iterations. No tooling, folders, or dependencies before they are needed.
- Monorepo. Expected parts over time: Go server, webapp, Obsidian plugin, Home Assistant integration, native app. Create each only when its first issue starts.
- The server and shared core are written in **Go**.
- **Contracts are the shared layer** between parts, not shared code. Use whatever fits: OpenAPI, JSON Schema, or a plain Markdown spec for things that aren't machine-checkable (e.g. CalDAV title grammar). Don't import code across parts.

## Tooling

- Tool versions are managed with [mise](https://github.com/jdx/mise) in `mise.toml` (Go and Node). Run `mise install` after cloning. Add a tool only when a part needs it; pin experiment-specific tools in the experiment's own `mise.toml`.

## Layout

- `experiments/<name>/`: throwaway, self-contained experiments (currently webapp animations). Each has its own deps and README, chooses its own stack, and is never imported by other parts. Promote by copying into a real part, not by linking.

## Work items

- Work is tracked in GitHub Issues (`stefanmeschke/arcavy`, private).
- Work on an issue goes on a branch and lands via PR using Conventional Commits. Follow `.github/pull_request_template.md`.
- Never commit, push, or open PRs unless explicitly asked. Leave changes uncommitted by default.
- PRs are always opened as drafts (`gh pr create --draft`).
- Prefer stacked PRs ([`gh stack`](https://github.com/github/gh-stack), a `gh` extension) for larger changes: several small PRs that build on each other, each reviewable on its own, instead of one big PR. Use `gh stack submit --auto` (creates drafts; never pass `--open`), since the interactive editor defaults to ready-for-review. Small changes can stay a single PR.
- Stacked PRs still follow the PR template and the draft/why rules; each PR in a stack explains why its own layer exists.
- PR descriptions focus on the **why**: the motivation, problem, or decision behind the change. The diff already shows the what; only mention it briefly where it helps review.
- Experiments don't close issues. An issue can relate to several experiments and vice versa; link them by number in the experiment README or the PR.

## Working with agents

- Ask clarifying questions one at a time (see `~/AGENTS.md`).
- Prefer the simplest thing that works. If a change adds a dependency, a new top-level folder, or a new convention, say so and confirm first.
