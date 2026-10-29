import React, { useMemo, useRef, useState } from 'react'
import { ALL_DAYS, DAY_BY_ID } from '../dayIndex.js'
import { chatCompletion, hasConfig } from '../llm.js'
import { dayPrompt, masterPrompt, aiBriefSystem, extractMarkdownBlock, FEATURES, SCALES, STACKS } from '../promptStudio.js'

// Prompt Studio: viết prompt cho coding agent dựa trên kho lý thuyết BEApp.
// Tab 1 "Theo ngày lý thuyết": prompt chỉ đạo agent cho từng phần học (offline).
// Tab 2 "Tổng cho dự án": form scale/tính năng → prompt tổng offline + chatbot
// "tổng nhận" (cần key) phỏng vấn làm rõ rồi trả về bản prompt tổng đầy đủ —
// nạp về khung bên phải và xuất file .md cho user.

function downloadText(name, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; a.click()
  URL.revokeObjectURL(a.href)
}

async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); alert(okMsg) }
  catch { alert('Clipboard bị chặn — hãy bôi đen nội dung và sao chép thủ công.') }
}

export function PromptStudioView({ s, dayId }) {
  const [tab, setTab] = useState('day')

  // ---- Tab 1: prompt theo ngày lý thuyết ----
  const [selDay, setSelDay] = useState(dayId || 1)
  const day = DAY_BY_ID[selDay] || ALL_DAYS[0]
  const dayMd = useMemo(() => dayPrompt(day), [day])

  // ---- Tab 2: prompt tổng cho dự án ----
  const [form, setForm] = useState({ name: '', desc: '', scale: 'mvp', stack: STACKS[0], features: ['auth'], extra: '' })
  const [master, setMaster] = useState('') // bản nạp từ chatbot tổng nhận (đè bản dựng từ form)
  const formMd = useMemo(() => masterPrompt(form), [form])
  const finalMd = master.trim() || formMd
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleFeature = (id) => setForm(f => ({ ...f, features: f.features.includes(id) ? f.features.filter(x => x !== id) : [...f.features, id] }))

  // ---- Chatbot tổng nhận ----
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const abortRef = useRef(null)
  const chatRef = useRef(null)
  const hasKey = hasConfig(s.llm)

  const send = async (text) => {
    const q = (typeof text === 'string' ? text : input).trim()
    if (!q || busy) return
    if (!hasKey) { setErr('Chưa có API key. Vào Cài đặt → AI Gia sư để dán key (AQ./AIza hoặc gsk_ — hỗ trợ nhiều key xoay vòng).'); return }
    const next = [...msgs, { role: 'user', content: q }]
    setMsgs(next); setInput(''); setErr(''); setBusy(true)
    try {
      abortRef.current = new AbortController()
      const sys = aiBriefSystem(form)
      const history = next.slice(-14).map(m => ({ role: m.role, content: m.content }))
      const acc = await chatCompletion(s.llm || {}, [{ role: 'system', content: sys }, ...history], { signal: abortRef.current.signal, maxTokens: 1600 })
      setMsgs(cur => [...cur, { role: 'assistant', content: acc || '(Trống)' }])
      // Tự nạp block markdown mới nhất vào khung prompt tổng.
      const block = extractMarkdownBlock(acc)
      if (block) setMaster(block)
    } catch (e) {
      if (e?.name !== 'AbortError') setErr(String(e.message || e))
    }
    setBusy(false)
  }

  const MasterBar = () => <div className="row" style={{ marginTop: 8 }}>
    <button className="btn small" onClick={() => copyText(finalMd, 'Đã sao chép prompt tổng vào clipboard.')}>Sao chép</button>
    <button className="btn ghost small" onClick={() => downloadText(`prompt-tong-${(form.name || 'du-an').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}.md`, finalMd)}>⬇️ Xuất .md</button>
    {master.trim() && <button className="btn ghost small" onClick={() => setMaster('')}>Quay về bản dựng từ form</button>}
    <span className="mut">{master.trim() ? 'Đang dùng bản từ chatbot tổng nhận.' : 'Đang dùng bản dựng tự động từ form (có key thì chat để tinh chỉnh).'}</span>
  </div>

  return <div>
    <div className="eyebrow">Prompt Studio</div>
    <h2 style={{ letterSpacing: '-.02em', margin: '6px 0' }}>Viết prompt cho agent đi đúng hướng backend</h2>
    <p className="mut">Prompt được ghép từ chính kho lý thuyết BEApp: kiến thức bắt buộc, bẫy agent từng ngày, tiêu chí đạt và kỷ luật chung (persistence contract, idempotency, test bắt buộc, ADR…). Xuất file .md dán thẳng cho Cursor/Claude Code/Copilot.</p>
    <div className="row" style={{ margin: '10px 0 4px' }}>
      <button className={tab === 'day' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('day')}>Theo ngày lý thuyết</button>
      <button className={tab === 'project' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('project')}>Tổng cho dự án + chatbot tổng nhận</button>
    </div>

    {tab === 'day' && <div className="ps-cols" style={{ marginTop: 10 }}>
      <div className="card">
        <label>Chọn ngày lý thuyết</label>
        <select value={selDay} onChange={e => setSelDay(Number(e.target.value))}>
          {ALL_DAYS.map(d => <option key={d.id} value={d.id}>Ngày {d.id} — {d.title}{d.isCheckpoint ? ' (checkpoint)' : ''}</option>)}
        </select>
        <p className="mut">Prompt gồm: vai trò & bối cảnh, kiến thức bắt buộc (kèm giải thích sâu nếu có), <strong>bẫy agent của ngày đó thành ràng buộc cứng</strong>, điều kiện đạt thành self-check, bài kiểm chứng và cách làm việc. Ngày này: {day.concepts.length} khái niệm · {day.criteria?.length || 0} tiêu chí.</p>
        <div className="row">
          <button className="btn small" onClick={() => copyText(dayMd, 'Đã sao chép prompt ngày ' + day.id + '.')}>Sao chép</button>
          <button className="btn ghost small" onClick={() => downloadText(`prompt-agent-ngay-${day.id}.md`, dayMd)}>⬇️ Xuất .md</button>
        </div>
      </div>
      <pre className="code" style={{ maxHeight: 620, overflowY: 'auto', margin: 0 }}>{dayMd}</pre>
    </div>}

    {tab === 'project' && <div className="ps-cols" style={{ marginTop: 10 }}>
      <div>
        <div className="card">
          <strong>1. Thông tin dự án</strong>
          <label>Tên dự án</label><input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="VD: Shop Bán Cà Phê" />
          <label>Mô tả ngắn (làm gì, cho ai)</label>
          <textarea value={form.desc} onChange={e => setF('desc', e.target.value)} style={{ minHeight: 70 }} placeholder="VD: Web bán hàng cà phê, khách đặt online, quản lý tồn kho, thanh toán chuyển khoản…" />
          <label>Quy mô</label>
          <select value={form.scale} onChange={e => setF('scale', e.target.value)}>
            {SCALES.map(sc => <option key={sc.id} value={sc.id}>{sc.label}</option>)}
          </select>
          <label>Stack</label>
          <select value={form.stack} onChange={e => setF('stack', e.target.value)}>
            {STACKS.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          <label>Tính năng (chọn nhiều — mỗi tính năng kéo theo đúng domain BEApp)</label>
          <div className="chips" style={{ padding: 0 }}>
            {FEATURES.map(f => <button key={f.id} className={`chip ${form.features.includes(f.id) ? 'on' : ''}`} onClick={() => toggleFeature(f.id)}>{f.label}</button>)}
          </div>
          <label>Ràng buộc thêm (tuỳ chọn)</label>
          <textarea value={form.extra} onChange={e => setF('extra', e.target.value)} style={{ minHeight: 60 }} placeholder="VD: SLA p99 300ms; tuân thủ bảo mật dữ liệu khách; ngân sách cloud tối đa…" />
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <strong>2. Chatbot tổng nhận {hasKey ? '' : <span className="mut">(cần key AI ở Cài đặt)</span>}</strong>
          <p className="mut">Bot sẽ hỏi làm rõ scale và nhu cầu (tối đa 5 câu), mỗi lượt trả về bản prompt tổng cập nhật dần — bản mới nhất tự nạp vào khung bên phải để bạn xuất .md.</p>
          {!msgs.length && <div className="chips" style={{ padding: 0 }}>
            <button className="chip" onClick={() => send('Hãy phỏng vấn tôi để làm rõ yêu cầu, bắt đầu từ câu quan trọng nhất.')}>Phỏng vấn tôi để làm rõ yêu cầu</button>
            <button className="chip" onClick={() => send('Form bên trái đã đủ thông tin — chốt bản prompt tổng luôn, không cần hỏi thêm.')}>Form đã đủ — chốt luôn</button>
          </div>}
          <div className="chat-msgs" style={{ maxHeight: 300 }} ref={chatRef}>
            {msgs.map((m, i) => <div key={i} className={`bubble ${m.role === 'user' ? 'user' : 'ai'}`}>{m.content.length > 400 && m.role === 'assistant'
              ? <>{m.content.slice(0, 400)}… <span className="mut">(đã nạp bản prompt đầy đủ sang khung bên phải)</span></>
              : m.content}</div>)}
            {busy && <div className="bubble ai"><span className="typing">Tổng nhận đang đọc form và soạn câu hỏi…</span></div>}
            {err && <p className="warn">{err}</p>}
          </div>
          <div className="chat-input">
            <input style={{ flex: 1 }} value={input} placeholder={hasKey ? 'Trả lời câu hỏi của tổng nhận… (Enter để gửi)' : 'Cần API key — vào Cài đặt → AI Gia sư'} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
            {busy
              ? <button className="btn small" onClick={() => abortRef.current?.abort()}>Dừng</button>
              : <button className="btn small" disabled={!input.trim() || !hasKey} onClick={() => send()}>Gửi</button>}
          </div>
        </div>
      </div>
      <div>
        <div className="card">
          <strong>Prompt tổng (markdown) — bản mới nhất, chỉnh sửa được trước khi xuất</strong>
          <textarea value={finalMd} onChange={e => setMaster(e.target.value)} style={{ minHeight: 560, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre' }} />
          <MasterBar />
        </div>
      </div>
    </div>}
  </div>
}
