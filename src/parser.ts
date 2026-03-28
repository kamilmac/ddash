// Mermaid-compatible parser for ddash.
// Supports: flowchart (TB/LR/RL/BT), sequenceDiagram
// Emits the same Diagram/Statement types consumed by layout.ts and seq-layout.ts.

export type DiagramType = 'flow' | 'seq' | 'state'
export type Direction = 'TB' | 'LR' | 'RL' | 'BT'
export type NodeShape = 'box' | 'diamond' | 'rounded' | 'cylinder' | 'circle'
export type EdgeKind = 'solid' | 'dashed' | 'crossed'

export interface NodeRef {
  id: string
  label: string
  shape?: NodeShape
}

export interface EdgeStmt {
  kind: 'edge'
  from: NodeRef
  to: NodeRef
  label?: string
  edgeKind: EdgeKind
  bidi: boolean
}

export interface NodeStmt {
  kind: 'node'
  ref: NodeRef
}

export interface GroupStartStmt {
  kind: 'group_start'
  id: string
  label: string
}

export interface GroupEndStmt {
  kind: 'group_end'
}

export interface DividerStmt {
  kind: 'divider'
  label?: string
}

export type BlockType = 'alt' | 'opt' | 'loop' | 'par'

export interface BlockStartStmt {
  kind: 'block_start'
  blockType: BlockType
  label: string
}

export interface BlockElseStmt {
  kind: 'block_else'
  label?: string
}

export interface ParseError {
  kind: 'error'
  line: number
  message: string
}

export type Statement = EdgeStmt | NodeStmt | GroupStartStmt | GroupEndStmt | DividerStmt | BlockStartStmt | BlockElseStmt | ParseError

export interface Diagram {
  type: DiagramType
  direction: Direction
  statements: Statement[]
  errors: ParseError[]
}

// ---- Node shape parsing ----
// Mermaid shapes:
//   A[text]    → box
//   A(text)    → rounded
//   A([text])  → rounded (stadium)
//   A{text}    → diamond
//   A{{text}}  → diamond (hexagon approx)
//   A[(text)]  → cylinder
//   A((text))  → circle
//   A>text]    → box (asymmetric, fallback)

const nodeRegistry = new Map<string, NodeRef>()

function resetNodeRegistry() {
  nodeRegistry.clear()
}

function parseNodeDecl(raw: string): NodeRef {
  raw = raw.trim()
  if (!raw) return { id: '', label: '', shape: 'box' }

  // Match: ID + optional shape brackets
  // e.g. "A[Label]", "myNode(Round Label)", "DB[(Database)]", "X((Circle))", "D{Decision}"

  // Circle: ID((label))
  let m = raw.match(/^([a-zA-Z_][\w.-]*)(\(\((.+?)\)\))$/)
  if (m) return registerNode(m[1], m[3], 'circle')

  // Cylinder: ID[(label)]
  m = raw.match(/^([a-zA-Z_][\w.-]*)(\[\((.+?)\)\])$/)
  if (m) return registerNode(m[1], m[3], 'cylinder')

  // Stadium/pill: ID([label])
  m = raw.match(/^([a-zA-Z_][\w.-]*)(\(\[(.+?)\]\))$/)
  if (m) return registerNode(m[1], m[3], 'rounded')

  // Hexagon (approx diamond): ID{{label}}
  m = raw.match(/^([a-zA-Z_][\w.-]*)\{\{(.+?)\}\}$/)
  if (m) return registerNode(m[1], m[2], 'diamond')

  // Diamond: ID{label}
  m = raw.match(/^([a-zA-Z_][\w.-]*)\{(.+?)\}$/)
  if (m) return registerNode(m[1], m[2], 'diamond')

  // Rounded: ID(label)
  m = raw.match(/^([a-zA-Z_][\w.-]*)\((.+?)\)$/)
  if (m) return registerNode(m[1], m[2], 'rounded')

  // Box: ID[label]
  m = raw.match(/^([a-zA-Z_][\w.-]*)\[(.+?)\]$/)
  if (m) return registerNode(m[1], m[2], 'box')

  // Asymmetric fallback: ID>label]
  m = raw.match(/^([a-zA-Z_][\w.-]*)>(.+?)\]$/)
  if (m) return registerNode(m[1], m[2], 'box')

  // Bare ID (no shape brackets) — use existing registration or default to box
  m = raw.match(/^([a-zA-Z_][\w.-]*)$/)
  if (m) {
    const existing = nodeRegistry.get(m[1])
    if (existing) return existing
    return registerNode(m[1], m[1], 'box')
  }

  // Quoted bare ID with spaces — shouldn't happen in Mermaid but handle gracefully
  return registerNode(raw, raw, 'box')
}

