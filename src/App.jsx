import React, { useMemo, useState, useEffect, useRef } from 'react'
import { DAYS, WEEKS, REVIEW_CHECKLIST, CAPSTONE_RUBRIC } from './data/days.js'
import { DAY_EXTRA } from './data/dayExtra.js'
import { useProgress, useReveal, streakOf, addDays, todayStr } from './store.js'

export function enrichDay(day) {
  const ex = DAY_EXTRA[day.id]
  if (!ex) return day
  return {
    ...day,
    concepts: day.concepts.map((c, i) => ({ ...c, ...(ex.conceptExtras?.[i] || {}) })).concat(ex.extraConcepts || []),
    exercises: day.exercises.map((e, i) => ({ ...e, ...(ex.exerciseExtras?.[i] || {}) })),
    links: ex.links || [],
  }
}
const ALL_DAYS = DAYS.map(enrichDay)
const DAY_BY_ID = Object.fromEntries(ALL_DAYS.map(d => [d.id, d]))

function dayProgress(s, day) {
  const notesCount = day.exercises.filter((_, i) => (s.notes?.[`${day.id}-${i}`] || '').trim()).length
  const ticked = day.criteria.filter((_, i) => s.criteria?.[day.id]?.[i]).length
  return { notesCount, ticked, totalCriteria: day.criteria.length, inProgress: notesCount > 0 || ticked > 0 }
}
function reviewDue(s) {
  const today = todayStr()
  const out = []
  ALL_DAYS.forEach(d => d.concepts.forEach((c, i) => {
    const r = s.srs?.[`${d.id}-${i}`]
    if (r && r.status === 'unknown' && r.due <= today) out.push({ day: d, concept: c, due: r.due, reason: 'Thẻ flashcard chưa thuộc, đến hạn ôn' })
  }))
  ALL_DAYS.forEach(d => { if (s.scores[d.id] !== undefined && s.scores[d.id] <= 2) out.push({ day: d, concept: null, due: null, reason: `Điểm tự chấm thấp (${s.scores[d.id]}/5)` }) })
  ALL_DAYS.forEach(d => { const p = dayProgress(s, d); if (!s.done[d.id] && p.ticked < p.totalCriteria && p.inProgress) out.push({ day: d, concept: null, due: null, reason: `Còn ${p.totalCriteria - p.ticked} tiêu chí chưa tick` }) })
  return out
}
function fmtDate(iso) { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
function fmtTime(iso) { if (!iso) return ''; const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(e) { return { err: e } }
  render() {
    if (this.state.err) return <div className="card"><h2>Có lỗi ở phần này</h2><p className="mut">{String(this.state.err.message || this.state.err)}</p><button className="btn" onClick={() => { this.setState({ err: null }); this.props.onHome && this.props.onHome() }}>Về trang chính</button></div>
    return this.props.children
  }
}
function Ring({ pct }) {
  const r = 52, c = 2 * Math.PI * r
  return <svg className="ring" viewBox="0 0 120 120" aria-label={`Hoàn thành ${pct}%`}><circle cx="60" cy="60" r={r} fill="none" stroke="#1a2338" strokeWidth="10" /><circle cx="60" cy="60" r={r} fill="none" stroke="#c6f24e" strokeWidth="10" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" transform="rotate(-90 60 60)" /><text x="60" y="66" textAnchor="middle" fill="#eaf0ff" fontSize="22" fontWeight="900">{pct}%</text></svg>
}
function PomodoroCard({ pomo, onToggle, onReset, onSet }) {
  const mm = String(Math.floor(pomo.sec / 60)).padStart(2, '0'), ss = String(pomo.sec % 60).padStart(2, '0')
  return <div className="card"><strong>Pomodoro tập trung</strong><div className="stat">{mm}:{ss}</div><div className="row"><button className="btn small" onClick={onToggle}>{pomo.run ? 'Tạm dừng' : 'Bắt đầu'}</button><button className="btn ghost small" onClick={() => onReset(25 * 60)}>Đặt lại 25 phút</button><button className="btn ghost small" onClick={() => onReset(50 * 60)}>50 phút</button><button className="btn ghost small" onClick={() => onSet(25 * 60)}>Chọn 25 phút</button></div><p className="mut">Đồng hồ này sống ở cấp app, đổi tab không bị reset. Hết 1 phiên thì ghi 1 dòng kết quả vào ghi chú bài tập, đừng chỉ bấm đồng hồ.</p></div>
}
function Dashboard({ go, s }) {
  const doneCount = Object.keys(s.done).length
  const pct = Math.round(doneCount / 30 * 100)
  const next = ALL_DAYS.find(d => !s.done[d.id]) || ALL_DAYS[29]
  const scores = Object.values(s.scores)
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'
  const due = reviewDue(s)
  const exDone = ALL_DAYS.reduce((a, d) => a + dayProgress(s, d).notesCount, 0)
  const exTotal = ALL_DAYS.reduce((a, d) => a + d.exercises.length, 0)
  return <div>
    <section className="hero reveal"><div className="aurora" aria-hidden="true"><i /><i /></div><div style={{ position: 'relative' }}>
      <div className="eyebrow">01 / Lộ trình · Java Backend Senior</div>
      <h1>Học sâu, <em>làm thật,</em><br />chấm thật.</h1>
      <p>30 ngày theo đúng Doc bạn đã làm. Mỗi ngày có khái niệm, bài tập, tiêu chí đạt và bẫy agent. Mở app là biết hôm nay học gì, không phải đi tìm.</p>
      <div className="row"><button className="btn" onClick={() => go('day', next.id)}>Học tiếp: Ngày {next.id} — {next.title} →</button><button className="btn ghost" onClick={() => go('timeline')}>Xem timeline 30 ngày</button></div>
    </div></section>
    <div className="marquee" aria-hidden="true"><div>{'JVM · Spring Boot · REST · DTO · SQL · JPA · MongoDB · Redis · Kafka · Saga · Resilience · CAP · DDD · OAuth2 · Observability · Docker · Testing · ADR · '.repeat(3)}</div></div>
    <div className="grid">
      <div className="card reveal"><Ring pct={pct} /><p><strong>{doneCount}/30 ngày đã xong · {exDone}/{exTotal} bài tập đã có ghi chú</strong><br /><span className="mut">Streak: {streakOf(s.done)} ngày · Điểm tự chấm trung bình: {avg}/5 · Pomodoro đã xong: {s.pomodoroDone || 0} phiên{s.pomodoroMinutes ? ` (${s.pomodoroMinutes} phút tập trung)` : ''}{s.pomodoroInterrupted ? `, ${s.pomodoroInterrupted} phiên dở` : ''}</span></p><div className="progress"><i style={{ width: pct + '%' }} /></div></div>
      <div className="card reveal"><div className="eyebrow">Hôm nay nên học</div><h3>Ngày {next.id} — {next.title}</h3><p className="mut">{next.goal}</p>
        {s.startDate && <p className="mut">Lịch của bạn: Ngày 1 = {fmtDate(s.startDate)}, Ngày 7 = {fmtDate(addDays(s.startDate, 6))}, Ngày 30 = {fmtDate(addDays(s.startDate, 29))}.</p>}
        <button className="btn small" onClick={() => go('day', next.id)}>Vào ngày này</button></div>
      <div className="card reveal"><div className="eyebrow">Ôn lại hôm nay</div>
        {due.length ? due.slice(0, 6).map((r, i) => <p key={i}>{r.concept ? `Ngày ${r.day.id} — ${r.concept.t} ` : `Ngày ${r.day.id} — ${r.day.title} `}<span className="mut">({r.reason}{r.due ? `, hẹn ${fmtDate(r.due)}` : ''})</span> <button className="btn ghost small" onClick={() => go('day', r.day.id, undefined, 'flash')}>Ôn</button></p>)
          : <p className="mut">Chưa có thẻ nào đến hạn ôn. Đánh dấu thẻ là “Chưa thuộc” ở Flashcard thì mai nó sẽ hiện ở đây, kèm ngày hẹn ôn.</p>}
      </div>
      <div className="card reveal"><div className="eyebrow">Cài app lên laptop</div><p>Mở web này bằng Chrome hoặc Edge, chọn Install app / Cài đặt ứng dụng. Biểu tượng sẽ xuất hiện ngoài desktop và taskbar, mở thành cửa sổ riêng và chạy offline.</p><button className="btn ghost small" onClick={() => go('settings')}>Hướng dẫn cài đặt</button></div>
    </div>
    <h2 style={{ marginTop: 28 }}>5 tuần, nhìn 1 lần là nhớ</h2>
    <div className="grid">{WEEKS.map(w => <div className="card reveal" key={w.n}><div className="eyebrow">Tuần {w.n}</div><h3>{w.name}</h3><p className="mut">Ngày {w.days[0]}–{w.days[w.days.length - 1]} · {w.days.filter(id => s.done[id]).length}/{w.days.length} ngày xong</p><button className="btn ghost small" onClick={() => go('timeline', undefined, w.n)}>Xem tuần này</button></div>)}</div>
  </div>
}
function Timeline({ go, s, week, setWeek }) {
  const list = week === 0 ? ALL_DAYS : ALL_DAYS.filter(d => d.week === week)
  return <div><h2>Timeline 30 ngày</h2><p className="mut">Bấm vào 1 ngày để học. Viền xanh = đã xong, viền tím = đang làm dở (đã có ghi chú hoặc đã tick tiêu chí nhưng chưa đánh dấu xong).</p>
    <div className="row">{[0, 1, 2, 3, 4, 5].map(w => <button key={w} className={week === w ? 'btn small' : 'btn ghost small'} onClick={() => setWeek(w)}>{w === 0 ? 'Tất cả' : `Tuần ${w}`}</button>)}</div>
    <div className="daygrid" style={{ marginTop: 16 }}>{list.map(d => { const pr = dayProgress(s, d); return <button key={d.id} className={`daycard ${s.done[d.id] ? 'done' : pr.inProgress ? 'progress' : ''}`} onClick={() => go('day', d.id)}><small>NGÀY {d.id} · TUẦN {d.week}</small><div><strong>{d.title}</strong></div><small>{s.done[d.id] ? `✓ Xong ${s.done[d.id]}` : pr.inProgress ? `Đang làm: ${pr.notesCount}/${d.exercises.length} bài tập có ghi chú, ${pr.ticked}/${pr.totalCriteria} tiêu chí` : (s.scores[d.id] !== undefined ? `Điểm tự chấm: ${s.scores[d.id]}/5` : 'Chưa học')}</small></button> })}</div>
  </div>
}
function Highlight({ text, q }) {
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return <>{text.slice(0, idx)}<mark>{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>
}
function SearchView({ go, s }) {
  const [q, setQ] = useState('')
  const res = useMemo(() => {
    if (q.trim().length < 2) return []
    const k = q.toLowerCase()
    return ALL_DAYS.map(d => {
      const noteHits = d.exercises.map((_, i) => s.notes?.[`${d.id}-${i}`] || '').filter(t => t.toLowerCase().includes(k))
      const conceptHit = d.concepts.find(c => (c.t + ' ' + c.d).toLowerCase().includes(k))
      const base = (d.title + ' ' + d.goal + ' ' + d.concepts.map(c => c.t + ' ' + c.d).join(' ') + ' ' + d.exercises.map(e => e.t).join(' ')).toLowerCase().includes(k)
      return base || noteHits.length ? { d, noteHits, conceptHit } : null
    }).filter(Boolean)
  }, [q, s.notes])
  return <div><h2>Tìm kiếm toàn app</h2><input style={{ width: '100%', padding: 12 }} placeholder="Gõ ít nhất 2 ký tự, ví dụ: JWT, Saga, N+1, cache…" value={q} onChange={e => setQ(e.target.value)} />
    <p className="mut">Tìm trong tiêu đề, mục tiêu, khái niệm, bài tập và ghi chú của bạn.</p>
    {q.trim().length >= 2 && <p className="mut">{res.length} kết quả</p>}
    <div className="grid">{res.map(({ d, noteHits, conceptHit }) => <div className="card" key={d.id}><div className="eyebrow">Ngày {d.id}</div><h3><Highlight text={d.title} q={q} /></h3><p className="mut"><Highlight text={d.goal} q={q} /></p>{conceptHit && <p className="mut">Khớp khái niệm: <Highlight text={conceptHit.t} q={q} /></p>}{noteHits.length > 0 && <p className="mut">Khớp {noteHits.length} ghi chú của bạn ở ngày này.</p>}<button className="btn small" onClick={() => go('day', d.id)}>Vào ngày này</button></div>)}</div>
    <h3 style={{ marginTop: 24 }}>Thuật ngữ hay gặp</h3><p className="mut">Idempotency: gửi lại cùng 1 thao tác mà kết quả không đổi. Circuit Breaker: ngắt mạch khi service lỗi liên tục. Aggregate: ranh giới transaction và invariant trong DDD. Outbox: ghi event cùng transaction với dữ liệu nghiệp vụ rồi gửi sau. N+1: 1 query lấy danh sách rồi N query lấy từng item con.</p></div>
}

function mdPreview(text) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^- (.*)$/gm, '<li>$1</li>').replace(/\n/g, '<br/>')
}
function DayView({ day, go, p, pomo, onTogglePomo, onResetPomo, onSetPomo, tab, setTab }) {
  const { s, setDone, setNote, appendNote, undoNote, toggleList, patch } = p
  const prev = DAY_BY_ID[day.id - 1], next = DAY_BY_ID[day.id + 1]
  const [toast, setToast] = useState('')
  const [openSet, setOpenSet] = useState(() => new Set([0]))
  const [preview, setPreview] = useState({})
  useEffect(() => { setOpenSet(new Set([0])) }, [day.id])
  useEffect(() => { patch({ lastView: { view: 'day', dayId: day.id, tab } }) }, [tab, day.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const pr = dayProgress(s, day)
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }
  const copyTemplate = async (text) => {
    try { await navigator.clipboard.writeText(text); showToast('Đã sao chép template.') }
    catch { showToast('Không sao chép được (clipboard bị chặn). Hãy bôi đen template và sao chép thủ công.') }
  }
  const suggested = Math.round(pr.ticked / Math.max(1, pr.totalCriteria) * 5)
  return <div>
    <div className="eyebrow">Ngày {day.id} · Tuần {day.week} {day.isCheckpoint ? '· Checkpoint' : ''}</div>
    <h2 style={{ fontSize: 34, letterSpacing: '-.03em', margin: '6px 0' }}>{day.title}</h2>
    <p className="mut">{day.goal}</p>
    <p className="mut">Bài tập: {pr.notesCount}/{day.exercises.length} đã có ghi chú · Tiêu chí: {pr.ticked}/{pr.totalCriteria} đã tick · {pomo.run ? `Pomodoro đang chạy ${String(Math.floor(pomo.sec / 60)).padStart(2, '0')}:${String(pomo.sec % 60).padStart(2, '0')}` : 'Pomodoro đang dừng'}</p>
    <div className="row tabrow">
      <button className={tab === 'learn' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('learn')}>Học</button>
      <button className={tab === 'do' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('do')}>Làm bài tập</button>
      <button className={tab === 'flash' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('flash')}>Flashcard ôn tập</button>
      <button className={tab === 'check' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('check')}>Tự chấm</button>
      <button className="btn ghost small" onClick={() => window.print()}>In / Lưu PDF ngày này</button>
    </div>
    {toast && <div className="banner" role="status">{toast}</div>}
    {tab === 'learn' && <div className="paper" style={{ marginTop: 16 }}>
      <div className="row"><h3 style={{ margin: 0 }}>Khái niệm phải nắm</h3><button className="btn ghost small" onClick={() => setOpenSet(new Set(day.concepts.map((_, i) => i)))}>Mở tất cả</button><button className="btn ghost small" onClick={() => setOpenSet(new Set())}>Thu tất cả</button></div>
      {day.concepts.map((c, i) => <details key={i} open={openSet.has(i)} onToggle={(e) => setOpenSet(prevSet => { const n = new Set(prevSet); if (e.target.open) n.add(i); else n.delete(i); return n })}>
        <summary>{c.t} {c.priority && <span className="tag">{c.priority}</span>}</summary><p>{c.d}</p>
        {c.ex && <><strong>Ví dụ:</strong><pre className="code">{c.ex}</pre></>}
        {c.diagram && <><strong>Sơ đồ:</strong><pre className="code">{c.diagram}</pre></>}
        {c.symptom && <p><strong>Sai ở đây thì:</strong> {c.symptom}</p>}
      </details>)}
      {day.links && day.links.length > 0 && <div style={{ marginTop: 14 }}><strong>Liên kết chéo:</strong>{day.links.map(l => <span key={l.to}> <button className="btn ghost small" onClick={() => go('day', l.to)}>{l.label}</button></span>)}</div>}
      <div className="warn" style={{ marginTop: 16 }}><strong>Bẫy agent thường gặp:</strong> {day.trap}</div>
      <div style={{ marginTop: 16 }}><PomodoroCard pomo={pomo} onToggle={onTogglePomo} onReset={onResetPomo} onSet={onSetPomo} /></div>
    </div>}
    {tab === 'do' && <div style={{ marginTop: 16 }}>
      {day.exercises.map((e, i) => {
        const key = `${day.id}-${i}`
        const note = s.notes[key] || ''
        const words = note.trim() ? note.trim().split(/\s+/).length : 0
        return <div className="card" key={i} style={{ marginBottom: 14 }}><h3>Bài {i + 1}: {e.t}</h3><p className="mut">{e.d}</p>
          {e.material && <details open><summary><strong>Gói vật liệu để làm bài (không cần app thật)</strong></summary><pre className="code">{e.material}</pre></details>}
          <div className="row"><button className="btn ghost small" onClick={() => copyTemplate(e.template)}>Sao chép template</button><button className="btn ghost small" onClick={() => { appendNote(key, e.template); showToast('Đã chèn template vào cuối ghi chú. Bấm Hoàn tác nếu muốn trở lại bản trước.') }}>Chèn template vào cuối ghi chú</button>
            {s.noteUndo?.[key] !== undefined && <button className="btn ghost small" onClick={() => { undoNote(key); showToast('Đã hoàn tác lần chèn vừa rồi.') }}>Hoàn tác lần chèn vừa rồi</button>}</div>
          <label>Ghi chú / output của bạn</label>
          <textarea value={note} onChange={ev => setNote(key, ev.target.value)} placeholder="Viết output ở đây: sơ đồ, contract, bảng review, ADR… Người khác đọc được mới tính là xong." />
          <p className="mut">{words} từ · {s.notesSavedAt?.[key] ? `Đã lưu lúc ${fmtTime(s.notesSavedAt[key])}` : 'Chưa lưu gì'} · <button className="btn ghost small" onClick={() => setPreview(prevP => ({ ...prevP, [key]: !prevP[key] }))}>{preview[key] ? 'Sửa tiếp' : 'Xem trước markdown'}</button></p>
          {preview[key] && <div className="paper" style={{ padding: 14 }} dangerouslySetInnerHTML={{ __html: mdPreview(note || '(Chưa có ghi chú)') }} />}
          {e.answer && <details><summary><strong>Xem đáp án mẫu — làm trước rồi mới đối chiếu</strong></summary><p>{e.answer}</p>{e.rubric && <><strong>Bài làm đạt khi có đủ:</strong><ul>{e.rubric.map((r, j) => <li key={j}>{r}</li>)}</ul></>}</details>}
        </div>
      })}
      {day.id === 28 && <div className="card"><h3>Checklist review code agent (tick từng mục khi đã kiểm tra)</h3>{REVIEW_CHECKLIST.map((c, i) => <label key={i} style={{ fontWeight: 400 }}><input type="checkbox" checked={!!s.review?.[day.id]?.[i]} onChange={() => toggleList('review', day.id, i)} /> {c}</label>)}</div>}
      {day.id === 30 && <div className="card"><h3>Rubric capstone (mỗi phần 0–2 điểm)</h3>{CAPSTONE_RUBRIC.map((c, i) => <div key={i}><label>{c.t} — {c.d}</label><select value={s.capstone?.[i] ?? ''} onChange={ev => patch({ capstone: { ...s.capstone, [i]: Number(ev.target.value) } })}><option value="">Chưa chấm</option><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></div>)}<p><strong>Tổng: {Object.values(s.capstone || {}).reduce((a, b) => a + (Number(b) || 0), 0)}/10.</strong> Dưới 7 thì quay lại ngày yếu nhất và làm lại checkpoint tuần đó.</p></div>}
    </div>}
    {tab === 'flash' && <Flashcards key={day.id} day={day} s={s} patch={patch} />}
    {tab === 'check' && <div className="card" style={{ marginTop: 16 }}><h3>Tự chấm ngày này</h3>
      {day.criteria.map((c, i) => <label key={i} style={{ fontWeight: 400 }}><input type="checkbox" checked={!!s.criteria?.[day.id]?.[i]} onChange={() => toggleList('criteria', day.id, i)} /> {c}</label>)}
      <p>Đã tick {pr.ticked}/{pr.totalCriteria} tiêu chí · Đã viết {pr.notesCount}/{day.exercises.length} bài tập.</p>
      <p className="mut">Định nghĩa điểm: 0 = chưa làm · 1–2 = đọc hiểu sơ · 3 = làm được bài tập với gợi ý · 4 = làm được độc lập · 5 = giải thích và bảo vệ được cho người khác. Gợi ý theo tiêu chí đã tick: {suggested}/5 (bạn vẫn sửa tay được).</p>
      <label>Điểm tự chấm cho ngày này (0–5)</label>
      <select value={s.scores[day.id] ?? ''} onChange={ev => patch({ scores: { ...s.scores, [day.id]: Number(ev.target.value) } })}><option value="">Chưa chấm</option>{[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select>
      {s.scores[day.id] === 5 && pr.ticked === 0 && <p className="warn">Cảnh báo: bạn chọn 5 nhưng chưa tick tiêu chí nào. Hãy làm bài tập và tick tiêu chí trước, hoặc hạ điểm xuống cho đúng.</p>}
      <div className="row" style={{ marginTop: 14 }}><button className="btn" onClick={() => {
        if (!pr.inProgress && s.scores[day.id] === undefined) { if (!window.confirm('Bạn chưa có output hay tiêu chí nào. Bạn có chắc muốn đánh dấu xong không?')) return }
        setDone(day.id, true)
      }}>Đánh dấu đã xong ngày này ✓</button>{s.done[day.id] && <button className="btn ghost" onClick={() => setDone(day.id, false)}>Bỏ đánh dấu xong</button>}</div>
      <p className="mut">Chỉ đánh dấu xong khi đã có output ở tab Làm bài tập, không chỉ đọc xong.</p>
    </div>}
    <div className="sticky-nav">
      {prev && <button className="btn ghost small" onClick={() => go('day', prev.id)}>← Ngày {prev.id}</button>}
      <button className="btn ghost small" onClick={() => go('timeline')}>Về Timeline</button>
      {next && <button className="btn small" onClick={() => go('day', next.id)}>Ngày {next.id} →</button>}
    </div>
    <div className="row" style={{ marginTop: 20 }}>
      {prev && <button className="btn ghost" onClick={() => go('day', prev.id)}>← Ngày {prev.id}: {prev.title}</button>}
      {next && <button className="btn" onClick={() => go('day', next.id)}>Ngày {next.id}: {next.title} →</button>}
    </div>
  </div>
}
function Flashcards({ day, s, patch }) {
  const [queue, setQueue] = useState(() => day.concepts.map((_, i) => i))
  const [pos, setPos] = useState(0)
  const [flip, setFlip] = useState(false)
  const [done, setDone] = useState(false)
  const idx = queue[pos]
  const c = day.concepts[idx]
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight') { setPos(p => Math.min(queue.length - 1, p + 1)); setFlip(false) }
      if (e.key === 'ArrowLeft') { setPos(p => Math.max(0, p - 1)); setFlip(false) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [queue.length])
  if (done || pos >= queue.length) {
    const unknownIdx = day.concepts.map((_, i) => i).filter(i => s.srs?.[`${day.id}-${i}`]?.status === 'unknown')
    return <div className="card" style={{ marginTop: 16 }}><h3>Đã ôn hết {day.concepts.length} thẻ</h3><p>{unknownIdx.length} thẻ chưa thuộc. Bấm dưới đây để ôn lại đúng các thẻ đó.</p><button className="btn" disabled={unknownIdx.length === 0} onClick={() => { setQueue(unknownIdx); setPos(0); setFlip(false); setDone(false) }}>Ôn lại các thẻ chưa thuộc</button> <button className="btn ghost" onClick={() => { setQueue(day.concepts.map((_, i) => i)); setPos(0); setFlip(false); setDone(false) }}>Ôn lại từ đầu</button></div>
  }
  if (!c) return null
  const srs = s.srs?.[`${day.id}-${idx}`]
  const mark = (known) => {
    const due = known ? addDays(todayStr(), 3) : addDays(todayStr(), 1)
    patch({ flashKnown: { ...s.flashKnown, [`${day.id}-${idx}`]: known }, srs: { ...s.srs, [`${day.id}-${idx}`]: { status: known ? 'known' : 'unknown', due } } })
    setTimeout(() => {
      setFlip(false)
      if (known) { if (pos + 1 >= queue.length) setDone(true); else setPos(pos + 1) }
      else {
        setQueue(q => { const nq = [...q]; const [cur] = nq.splice(pos, 1); nq.push(cur); return nq })
        // Thẻ chưa thuộc quay lại cuối hàng đợi: vị trí hiện tại giờ là thẻ tiếp theo.
        // Nếu chỉ còn 1 thẻ trong hàng đợi thì kết thúc phiên để tránh lặp vô hạn.
        if (queue.length <= 1) setDone(true)
      }
    }, 300)
  }
  return <div style={{ marginTop: 16 }}>
    <p className="mut">Thẻ {pos + 1}/{queue.length} · Bấm vào thẻ để lật, hoặc dùng phím Space/Enter để lật, phím mũi tên để chuyển thẻ. Thẻ chưa thuộc sẽ quay lại cuối hàng đợi trong phiên này và hẹn ôn vào ngày mai; thẻ đã thuộc hẹn ôn sau 3 ngày.</p>
    <div className="flash" tabIndex={0} role="button" aria-label={`Thẻ flashcard: ${c.t}. Bấm Space hoặc Enter để lật.`} onClick={() => setFlip(!flip)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlip(!flip) } }}><div className={`flash-in ${flip ? 'flipped' : ''}`}>
      <div className="flash-face"><div className="eyebrow">Khái niệm</div><h3>{c.t}</h3><p className="mut">Bấm để xem giải thích</p></div>
      <div className="flash-face flash-back"><div className="eyebrow">Giải thích</div><p>{c.d}</p></div>
    </div></div>
    <div className="row" style={{ marginTop: 12 }}><button className="btn ghost small" onClick={() => { setPos(Math.max(0, pos - 1)); setFlip(false) }}>← Thẻ trước</button><button className="btn small" onClick={() => { if (pos + 1 >= queue.length) setDone(true); else setPos(pos + 1); setFlip(false) }}>Thẻ sau →</button>
      <button className="btn small" onClick={() => mark(true)}>Đã thuộc ✓</button>
      <button className="btn ghost small" onClick={() => mark(false)}>Chưa thuộc, ôn lại</button></div>
    <p className="mut">{srs ? `Ôn lại vào: ${fmtDate(srs.due)} (${srs.status === 'unknown' ? 'chưa thuộc' : 'đã thuộc'}).` : 'Chưa đánh dấu thẻ này.'} Phím tắt: ← → chuyển thẻ, Space/Enter lật thẻ.</p>
  </div>
}
function Settings({ p }) {
  const { s, patch, exportJSON, importJSON, clearAll } = p
  const [msg, setMsg] = useState('')
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [pendingFile, setPendingFile] = useState(null)
  const [importSummary, setImportSummary] = useState('')
  return <div><h2>Cài đặt và cài app lên laptop</h2>
    <div className="card"><h3>1. Cài đặt PWA</h3><ol><li>Mở web này bằng Chrome hoặc Edge trên laptop.</li><li>Trên thanh địa chỉ, bấm biểu tượng Install / Cài đặt, hoặc menu ⋮ → Install app / Cài đặt ứng dụng.</li><li>Biểu tượng BEApp sẽ xuất hiện ngoài desktop, taskbar và Start Menu. Mở từ biểu tượng sẽ ra cửa sổ riêng, không có thanh địa chỉ.</li><li>App chạy offline cho nội dung 30 ngày và bài làm của bạn. Khi có bản mới, app sẽ hiện banner "Có bản mới" — bấm cập nhật, đừng để bản cũ kẹt lại.</li></ol><p className="mut">Lưu ý: nội dung và tiến độ lưu trên trình duyệt của máy bạn. Đổi máy thì dùng Xuất dữ liệu ở dưới rồi Nhập lại. Icon PWA đã có PNG 192 và 512 trong manifest; việc cài từ link deploy thật vẫn cần kiểm chứng sau khi có link Vercel.</p></div>
    <div className="card" style={{ marginTop: 14 }}><h3>2. Lịch học của bạn</h3>
      <label>Ngày bắt đầu lộ trình</label><input type="date" value={s.startDate || ''} onChange={e => patch({ startDate: e.target.value })} />
      {s.startDate && <p className="mut">Lịch của bạn: Ngày 1 = {fmtDate(s.startDate)}, Ngày 7 = {fmtDate(addDays(s.startDate, 6))}, Ngày 30 = {fmtDate(addDays(s.startDate, 29))}. Lịch này cũng hiện ở Dashboard.</p>}
      <label>Giờ nhắc học hàng ngày</label><input type="time" value={s.reminder || '07:00'} onChange={e => patch({ reminder: e.target.value })} />
      <p className="mut">Quyền thông báo hiện tại: {perm}. App không gửi thông báo nền khi chưa mở app. Cách chắc chắn nhất: ghim BEApp lên taskbar và mở vào giờ đã chọn. Số phiên Pomodoro đã xong: {s.pomodoroDone || 0}{s.pomodoroInterrupted ? `, ${s.pomodoroInterrupted} phiên dở` : ''}.</p>
      <button className="btn ghost small" onClick={async () => { try { const r = await Notification.requestPermission(); setPerm(r); if (r === 'granted') new Notification('BEApp nhắc học', { body: 'Đây là thông báo thử. Đến giờ nhắc, hãy mở BEApp và học tiếp ngày đang dở.' }); setMsg(r === 'granted' ? 'Đã gửi thông báo thử.' : 'Quyền thông báo: ' + r + '. Nếu đã chặn, hãy mở lại quyền trong cài đặt trình duyệt cho trang này.') } catch { setMsg('Trình duyệt này không hỗ trợ thông báo.') } }}>Xin quyền và thử nhắc ngay</button>{msg && <p>{msg}</p>}</div>
    <div className="card" style={{ marginTop: 14 }}><h3>3. Sao lưu tiến độ</h3><div className="row"><button className="btn small" onClick={exportJSON}>Xuất dữ liệu ra file JSON</button><label className="btn ghost small">Chọn file để nhập<input type="file" accept="application/json" hidden onChange={e => { if (e.target.files[0]) setPendingFile(e.target.files[0]); e.target.value = '' }} /></label><button className="btn ghost small" onClick={() => { if (window.confirm('Xóa toàn bộ tiến độ và ghi chú? Hành động này không hoàn tác được.')) clearAll() }}>Xóa toàn bộ dữ liệu</button></div>
      {pendingFile && <div className="warn" style={{ marginTop: 12 }}><strong>Nhập file “{pendingFile.name}” sẽ thay thế toàn bộ tiến độ hiện tại.</strong> Bạn đã xuất backup chưa?<div className="row" style={{ marginTop: 8 }}><button className="btn small" onClick={exportJSON}>Xuất backup trước</button><button className="btn" onClick={() => importJSON(pendingFile, (ok, data) => { if (ok) { const days = data?.done ? Object.keys(data.done).length : 0; const notes = data?.notes ? Object.values(data.notes).filter(Boolean).length : 0; setImportSummary(`Đã nhập xong: ${days} ngày xong, ${notes} ghi chú.`); setPendingFile(null) } else setImportSummary('File không đọc được, tiến độ cũ vẫn giữ nguyên.') })}>Nhập và thay thế</button><button className="btn ghost small" onClick={() => setPendingFile(null)}>Hủy</button></div></div>}
      {importSummary && <p>{importSummary}</p>}</div>
  </div>
}
export default function App() {
  const p = useProgress()
  const { s, patch } = p
  const [view, setView] = useState(() => s.lastView?.view || 'home')
  const [dayId, setDayId] = useState(() => s.lastView?.dayId || 1)
  const [dayTab, setDayTab] = useState(() => s.lastView?.tab || 'learn')
  const [timelineWeek, setTimelineWeek] = useState(0)
  const [update, setUpdate] = useState(false)
  const [pomo, setPomo] = useState({ sec: 25 * 60, duration: 25 * 60, run: false, started: false })
  const pomoRef = useRef(pomo); pomoRef.current = pomo
  useEffect(() => { const h = () => setUpdate(true); window.addEventListener('beapp-update', h); return () => window.removeEventListener('beapp-update', h) }, [])
  // Pomodoro sống ở cấp App: đổi tab không reset (P1-09).
  useEffect(() => {
    if (!pomo.run) return
    const t = setInterval(() => {
      setPomo(prev => prev.sec <= 1 ? { ...prev, sec: 0 } : { ...prev, sec: prev.sec - 1 })
    }, 1000)
    return () => clearInterval(t)
  }, [pomo.run])
  // Xử lý kết thúc phiên riêng để tránh side-effect trong setState updater:
  const prevSecRef = useRef(pomo.sec)
  useEffect(() => {
    if (prevSecRef.current > 0 && pomo.sec === 0 && pomo.run) {
      setPomo(prev => ({ ...prev, run: false, started: false }))
      patch({ pomodoroDone: (s.pomodoroDone || 0) + 1, pomodoroMinutes: (s.pomodoroMinutes || 0) + Math.round(pomo.duration / 60) })
    }
    prevSecRef.current = pomo.sec
  }, [pomo.sec, pomo.run])
  const day = DAY_BY_ID[dayId] || ALL_DAYS[0]
  useReveal(view + dayId)
  useEffect(() => { if (view !== 'day') patch({ lastView: { view, dayId } }) }, [view, dayId]) // eslint-disable-line react-hooks/exhaustive-deps
  const go = (v, id, week, tab) => {
    if (id) setDayId(id)
    if (week !== undefined) setTimelineWeek(week)
    // P2-03: vào ngày từ Dashboard/Timeline/Tìm kiếm thì về tab Học;
    // chuyển ngày bằng prev/next trong trang ngày thì giữ nguyên tab đang chọn.
    if (tab) setDayTab(tab)
    else if (v === 'day' && view !== 'day') setDayTab('learn')
    setView(v); window.scrollTo(0, 0)
  }
  const togglePomo = () => setPomo(prev => ({ ...prev, run: !prev.run, started: true }))
  const resetPomo = (dur) => {
    setPomo(prev => {
      if (prev.started && prev.sec < prev.duration) patch({ pomodoroInterrupted: (s.pomodoroInterrupted || 0) + 1 })
      return { sec: dur, duration: dur, run: false, started: false }
    })
  }
  const setPomoDur = (dur) => setPomo(prev => ({ ...prev, sec: dur, duration: dur, run: false, started: false }))
  return <div>
    <header className="topbar"><div className="topbar-in"><div className="logo">BE<span>App</span> <small style={{ fontSize: 13, color: '#93a0be' }}>· 30 ngày Backend Senior</small></div>
      <nav className="nav"><button className={view === 'home' ? 'on' : ''} onClick={() => go('home')}>Trang chính</button><button className={view === 'timeline' ? 'on' : ''} onClick={() => go('timeline')}>Timeline</button><button className={view === 'search' ? 'on' : ''} onClick={() => go('search')}>Tìm kiếm</button><button className={view === 'settings' ? 'on' : ''} onClick={() => go('settings')}>Cài đặt</button></nav>
    </div></header>
    <main className="wrap view" key={view}>
      {(() => {
        if (!s.reminder) return null
        const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes()
        const [rh, rm] = s.reminder.split(':').map(Number); const rmins = rh * 60 + rm
        if (mins < rmins || mins >= rmins + 60) return null
        const next = ALL_DAYS.find(d => !s.done[d.id]) || ALL_DAYS[0]
        return <div className="banner" role="status"><strong>Đến giờ nhắc học hôm nay ({s.reminder}).</strong> Học tiếp: Ngày {next.id} — {next.title} <button className="btn small" onClick={() => go('day', next.id)}>Học tiếp →</button></div>
      })()}
      {update && <div className="banner">Có bản mới của app. <button className="btn small" onClick={() => window.__beappUpdateSW && window.__beappUpdateSW(true)}>Cập nhật ngay</button></div>}
      <Boundary onHome={() => go('home')}>
        {view === 'home' && <Dashboard go={go} s={s} />}
        {view === 'timeline' && <Timeline go={go} s={s} week={timelineWeek} setWeek={setTimelineWeek} />}
        {view === 'day' && <DayView day={day} go={go} p={p} pomo={pomo} onTogglePomo={togglePomo} onResetPomo={resetPomo} onSetPomo={setPomoDur} tab={dayTab} setTab={setDayTab} />}
        {view === 'search' && <SearchView go={go} s={s} />}
        {view === 'settings' && <Settings p={p} />}
      </Boundary>
      <footer>BEApp v1 · Nội dung từ lộ trình 30 ngày trong Google Doc "Theory domains for backend dev". Tiến độ lưu ở localStorage trên máy bạn, không gửi lên server. Mở bằng Chrome/Edge và Install app để dùng như app trên laptop.</footer>
    </main>
  </div>
}
