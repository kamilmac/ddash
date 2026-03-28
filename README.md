# ddash

Diagrams that live in the URL. Write text, get a rendered diagram, share the link.

**[ddash.zweibel-cocaine.com](https://ddash.zweibel-cocaine.com)**

No server, no accounts, no storage — the diagram source is compressed into the URL hash.

## Syntax

```
@flow LR

User -> Auth: login
Auth -> |DB|: verify
DB -> Auth: ok
Auth -> User: token
```

### Diagram types

- `@flow` — Flowcharts, architecture diagrams (default)
- `@seq` — Sequence diagrams

### Node shapes

```
Service               # box (default)
<Decision>            # diamond
(Status)              # rounded
|Database|            # cylinder
```

### Edges

```
A -> B: label         # directed with label
A <-> B               # bidirectional
A --> B               # dashed
A -x B                # crossed
A -> B -> C           # chain
```

### Groups

```
Backend {
  API -> |DB|: query
}
```

### Sequence blocks

```
@seq

alt success {
  API -> User: 200
} else {
  API -> User: 401
}
```

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
echo '@flow LR
A -> B: hello' > /tmp/ddash.txt

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
- Single-file production build (~124 KB)
- Deployed to GitHub Pages
