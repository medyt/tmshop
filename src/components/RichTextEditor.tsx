import { useEffect, useRef, useState } from 'react'
import { buildVideoEmbed } from '../lib/richText'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  ariaLabel?: string
}

type ToolbarAction =
  | { kind: 'cmd'; command: string; value?: string; label: string; title: string }
  | { kind: 'block'; block: string; label: string; title: string }
  | { kind: 'link'; label: string; title: string }
  | { kind: 'image'; label: string; title: string }
  | { kind: 'video'; label: string; title: string }
  | { kind: 'table'; label: string; title: string }
  | { kind: 'sep' }

const TOOLBAR: ToolbarAction[] = [
  { kind: 'block', block: 'p', label: 'P', title: 'Paragraf' },
  { kind: 'block', block: 'h2', label: 'H2', title: 'Titlu mare' },
  { kind: 'block', block: 'h3', label: 'H3', title: 'Subtitlu' },
  { kind: 'sep' },
  { kind: 'cmd', command: 'bold', label: 'B', title: 'Îngroșat' },
  { kind: 'cmd', command: 'italic', label: 'I', title: 'Înclinat' },
  { kind: 'cmd', command: 'underline', label: 'U', title: 'Subliniat' },
  { kind: 'cmd', command: 'strikeThrough', label: 'S', title: 'Tăiat' },
  { kind: 'sep' },
  { kind: 'cmd', command: 'insertUnorderedList', label: '• Listă', title: 'Listă cu buline' },
  { kind: 'cmd', command: 'insertOrderedList', label: '1. Listă', title: 'Listă numerotată' },
  { kind: 'sep' },
  { kind: 'cmd', command: 'justifyLeft', label: '⯇', title: 'Aliniere stânga' },
  { kind: 'cmd', command: 'justifyCenter', label: '≡', title: 'Aliniere centru' },
  { kind: 'cmd', command: 'justifyRight', label: '⯈', title: 'Aliniere dreapta' },
  { kind: 'sep' },
  { kind: 'link', label: '🔗 Link', title: 'Inserează link' },
  { kind: 'cmd', command: 'unlink', label: 'Scoate link', title: 'Elimină link' },
  { kind: 'image', label: '🖼 Imagine', title: 'Inserează imagine (URL)' },
  { kind: 'video', label: '🎬 Video', title: 'Inserează video (YouTube, Vimeo sau .mp4)' },
  { kind: 'table', label: '▦ Tabel', title: 'Inserează tabel' },
  { kind: 'sep' },
  { kind: 'cmd', command: 'removeFormat', label: 'Curăță', title: 'Curăță formatarea' },
]

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Scrie descrierea…',
  ariaLabel = 'Editor descriere',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'rich' | 'html'>('rich')

  // Sincronizează conținutul din exterior doar când editorul nu e focusat,
  // ca să nu sară cursorul în timpul tastării.
  useEffect(() => {
    if (mode !== 'rich') return
    const el = editorRef.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value, mode])

  const emitChange = () => {
    const el = editorRef.current
    if (el) onChange(el.innerHTML)
  }

  const exec = (command: string, arg?: string) => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    document.execCommand(command, false, arg)
    emitChange()
  }

  const applyBlock = (block: string) => {
    exec('formatBlock', `<${block}>`)
  }

  const insertLink = () => {
    const url = window.prompt('Adresa link-ului (https://...)')
    if (!url) return
    exec('createLink', url)
    // Asigură deschiderea în tab nou pentru linkurile externe.
    const el = editorRef.current
    if (el) {
      el.querySelectorAll('a[href]').forEach((a) => {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      })
      emitChange()
    }
  }

  const insertImage = () => {
    const url = window.prompt('Adresa imaginii (https://...)')
    if (!url) return
    exec('insertImage', url)
  }

  const insertVideo = () => {
    const url = window.prompt(
      'Link video (YouTube, Vimeo) sau fișier .mp4 (https://...)',
    )
    if (!url) return
    const embed = buildVideoEmbed(url)
    if (!embed) {
      window.alert(
        'Link video nevalid. Folosește un link YouTube/Vimeo sau un fișier .mp4/.webm.',
      )
      return
    }
    const el = editorRef.current
    if (!el) return
    el.focus()
    document.execCommand('insertHTML', false, embed)
    emitChange()
  }

  const insertTable = () => {
    const colsRaw = window.prompt('Număr de coloane:', '3')
    if (!colsRaw) return
    const rowsRaw = window.prompt('Număr de rânduri (fără antet):', '3')
    if (!rowsRaw) return
    const cols = Math.max(1, Math.min(10, parseInt(colsRaw, 10) || 0))
    const rows = Math.max(1, Math.min(50, parseInt(rowsRaw, 10) || 0))
    if (!cols || !rows) return

    const headCells = Array.from(
      { length: cols },
      (_, i) => `<th>Coloana ${i + 1}</th>`,
    ).join('')
    const bodyRow = `<tr>${Array.from({ length: cols }, () => '<td>&nbsp;</td>').join('')}</tr>`
    const bodyRows = Array.from({ length: rows }, () => bodyRow).join('')
    const table = `<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`

    const el = editorRef.current
    if (!el) return
    el.focus()
    document.execCommand('insertHTML', false, table)
    emitChange()
  }

  const handleAction = (action: ToolbarAction) => {
    switch (action.kind) {
      case 'cmd':
        exec(action.command, action.value)
        break
      case 'block':
        applyBlock(action.block)
        break
      case 'link':
        insertLink()
        break
      case 'image':
        insertImage()
        break
      case 'video':
        insertVideo()
        break
      case 'table':
        insertTable()
        break
      default:
        break
    }
  }

  const htmlMode = mode === 'html'

  return (
    <div className="rte">
      <div className="rte__toolbar" role="toolbar" aria-label="Formatare text">
        {!htmlMode &&
          TOOLBAR.map((action, index) =>
            action.kind === 'sep' ? (
              <span key={`sep-${index}`} className="rte__sep" aria-hidden="true" />
            ) : (
              <button
                key={`${action.kind}-${action.label}`}
                type="button"
                className="rte__btn"
                title={action.title}
                aria-label={action.title}
                // preventDefault pe mousedown ca să nu se piardă selecția din editor.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </button>
            ),
          )}
        <span className="rte__sep" aria-hidden="true" />
        <button
          type="button"
          className={`rte__btn${htmlMode ? ' rte__btn--active' : ''}`}
          title="Comută vizualizarea codului HTML"
          aria-pressed={htmlMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMode(htmlMode ? 'rich' : 'html')}
        >
          {'</> Cod HTML'}
        </button>
      </div>

      {htmlMode ? (
        <textarea
          className="rte__code"
          value={value}
          spellCheck={false}
          aria-label={`${ariaLabel} — cod HTML`}
          placeholder="<p>Scrie sau lipește cod HTML aici…</p>"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div
          ref={editorRef}
          className="rte__area"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          data-placeholder={placeholder}
          onInput={emitChange}
          onBlur={emitChange}
        />
      )}
    </div>
  )
}
