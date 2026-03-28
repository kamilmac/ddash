import './style.css'
import { initTheme } from './theme.ts'
import { initEditor } from './editor.ts'
import { loadFromURL } from './url.ts'
import { initPanZoom } from './pan-zoom.ts'

// Embed mode: ?embed strips all chrome
if (new URLSearchParams(window.location.search).has('embed')) {
  document.body.classList.add('embed')
}

initTheme()
const { setSource } = initEditor()
initPanZoom(document.getElementById('diagramPane')!)

const content = loadFromURL()
if (content) {
  setSource(content)
}

document.body.style.opacity = '1'
