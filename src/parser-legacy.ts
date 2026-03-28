// Legacy ddash parser — kept for backward compatibility with existing shared URLs.
// If the source starts with @flow, @seq, or @state, this parser is used.
// See parser.ts for the new Mermaid-compatible parser.

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

const EDGE_RE = /\s+(-->|<->|->|--|(?:-x))\s+/

const DIRECTIONS = new Set(['TB', 'LR', 'RL', 'BT'])

function normalizeId(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_')
}

function parseNodeRef(raw: string): NodeRef {
  raw = raw.trim()
  if (!raw) return { id: '', label: '', shape: 'box' }

  if (raw.startsWith('<') && raw.endsWith('>') && raw.length > 2) {
    const label = raw.slice(1, -1).trim()
    return { id: normalizeId(label), label, shape: 'diamond' }
  }
  if (raw.startsWith('(') && raw.endsWith(')') && raw.length > 2) {
    const label = raw.slice(1, -1).trim()
    return { id: normalizeId(label), label, shape: 'rounded' }
  }
  if (raw.startsWith('|') && raw.endsWith('|') && raw.length > 2) {
    const label = raw.slice(1, -1).trim()
    return { id: normalizeId(label), label, shape: 'cylinder' }
  }

  return { id: normalizeId(raw), label: raw }
}

function splitToAndLabel(raw: string): { toRaw: string; label?: string } {
  const idx = raw.indexOf(': ')
  if (idx === -1) {
    const colonIdx = raw.indexOf(':')
    if (colonIdx > 0 && colonIdx < raw.length - 1) {
      return { toRaw: raw.substring(0, colonIdx).trim(), label: raw.substring(colonIdx + 1).trim() }
    }
    return { toRaw: raw.trim() }
  }
  return { toRaw: raw.substring(0, idx).trim(), label: raw.substring(idx + 2).trim() }
}

function edgeTokenToKind(token: string): EdgeKind {
  switch (token) {
    case '-->': return 'dashed'
    case '-x': return 'crossed'
    default: return 'solid'
  }
}

function stripComment(line: string): string {
  let depth = 0
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '<' || ch === '(' || ch === '|') depth++
    if (ch === '>' || ch === ')') depth--
    if (ch === '|' && i > 0 && depth > 0) depth--
    if (ch === '#' && depth === 0 && i > 0 && (line[i - 1] === ' ' || line[i - 1] === '\t')) {
      return line.substring(0, i).trimEnd()
    }
  }
  return line
}

function parseLine(raw: string, lineNum: number): Statement[] {
  const stripped = stripComment(raw)
  const trimmed = stripped.trim()

  if (!trimmed || trimmed.startsWith('#')) return []
  if (trimmed.startsWith('@')) return []

  if (trimmed.startsWith('---')) {
    const inner = trimmed.replace(/^-+\s*/, '').replace(/\s*-+$/, '').trim()
    return [{ kind: 'divider', label: inner || undefined } as DividerStmt]
  }

  const elseMatch = trimmed.match(/^\}\s*else\s*(.*?)\s*\{?\s*$/)
  if (elseMatch) {
    const label = elseMatch[1].trim()
    return [{ kind: 'block_else', label: label || undefined } as BlockElseStmt]
  }

  if (trimmed === '}') return [{ kind: 'group_end' }]

  const blockMatch = trimmed.match(/^(alt|opt|loop|par)\s+(.*?)\s*\{\s*$/)
  if (blockMatch) {
    return [{ kind: 'block_start', blockType: blockMatch[1] as BlockType, label: blockMatch[2].trim() } as BlockStartStmt]
  }

  const groupMatch = trimmed.match(/^(.+?)\s*\{\s*$/)
  if (groupMatch) {
    const label = groupMatch[1].trim()
    return [{ kind: 'group_start', id: normalizeId(label), label }]
  }

  const parts = stripped.trim().split(EDGE_RE)

  if (parts.length >= 3) {
    const stmts: Statement[] = []
    for (let i = 0; i < parts.length - 2; i += 2) {
      const fromRef = parseNodeRef(parts[i])
      const token = parts[i + 1]
      const isLast = i + 2 >= parts.length - 1

      let toRef: NodeRef
      let label: string | undefined

      if (isLast) {
        const { toRaw, label: lbl } = splitToAndLabel(parts[i + 2])
        toRef = parseNodeRef(toRaw)
        label = lbl
      } else {
        toRef = parseNodeRef(parts[i + 2])
      }

      if (!fromRef.id || !toRef.id) {
        stmts.push({ kind: 'error', line: lineNum, message: 'Empty node name in edge' })
        continue
      }

      stmts.push({
        kind: 'edge',
        from: fromRef,
        to: toRef,
        label,
        edgeKind: edgeTokenToKind(token),
        bidi: token === '<->',
      })
    }
    return stmts
  }

  const ref = parseNodeRef(trimmed)
  if (ref.id) return [{ kind: 'node', ref }]

  return [{ kind: 'error', line: lineNum, message: `Unrecognized: ${trimmed}` }]
}

export function parseLegacy(source: string): Diagram {
  let type: DiagramType = 'flow'
  let direction: Direction = 'TB'
  const statements: Statement[] = []
  const errors: ParseError[] = []

  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (trimmed.startsWith('@')) {
      const match = trimmed.match(/^@(\w+)\s*(.*)$/)
      if (match) {
        const t = match[1].toLowerCase()
        if (t === 'flow' || t === 'seq' || t === 'state') type = t as DiagramType
        const d = match[2].trim().toUpperCase()
        if (DIRECTIONS.has(d)) direction = d as Direction
      }
      continue
    }

    const stmts = parseLine(lines[i], i + 1)
    for (const s of stmts) {
      statements.push(s)
      if (s.kind === 'error') errors.push(s)
    }
  }

  return { type, direction, statements, errors }
}