function registerNode(id: string, label: string, shape: NodeShape): NodeRef {
  const existing = nodeRegistry.get(id)
  if (existing) {
    // First declaration wins for shape/label, but bare refs shouldn't override
    return existing
  }
  const ref: NodeRef = { id, label, shape }
  nodeRegistry.set(id, ref)
  return ref
}

// ---- Edge parsing ----
// Mermaid edge patterns (between node declarations on a single line):
//   -->       solid arrow
//   ---       solid no arrow (we treat as solid arrow for consistency)
//   -.->      dashed arrow
//   -.-       dashed no arrow
//   ==>       thick arrow (map to solid)
//   ===       thick no arrow (map to solid)
//   --x       crossed
//   -->|label| edge with label
//   -- label --> edge with label (inline)
//   -. label .-> dashed with label
//   <-->      bidirectional

interface EdgeToken {
  edgeKind: EdgeKind
  bidi: boolean
  label?: string
}

// Split a line into alternating [node, edge, node, edge, node, ...] segments
function splitFlowLine(line: string): { segments: string[]; edges: EdgeToken[] } | null {
  const segments: string[] = []
  const edges: EdgeToken[] = []

  let rest = line.trim()
  if (!rest) return null

  while (rest.length > 0) {
    // Try to consume a node segment (everything up to an edge token)
    const edgeMatch = findNextEdge(rest)

    if (!edgeMatch) {
      // No more edges — rest is the final node
      segments.push(rest.trim())
      break
    }

    segments.push(rest.substring(0, edgeMatch.start).trim())
    edges.push(edgeMatch.token)
    rest = rest.substring(edgeMatch.end).trim()
  }

  if (segments.length < 2 || edges.length === 0) return null
  return { segments, edges }
}

interface EdgeMatch {
  start: number
  end: number
  token: EdgeToken
}

function findNextEdge(text: string): EdgeMatch | null {
  // Order matters — longer patterns first to avoid partial matches

  const patterns: Array<{ re: RegExp; kind: EdgeKind; bidi: boolean; labelGroup?: number }> = [
    // Bidirectional
    { re: /\s*<-->\s*/, kind: 'solid', bidi: true },
    { re: /\s*<-\.->/, kind: 'dashed', bidi: true },
    { re: /\s*<==>\s*/, kind: 'solid', bidi: true },

    // With pipe-delimited label: -->|label|
    { re: /\s*-->\|([^|]*)\|\s*/, kind: 'solid', bidi: false, labelGroup: 1 },
    { re: /\s*-\.->\|([^|]*)\|\s*/, kind: 'dashed', bidi: false, labelGroup: 1 },
    { re: /\s*==>\|([^|]*)\|\s*/, kind: 'solid', bidi: false, labelGroup: 1 },

    // Inline label: -- label -->
    { re: /\s*--\s+([^-][^>]*?)\s*-->\s*/, kind: 'solid', bidi: false, labelGroup: 1 },
    { re: /\s*-\.\s+([^.][^>]*?)\s*\.->\s*/, kind: 'dashed', bidi: false, labelGroup: 1 },
    { re: /\s*==\s+([^=][^>]*?)\s*==>\s*/, kind: 'solid', bidi: false, labelGroup: 1 },

    // Crossed
    { re: /\s*--x\s*/, kind: 'crossed', bidi: false },
    { re: /\s*x--x\s*/, kind: 'crossed', bidi: true },

    // Simple edges (no label)
    { re: /\s*-\.->/, kind: 'dashed', bidi: false },
    { re: /\s*-\.-\s*/, kind: 'dashed', bidi: false },
    { re: /\s*==>\s*/, kind: 'solid', bidi: false },
    { re: /\s*===\s*/, kind: 'solid', bidi: false },
    { re: /\s*-->\s*/, kind: 'solid', bidi: false },
    { re: /\s*---\s*/, kind: 'solid', bidi: false },
  ]

  let best: EdgeMatch | null = null

  for (const p of patterns) {
    const m = text.match(p.re)
    if (m && m.index !== undefined) {
      const candidate: EdgeMatch = {
        start: m.index,
        end: m.index + m[0].length,
        token: {
          edgeKind: p.kind,
          bidi: p.bidi,
          label: p.labelGroup !== undefined ? m[p.labelGroup]?.trim() : undefined,
        },
      }
      // Pick the earliest match
      if (!best || candidate.start < best.start) {
        best = candidate
      }
    }
  }

  return best
}

