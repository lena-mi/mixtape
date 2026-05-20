<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte'
  import { browser } from '$app/environment'
  import { supabase } from '$lib/supabase'
  import { toast } from '$lib/stores/toasts'
  import type { DrawOp, Tool } from '$lib/canvas/types'
  import { PALETTE, FONTS, BUILTIN_STICKERS, GOOGLE_FONTS_URL, OPS_LIMIT } from '$lib/canvas/types'

  // ── Props ──────────────────────────────────────────────────────────────────
  let { tapeId, initialOps = [] }: { tapeId: string; initialOps: DrawOp[] } = $props()

  // ── Tool state ─────────────────────────────────────────────────────────────
  let activeTool = $state<Tool | null>(null)
  let penColor = $state<string>(PALETTE[0])
  let penSize = $state(5)
  let activeFont = $state<string>('DM Sans')
  let activeSticker = $state<string>('star')

  // ── Ops + history ──────────────────────────────────────────────────────────
  let ops = $state<DrawOp[]>(untrack(() => [...initialOps]))
  let undoStack: DrawOp[][] = []
  let redoStack: DrawOp[][] = []
  const canUndo = $derived(undoStack.length > 0)
  const canRedo = $derived(redoStack.length > 0)

  // ── Konva refs ─────────────────────────────────────────────────────────────
  let containerEl: HTMLDivElement
  let Konva: any
  let stage: any = null
  let layer: any = null

  // ── Drawing state ──────────────────────────────────────────────────────────
  let isDrawing = false
  let currentLine: any = null
  let currentPoints: number[] = []
  let sessionId = ''

  // ── Realtime + save ────────────────────────────────────────────────────────
  let channel: any = null
  let saveTimer: ReturnType<typeof setTimeout>

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getSessionId(): string {
    let id = localStorage.getItem('canvas_session_id')
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('canvas_session_id', id) }
    return id
  }

  function pointerPos() {
    return stage.getPointerPosition() ?? { x: 0, y: 0 }
  }

  // ── Undo / redo ────────────────────────────────────────────────────────────
  function snapshot() {
    undoStack = [...undoStack, [...ops]]
    redoStack = []
  }

  function undo() {
    if (undoStack.length === 0) return
    redoStack = [...redoStack, [...ops]]
    ops = undoStack[undoStack.length - 1]
    undoStack = undoStack.slice(0, -1)
    redrawAll()
    scheduleSave()
  }

  function redo() {
    if (redoStack.length === 0) return
    undoStack = [...undoStack, [...ops]]
    ops = redoStack[redoStack.length - 1]
    redoStack = redoStack.slice(0, -1)
    redrawAll()
    scheduleSave()
  }

  function redrawAll() {
    layer.destroyChildren()
    for (const op of ops) renderOp(op)
    layer.batchDraw()
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  function scheduleSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveToDb, 500)
  }

  async function saveToDb() {
    if (ops.length > OPS_LIMIT) {
      ops = ops.slice(-OPS_LIMIT)
      toast('Canvas full — oldest strokes were removed to make room', { kind: 'warn' })
    }
    await fetch(`/tape/${tapeId}/canvas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
    }).catch(() => {})
  }

  // ── Op management ──────────────────────────────────────────────────────────
  function mergeOp(op: DrawOp) {
    const i = ops.findIndex(o => o.id === op.id)
    if (i === -1) ops = [...ops, op]
    else if (op.timestamp >= ops[i].timestamp) ops = [...ops.slice(0, i), op, ...ops.slice(i + 1)]
  }

  function commitOp(op: DrawOp) {
    snapshot()
    ops = [...ops, op]
    channel?.send({ type: 'broadcast', event: 'op', payload: op }).catch?.(() => {})
    scheduleSave()
  }

  function patchOp(op: DrawOp) {
    mergeOp(op)
    channel?.send({ type: 'broadcast', event: 'op', payload: op }).catch?.(() => {})
    scheduleSave()
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  function renderOp(op: DrawOp) {
    layer.findOne(`#op-${op.id}`)?.destroy()

    if (op.type === 'stroke') {
      layer.add(new Konva.Line({
        id: `op-${op.id}`,
        points: op.points,
        stroke: op.brush === 'eraser' ? '#000' : op.color,
        strokeWidth: op.size,
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0.4,
        globalCompositeOperation: op.brush === 'eraser' ? 'destination-out' : 'source-over',
      }))

    } else if (op.type === 'text') {
      const node = new Konva.Text({
        id: `op-${op.id}`,
        x: op.x, y: op.y,
        text: op.text,
        fill: op.color,
        fontSize: op.size,
        fontFamily: `${op.font}, sans-serif`,
      })
      node.on('dblclick dbltap', () => openTextEditor(node, op))
      layer.add(node)

    } else if (op.type === 'note') {
      const PAD = 12
      const group = new Konva.Group({ id: `op-${op.id}`, x: op.x, y: op.y, draggable: true })

      group.add(new Konva.Rect({
        width: op.w, height: op.h,
        fill: '#ffffff',
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowBlur: 16,
        shadowOffsetX: 0, shadowOffsetY: 4,
        cornerRadius: 3,
      }))

      group.add(new Konva.Text({
        x: PAD, y: PAD,
        width: op.w - PAD * 2,
        height: op.h - PAD * 2,
        text: op.text,
        fontSize: 14,
        fontFamily: 'DM Sans, sans-serif',
        fill: '#1a1a1a',
        lineHeight: 1.45,
        wrap: 'word',
      }))

      group.on('dragend', () => {
        patchOp({ ...op, x: group.x(), y: group.y(), timestamp: Date.now() })
      })
      group.on('dblclick dbltap', () => openNoteEditor(group, op))
      layer.add(group)

    } else if (op.type === 'sticker') {
      const emoji = BUILTIN_STICKERS[op.sticker]
      if (emoji) {
        layer.add(new Konva.Text({
          id: `op-${op.id}`,
          x: op.x, y: op.y,
          text: emoji,
          fontSize: op.size,
          offsetX: op.size / 2,
          offsetY: op.size / 2,
        }))
      } else {
        Konva.Image.fromURL(op.sticker, (img: any) => {
          img.setAttrs({
            id: `op-${op.id}`,
            x: op.x, y: op.y,
            width: op.size, height: op.size,
            offsetX: op.size / 2, offsetY: op.size / 2,
          })
          layer.add(img)
          layer.batchDraw()
        })
      }
    }

    layer.batchDraw()
  }

  // ── Text editor overlay ────────────────────────────────────────────────────
  // vx/vy: raw viewport (clientX/Y) coordinates — preferred over Konva's absolutePosition
  // which can be stale when clicks pass through pointer-events:none elements.
  function openTextEditor(node: any, existing?: import('$lib/canvas/types').TextOp, vx?: number, vy?: number) {
    node.hide(); layer.draw()

    const rect = containerEl.getBoundingClientRect()
    const stagePos = node.absolutePosition()
    const x = vx ?? (stagePos.x + rect.left)
    const y = vy ?? (stagePos.y + rect.top)
    const ta = document.createElement('textarea')
    Object.assign(ta.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      fontSize: `${existing?.size ?? penSize}px`,
      fontFamily: `${existing?.font ?? activeFont}, sans-serif`,
      color: existing?.color ?? penColor,
      background: 'transparent',
      border: 'none',
      outline: '1.5px dashed rgba(0,0,0,0.2)',
      outlineOffset: '4px',
      resize: 'none',
      overflow: 'hidden',
      padding: '0',
      margin: '0',
      lineHeight: '1.3',
      minWidth: '80px',
      maxWidth: `${window.innerWidth - x - 24}px`,
      zIndex: '99999',
    })
    ta.value = existing?.text ?? ''
    document.body.appendChild(ta)
    ta.focus()

    const resize = () => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px` }
    resize(); ta.addEventListener('input', resize)

    let done = false
    const finish = () => {
      if (done) return; done = true
      const text = ta.value.trim()
      ta.remove()
      if (!text) { node.destroy(); layer.draw(); return }

      if (existing) {
        const updated = { ...existing, text, timestamp: Date.now() }
        patchOp(updated); renderOp(updated)
      } else {
        const op: import('$lib/canvas/types').TextOp = {
          id: crypto.randomUUID(), type: 'text', sessionId,
          timestamp: Date.now(),
          x: node.x(), y: node.y(),
          text, font: activeFont, size: penSize, color: penColor,
        }
        commitOp(op); renderOp(op)
      }
    }

    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish() }
      if (e.key === 'Escape') { done = true; ta.remove(); node.show(); layer.draw() }
    })
    // Delay blur listener — the click that opened the editor shifts focus briefly,
    // which would fire blur immediately and cancel before the user can type.
    setTimeout(() => ta.addEventListener('blur', finish), 150)
  }

  // ── Note editor overlay ────────────────────────────────────────────────────
  function openNoteEditor(group: any, op: import('$lib/canvas/types').NoteOp) {
    const textNode = group.findOne('Text')
    textNode?.hide(); layer.draw()

    const PAD = 12
    const rect = containerEl.getBoundingClientRect()
    const stagePos = group.absolutePosition()
    const vx = stagePos.x + rect.left
    const vy = stagePos.y + rect.top
    const ta = document.createElement('textarea')
    Object.assign(ta.style, {
      position: 'fixed',
      left: `${vx + PAD}px`,
      top: `${vy + PAD}px`,
      width: `${op.w - PAD * 2}px`,
      height: `${op.h - PAD * 2}px`,
      fontSize: '14px',
      fontFamily: 'DM Sans, sans-serif',
      color: '#1a1a1a',
      lineHeight: '1.45',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'none',
      padding: '0',
      margin: '0',
      zIndex: '99999',
    })
    ta.value = op.text
    document.body.appendChild(ta)
    ta.focus()

    let done = false
    const finish = () => {
      if (done) return; done = true
      const text = ta.value
      ta.remove()
      const updated = { ...op, text, timestamp: Date.now() }
      if (textNode) { textNode.text(text); textNode.show() }
      patchOp(updated); layer.draw()
    }

    ta.addEventListener('keydown', e => {
      if (e.key === 'Escape') { done = true; ta.remove(); textNode?.show(); layer.draw() }
    })
    setTimeout(() => ta.addEventListener('blur', finish), 150)
  }

  // ── Stage events ───────────────────────────────────────────────────────────
  function setupEvents() {
    stage.on('mousedown touchstart', (e: any) => {
      if (!activeTool) return
      const nativeEvt = e.evt as MouseEvent | TouchEvent | undefined
      const cx = (nativeEvt as MouseEvent)?.clientX ?? (nativeEvt as TouchEvent)?.touches?.[0]?.clientX ?? 0
      const cy = (nativeEvt as MouseEvent)?.clientY ?? (nativeEvt as TouchEvent)?.touches?.[0]?.clientY ?? 0
      const r = containerEl.getBoundingClientRect()
      const pos = { x: cx - r.left, y: cy - r.top }

      if (activeTool === 'hard-pen' || activeTool === 'eraser') {
        isDrawing = true
        currentPoints = [pos.x, pos.y]
        currentLine = new Konva.Line({
          points: currentPoints,
          stroke: activeTool === 'eraser' ? '#000' : penColor,
          strokeWidth: activeTool === 'eraser' ? penSize * 2 : penSize,
          lineCap: 'round',
          lineJoin: 'round',
          tension: 0.4,
          globalCompositeOperation: activeTool === 'eraser' ? 'destination-out' : 'source-over',
        })
        layer.add(currentLine)
      }
    })

    stage.on('mousemove touchmove', (e: any) => {
      if (!isDrawing || !currentLine) return
      e.evt?.preventDefault()
      const pos = pointerPos()
      currentPoints = [...currentPoints, pos.x, pos.y]
      currentLine.points(currentPoints)
      layer.batchDraw()
    })

    stage.on('mouseup touchend', () => {
      if (!isDrawing || !currentLine) return
      isDrawing = false

      if (currentPoints.length < 4) {
        currentLine.destroy(); currentLine = null; currentPoints = []; layer.batchDraw(); return
      }

      const op: import('$lib/canvas/types').StrokeOp = {
        id: crypto.randomUUID(), type: 'stroke', sessionId,
        timestamp: Date.now(),
        brush: activeTool as 'hard-pen' | 'eraser',
        points: [...currentPoints],
        color: penColor,
        size: activeTool === 'eraser' ? penSize * 2 : penSize,
      }
      currentLine.id(`op-${op.id}`)
      currentLine = null; currentPoints = []
      commitOp(op)
    })

    stage.on('click tap', (e: any) => {
      if (!activeTool) return

      // Use raw client coordinates — Konva's getPointerPosition() can be stale
      // when events arrive via pointer-events:none pass-through.
      const nativeEvt = e.evt as MouseEvent | undefined
      const clientX = nativeEvt?.clientX ?? 0
      const clientY = nativeEvt?.clientY ?? 0
      const cRect = containerEl.getBoundingClientRect()
      const pos = { x: clientX - cRect.left, y: clientY - cRect.top }

      if (activeTool === 'text' && (e.target === stage || e.target === layer)) {
        const dummy = new Konva.Text({ x: pos.x, y: pos.y, text: '', fontSize: penSize, fontFamily: activeFont })
        layer.add(dummy)
        openTextEditor(dummy, undefined, clientX, clientY)
      }

      if (activeTool === 'note' && (e.target === stage || e.target === layer)) {
        const op: import('$lib/canvas/types').NoteOp = {
          id: crypto.randomUUID(), type: 'note', sessionId,
          timestamp: Date.now(),
          x: pos.x, y: pos.y, w: 220, h: 130, text: '',
        }
        commitOp(op); renderOp(op)
        const group = layer.findOne(`#op-${op.id}`)
        if (group) setTimeout(() => openNoteEditor(group, op), 0)
      }

      if (activeTool === 'sticker') {
        const op: import('$lib/canvas/types').StickerOp = {
          id: crypto.randomUUID(), type: 'sticker', sessionId,
          timestamp: Date.now(),
          x: pos.x, y: pos.y,
          sticker: activeSticker, size: 40,
        }
        commitOp(op); renderOp(op)
      }
    })
  }

  // ── Realtime ───────────────────────────────────────────────────────────────
  function subscribeRealtime() {
    channel = supabase
      .channel(`canvas:${tapeId}`)
      .on('broadcast', { event: 'op' }, ({ payload }: { payload: DrawOp }) => {
        mergeOp(payload); renderOp(payload); scheduleSave()
      })
      .subscribe()
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  export function exportCanvasPNG(): Promise<Blob> {
    if (!stage) return Promise.reject(new Error('Canvas not initialized'))
    return fetch(stage.toDataURL({ pixelRatio: 2 })).then(r => r.blob())
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo() }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') { e.preventDefault(); redo() }
    if (e.key === 'Escape') activeTool = null
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  onMount(async () => {
    sessionId = getSessionId()
    Konva = (await import('konva')).default

    if (!document.querySelector('link[data-gfonts]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = GOOGLE_FONTS_URL
      link.dataset.gfonts = '1'
      document.head.appendChild(link)
    }

    stage = new Konva.Stage({ container: containerEl, width: window.innerWidth, height: window.innerHeight })
    layer = new Konva.Layer()
    stage.add(layer)

    for (const op of ops) renderOp(op)
    setupEvents()
    subscribeRealtime()

    const onResize = () => { stage.width(window.innerWidth); stage.height(window.innerHeight) }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', handleKeydown)
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('keydown', handleKeydown) }
  })

  onDestroy(() => {
    clearTimeout(saveTimer)
    if (browser) window.removeEventListener('keydown', handleKeydown)
    if (channel) supabase.removeChannel(channel)
    stage?.destroy()
  })

  $effect(() => {
    const active = activeTool !== null
    if (browser) document.body.classList.toggle('drawing-active', active)
    return () => { if (browser) document.body.classList.remove('drawing-active') }
  })

  const toolCursor = $derived(
    activeTool === 'text' ? 'text'
    : activeTool === 'eraser' ? 'cell'
    : activeTool ? 'crosshair'
    : 'default'
  )
</script>

<!-- ── Canvas ──────────────────────────────────────────────────────────────── -->
<div
  class="canvas-wrap"
  class:active={activeTool !== null}
  style:cursor={toolCursor}
  bind:this={containerEl}
></div>

<!-- ── Toolbar ───────────────────────────────────────────────────────────────── -->
<div class="toolbar" role="toolbar" aria-label="Drawing tools">

  <!-- Tools -->
  <div class="tool-row">
    {#each ([
      ['hard-pen', 'Pen'],
      ['eraser',   'Eraser'],
      ['text',     'Text'],
      ['note',     'Note'],
      ['sticker',  'Sticker'],
    ] as const) as [t, label]}
      <button
        class="tool-btn"
        class:active={activeTool === t}
        onclick={() => activeTool = activeTool === t ? null : t}
        title={label}
        aria-label={label}
        aria-pressed={activeTool === t}
      >
        {#if t === 'hard-pen'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20l16-16-4-4-16 16 4 4z"/><path d="M4 20l4 0 0-4"/></svg>
        {:else if t === 'eraser'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 20H7L3 16l13-13 4 4z"/><path d="M6.5 17.5l-3-3"/></svg>
        {:else if t === 'text'}
          <span class="icon-t" aria-hidden="true">T</span>
        {:else if t === 'note'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        {:else}
          <span aria-hidden="true">✦</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Settings panel -->
  {#if activeTool === 'hard-pen' || activeTool === 'eraser' || activeTool === 'text'}
    <div class="toolbar-sep"></div>

    {#if activeTool !== 'eraser'}
      <p class="section-label">Color</p>
      <div class="palette">
        {#each PALETTE as color}
          <button
            class="swatch"
            class:selected={penColor === color}
            style:background={color}
            onclick={() => penColor = color}
            aria-label={color}
          ></button>
        {/each}
      </div>
    {/if}

    <p class="section-label">Size <span class="val">{penSize}px</span></p>
    <input type="range" class="slider" min="2" max="32" step="1" bind:value={penSize} />

    {#if activeTool === 'text'}
      <p class="section-label">Font</p>
      <div class="font-list">
        {#each FONTS as font}
          <button
            class="font-btn"
            class:selected={activeFont === font}
            style:font-family={`${font}, sans-serif`}
            onclick={() => activeFont = font}
          >{font}</button>
        {/each}
      </div>
    {/if}
  {/if}

  {#if activeTool === 'sticker'}
    <div class="toolbar-sep"></div>
    <p class="section-label">Sticker</p>
    <div class="sticker-row">
      {#each Object.entries(BUILTIN_STICKERS) as [id, emoji]}
        <button
          class="sticker-opt"
          class:selected={activeSticker === id}
          onclick={() => activeSticker = id}
          title={id}
        >{emoji}</button>
      {/each}
    </div>
  {/if}

  <!-- Undo / redo / close -->
  <div class="toolbar-sep"></div>
  <div class="tool-row">
    <button class="tool-btn" onclick={undo} disabled={!canUndo} title="Undo (⌘Z)" aria-label="Undo">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 7h13a4 4 0 0 1 0 8H6"/><path d="M6 11l-3-4 3-4"/></svg>
    </button>
    <button class="tool-btn" onclick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" aria-label="Redo">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 7H8a4 4 0 0 0 0 8h10"/><path d="M18 11l3-4-3-4"/></svg>
    </button>
    {#if activeTool !== null}
      <button class="tool-btn close-btn" onclick={() => activeTool = null} title="Done" aria-label="Close tools">×</button>
    {/if}
  </div>
</div>

<style>
  /* ── Canvas ───────────────────────────────────────────────────────────────── */
  .canvas-wrap {
    position: fixed;
    inset: 0;
    z-index: 0;        /* below tape UI (z-index: 1) in passive mode */
    pointer-events: none;
    overflow: hidden;
  }

  .canvas-wrap.active {
    pointer-events: auto;
  }

  .canvas-wrap :global(canvas) {
    display: block;
  }

  /* ── Toolbar ──────────────────────────────────────────────────────────────── */
  .toolbar {
    position: fixed;
    left: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    z-index: 9999;
    background: var(--color-white);
    border: 1px solid var(--color-gray-border);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    padding: var(--space-2);
    width: 192px;
    max-height: calc(100vh - var(--space-8));
    overflow-y: auto;
    overflow-x: hidden;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .toolbar-sep {
    height: 1px;
    background: var(--color-gray-border);
    flex-shrink: 0;
  }

  .tool-row {
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
  }

  .section-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--color-gray-muted);
    margin: 0;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .val {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    font-family: var(--font-mono);
    font-size: 10px;
  }

  /* ── Tool buttons ─────────────────────────────────────────────────────────── */
  .tool-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    border-radius: calc(var(--radius-md) - 2px);
    cursor: pointer;
    color: var(--color-gray-secondary);
    font-size: 12px;
    font-family: inherit;
    flex-shrink: 0;
    transition: background 0.1s, color 0.1s;
  }

  .tool-btn:hover:not(:disabled) { background: #f0f0f0; color: var(--color-black); }
  .tool-btn.active { background: var(--color-black); color: var(--color-white); }
  .tool-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .close-btn { font-size: 16px; margin-left: auto; }
  .close-btn:hover { background: #fef2f2; color: #dc2626; }

  .icon-t { font-weight: 700; font-size: 13px; text-decoration: underline; text-underline-offset: 2px; }

  /* ── Palette ──────────────────────────────────────────────────────────────── */
  .palette {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 3px;
  }

  .swatch {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 3px;
    border: 1.5px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: transform 0.1s;
  }

  .swatch:hover { transform: scale(1.2); }
  .swatch.selected { border-color: var(--color-black); outline: 2px solid white; outline-offset: -3px; }

  /* ── Slider ───────────────────────────────────────────────────────────────── */
  .slider { width: 100%; accent-color: var(--color-black); cursor: pointer; }

  /* ── Font list ────────────────────────────────────────────────────────────── */
  .font-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    max-height: 130px;
    overflow-y: auto;
  }

  .font-btn {
    text-align: left;
    padding: 5px 6px;
    border: none;
    background: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 13px;
    color: var(--color-black);
    transition: background 0.1s;
    white-space: nowrap;
  }

  .font-btn:hover { background: #f0f0f0; }
  .font-btn.selected { background: var(--color-black); color: var(--color-white); }

  /* ── Stickers ─────────────────────────────────────────────────────────────── */
  .sticker-row { display: flex; gap: 2px; }

  .sticker-opt {
    flex: 1;
    height: 36px;
    border: none;
    background: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.55;
    transition: opacity 0.1s, background 0.1s;
  }

  .sticker-opt:hover { opacity: 1; background: #f0f0f0; }
  .sticker-opt.selected { background: var(--color-black); opacity: 1; }
</style>
