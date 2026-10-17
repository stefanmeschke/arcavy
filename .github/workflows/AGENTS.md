# GitHub Actions workflows

The repo setting **Require actions to be pinned to a full-length commit SHA** is enabled. A workflow that references an action by tag or branch (`@v4`, `@main`) is rejected and fails at job setup, before any step runs.

- Pin every `uses:` to a full 40-character commit SHA, with the human-readable version as a trailing comment: `uses: actions/checkout@<sha> # v7.0.1`. This includes actions used inside other workflows.
- Look up a SHA with `gh api repos/<owner>/<repo>/git/ref/tags/<tag> --jq .object`. If the object type is `tag` (annotated tag), dereference it with `gh api repos/<owner>/<repo>/git/tags/<sha> --jq .object.sha` to get the commit SHA. Prefer an exact release tag (`v7.0.1`) over a moving major tag (`v7`).
- Never invent or copy a SHA from memory; always resolve it from the repo.
- Workflows call `mise run <task>` instead of embedding logic; see `/AGENTS.md`.
- Keep `permissions:` minimal (default `contents: read`).
