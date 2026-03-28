# ddash

Interactive diagrams that live in the URL. Write Mermaid syntax, get a rendered diagram, share the link.

**[ddash.zweibel-cocaine.com](https://ddash.zweibel-cocaine.com)**

No server, no accounts, no storage — the diagram source is compressed into the URL hash.

## Syntax

Uses **Mermaid-compatible syntax** for flowcharts and sequence diagrams.

```
flowchart LR
  User -->|login| Auth
  Auth --> DB[(DB)]
  DB -->|ok| Auth
  Auth -->|token| User
```

### Diagram types

- `flowchart` / `graph` — Flowcharts, architecture diagrams (default)
- `sequenceDiagram` — Sequence diagrams

### Node shapes

```
A[Label]              %% box (default)
A{Label}              %% diamond
A(Label)              %% rounded
A([Label])            %% stadium / pill
A[(Label)]            %% cylinder
A((Label))            %% circle
```

### Edges

```
A --> B               %% solid arrow
A -->|label| B        %% with label
A -- label --> B      %% label (alt syntax)
A -.-> B              %% dashed
A --x B               %% crossed
A <--> B              %% bidirectional
A --> B --> C         %% chain
```

### Subgraphs

```
subgraph Backend
  API --> DB[(Database)]
end
```

### Sequence diagrams

```
sequenceDiagram
  Client ->> API: request
  API -->> Client: response

  alt success
    API -->> Client: 200
  else error
    API -->> Client: 500
  end
```

## Interactivity

- **Drag nodes** — grab any node and reposition; edges follow
- **Click to highlight** — click a node to highlight it and connected edges
- **Hover tooltips** — see node ID and connections
- **Zoom / pan** — mouse wheel to zoom, drag empty space to pan
- **Reset** — double-click to reset view

## Agent integration

ddash serves a skill definition at `/skill.md` and a zero-dependency helper script at `/open.mjs`.

**Install as a Claude Code skill:**

```bash
mkdir -p ~/.claude/skills/ddash && \
curl -sf https://ddash.zweibel-cocaine.com/skill.md -o ~/.claude/skills/ddash/SKILL.md && \
curl -sf https://ddash.zweibel-cocaine.com/open.mjs -o ~/.claude/skills/ddash/open.mjs
```

**One-shot usage (no install):**

```bash
echo 'flowchart LR
  A -->|hello| B' > /tmp/ddash.txt

curl -sf https://ddash.zweibel-cocaine.com/open.mjs | node - /tmp/ddash.txt
```

## Development

```bash
bun install
bun run dev      # dev server at localhost:5173
bun run build    # production build → dist/
```

## Stack

- Vite + TypeScript + Bun
- [dagre](https://github.com/dagrejs/dagre) for graph layout
- [lz-string](https://github.com/pieroxy/lz-string) for URL compression
- Custom Mermaid-compatible parser (no mermaid dependency)
- Interactive SVG rendering with node dragging, highlighting, and tooltips
- Deployed to GitHub Pages
