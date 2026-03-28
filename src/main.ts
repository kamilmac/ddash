import './style.css'
import { initTheme, onThemeChange } from './theme.ts'
import { initEditor } from './editor.ts'
import { loadFromURL } from './url.ts'
import { initPanZoom } from './pan-zoom.ts'

if (new URLSearchParams(window.location.search).has('embed')) {
  document.body.classList.add('embed')
}

initTheme()
const { setSource, rerender } = initEditor()
onThemeChange(rerender)
initPanZoom(document.getElementById('diagramPane')!)

const content = loadFromURL()
if (content) {
  setSource(content)
}

document.body.style.opacity = '1'
