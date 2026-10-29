import React, { useEffect, useMemo, useRef, useState } from 'react'
import { chatCompletion, detectProvider } from '../llm.js'
import { buildContextBundle, MODE_LABEL } from '../tutorContext.js'
import { DAY_BY_ID } from '../dayIndex.js'
import { LABS } from '../data/labs.js'

// Khung chat gia sư bám bài. Các phần bài học (bài tập, lab, khái niệm, checkpoint)
// chỉ đặt nút "Gia sư bám bài" — bấm nút mở ChatDock nổi bên phải, hội thoại sống
// xuyên suốt khi đổi bài. Lịch sử gửi kèm mỗi request (system + N tin gần nhất).
// Session lưu localStorage key riêng (beapp-chats-v1), không phình state chính.

const CHAT_KEY = 'beapp-chats-v1'
const MAX_STORED = 30 // tin nhắn giữ trong localStorage mỗi phiên
const MAX_SENT = 16   // tin nhắn gửi kèm mỗi request (cửa sổ trượt)

export function loadChats() { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {} } catch { return {} } }
function saveChats(all) { try { localStorage.setItem(CHAT_KEY, JSON.stringify(all)) } catch { /* hết dung lượng thì bỏ qua */ } }

export function scopeOf(kind, dayId, index, lab) {
  return `${kind}-${dayId}${kind === 'lab' && lab ? `-${lab.id}` : index !== undefined ? `-${index}` : ''}`
}

// Sự kiện mở dock: mọi nút inline dispatch, App/ChatDock lắng nghe.
export function openDockChat(detail) { window.dispatchEvent(new CustomEvent('beapp-open-chat', { detail })) }

// Parse scope "exercise-1-0" | "lab-1-1-5" | "concept-3-2" | "defend-7" thành props cho TutorChat.
// Lưu ý: lab id chứa dấu gạch ("1-5") nên phần lab phải join lại từ phần tử thứ 3.
export function resolveChatScope(scope, openedHints = 0) {
  const parts = String(scope).split('-')
  const kind = parts[0]
  const dayId = Number(parts[1])
  const day = DAY_BY_ID[dayId]
  if (!day || !MODE_LABEL[kind]) return null
  if (kind === 'lab') {
    const lab = (LABS[dayId] || []).find(l => l.id === parts.slice(2).join('-'))
    if (!lab) return null
    return { day, kind, lab, openedHints }
  }
  if (kind === 'defend') return { day, kind, openedHints }
  const index = Number(parts[2])
  if (kind === 'exercise' && !day.exercises[index]) return null
  if (kind === 'concept' && !day.concepts[index]) return null
  return { day, kind, index, openedHints }
}

export function scopeLabel(scope) {
  const parts = String(scope).split('-')
  const day = DAY_BY_ID[Number(parts[1])]
  if (!day) return scope
  const kind = parts[0]
  if (kind === 'exercise') return `Ngày ${day.id} · Bài ${Number(parts[2]) + 1}`
  if (kind === 'lab') return `Ngày ${day.id} · Lab ${parts.slice(2).join('-')}`
  if (kind === 'concept') return `Ngày ${day.id} · Khái niệm ${Number(parts[2]) + 1}`
  return `Ngày ${day.id} · Checkpoint`
}

// Nút inline đặt trong từng phần bài học — bấm mở dock.
export function TutorChatButton({ day, kind, index, lab, openedHints = 0, label }) {
  const [count, setCount] = useState(() => loadChats()[scopeOf(kind, day.id, index, lab)]?.msgs?.length || 0)
  useEffect(() => {
    const h = () => setCount(loadChats()[scopeOf(kind, day.id, index, lab)]?.msgs?.length || 0)
    window.addEventListener('beapp-chat-updated', h)
    return () => window.removeEventListener('beapp-chat-updated', h)
  }, [kind, day.id, index, lab])
  return <button className="btn ghost small chat-quick" style={{ marginTop: 10 }}
    onClick={() => openDockChat({ kind, dayId: day.id, index, labId: lab?.id, openedHints })}>
    💬 Gia sư bám bài — {label || MODE_LABEL[kind]}{count ? ` · ${count} tin nhắn` : ''}
  </button>
}

