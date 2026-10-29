import React, { useEffect, useMemo, useRef, useState } from 'react'
import { chatCompletion, detectProvider } from '../llm.js'
import { buildContextBundle, MODE_LABEL } from '../tutorContext.js'

// Khung chat gia sư bám bài, gắn ở từng phần: bài tập, lab, khái niệm, checkpoint.
// Lịch sử hội thoại được gửi kèm mỗi request (system + N tin gần nhất) nên câu
// follow-up kiểu "vì sao sửa A hết mà sửa B không" giữ được bối cảnh.
// Session lưu ở key localStorage riêng (beapp-chats-v1), không phình state chính.

const CHAT_KEY = 'beapp-chats-v1'
const MAX_STORED = 30 // tin nhắn giữ trong localStorage mỗi phiên
const MAX_SENT = 16   // tin nhắn gửi kèm mỗi request (cửa sổ trượt)

function loadChats() { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {} } catch { return {} } }
function saveChats(all) { try { localStorage.setItem(CHAT_KEY, JSON.stringify(all)) } catch { /* hết dung lượng thì bỏ qua */ } }

export function TutorChat({ s, day, kind, index, lab, openedHints = 0 }) {
  const scope = `${kind}-${day.id}${kind === 'lab' && lab ? `-${lab.id}` : index !== undefined ? `-${index}` : ''}`
  const cfg = s.llm || {}
  const [open, setOpen] = useState(false)
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
  }, [msgs, scope])
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, pending, busy])

  const hasCredential = !!cfg.key || detectProvider(cfg) === 'custom'

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

  if (!open) return <button className="btn ghost small chat-quick" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>💬 Gia sư bám bài — {MODE_LABEL[kind] || kind}{msgs.length ? ` · ${msgs.length} tin nhắn` : ''}</button>

  return <div className="chatbox">
    <div className="chat-head">
      <span className="pill">{MODE_LABEL[kind] || kind}</span>
      <small className="mut">{bundle.meta}</small>
      <span className="chat-tools">
        <button className="btn ghost small" onClick={copyContext}>Sao chép bối cảnh</button>
        <button className="btn ghost small" onClick={clear}>Đoạn chat mới</button>
        <button className="btn ghost small" onClick={() => setOpen(false)}>Thu gọn ▲</button>
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
