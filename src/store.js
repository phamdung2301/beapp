import { useEffect, useState } from 'react'

const KEY = 'beapp-v1'

// Tương thích ngược: state cũ (chỉ có done/scores/notes/...) vẫn đọc được,
// các trường mới được merge mặc định, không xóa dữ liệu cũ.
const DEFAULTS = { done: {}, scores: {}, notes: {}, criteria: {}, review: {}, capstone: {}, flashKnown: {}, startDate: '', reminder: '07:00', pomodoroDone: 0, pomodoroMinutes: 0, srs: {}, noteUndo: {}, notesSavedAt: {}, pomodoroInterrupted: 0, lastView: null }

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { return { ...DEFAULTS } }
}

export function useProgress() {
  const [s, setS] = useState(loadState)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }, [s])
  const patch = (p) => setS(prev => ({ ...prev, ...p }))
  const setDone = (dayId, done) => setS(prev => {
    const d = { ...prev.done }
    if (done) d[dayId] = new Date().toISOString().slice(0, 10)
    else delete d[dayId]
    return { ...prev, done: d }
  })
  const setNote = (k, v) => setS(prev => ({ ...prev, notes: { ...prev.notes, [k]: v }, notesSavedAt: { ...(prev.notesSavedAt || {}), [k]: new Date().toISOString() } }))
  // P0-01: chèn template phải append + lưu bản trước để hoàn tác, không ghi đè.
  const appendNote = (k, text) => setS(prev => {
    const cur = prev.notes?.[k] || ''
    const next = cur ? cur + '\n\n' + text : text
    return { ...prev, notes: { ...prev.notes, [k]: next }, noteUndo: { ...(prev.noteUndo || {}), [k]: cur }, notesSavedAt: { ...(prev.notesSavedAt || {}), [k]: new Date().toISOString() } }
  })
  const undoNote = (k) => setS(prev => {
    if (!(k in (prev.noteUndo || {}))) return prev
    return { ...prev, notes: { ...prev.notes, [k]: prev.noteUndo[k] }, noteUndo: { ...prev.noteUndo, [k]: undefined } }
  })
  const toggleList = (field, dayId, idx) => setS(prev => {
    const arr = [...(prev[field]?.[dayId] || [])]
    arr[idx] = !arr[idx]
    return { ...prev, [field]: { ...prev[field], [dayId]: arr } }
  })
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'beapp-tien-do.json'; a.click()
    URL.revokeObjectURL(a.href)
  }
  const importJSON = (file, onDone) => {
    const r = new FileReader()
    r.onload = () => { try { const data = JSON.parse(r.result); setS({ ...DEFAULTS, ...data }); onDone(true, data) } catch { onDone(false, null) } }
    r.readAsText(file)
  }
  const clearAll = () => { localStorage.removeItem(KEY); setS(loadState()) }
  return { s, patch, setDone, setNote, appendNote, undoNote, toggleList, exportJSON, importJSON, clearAll }
}

export function useReveal(dep) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    els.forEach(el => el.classList.add('in'))
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.08 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [dep])
}

export function streakOf(done) {
  const dates = new Set(Object.values(done))
  let streak = 0
  const d = new Date()
  if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
export function todayStr() { return new Date().toISOString().slice(0, 10) }
