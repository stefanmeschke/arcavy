# book-pile-loader

A looping loading animation: flat warm-toned books drop one by one onto a pile, hold for a moment, then slide off sideways, top first, without ever intersecting the books below. Rendered with three.js, driven by a pure `pose(i, t)` timeline so every frame is deterministic. Respects `prefers-reduced-motion` by showing the finished pile statically.

Part of [#1](https://github.com/stefanmeschke/arcavy/issues/1).

## Run

```sh
mise run dev:book-pile-loader
```

## Style

Flat illustration look in a warm palette (navy `#14213d`, orange `#fca311`, grey `#e5e5e5` plus an amber shade and a light orange tint): five chunky books (spine thickness around a third of the width for the bottom book, a quarter for the others; navy, orange, grey, amber, light orange, bottom to top) at slightly different angles. Each cover is one thin extruded "C" shell (top cover, rounded spine, bottom cover) framing a recessed white page block with a warm grey open side, with a smooth spine (no raised ridges) and two bookmarks (a long ribbon on the bottom book, a navy notched tab on the amber one). Lambert shading with a strong hemisphere light plus one directional light whose shadow map only casts soft shadows between the books and onto the white page. The ground shadow is analytic instead: each frame the books' oriented boxes are projected along the sun direction onto the ground, filled into a small canvas and blurred, giving a smooth soft shadow (plus a tighter contact shadow under the books) that follows the falling and toppling books.

## Stack

TypeScript, three.js, Vite, pnpm.

## Scope

This experiment is self-contained and never imported by other parts. Promote it by copying into a real part, not by linking.

## Debug controls

The dev server (`mise run dev:book-pile-loader`) shows a small panel at the bottom left to pause/play, scrub the timeline and change the speed. It is not part of production builds.
