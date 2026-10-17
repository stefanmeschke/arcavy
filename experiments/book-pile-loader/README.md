# book-pile-loader

A looping loading animation: low-poly books drop one by one onto a pile, hold for a moment, then topple off the top first. Rendered with three.js, driven by a pure `pose(i, t)` timeline so every frame is deterministic. Respects `prefers-reduced-motion` by showing the finished pile statically.

Part of [#1](https://github.com/stefanmeschke/arcavy/issues/1).

## Run

```sh
mise run dev:book-pile-loader
```

## Stack

TypeScript, three.js, Vite, pnpm.

## Scope

This experiment is self-contained and never imported by other parts. Promote it by copying into a real part, not by linking.
