import { parse } from './parser.ts'
import { layoutDiagram } from './layout.ts'
import { renderDiagram } from './render.ts'
import { layoutSequence } from './seq-layout.ts'
import { renderSequence } from './seq-render.ts'
import { initInteractivity } from './interact.ts'
import { updateURL } from './url.ts'
import { examples } from './examples.ts'

const DEBOUNCE_MS = 300

const $ = (s: string) => document.getElementById(s)!

export interface EditorAPI {
  setSource(source: string): void
}

export function initEditor(): EditorAPI {
  const editor = $('editor') as HTMLTextAreaElement
  const diagramPane = $('diagramPane')
  const errorBar = $('errorBar')
  const emptyState = $('emptyState')
  const examplesMenu = $('examplesMenu')
  const sidebar = $('sidebar')
  const overlay = $('overlay')
  const toast = $('toast')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // ---- Sidebar ----
  function openSidebar() {
    sidebar.classList.add('open')
    overlay.classList.add('open')
    document.body.classList.add('sidebar-open')
    editor.focus()
  }

  function closeSidebar() {
    sidebar.classList.remove('open')
    overlay.classList.remove('open')
    document.body.classList.remove('sidebar-open')
  }

  sidebar.removeAttribute('hidden')
  $('menuBtn').addEventListener('click', openSidebar)
  $('closeBtn').addEventListener('click', closeSidebar)
  overlay.addEventListener('click', closeSidebar)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar()
  })

  // ---- Diagram processing ----
  function processSource(source: string) {
    const trimmed = source.trim()

    if (!trimmed) {
      diagramPane.innerHTML = ''
      emptyState.style.display = ''
      errorBar.textContent = ''
      errorBar.style.display = 'none'
      return
    }

    emptyState.style.display = 'none'

    try {
      const diagram = parse(source)
      if (diagram.type === 'seq') {
        const seqLayout = layoutSequence(diagram)
        renderSequence(seqLayout, diagramPane)
      } else {
        const layout = layoutDiagram(diagram)
        renderDiagram(layout, diagramPane)
        initInteractivity(diagramPane, layout)
      }

      if (diagram.errors.length > 0) {
        errorBar.textContent = diagram.errors
          .map(e => `Line ${e.line}: ${e.message}`)
          .join(' | ')
        errorBar.style.display = ''
      } else {
        errorBar.textContent = ''
        errorBar.style.display = 'none'
      }
    } catch (err) {
      errorBar.textContent = `Render error: ${err instanceof Error ? err.message : 'unknown'}`
      errorBar.style.display = ''
    }
  }

  // ---- Editor input ----
  function onInput() {
    const source = editor.value
    processSource(source)
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => updateURL(source), DEBOUNCE_MS)
  }

  editor.addEventListener('input', onInput)

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = editor.selectionStart
      const end = editor.selectionEnd
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end)
      editor.selectionStart = editor.selectionEnd = start + 2
      onInput()
    }
  })

  // ---- Copy link ----
  $('copyBtn').addEventListener('click', () => {
    if (!window.location.hash) {
      showToast('Nothing to copy')
      return
    }
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Link copied!')
    }).catch(() => {
      showToast('Failed to copy')
    })
  })

  // ---- Examples dropdown ----
  $('examplesBtn').addEventListener('click', () => {
    examplesMenu.classList.toggle('open')
  })

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.examples-wrap')) {
      examplesMenu.classList.remove('open')
    }
  })

  for (const ex of examples) {
    const btn = document.createElement('button')
    btn.textContent = ex.name
    btn.addEventListener('click', () => {
      setSource(ex.source)
      examplesMenu.classList.remove('open')
    })
    examplesMenu.appendChild(btn)
  }

  // ---- Toast ----
  function showToast(msg: string) {
    toast.textContent = msg
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2000)
  }

  // ---- API ----
  function setSource(source: string) {
    editor.value = source
    processSource(source)
    updateURL(source)

  }

  return { setSource }
}