// ---- Flowchart parser ----

function parseFlowchart(lines: string[], startIndex: number, direction: Direction): Diagram {
  resetNodeRegistry()
  const statements: Statement[] = []
  const errors: ParseError[] = []

  for (let i = startIndex; i < lines.length; i++) {
    const lineNum = i + 1
    let line = lines[i]

    // Strip comments
    const commentIdx = line.indexOf('%%')
    if (commentIdx !== -1) line = line.substring(0, commentIdx)
    const trimmed = line.trim()
    if (!trimmed) continue

    // Subgraph end
    if (trimmed === 'end') {
      statements.push({ kind: 'group_end' })
      continue
    }

    // Subgraph start: "subgraph Title" or "subgraph id [Title]"
    const subgraphMatch = trimmed.match(/^subgraph\s+(.+)$/)
    if (subgraphMatch) {
      const rest = subgraphMatch[1].trim()
      // Check for "id [Label]" syntax
      const idLabelMatch = rest.match(/^([a-zA-Z_][\w.-]*)\s*\[(.+?)\]$/)
      if (idLabelMatch) {
        statements.push({ kind: 'group_start', id: idLabelMatch[1], label: idLabelMatch[2] })
      } else {
        const id = rest.replace(/\s+/g, '_').toLowerCase()
        statements.push({ kind: 'group_start', id, label: rest })
      }
      continue
    }

    // Direction override inside flowchart (e.g. "direction LR")
    const dirMatch = trimmed.match(/^direction\s+(TB|LR|RL|BT)$/i)
    if (dirMatch) continue // We use the top-level direction only

    // Try to parse as edge chain
    const chain = splitFlowLine(trimmed)
    if (chain) {
      for (let j = 0; j < chain.edges.length; j++) {
        const from = parseNodeDecl(chain.segments[j])
        const to = parseNodeDecl(chain.segments[j + 1])
        if (!from.id || !to.id) {
          errors.push({ kind: 'error', line: lineNum, message: 'Empty node in edge' })
          continue
        }
        statements.push({
          kind: 'edge',
          from,
          to,
          label: chain.edges[j].label,
          edgeKind: chain.edges[j].edgeKind,
          bidi: chain.edges[j].bidi,
        })
      }
      continue
    }

    // Bare node declaration (just "A[Label]" on its own line)
    const nodeRef = parseNodeDecl(trimmed)
    if (nodeRef.id) {
      statements.push({ kind: 'node', ref: nodeRef })
      continue
    }

    errors.push({ kind: 'error', line: lineNum, message: `Unrecognized: ${trimmed}` })
  }

  return { type: 'flow', direction, statements, errors }
}

// ---- Sequence diagram parser ----

