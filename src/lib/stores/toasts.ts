import { writable } from 'svelte/store'

export type ToastKind = 'info' | 'warn' | 'error'

export type Toast = {
  id: string
  message: string
  kind: ToastKind
}

const { subscribe, update } = writable<Toast[]>([])

export const toasts = { subscribe }

export function toast(message: string, options?: { kind?: ToastKind; duration?: number }) {
  const id = crypto.randomUUID()
  const kind = options?.kind ?? 'info'
  const duration = options?.duration ?? 4000
  update(ts => [...ts, { id, message, kind }])
  setTimeout(() => update(ts => ts.filter(t => t.id !== id)), duration)
}
