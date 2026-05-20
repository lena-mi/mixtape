export type Tool = 'hard-pen' | 'eraser' | 'text' | 'note' | 'sticker'

type BaseOp = { id: string; sessionId: string; timestamp: number }

export type StrokeOp = BaseOp & {
  type: 'stroke'
  brush: 'hard-pen' | 'eraser'
  points: number[]
  color: string
  size: number
}

export type TextOp = BaseOp & {
  type: 'text'
  x: number; y: number
  text: string
  font: string
  size: number
  color: string
}

export type NoteOp = BaseOp & {
  type: 'note'
  x: number; y: number
  w: number; h: number
  text: string
}

export type StickerOp = BaseOp & {
  type: 'sticker'
  x: number; y: number
  // built-in id ('star' | 'heart' | 'cassette' | 'flame') or image URL for future packs
  sticker: string
  size: number
}

export type DrawOp = StrokeOp | TextOp | NoteOp | StickerOp

// ── Constants ──────────────────────────────────────────────────────────────

export const PALETTE = [
  '#000000', '#1c1c1c', '#3a3a3a', '#5e5e5e', '#8a8a8a', '#ffffff',
  '#ff3131', '#ff9c00', '#ffe600', '#00c951', '#0084ff', '#7e00fb',
  '#ff84b7', '#ffc8a0', '#fff4b8', '#b7f0b1', '#b4d4ff', '#d4a5ff',
  '#9b1c1c', '#995200', '#7c6600', '#025920', '#023978', '#430079',
] as const

export const FONTS = [
  'Bebas Neue',
  'Archivo Black',
  'Special Elite',
  'Courier Prime',
  'Permanent Marker',
  'DM Sans',
  'Reenie Beanie',
] as const

export const BUILTIN_STICKERS: Record<string, string> = {
  star: '⭐',
  heart: '❤️',
  cassette: '📼',
  flame: '🔥',
}

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Archivo+Black&family=Special+Elite&family=Courier+Prime:wght@400;700&family=Permanent+Marker&family=DM+Sans:wght@400;700&family=Reenie+Beanie&display=swap'

export const OPS_LIMIT = 150
