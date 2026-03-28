import type { Diagram, EdgeKind, BlockType } from './parser.ts'
import { measureText, NODE_FONT } from './measure.ts'

const COL_SPACING = 160
const ROW_HEIGHT = 40
const HEADER_H = 36
const HEADER_PAD_X = 20
const SELF_MSG_W = 30
const MARGIN = 30

export interface SeqParticipant {
  id: string
  label: string
  x: number
  headerW: number
}

export interface SeqMessage {
  fromId: string
  toId: string
  label?: string
  kind: EdgeKind
  bidi: boolean
  y: number
  fromX: number
  toX: number
  self: boolean
}

export interface SeqDivider {
  y: number
  label?: string
}

export interface SeqBlock {
  type: BlockType
  label: string
  y: number
  height: number
  sections: Array<{ label?: string; y: number }>
}

export interface SeqLayoutResult {
  kind: 'seq'
  participants: SeqParticipant[]
  messages: SeqMessage[]
  dividers: SeqDivider[]
  blocks: SeqBlock[]
  totalWidth: number
  totalHeight: number
}

export function layoutSequence(diagram: Diagram): SeqLayoutResult {
  const participantOrder: string[] = []
  const participantLabels = new Map<string, string>()

  function ensureParticipant(id: string, label: string) {
    if (!participantLabels.has(id)) {
      participantOrder.push(id)
      participantLabels.set(id, label)
    }
  }

  // First pass: collect participants in order
  for (const stmt of diagram.statements) {
    if (stmt.kind === 'edge') {
      ensureParticipant(stmt.from.id, stmt.from.label)
      ensureParticipant(stmt.to.id, stmt.to.label)
    } else if (stmt.kind === 'node') {
      ensureParticipant(stmt.ref.id, stmt.ref.label)
    }
  }

  if (participantOrder.length === 0) {
    return { kind: 'seq', participants: [], messages: [], dividers: [], blocks: [], totalWidth: 0, totalHeight: 0 }
  }

  // Measure participant headers to determine column widths
  const headerWidths = new Map<string, number>()
  for (const id of participantOrder) {
    const label = participantLabels.get(id)!
    const m = measureText(label, NODE_FONT)
    headerWidths.set(id, Math.ceil(m.width) + HEADER_PAD_X * 2)
  }

  // Position participants — ensure enough spacing
  const participantX = new Map<string, number>()
  let x = MARGIN
  for (const id of participantOrder) {
    const hw = headerWidths.get(id)!
    const colW = Math.max(hw, COL_SPACING)
    participantX.set(id, x + colW / 2)
    x += colW
  }
  const totalWidth = x + MARGIN

  // Build participant objects
  const participants: SeqParticipant[] = participantOrder.map(id => ({
    id,
    label: participantLabels.get(id)!,
    x: participantX.get(id)!,
    headerW: headerWidths.get(id)!,
  }))

  // Second pass: lay out messages, dividers, blocks
  let y = MARGIN + HEADER_H + 20 // start below headers
  const messages: SeqMessage[] = []
  const dividers: SeqDivider[] = []
  const blocks: SeqBlock[] = []
  const blockStack: Array<{ type: BlockType; label: string; startY: number; sections: Array<{ label?: string; y: number }> }> = []

  for (const stmt of diagram.statements) {
    switch (stmt.kind) {
      case 'edge': {
        const fromX = participantX.get(stmt.from.id)
        const toX = participantX.get(stmt.to.id)
        if (fromX === undefined || toX === undefined) break

        const self = stmt.from.id === stmt.to.id
        messages.push({
          fromId: stmt.from.id,
          toId: stmt.to.id,
          label: stmt.label,
          kind: stmt.edgeKind,
          bidi: stmt.bidi,
          y,
          fromX,
          toX: self ? fromX + SELF_MSG_W : toX,
          self,
        })
        y += self ? ROW_HEIGHT + 10 : ROW_HEIGHT
        break
      }
      case 'divider':
        y += 10
        dividers.push({ y, label: stmt.label })
        y += 20
        break
      case 'block_start':
        blockStack.push({ type: stmt.blockType, label: stmt.label, startY: y - 15, sections: [] })
        y += 8
        break
      case 'block_else': {
        const current = blockStack[blockStack.length - 1]
        if (current) {
          current.sections.push({ label: stmt.label, y: y - 5 })
        }
        y += 8
        break
      }
      case 'group_end': {
        // In sequence context, this closes a block
        const block = blockStack.pop()
        if (block) {
          blocks.push({
            type: block.type,
            label: block.label,
            y: block.startY,
            height: y - block.startY + 5,
            sections: block.sections,
          })
        }
        y += 8
        break
      }
    }
  }

  const totalHeight = y + MARGIN + HEADER_H // bottom headers

  return { kind: 'seq', participants, messages, dividers, blocks, totalWidth: totalWidth, totalHeight }
}