function parseSequenceDiagram(lines: string[], startIndex: number): Diagram {
  resetNodeRegistry()
  const statements: Statement[] = []
  const errors: ParseError[] = []

  // Sequence edge patterns: ->>, -->>,-x, -), etc.
  const seqEdgeRe = /^(.+?)\s*(-->>|--\)|->|-->|->>|-x|-)(?:\s*\+|\s*-)?\s*(.+?):\s*(.+)$/
  const participantRe = /^participant\s+(.+?)(?:\s+as\s+(.+))?$/
  const actorRe = /^actor\s+(.+?)(?:\s+as\s+(.+))?$/
  const noteRe = /^Note\s+(?:over|left of|right of)\s+(.+?):\s*(.+)$/i
  const dividerRe = /^-{3,}\s*(.*?)\s*-{0,}$/

  for (let i = startIndex; i < lines.length; i++) {
    let line = lines[i]

    const commentIdx = line.indexOf('%%')
    if (commentIdx !== -1) line = line.substring(0, commentIdx)
    const trimmed = line.trim()
    if (!trimmed) continue

    // Participant / actor
    const partMatch = trimmed.match(participantRe) || trimmed.match(actorRe)
    if (partMatch) {
      const id = partMatch[1].trim()
      const alias = partMatch[2]?.trim() || id
      const ref: NodeRef = { id, label: alias, shape: 'box' }
      nodeRegistry.set(id, ref)
      statements.push({ kind: 'node', ref })
      continue
    }

    // Block end
    if (trimmed === 'end') {
      statements.push({ kind: 'group_end' })
      continue
    }

    // Block start: alt, opt, loop, par
    const blockMatch = trimmed.match(/^(alt|opt|loop|par)\s+(.*)$/)
    if (blockMatch) {
      statements.push({
        kind: 'block_start',
        blockType: blockMatch[1] as BlockType,
        label: blockMatch[2].trim(),
      })
      continue
    }

    // Block else
    const elseMatch = trimmed.match(/^else\s*(.*)$/)
    if (elseMatch) {
      statements.push({ kind: 'block_else', label: elseMatch[1].trim() || undefined })
      continue
    }

    // Divider: ---- text ----
    if (/^-{3,}/.test(trimmed)) {
      const dm = trimmed.match(dividerRe)
      statements.push({ kind: 'divider', label: dm?.[1] || undefined })
      continue
    }

    // Note (skip for now — not rendered)
    if (noteRe.test(trimmed)) continue

    // Sequence message edge
    const edgeMatch = trimmed.match(seqEdgeRe)
    if (edgeMatch) {
      const fromId = edgeMatch[1].trim()
      const arrow = edgeMatch[2]
      const toId = edgeMatch[3].trim()
      const label = edgeMatch[4].trim()

      const from = nodeRegistry.get(fromId) || registerNode(fromId, fromId, 'box')
      const to = nodeRegistry.get(toId) || registerNode(toId, toId, 'box')

      let edgeKind: EdgeKind = 'solid'
      const bidi = false
      if (arrow === '-->>' || arrow === '-->' || arrow === '--)') edgeKind = 'dashed'
      if (arrow === '-x') edgeKind = 'crossed'

      statements.push({ kind: 'edge', from, to, label, edgeKind, bidi })
      continue
    }

    // Skip unknown lines silently in sequence diagrams (notes, rects, etc.)
  }

  return { type: 'seq', direction: 'TB', statements, errors }
}

// ---- Entry point ----

export function parse(source: string): Diagram {
  const lines = source.split('\n')

  // Find the first non-empty, non-comment line to detect diagram type
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    // Mermaid flowchart / graph
    const flowMatch = trimmed.match(/^(?:flowchart|graph)\s+(TB|BT|LR|RL|TD)$/i)
    if (flowMatch) {
      const dir = flowMatch[1].toUpperCase()
      const direction: Direction = dir === 'TD' ? 'TB' : dir as Direction
      return parseFlowchart(lines, i + 1, direction)
    }

    // Mermaid sequence diagram
    if (trimmed === 'sequenceDiagram') {
      return parseSequenceDiagram(lines, i + 1)
    }

    // No recognized header — treat as flowchart TB by default
    return parseFlowchart(lines, i, 'TB')
  }

  return { type: 'flow', direction: 'TB', statements: [], errors: [] }
}