// Panel chat đầy đủ — dùng trong ChatDock hoặc nhúng trực tiếp (Phỏng vấn thử).
export function TutorChat({ s, day, kind, index, lab, openedHints = 0 }) {
  const scope = scopeOf(kind, day.id, index, lab)
  const cfg = s.llm || {}
  const [msgs, setMsgs] = useState(() => loadChats()[scope]?.msgs || [])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const abortRef = useRef(null)
  const listRef = useRef(null)
  const bundle = useMemo(() => buildContextBundle(day, kind, { index, lab, openedHints }, s), [day, kind, index, lab, openedHints, s])

  useEffect(() => {
    const all = loadChats()
    all[scope] = { msgs: msgs.slice(-MAX_STORED), at: Date.now() }
    saveChats(all)
    try { window.dispatchEvent(new Event('beapp-chat-updated')) } catch { /* ignore */ }
  }, [msgs, scope])
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, pending, busy])

  // custom (endpoint riêng) thì bắt buộc có endpoint mới tính là cấu hình xong —
  // key trống + endpoint trống là chưa cấu hình, phải hướng dẫn người học vào Cài đặt.
  const hasCredential = !!cfg.key || (detectProvider(cfg) === 'custom' && !!(cfg.endpoint || '').trim())

  const send = async (text, opts = {}) => {
    const q = (typeof text === 'string' ? text : input).trim()
    if (!q || busy) return
    if (!hasCredential) {
      setErr('Chưa có API key. Vào Cài đặt → AI Gia sư để nhập key (AQ./AIza của Google hoặc gsk_ của Groq). Hoặc bấm "Sao chép bối cảnh" để hỏi ở AI khác bạn đang có.')
      return
    }
    const next = [...msgs, { role: 'user', content: q, at: Date.now() }]
    setMsgs(next); setInput(''); setErr(''); setPending(''); setBusy(true)
    const history = next.slice(-MAX_SENT).map(m => ({ role: m.role, content: m.content }))
    const sys = opts.mode === 'review' && bundle.reviewSystem ? bundle.reviewSystem : bundle.system
    try {
      abortRef.current = new AbortController()
      const acc = await chatCompletion(cfg, [{ role: 'system', content: sys }, ...history], { signal: abortRef.current.signal, onDelta: d => setPending(p => p + d) })
      setMsgs(cur => [...cur, { role: 'assistant', content: acc || '(Không có nội dung trả về)', at: Date.now() }])
    } catch (e) {
      if (e?.name !== 'AbortError') setErr(String(e.message || e))
    }
    setPending(''); setBusy(false)
  }
  const stop = () => abortRef.current?.abort()
  const clear = () => { if (busy) stop(); setMsgs([]); setErr('') }
  const copyContext = async () => {
    const text = bundle.system + (input.trim() ? `\n\nCÂU HỎI CỦA TÔI: ${input.trim()}` : '\n\n(Câu hỏi của tôi sẽ nằm ở đây.)')
    try { await navigator.clipboard.writeText(text); alert('Đã sao chép bối cảnh bài học vào clipboard — dán vào bất kỳ AI nào bạn có.') }
    catch { alert('Clipboard bị chặn, không sao chép được.') }
  }

  return <div className="chatbox">
    <div className="chat-head">
      <span className="pill">{MODE_LABEL[kind] || kind}</span>
      <small className="mut">{bundle.meta}</small>
      <span className="chat-tools">
        <button className="btn ghost small" onClick={copyContext}>Sao chép bối cảnh</button>
        <button className="btn ghost small" onClick={clear}>Đoạn chat mới</button>
      </span>
    </div>
    <div className="chat-msgs" ref={listRef}>
      {!msgs.length && <p className="mut">Gia sư đã đọc xong bối cảnh: {bundle.meta}. Hỏi thẳng hoặc bấm câu hỏi mẫu bên dưới. Lịch sử chat được lưu trên máy bạn.</p>}
      {msgs.map((m, i) => <div key={i} className={`bubble ${m.role === 'user' ? 'user' : 'ai'}`}>{m.content}</div>)}
      {busy && <div className="bubble ai">{pending || <span className="typing">Gia sư đang đọc bối cảnh và soạn trả lời…</span>}</div>}
      {err && <p className="warn">{err}</p>}
    </div>
    {!msgs.length && !busy && <div className="chips">
      {bundle.suggestions.map((q, i) => <button key={i} className="chip" onClick={() => send(q)}>{q}</button>)}
      {kind === 'exercise' && <button className="chip" onClick={() => send('Xin nhận xét bài làm của tôi theo từng tiêu chí đạt: ý nào đạt, ý nào thiếu, ý nào sai.', { mode: 'review' })}>🔍 Xin nhận xét bài làm theo tiêu chí</button>}
    </div>}
    <div className="chat-input">
      <input style={{ flex: 1 }} value={input} placeholder="Hỏi gia sư… (Enter để gửi)" onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
      {busy
        ? <button className="btn small" onClick={stop}>Dừng</button>
        : <button className="btn small" disabled={!input.trim()} onClick={() => send()}>Gửi</button>}
    </div>
  </div>
}
