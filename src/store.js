import { useEffect, useState } from 'react'

const KEY = 'beapp-v1'

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { done: {}, scores: {}, notes: {}, criteria: {}, review: {}, capstone: {}, flashKnown: {}, startDate: '', reminder: '07:00', pomodoroDone: 0 }
    return { done: {}, scores: {}, notes: {}, criteria: {}, review: {}, capstone: {}, flashKnown: {}, startDate: '', reminder: '07:00', pomodoroDone: 0, ...JSON.parse(raw) }
  } catch { return { done: {}, scores: {}, notes: {}, criteria: {}, review: {}, capstone: {}, flashKnown: {}, startDate: '', reminder: '07:00', pomodoroDone: 0 } }
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
  const setNote = (k, v) => setS(prev => ({ ...prev, notes: { ...prev.notes, [k]: v } }))
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
    r.onload = () => { try { setS(JSON.parse(r.result)); onDone(true) } catch { onDone(false) } }
    r.readAsText(file)
  }
  const clearAll = () => { localStorage.removeItem(KEY); setS(loadState()) }
  return { s, patch, setDone, setNote, toggleList, exportJSON, importJSON, clearAll }
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
