import React, { useMemo, useState, useEffect, useRef } from 'react'
import { WEEKS, REVIEW_CHECKLIST, CAPSTONE_RUBRIC } from './data/days.js'
import { CONCEPT_EXPLAIN } from './data/conceptExplain.js'
import { QUIZ_EXTRA } from './data/quizExtra.js'
import { LABS } from './data/labs.js'
import { DRILLS } from './data/drills.js'
import { PROVIDERS, detectProvider, keysFor, maskKey, activeKeyIndex, checkKeys, listModels } from './llm.js'
import { useProgress, useReveal, streakOf, addDays, todayStr, sm2Next, masteryLevel } from './store.js'
import { LogSimulator, SpecCalculator, MisconceptionCorner } from './components/Day1Interactive.jsx'
import { LabView, QuizBox, TeachBackBox, AIGraderBox } from './components/Labs.jsx'
import { TutorChatButton, TutorChat } from './components/TutorChat.jsx'
import { ChatDock } from './components/ChatDock.jsx'
import { IncidentDrill } from './components/IncidentDrill.jsx'
import { enrichDay, ALL_DAYS, DAY_BY_ID } from './dayIndex.js'

const DAY_TABS = ['learn', 'do', 'flash', 'check', 'explain', 'lab']

function dayProgress(s, day) {
  const notesCount = day.exercises.filter((_, i) => (s.notes?.[`${day.id}-${i}`] || '').trim()).length
  const ticked = day.criteria.filter((_, i) => s.criteria?.[day.id]?.[i]).length
  return { notesCount, ticked, totalCriteria: day.criteria.length, inProgress: notesCount > 0 || ticked > 0 }
}
function buildReviewQueue(s) {
  const today = todayStr()
  const byKey = new Map()
  const push = (key, item) => { if (!byKey.has(key)) byKey.set(key, item) }
  // SM-2 mới được ưu tiên; dữ liệu ôn cũ (srs) vẫn đọc được để không mất hẹn cũ.
  ALL_DAYS.forEach(d => d.concepts.forEach((c, i) => {
    const r = s.srs2?.[`${d.id}-${i}`]
    if (r && r.due <= today) push(`c-${d.id}-${i}`, { day: d, concept: c, due: r.due, reason: r.status === 'unknown' ? 'Thẻ chưa thuộc, đến hạn ôn (SM-2)' : 'Đến hạn ôn (SM-2)', tab: 'flash' })
  }))
  ALL_DAYS.forEach(d => d.concepts.forEach((c, i) => {
    const r = s.srs?.[`${d.id}-${i}`]
    if (r && r.status === 'unknown' && r.due <= today) push(`c-${d.id}-${i}`, { day: d, concept: c, due: r.due, reason: 'Thẻ flashcard chưa thuộc, đến hạn ôn', tab: 'flash' })
  }))
  ALL_DAYS.forEach(d => { if (s.scores[d.id] !== undefined && s.scores[d.id] <= 2) push(`d-${d.id}`, { day: d, concept: null, due: null, reason: `Điểm tự chấm thấp (${s.scores[d.id]}/5)`, tab: 'check' }) })
  // Nhắc đọc lại teach-back sau 7 ngày kể từ lần viết (hoặc lần đọc lại gần nhất):
  // bản giải thích bằng lời của mình, đọc lại sau 1 tuần để thấy mình hiểu sâu hơn chưa.
  ALL_DAYS.forEach(d => d.concepts.forEach((c, i) => {
    const tb = s.teachBack?.[`${d.id}-${i}`]
    if (!tb?.text) return
    const last = tb.reReadAt || tb.at
    if (!last) return
    const due = addDays(String(last).slice(0, 10), 7)
    if (due <= today) push(`tb-${d.id}-${i}`, { day: d, concept: c, due, reason: `Đọc lại bản teach-back viết ${fmtDate(String(last).slice(0, 10))}`, tab: 'explain' })
  }))
  ALL_DAYS.forEach(d => { const p = dayProgress(s, d); if (!s.done[d.id] && p.ticked < p.totalCriteria && p.inProgress) push(`p-${d.id}`, { day: d, concept: null, due: null, reason: `Còn ${p.totalCriteria - p.ticked} tiêu chí chưa tick`, tab: 'do' }) })
  // Thẻ mới gợi ý: khái niệm đầu tiên của ngày chưa xong mà chưa từng ôn.
  const next = ALL_DAYS.find(d => !s.done[d.id])
  if (next) {
    const ni = next.concepts.findIndex((_, i) => !s.srs2?.[`${next.id}-${i}`] && !s.srs?.[`${next.id}-${i}`])
    if (ni >= 0) push(`n-${next.id}`, { day: next, concept: next.concepts[ni], due: null, reason: 'Thẻ mới gợi ý hôm nay (chưa từng ôn)', tab: 'flash', isNew: true })
  }
  const arr = [...byKey.values()]
  arr.sort((a, b) => {
    if (!!a.isNew !== !!b.isNew) return a.isNew ? 1 : -1
    if (!a.due && b.due) return 1
    if (a.due && !b.due) return -1
    if (a.due && b.due) return a.due < b.due ? -1 : 1
    return 0
  })
  return arr
}
function masteryStats(s) {
  let total = 0, ok = 0, explained = 0
  const weak = []
  const lvCounts = { 'chưa học': 0, 'đã đọc': 0, 'luyện được': 0, 'giải thích được': 0 }
  ALL_DAYS.forEach(d => d.concepts.forEach((c, i) => {
    total++
    const m = s.mastery?.[`${d.id}-${i}`]
    const lv = masteryLevel(m)
    lvCounts[lv] = (lvCounts[lv] || 0) + 1
    if (lv === 'luyện được' || lv === 'giải thích được') ok++
    if (lv === 'giải thích được') explained++
    const r = s.srs2?.[`${d.id}-${i}`]
    if ((r?.lapses || 0) > 0 || s.srs?.[`${d.id}-${i}`]?.status === 'unknown') weak.push({ day: d, concept: c, lapses: r?.lapses || 0 })
  }))
  weak.sort((a, b) => b.lapses - a.lapses)
  return { total, ok, explained, weak: weak.slice(0, 3), lvCounts }
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
const MASTERY_LEVELS = [
  { id: 'chưa học', color: '#232b3f' },
  { id: 'đã đọc', color: '#8b7cff' },
  { id: 'luyện được', color: '#7aa32b' },
  { id: 'giải thích được', color: '#c6f24e' },
]

function Dashboard({ go, s }) {
  const doneCount = Object.keys(s.done).length
  const pct = Math.round(doneCount / 30 * 100)
  const next = ALL_DAYS.find(d => !s.done[d.id]) || ALL_DAYS[29]
  const scores = Object.values(s.scores)
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'
  const due = buildReviewQueue(s)
  const ms = masteryStats(s)
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
      <div className="card reveal"><Ring pct={pct} /><p><strong>{doneCount}/30 ngày đã xong · {exDone}/{exTotal} bài tập đã có ghi chú</strong><br /><span className="mut">Streak: {streakOf(s.done)} ngày · Điểm tự chấm trung bình: {avg}/5 · Pomodoro đã xong: {s.pomodoroDone || 0} phiên{s.pomodoroMinutes ? ` (${s.pomodoroMinutes} phút tập trung)` : ''}{s.pomodoroInterrupted ? `, ${s.pomodoroInterrupted} phiên dở` : ''}</span></p><p className="mut">Thông thạo (từ quiz + lab + teach-back, không phải tick): {ms.ok}/{ms.total} khái niệm luyện được, trong đó {ms.explained} giải thích được.{ms.weak.length > 0 && <> Điểm yếu nhất: {ms.weak.map(w => `Ngày ${w.day.id} — ${w.concept.t}`).join('; ')}.</>}</p>
        <div className="mastery-bar" aria-label="Phân bố mức thông thạo">{MASTERY_LEVELS.map(lv => { const n = ms.lvCounts?.[lv.id] || 0; return <i key={lv.id} style={{ width: (n / Math.max(1, ms.total) * 100) + '%', background: lv.color }} title={`${lv.id}: ${n} khái niệm`} /> })}</div>
        <div className="row" style={{ marginTop: 6 }}>{MASTERY_LEVELS.map(lv => <small key={lv.id} className="mut" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: lv.color, display: 'inline-block' }} />{lv.id} ({ms.lvCounts?.[lv.id] || 0})</small>)}</div>
        <div className="progress" style={{ marginTop: 10 }}><i style={{ width: pct + '%' }} /></div></div>
      <div className="card reveal"><div className="eyebrow">Hôm nay nên học</div><h3>Ngày {next.id} — {next.title}</h3><p className="mut">{next.goal}</p>
        {s.startDate && <p className="mut">Lịch của bạn: Ngày 1 = {fmtDate(s.startDate)}, Ngày 7 = {fmtDate(addDays(s.startDate, 6))}, Ngày 30 = {fmtDate(addDays(s.startDate, 29))}.</p>}
        <button className="btn small" onClick={() => go('day', next.id)}>Vào ngày này</button></div>
      <div className="card reveal"><div className="eyebrow">Hôm nay ôn gì</div>
        {due.length ? due.slice(0, 6).map((r, i) => <p key={i}>{r.concept ? `Ngày ${r.day.id} — ${r.concept.t} ` : `Ngày ${r.day.id} — ${r.day.title} `}<span className="mut">({r.reason}{r.due ? `, hẹn ${fmtDate(r.due)}` : ''})</span> <button className="btn ghost small" onClick={() => go('day', r.day.id, undefined, r.tab)}>Ôn</button></p>)
          : <p className="mut">Chưa có thẻ nào đến hạn ôn. Đánh dấu thẻ là “Chưa thuộc” ở Flashcard thì nó sẽ hiện ở đây theo lịch SM-2.</p>}
        <button className="btn ghost small" onClick={() => go('review')}>Xem tất cả →</button></div>
      <div className="card reveal"><div className="eyebrow">Cài app lên laptop</div><p>Mở web này bằng Chrome hoặc Edge, chọn Install app / Cài đặt ứng dụng. Biểu tượng sẽ xuất hiện ngoài desktop và taskbar, mở thành cửa sổ riêng và chạy offline.</p><button className="btn ghost small" onClick={() => go('settings')}>Hướng dẫn cài đặt</button></div>
    </div>
    <h2 style={{ marginTop: 28 }}>Bản đồ 30 ngày</h2>
    <div className="card reveal"><div className="heatmap">{ALL_DAYS.map(d => { const pr = dayProgress(s, d); const sc = s.scores[d.id]; return <button key={d.id} className={`hm ${s.done[d.id] ? 'done' : pr.inProgress ? 'progress' : ''}`} style={sc !== undefined ? { background: `rgba(198,242,78,${(0.08 + sc * 0.14).toFixed(2)})` } : undefined} title={`Ngày ${d.id}: ${d.title}${sc !== undefined ? ` · tự chấm ${sc}/5` : ''}`} onClick={() => go('day', d.id)}>{d.id}</button> })}</div><p className="mut">Màu càng đậm = điểm tự chấm càng cao. Viền xanh = đã xong, viền cam = đang làm dở. Bấm vào ô để vào ngày đó.</p></div>
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
function SearchView({ go, s, initialQ }) {
  const [q, setQ] = useState(initialQ || '')
  useEffect(() => { setQ(initialQ || '') }, [initialQ])
  const res = useMemo(() => {
    if (q.trim().length < 2) return []
    const k = q.toLowerCase()
    return ALL_DAYS.map(d => {
      const noteHits = d.exercises.map((_, i) => s.notes?.[`${d.id}-${i}`] || '').filter(t => t.toLowerCase().includes(k))
      const conceptHit = d.concepts.find(c => (c.t + ' ' + c.d).toLowerCase().includes(k))
      // Quét cả tầng giải thích sâu (what/role/thresholds/dontUse) và lab —
      // hai nguồn nội dung lớn nhất của app, trước đây tìm kiếm bỏ qua.
      const explains = CONCEPT_EXPLAIN[d.id] || []
      const explainStr = explains.map(e => [e?.what, e?.role, e?.thresholds, e?.dontUse].filter(Boolean).join(' ')).join(' ')
      const labs = LABS[d.id] || []
      const labStr = labs.map(l => [l.title, l.prompt, l.concept].join(' ')).join(' ')
      const base = (d.title + ' ' + d.goal + ' ' + d.concepts.map(c => c.t + ' ' + c.d).join(' ') + ' ' + d.exercises.map(e => e.t).join(' ') + ' ' + explainStr + ' ' + labStr).toLowerCase().includes(k)
      const labHit = labs.find(l => (l.title + ' ' + l.prompt + ' ' + l.concept).toLowerCase().includes(k))
      const explainHit = explains.find(e => [e?.what, e?.role, e?.thresholds, e?.dontUse].filter(Boolean).join(' ').toLowerCase().includes(k))
      return base || noteHits.length ? { d, noteHits, conceptHit, labHit, explainHit } : null
    }).filter(Boolean)
  }, [q, s.notes])
  return <div><h2>Tìm kiếm toàn app</h2><input id="search-input" style={{ width: '100%', padding: 12 }} placeholder="Gõ ít nhất 2 ký tự (phím tắt /), ví dụ: JWT, Saga, N+1, cache, stampede, idempotent…" value={q} onChange={e => setQ(e.target.value)} />
    <p className="mut">Tìm trong tiêu đề, mục tiêu, khái niệm, bài tập, ghi chú của bạn, giải thích sâu và lab.</p>
    {q.trim().length >= 2 && <p className="mut">{res.length} kết quả</p>}
    <div className="grid">{res.map(({ d, noteHits, conceptHit, labHit, explainHit }) => <div className="card" key={d.id}><div className="eyebrow">Ngày {d.id}</div><h3><Highlight text={d.title} q={q} /></h3><p className="mut"><Highlight text={d.goal} q={q} /></p>{conceptHit && <p className="mut">Khớp khái niệm: <Highlight text={conceptHit.t} q={q} /></p>}{explainHit && <p className="mut">Khớp trong giải thích sâu của ngày này.</p>}{labHit && <p className="mut">Khớp lab: {labHit.title}.</p>}{noteHits.length > 0 && <p className="mut">Khớp {noteHits.length} ghi chú của bạn ở ngày này.</p>}<button className="btn small" onClick={() => go('day', d.id)}>Vào ngày này</button></div>)}</div>
    <h3 style={{ marginTop: 24 }}>Thuật ngữ hay gặp</h3><p className="mut">Idempotency: gửi lại cùng 1 thao tác mà kết quả không đổi. Circuit Breaker: ngắt mạch khi service lỗi liên tục. Aggregate: ranh giới transaction và invariant trong DDD. Outbox: ghi event cùng transaction với dữ liệu nghiệp vụ rồi gửi sau. N+1: 1 query lấy danh sách rồi N query lấy từng item con.</p></div>
}

function ReviewView({ go, s }) {
  const today = todayStr()
  const q = buildReviewQueue(s)
  const overdue = q.filter(r => r.due && r.due < today)
  const dueToday = q.filter(r => r.due === today)
  const rest = q.filter(r => !r.due || r.due > today)
  const Row = ({ r }) => <div className="card" style={{ marginTop: 12 }}>
    <div className="eyebrow">Ngày {r.day.id}{r.isNew ? ' · Thẻ mới' : ''}</div>
    <p><strong>{r.concept ? r.concept.t : r.day.title}</strong> <span className="mut">({r.reason}{r.due ? `, hẹn ${fmtDate(r.due)}` : ''})</span></p>
    <div className="row">
      <button className="btn small" onClick={() => go('day', r.day.id, undefined, r.tab)}>{r.tab === 'flash' ? 'Ôn flashcard' : r.tab === 'check' ? 'Tự chấm lại' : 'Làm tiếp'}</button>
      <button className="btn ghost small" onClick={() => go('day', r.day.id, undefined, 'lab')}>Làm lab →</button>
      <button className="btn ghost small" onClick={() => go('day', r.day.id, undefined, 'explain')}>Đọc giải thích →</button>
    </div>
  </div>
  return <div><h2>Hôm nay ôn gì</h2><p className="mut">Hàng đợi ôn tập toàn app: quá hạn lên trước, trộn nhiều ngày, không còn chuyện muốn ôn ngày 3 thì phải tự mò vào đúng ngày 3. Lịch hẹn theo SM-2 (1 → 6 → giãn dần theo lịch sử), dữ liệu ôn cũ vẫn giữ nguyên.</p>
    <h3>Quá hạn ({overdue.length})</h3>{overdue.length ? overdue.map((r, i) => <Row key={i} r={r} />) : <p className="mut">Không có mục quá hạn. Tốt.</p>}
    <h3>Đến hạn hôm nay ({dueToday.length})</h3>{dueToday.length ? dueToday.map((r, i) => <Row key={i} r={r} />) : <p className="mut">Hôm nay chưa có mục đến hạn.</p>}
    <h3>Cần làm tiếp / sắp tới ({rest.length})</h3>{rest.map((r, i) => <Row key={i} r={r} />)}
  </div>
}

function mdPreview(text) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^- (.*)$/gm, '<li>$1</li>').replace(/\n/g, '<br/>')
}
const SHAPE_LABEL = { trace: 'Trace từng bước', decision: 'Cây quyết định', compare: 'Bảng so sánh', incident: 'Câu chuyện sự cố', analogy: 'Analogy', definition: 'Định nghĩa nền' }
function ExplainView({ day, go, s, patch }) {
  const [q, setQ] = useState('')
  const [openSet, setOpenSet] = useState(() => new Set())
  const explains = CONCEPT_EXPLAIN[day.id] || []
  const k = q.trim().toLowerCase()
  const items = day.concepts.map((c, i) => ({ c, e: explains[i], i })).filter(({ c, e }) => {
    if (!k) return true
    return (c.t + ' ' + (e?.what || '') + ' ' + (e?.role || '') + ' ' + (e?.map || '') + ' ' + (e?.dontUse || '') + ' ' + (e?.thresholds || '')).toLowerCase().includes(k)
  })
  const toggle = (i) => setOpenSet(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n })
  return <div style={{ marginTop: 16 }}>
    <div className="card"><h3>Giải thích khái niệm — Ngày {day.id}: {day.title}</h3>
      <p className="mut">Mỗi khái niệm render theo dạng của nó (trace, cây quyết định, bảng so sánh, câu chuyện sự cố, analogy), không còn khuôn 4 phần bắt buộc. Mỗi khái niệm thu gọn mặc định — mở từng cái, đọc xong thì làm câu hỏi kiểm tra hiểu và viết lại bằng lời của bạn (khuyến khích, không bắt buộc). Bấm vào nút ngày ở phần kết nối để nhảy tới ngày đó và vẫn ở tab Giải thích này.</p>
      <input style={{ width: '100%', padding: 12 }} placeholder="Tìm khái niệm trong ngày này, ví dụ: heap, token, saga…" value={q} onChange={e => setQ(e.target.value)} />
      <p className="mut">{items.length}/{day.concepts.length} khái niệm {k ? `khớp “${q}”` : 'trong ngày này'}{explains.length !== day.concepts.length ? ` — cảnh báo: dữ liệu giải thích có ${explains.length} mục, không khớp ${day.concepts.length} khái niệm.` : ''}</p>
      <div className="row"><button className="btn ghost small" onClick={() => setOpenSet(new Set(day.concepts.map((_, i) => i)))}>Mở tất cả</button><button className="btn ghost small" onClick={() => setOpenSet(new Set())}>Thu tất cả</button>{k && <button className="btn ghost small" onClick={() => go('search', undefined, undefined, undefined, q)}>Tìm “{q}” toàn app →</button>}</div>
    </div>
    {items.map(({ c, e, i }) => <div className="card" key={i} style={{ marginTop: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>{i + 1}. {c.t}</h3><button className="btn ghost small" onClick={() => toggle(i)}>{openSet.has(i) ? 'Thu lại ↑' : 'Mở ↓'}</button></div>
      {e && <p className="mut">{e.shape && <span className="tag">{SHAPE_LABEL[e.shape] || e.shape}</span>} {e.difficulty && <span className="tag">Độ khó {e.difficulty}/3</span>} <span className="tag">{masteryLevel(s.mastery?.[`${day.id}-${i}`])}</span></p>}
      {!e && <p className="warn">Chưa có giải thích cho khái niệm này.</p>}
      {e && openSet.has(i) && <div>
        <p><strong>1. Nó là gì?</strong><br />{e.what}</p>
        <p><strong>2. Nhiệm vụ của nó là gì?</strong><br />{e.role}</p>
        <div className="banner" style={{ margin: '12px 0' }}><strong>3. Nó nằm ở đâu trong bản đồ gần đó?</strong><br />{e.map}</div>
        {e.thresholds && <div className="banner"><strong>Ngưỡng quyết định:</strong> {e.thresholds}</div>}
        {e.dontUse && <div className="warn" style={{ marginTop: 12 }}><strong>Không dùng khi:</strong> {e.dontUse}</div>}
        <p><strong>Kết nối với các khái niệm khác như thế nào?</strong></p>
        <ul>{e.connects.map((cn, j) => <li key={j}>{cn.t}{typeof cn.day === 'number' && <> <button className="btn ghost small" onClick={() => go('day', cn.day, undefined, 'explain')}>→ Ngày {cn.day}: {DAY_BY_ID[cn.day]?.title || ''}</button></>}</li>)}</ul>
        <QuizBox quiz={e.quiz || QUIZ_EXTRA[`${day.id}-${i}`]} mKey={`${day.id}-${i}`} s={s} patch={patch} />
        <TeachBackBox cKey={`${day.id}-${i}`} c={c} e={e} s={s} patch={patch} />
        <TutorChatButton day={day} kind="concept" index={i} />
      </div>}
    </div>)}
    {items.length === 0 && <p className="mut">Không có khái niệm nào khớp với từ khóa này trong ngày {day.id}. Hãy thử từ khóa khác hoặc tìm toàn app.</p>}
  </div>
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
  const hasTeach = day.concepts.some((_, i) => s.teachBack?.[`${day.id}-${i}`])
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
      <button className={tab === 'explain' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('explain')}>Giải thích khái niệm</button>
      <button className={tab === 'lab' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('lab')}>Lab thực hành</button>
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
      {day.id === 1 && <div style={{ marginTop: 16 }}><MisconceptionCorner /></div>}
      <div style={{ marginTop: 16 }}><PomodoroCard pomo={pomo} onToggle={onTogglePomo} onReset={onResetPomo} onSet={onSetPomo} /></div>
    </div>}
    {tab === 'do' && <div style={{ marginTop: 16 }}>
      {DRILLS[day.id] && <IncidentDrill drill={DRILLS[day.id]} />}
      {day.id === 1 && <p className="mut">Lưu ý cho Bài 1: thứ tự liệt kê trong đề (thread → connection → cache) chỉ là danh sách, không phải thứ tự kiểm chứng. Thứ tự kiểm chứng luôn theo bằng chứng mạnh nhất trong log bạn đang cầm — hãy làm Log Simulator dưới đây trước khi viết ghi chú.</p>}
      {day.exercises.map((e, i) => {
        const key = `${day.id}-${i}`
        const note = s.notes[key] || ''
        const words = note.trim() ? note.trim().split(/\s+/).length : 0
        const body = <>
          <label>Ghi chú / output của bạn</label>
          <textarea value={note} onChange={ev => setNote(key, ev.target.value)} placeholder="Viết output ở đây: sơ đồ, contract, bảng review, ADR… Người khác đọc được mới tính là xong." />
          <p className="mut">{words} từ · {s.notesSavedAt?.[key] ? `Đã lưu lúc ${fmtTime(s.notesSavedAt[key])}` : 'Chưa lưu gì'} · <button className="btn ghost small" onClick={() => setPreview(prevP => ({ ...prevP, [key]: !prevP[key] }))}>{preview[key] ? 'Sửa tiếp' : 'Xem trước markdown'}</button></p>
          {preview[key] && <div className="paper" style={{ padding: 14 }} dangerouslySetInnerHTML={{ __html: mdPreview(note || '(Chưa có ghi chú)') }} />}
        </>
        return <React.Fragment key={i}>
          {day.id === 1 && i === 0 && <LogSimulator />}
          {day.id === 1 && i === 1 && <SpecCalculator onInsert={(text) => { appendNote(`${day.id}-1`, text); showToast('Đã chèn spec đã tính vào cuối ghi chú Bài 2.') }} />}
          <div className="card" style={{ marginBottom: 14 }}><h3>Bài {i + 1}: {e.t}</h3><p className="mut">{e.d}</p>
          {e.material && <details open><summary><strong>Gói vật liệu để làm bài (không cần app thật)</strong></summary><pre className="code">{e.material}</pre></details>}
          <div className="row"><button className="btn ghost small" onClick={() => copyTemplate(e.template)}>Sao chép template</button><button className="btn ghost small" onClick={() => { appendNote(key, e.template); showToast('Đã chèn template vào cuối ghi chú. Bấm Hoàn tác nếu muốn trở lại bản trước.') }}>Chèn template vào cuối ghi chú</button>
            {s.noteUndo?.[key] !== undefined && <button className="btn ghost small" onClick={() => { undoNote(key); showToast('Đã hoàn tác lần chèn vừa rồi.') }}>Hoàn tác lần chèn vừa rồi</button>}</div>
          {e.rubric
            ? <div className="ex-grid">
                <div className="ex-left"><div className="banner" style={{ marginTop: 8 }}><strong>Tiêu chí đạt — đối chiếu khi viết:</strong><ul style={{ margin: '6px 0 0' }}>{e.rubric.map((r, j) => <li key={j}>{r}</li>)}</ul></div></div>
                <div className="ex-right">{body}</div>
              </div>
            : body}
          {e.answer && <details><summary><strong>Xem đáp án mẫu — làm trước rồi mới đối chiếu</strong></summary><p>{e.answer}</p></details>}
          <TutorChatButton day={day} kind="exercise" index={i} />
        </div>
        </React.Fragment>
      })}
      {day.id === 28 && <div className="card"><h3>Checklist review code agent (tick từng mục khi đã kiểm tra)</h3>{REVIEW_CHECKLIST.map((c, i) => <label key={i} style={{ fontWeight: 400 }}><input type="checkbox" checked={!!s.review?.[day.id]?.[i]} onChange={() => toggleList('review', day.id, i)} /> {c}</label>)}</div>}
      {day.id === 30 && <div className="card"><h3>Rubric capstone (mỗi phần 0–2 điểm)</h3>{CAPSTONE_RUBRIC.map((c, i) => <div key={i}><label>{c.t} — {c.d}</label><select value={s.capstone?.[i] ?? ''} onChange={ev => patch({ capstone: { ...s.capstone, [i]: Number(ev.target.value) } })}><option value="">Chưa chấm</option><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></div>)}<p><strong>Tổng: {Object.values(s.capstone || {}).reduce((a, b) => a + (Number(b) || 0), 0)}/10.</strong> Dưới 7 thì quay lại ngày yếu nhất và làm lại checkpoint tuần đó.</p></div>}
    </div>}
    {tab === 'flash' && <Flashcards key={day.id} day={day} s={s} patch={patch} />}
    {tab === 'explain' && <ExplainView day={day} go={go} s={s} patch={patch} />}
    {tab === 'lab' && <LabView day={day} s={s} patch={patch} />}
    {tab === 'check' && <div className="card" style={{ marginTop: 16 }}><h3>Tự chấm ngày này</h3>
      {day.criteria.map((c, i) => <label key={i} style={{ fontWeight: 400 }}><input type="checkbox" checked={!!s.criteria?.[day.id]?.[i]} onChange={() => toggleList('criteria', day.id, i)} /> {c}</label>)}
      <p>Đã tick {pr.ticked}/{pr.totalCriteria} tiêu chí · Đã viết {pr.notesCount}/{day.exercises.length} bài tập.</p>
      <p className="mut">Định nghĩa điểm: 0 = chưa làm · 1–2 = đọc hiểu sơ · 3 = làm được bài tập với gợi ý · 4 = làm được độc lập · 5 = giải thích và bảo vệ được cho người khác. Gợi ý theo tiêu chí đã tick: {suggested}/5 (bạn vẫn sửa tay được).</p>
      <label>Điểm tự chấm cho ngày này (0–5)</label>
      <select value={s.scores[day.id] ?? ''} onChange={ev => patch({ scores: { ...s.scores, [day.id]: Number(ev.target.value) } })}><option value="">Chưa chấm</option>{[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select>
      {s.scores[day.id] === 5 && pr.ticked === 0 && <p className="warn">Cảnh báo: bạn chọn 5 nhưng chưa tick tiêu chí nào. Hãy làm bài tập và tick tiêu chí trước, hoặc hạ điểm xuống cho đúng.</p>}
      {s.scores[day.id] === 5 && pr.ticked > 0 && !hasTeach && <p className="mut">Gợi ý (không bắt buộc, không chặn điểm 5): điểm 5 nghĩa là "giải thích và bảo vệ được cho người khác" — thử viết 1 bản giải thích lại ở tab Giải thích khái niệm để tự kiểm chứng.</p>}
      <div className="row" style={{ marginTop: 14 }}><button className="btn" onClick={() => {
        if (!pr.inProgress && s.scores[day.id] === undefined) { if (!window.confirm('Bạn chưa có output hay tiêu chí nào. Bạn có chắc muốn đánh dấu xong không?')) return }
        setDone(day.id, true)
      }}>Đánh dấu đã xong ngày này ✓</button>{s.done[day.id] && <button className="btn ghost" onClick={() => setDone(day.id, false)}>Bỏ đánh dấu xong</button>}</div>
      <p className="mut">Chỉ đánh dấu xong khi đã có output ở tab Làm bài tập, không chỉ đọc xong.</p>
      {day.exercises.length > 0 && <div style={{ marginTop: 10 }}><p className="mut">Có key AI thì xin AI chấm theo rubric từng bài (tham khảo, không tự tick giúp):</p>{day.exercises.map((_, i) => <AIGraderBox key={i} day={day} index={i} s={s} />)}</div>}
      {day.isCheckpoint && <div style={{ marginTop: 16 }}><TutorChatButton day={day} kind="defend" label="Bảo vệ thiết kế trước khi duyệt" /></div>}
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
// Thẻ flashcard 3 chế độ, cùng một lịch SM-2 theo khái niệm:
// - Thuật ngữ: mặt trước tên, mặt sau mô tả + ngưỡng + cấm dùng (từ explain sâu).
// - Đoán ngược: mặt trước là mô tả, đoán tên khái niệm.
// - Tình huống: mặt trước là ngưỡng quyết định / ràng buộc "không dùng khi" (ngày có shape data).
const FC_MODES = [
  { id: 'term', label: 'Thuật ngữ' },
  { id: 'reverse', label: 'Đoán ngược' },
  { id: 'scenario', label: 'Tình huống' },
]
function clipTxt(t, n) { t = String(t || '').trim(); return t.length <= n ? t : t.slice(0, n - 1) + '…' }
function buildCards(mode, day) {
  const explains = CONCEPT_EXPLAIN[day.id] || []
  const out = []
  day.concepts.forEach((c, i) => {
    const e = explains[i]
    if (mode === 'term') out.push({ idx: i, front: c.t, back: c.d, thresholds: e?.thresholds, dontUse: e?.dontUse })
    else if (mode === 'reverse') {
      const src = e?.what || c.d
      if (src) out.push({ idx: i, front: clipTxt(src, 260), back: `${c.t} — ${c.d}` })
    } else if (mode === 'scenario') {
      if (e?.thresholds) out.push({ idx: i, front: `Ngưỡng quyết định: ${e.thresholds}\n\nĐây là quy tắc của khái niệm nào trong ngày này?`, back: `${c.t} — ${c.d}` })
      else if (e?.dontUse) out.push({ idx: i, front: `Không nên dùng khi: ${e.dontUse}\n\nĐây là khái niệm nào?`, back: `${c.t} — ${c.d}` })
    }
  })
  return out
}
function Flashcards({ day, s, patch }) {
  const [mode, setMode] = useState('term')
  const cards = useMemo(() => buildCards(mode, day), [mode, day])
  const [queue, setQueue] = useState(() => cards.map((_, i) => i))
  const [pos, setPos] = useState(0)
  const [flip, setFlip] = useState(false)
  const [done, setDone] = useState(false)
  const reset = (m = mode) => { const cs = buildCards(m, day); setQueue(cs.map((_, i) => i)); setPos(0); setFlip(false); setDone(false) }
  useEffect(() => { reset(mode) }, [mode, day.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const idx = queue[pos]
  const card = cards[idx]
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight') { setPos(p => Math.min(queue.length - 1, p + 1)); setFlip(false) }
      if (e.key === 'ArrowLeft') { setPos(p => Math.max(0, p - 1)); setFlip(false) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [queue.length])
  // Hàng nút chế độ đặt ngoài các nhánh return để khi một chế độ hết thẻ vẫn đổi được chế độ khác.
  const modeRow = <div className="row" style={{ marginBottom: 8 }}>{FC_MODES.map(m => <button key={m.id} className={mode === m.id ? 'btn small' : 'btn ghost small'} onClick={() => setMode(m.id)}>{m.label}</button>)}</div>
  if (cards.length === 0) {
    return <div className="card" style={{ marginTop: 16 }}>{modeRow}<p className="mut">Chế độ thẻ "{FC_MODES.find(m => m.id === mode)?.label}" chưa có thẻ cho ngày này (thẻ tình huống sinh từ ngưỡng quyết định / cấm dùng, hiện có ở các ngày 11–20). Thử chế độ khác.</p></div>
  }
  if (done || pos >= queue.length) {
    const unknownIdx = cards.map((_, i) => i).filter(i => s.srs?.[`${day.id}-${cards[i].idx}`]?.status === 'unknown')
    return <div className="card" style={{ marginTop: 16 }}><h3>Đã ôn hết {cards.length} thẻ</h3><p>{unknownIdx.length} thẻ chưa thuộc. Bấm dưới đây để ôn lại đúng các thẻ đó.</p><button className="btn" disabled={unknownIdx.length === 0} onClick={() => { setQueue(unknownIdx); setPos(0); setFlip(false); setDone(false) }}>Ôn lại các thẻ chưa thuộc</button> <button className="btn ghost" onClick={() => reset()}>Ôn lại từ đầu</button></div>
  }
  if (!card) return null
  const srs = s.srs2?.[`${day.id}-${card.idx}`] || s.srs?.[`${day.id}-${card.idx}`]
  const mark = (known) => {
    const nxt = sm2Next(s.srs2?.[`${day.id}-${card.idx}`], known)
    const due = addDays(todayStr(), nxt.interval)
    patch({ flashKnown: { ...s.flashKnown, [`${day.id}-${card.idx}`]: known }, srs: { ...s.srs, [`${day.id}-${card.idx}`]: { status: known ? 'known' : 'unknown', due } }, srs2: { ...s.srs2, [`${day.id}-${card.idx}`]: { ...nxt, due } } })
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
    {modeRow}
    <p className="mut">{mode === 'term' && 'Mặt sau có thêm ngưỡng quyết định và cảnh báo "không dùng khi" (nơi có dữ liệu).'}</p>
    <p className="mut">Thẻ {pos + 1}/{queue.length} · Bấm vào thẻ để lật, hoặc dùng phím Space/Enter để lật, phím mũi tên để chuyển thẻ. Thẻ chưa thuộc sẽ quay lại cuối hàng đợi trong phiên này và hẹn ôn sau 1 ngày; thẻ đã thuộc hẹn ôn theo SM-2 (1 → 6 → giãn dần).</p>
    <div className="flash" tabIndex={0} role="button" aria-label={`Thẻ flashcard. Bấm Space hoặc Enter để lật.`} onClick={() => setFlip(!flip)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlip(!flip) } }}><div className={`flash-in ${flip ? 'flipped' : ''}`}>
      <div className="flash-face"><div className="eyebrow">{mode === 'term' ? 'Khái niệm' : mode === 'reverse' ? 'Đây là khái niệm nào?' : 'Tình huống'}</div><p style={{ whiteSpace: 'pre-wrap' }}>{card.front}</p>{mode === 'term' && <p className="mut">Bấm để xem giải thích</p>}</div>
      <div className="flash-face flash-back"><div className="eyebrow">Giải thích</div><p>{card.back}</p>{mode === 'term' && card.thresholds && <p className="mut">🚦 Ngưỡng: {card.thresholds}</p>}{mode === 'term' && card.dontUse && <p className="mut">🚫 Không dùng khi: {card.dontUse}</p>}</div>
    </div></div>
    <div className="row" style={{ marginTop: 12 }}><button className="btn ghost small" onClick={() => { setPos(Math.max(0, pos - 1)); setFlip(false) }}>← Thẻ trước</button><button className="btn small" onClick={() => { if (pos + 1 >= queue.length) setDone(true); else setPos(pos + 1); setFlip(false) }}>Thẻ sau →</button>
      <button className="btn small" onClick={() => mark(true)}>Đã thuộc ✓</button>
      <button className="btn ghost small" onClick={() => mark(false)}>Chưa thuộc, ôn lại</button></div>
    <p className="mut">{srs ? `Ôn lại vào: ${fmtDate(srs.due)} (${srs.status === 'unknown' ? 'chưa thuộc' : 'đã thuộc'}${srs.interval ? `, khoảng ${srs.interval} ngày` : ''}).` : 'Chưa đánh dấu thẻ này.'} Phím tắt: ← → chuyển thẻ, Space/Enter lật thẻ.</p>
  </div>
}
function MockInterviewView({ go, s }) {
  const [sel, setSel] = useState(1)
  const day = DAY_BY_ID[sel]
  return <div>
    <h2>Phỏng vấn thử</h2>
    <p className="mut">AI đóng vai interviewer senior: mỗi lượt CHỈ một câu hỏi, xoáy vào tiêu chí của ngày bạn chọn và điểm yếu lộ ra trong câu trả lời. Sau khoảng 4 lượt, AI tổng kết tiêu chí nào bạn bảo vệ được. Mẹo: chọn ngày đã có điểm tự chấm ≥ 4 để luyện đúng định nghĩa điểm 5 — "giải thích và bảo vệ được cho người khác".</p>
    <label>Chọn ngày để luyện bảo vệ</label>
    <select value={sel} onChange={e => setSel(Number(e.target.value))}>
      {ALL_DAYS.map(d => <option key={d.id} value={d.id}>Ngày {d.id} — {d.title}{s.scores[d.id] !== undefined ? ` (tự chấm ${s.scores[d.id]}/5)` : ''}</option>)}
    </select>
    {day && <div className="card" style={{ marginTop: 12 }}>
      <div className="eyebrow">Tiêu chí bạn phải bảo vệ được</div>
      <ul style={{ margin: '8px 0 0' }}>{(day.criteria || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>}
    {day && <TutorChat s={s} day={day} kind="defend" />}
  </div>
}

function Settings({ p }) {
  const { s, patch, exportJSON, importJSON, clearAll } = p
  const [msg, setMsg] = useState('')
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [pendingFile, setPendingFile] = useState(null)
  const [importSummary, setImportSummary] = useState('')
  const prov = detectProvider(s.llm)
  const [keyDraft, setKeyDraft] = useState({ gemini: (s.llm?.keys?.gemini || []).join('\n'), groq: (s.llm?.keys?.groq || []).join('\n') })
  const geminiKeys = keysFor('gemini', s.llm)
  const groqKeys = keysFor('groq', s.llm)
  const activeIdx = { gemini: activeKeyIndex('gemini'), groq: activeKeyIndex('groq') }
  const [models, setModels] = useState({ gemini: [], groq: [] })
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [checkRes, setCheckRes] = useState(null)
  const setKeysDraft = (p, t) => {
    setKeyDraft(d => ({ ...d, [p]: t }))
    patch({ llm: { ...s.llm, keys: { ...(s.llm?.keys || {}), [p]: t.split('\n').map(x => x.trim()).filter(Boolean) } } })
  }
  const runKeyCheck = async () => {
    setTesting(true); setTestMsg(''); setCheckRes(null)
    const res = {}
    const nextModels = { gemini: [], groq: [] }
    try {
      for (const p of ['gemini', 'groq']) {
        if (!keysFor(p, s.llm).length) continue
        res[p] = await checkKeys(s.llm || {}, p)
        if (res[p].some(r => r.ok)) {
          try { nextModels[p] = await listModels(s.llm || {}, p) } catch { /* datalist là best-effort */ }
        }
      }
      setCheckRes(res)
      setModels(nextModels)
      if (!Object.keys(res).length) setTestMsg('Chưa có key nào để kiểm tra — dán ít nhất 1 key Gemini hoặc Groq ở trên.')
    } catch (e) { setTestMsg('Lỗi: ' + (e.message || e)) }
    setTesting(false)
  }
  const exportAnki = () => {
    const rows = [['Front', 'Back', 'Tags']]
    ALL_DAYS.forEach(d => {
      const explains = CONCEPT_EXPLAIN[d.id] || []
      d.concepts.forEach((c, i) => {
        const e = explains[i]
        const back = c.d + (e?.thresholds ? '\n\n🚦 Ngưỡng: ' + e.thresholds : '') + (e?.dontUse ? '\n\n🚫 Không dùng khi: ' + e.dontUse : '')
        rows.push([c.t, back, `BEApp::Ngay${d.id}`])
        if (e?.what) rows.push([clipTxt(e.what, 260), `${c.t} — ${c.d}`, `BEApp::Ngay${d.id}::nguoc`])
      })
    })
    const csv = '\uFEFF' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'beapp-flashcards-anki.csv'; a.click()
    URL.revokeObjectURL(a.href)
  }
  return <div><h2>Cài đặt và cài app lên laptop</h2>
    <div className="card"><h3>1. Cài đặt PWA</h3><ol><li>Mở web này bằng Chrome hoặc Edge trên laptop.</li><li>Trên thanh địa chỉ, bấm biểu tượng Install / Cài đặt, hoặc menu ⋮ → Install app / Cài đặt ứng dụng.</li><li>Biểu tượng BEApp sẽ xuất hiện ngoài desktop, taskbar và Start Menu. Mở từ biểu tượng sẽ ra cửa sổ riêng, không có thanh địa chỉ.</li><li>App chạy offline cho nội dung 30 ngày và bài làm của bạn. Khi có bản mới, app sẽ hiện banner "Có bản mới" — bấm cập nhật, đừng để bản cũ kẹt lại.</li></ol><p className="mut">Lưu ý: nội dung và tiến độ lưu trên trình duyệt của máy bạn. Đổi máy thì dùng Xuất dữ liệu ở dưới rồi Nhập lại. Icon PWA đã có PNG 192 và 512 trong manifest; việc cài từ link deploy thật vẫn cần kiểm chứng sau khi có link Vercel.</p></div>
    <div className="card" style={{ marginTop: 14 }}><h3>2. Lịch học của bạn</h3>
      <label>Ngày bắt đầu lộ trình</label><input type="date" value={s.startDate || ''} onChange={e => patch({ startDate: e.target.value })} />
      {s.startDate && <p className="mut">Lịch của bạn: Ngày 1 = {fmtDate(s.startDate)}, Ngày 7 = {fmtDate(addDays(s.startDate, 6))}, Ngày 30 = {fmtDate(addDays(s.startDate, 29))}. Lịch này cũng hiện ở Dashboard.</p>}
      <label>Giờ nhắc học hàng ngày</label><input type="time" value={s.reminder || '07:00'} onChange={e => patch({ reminder: e.target.value })} />
      <p className="mut">Quyền thông báo hiện tại: {perm}. App không gửi thông báo nền khi chưa mở app. Cách chắc chắn nhất: ghim BEApp lên taskbar và mở vào giờ đã chọn. Số phiên Pomodoro đã xong: {s.pomodoroDone || 0}{s.pomodoroInterrupted ? `, ${s.pomodoroInterrupted} phiên dở` : ''}.</p>
      <button className="btn ghost small" onClick={async () => { try { const r = await Notification.requestPermission(); setPerm(r); if (r === 'granted') new Notification('BEApp nhắc học', { body: 'Đây là thông báo thử. Đến giờ nhắc, hãy mở BEApp và học tiếp ngày đang dở.' }); setMsg(r === 'granted' ? 'Đã gửi thông báo thử.' : 'Quyền thông báo: ' + r + '. Nếu đã chặn, hãy mở lại quyền trong cài đặt trình duyệt cho trang này.') } catch { setMsg('Trình duyệt này không hỗ trợ thông báo.') } }}>Xin quyền và thử nhắc ngay</button>{msg && <p>{msg}</p>}</div>
    <div className="card" style={{ marginTop: 14 }}><h3>3. Sao lưu tiến độ</h3><div className="row"><button className="btn small" onClick={exportJSON}>Xuất dữ liệu ra file JSON</button><button className="btn ghost small" onClick={exportAnki}>Xuất flashcards CSV (Anki)</button><label className="btn ghost small">Chọn file để nhập<input type="file" accept="application/json" hidden onChange={e => { if (e.target.files[0]) setPendingFile(e.target.files[0]); e.target.value = '' }} /></label><button className="btn ghost small" onClick={() => { if (window.confirm('Xóa toàn bộ tiến độ và ghi chú? Hành động này không hoàn tác được.')) clearAll() }}>Xóa toàn bộ dữ liệu</button></div>
      <p className="mut">CSV có 2 loại thẻ: thuật ngữ (kèm ngưỡng/cấm dùng) và đoán ngược, tag theo ngày (BEApp::Ngay&lt;id&gt;) — import thẳng vào Anki hoặc Google Sheets.</p>
      {pendingFile && <div className="warn" style={{ marginTop: 12 }}><strong>Nhập file “{pendingFile.name}” sẽ thay thế toàn bộ tiến độ hiện tại.</strong> Bạn đã xuất backup chưa?<div className="row" style={{ marginTop: 8 }}><button className="btn small" onClick={exportJSON}>Xuất backup trước</button><button className="btn" onClick={() => importJSON(pendingFile, (ok, data) => { if (ok) { const days = data?.done ? Object.keys(data.done).length : 0; const notes = data?.notes ? Object.values(data.notes).filter(Boolean).length : 0; setImportSummary(`Đã nhập xong: ${days} ngày xong, ${notes} ghi chú.`); setPendingFile(null) } else setImportSummary('File không đọc được, tiến độ cũ vẫn giữ nguyên.') })}>Nhập và thay thế</button><button className="btn ghost small" onClick={() => setPendingFile(null)}>Hủy</button></div></div>}
      {importSummary && <p>{importSummary}</p>}</div>
    <div className="card" style={{ marginTop: 14 }}><h3>4. AI Gia sư (tùy chọn, key của bạn)</h3>
      <p className="mut">App là web tĩnh chạy trong trình duyệt nên <strong>không có .env</strong> — giá trị .env sẽ bị nhúng vào bundle tĩnh và lộ ra công khai. Key dán vào đây chỉ lưu ở localStorage máy bạn, request đi thẳng tới nhà cung cấp. <strong>Mỗi nhà cung cấp dán được nhiều key, mỗi dòng một key</strong> — app tự xoay vòng khi một key hết quota (429) hoặc bị từ chối, ghi nhớ vị trí để không đốt request vào key đang chết.</p>
      <label>Provider ưu tiên</label>
      <select value={s.llm?.provider || 'auto'} onChange={e => patch({ llm: { ...s.llm, provider: e.target.value } })}>
        <option value="auto">Tự chọn — Gemini trước, hết sạch quota thì đổ sang Groq</option>
        <option value="gemini">Chỉ Google Gemini</option>
        <option value="groq">Chỉ Groq</option>
        <option value="custom">Chỉ endpoint khác (OpenAI-compatible)</option>
      </select>
      <label>Key Google Gemini — mỗi dòng 1 key ({PROVIDERS.gemini.keyHint})</label>
      <textarea rows={3} style={{ minHeight: 0, fontFamily: 'monospace', fontSize: 13 }} value={keyDraft.gemini} onChange={e => setKeysDraft('gemini', e.target.value)} placeholder={'AQ.Ab8R…\nAIzaSy…  (dòng thứ 2 là key dự phòng)'} />
      <p className="mut">{geminiKeys.length ? `Đã lưu ${geminiKeys.length} key Gemini · lần tới dùng key #${((activeIdx.gemini ?? 0) % geminiKeys.length) + 1} (${maskKey(geminiKeys[(activeIdx.gemini ?? 0) % geminiKeys.length])}).` : 'Chưa có key Gemini.'}</p>
      <label>Key Groq — mỗi dòng 1 key ({PROVIDERS.groq.keyHint})</label>
      <textarea rows={3} style={{ minHeight: 0, fontFamily: 'monospace', fontSize: 13 }} value={keyDraft.groq} onChange={e => setKeysDraft('groq', e.target.value)} placeholder={'gsk_…\ngsk_…  (dòng thứ 2 là key dự phòng)'} />
      <p className="mut">{groqKeys.length ? `Đã lưu ${groqKeys.length} key Groq · lần tới dùng key #${((activeIdx.groq ?? 0) % groqKeys.length) + 1} (${maskKey(groqKeys[(activeIdx.groq ?? 0) % groqKeys.length])}).` : 'Chưa có key Groq.'}</p>
      {prov === 'custom' && <><label>Endpoint (dạng …/v1/chat/completions)</label><input style={{ width: '100%', padding: 12 }} value={s.llm?.endpoint || ''} onChange={e => patch({ llm: { ...s.llm, endpoint: e.target.value } })} placeholder="https://…/v1/chat/completions" />
        <label>Model của endpoint custom</label><input style={{ width: '100%', padding: 12 }} value={s.llm?.models?.custom || s.llm?.model || ''} onChange={e => patch({ llm: { ...s.llm, models: { ...(s.llm?.models || {}), custom: e.target.value } } })} placeholder="model-name" /></>}
      <label>Model Gemini (để trống dùng mặc định {PROVIDERS.gemini.defaultModel})</label>
      <input style={{ width: '100%', padding: 12 }} list="llm-models-gemini" value={s.llm?.models?.gemini || ''} onChange={e => patch({ llm: { ...s.llm, models: { ...(s.llm?.models || {}), gemini: e.target.value } } })} placeholder={PROVIDERS.gemini.defaultModel} />
      <datalist id="llm-models-gemini">{models.gemini.map(m => <option key={m} value={m} />)}</datalist>
      <label>Model Groq (để trống dùng mặc định {PROVIDERS.groq.defaultModel})</label>
      <input style={{ width: '100%', padding: 12 }} list="llm-models-groq" value={s.llm?.models?.groq || ''} onChange={e => patch({ llm: { ...s.llm, models: { ...(s.llm?.models || {}), groq: e.target.value } } })} placeholder={PROVIDERS.groq.defaultModel} />
      <datalist id="llm-models-groq">{models.groq.map(m => <option key={m} value={m} />)}</datalist>
      <div className="row">
        <button className="btn ghost small" disabled={testing} onClick={runKeyCheck}>{testing ? 'Đang kiểm tra từng key…' : 'Kiểm tra từng key & tải model'}</button>
        <button className="btn ghost small" onClick={() => { setKeyDraft({ gemini: '', groq: '' }); patch({ llm: { provider: s.llm?.provider || 'auto', endpoint: s.llm?.endpoint || '', key: '', keys: { gemini: [], groq: [] }, models: s.llm?.models || {} } }) }}>Xóa toàn bộ key</button>
      </div>
      {checkRes && <div style={{ marginTop: 8 }}>
        {Object.entries(checkRes).map(([p, list]) => <div key={p}><strong>{PROVIDERS[p]?.label}:</strong>{list.length === 0 && <span className="mut"> chưa có key.</span>}{list.map((r, i) => <p key={i} className="mut" style={{ margin: '4px 0' }}>{r.ok ? '✓' : '✗'} {r.key} — {r.detail}</p>)}</div>)}
      </div>}
      {!checkRes && testMsg && <p className="mut">{testMsg}</p>}
      <p className="mut">Lấy key Gemini: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">AI Studio</a> · key Groq: <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq Console</a>. Nhà cung cấp đang dùng: <strong>{PROVIDERS[prov]?.label}</strong>.</p>
      <p className="mut">Khi chưa có key: mọi phần vẫn chạy với gợi ý viết sẵn. Trong mỗi khung chat có nút "Sao chép bối cảnh" — dán sang bất kỳ AI nào bạn đang có mà không cần key trong app.</p></div>
    <div className="card" style={{ marginTop: 14 }}><h3>5. Giao diện và phím tắt</h3>
      <label>Chủ đề</label>
      <select value={s.theme || 'dark'} onChange={e => patch({ theme: e.target.value })}>
        <option value="dark">Tối (mặc định)</option>
        <option value="light">Sáng</option>
      </select>
      <label>Cỡ chữ</label>
      <select value={s.fontScale || 1} onChange={e => patch({ fontScale: Number(e.target.value) })}>
        <option value={0.9}>Nhỏ (90%)</option>
        <option value={1}>Vừa (100%)</option>
        <option value={1.15}>Lớn (115%)</option>
        <option value={1.3}>Rất lớn (130%)</option>
      </select>
      <p className="mut">Cả hai lưu trên máy bạn và áp dụng ngay toàn app — nội dung học dài thì tăng cỡ chữ đỡ mỏi mắt.</p>
      <h3 style={{ marginTop: 14 }}>Phím tắt</h3>
      <ul className="mut">
        <li><strong>/</strong> — mở Tìm kiếm và focus ô nhập</li>
        <li><strong>1–6</strong> — đổi tab trong ngày học (Học, Làm bài, Flashcard, Tự chấm, Giải thích, Lab)</li>
        <li><strong>←/→</strong> — chuyển thẻ flashcard · <strong>Space/Enter</strong> — lật thẻ</li>
        <li><strong>Esc</strong> — đóng khung chat gia sư · <strong>Enter</strong> — gửi câu hỏi trong chat</li>
      </ul></div>
  </div>
}
export default function App() {
  const p = useProgress()
  const { s, patch } = p
  const [view, setView] = useState(() => s.lastView?.view || 'home')
  const [dayId, setDayId] = useState(() => s.lastView?.dayId || 1)
  const [dayTab, setDayTab] = useState(() => s.lastView?.tab || 'learn')
  const [timelineWeek, setTimelineWeek] = useState(0)
  const [searchQ, setSearchQ] = useState('')
  const [update, setUpdate] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const [pomo, setPomo] = useState({ sec: 25 * 60, duration: 25 * 60, run: false, started: false })
  const pomoRef = useRef(pomo); pomoRef.current = pomo
  // Chủ đề + cỡ chữ áp dụng cấp body ngay khi đổi.
  useEffect(() => {
    document.body.classList.toggle('light', (s.theme || 'dark') === 'light')
    document.body.classList.toggle('focus', !!s.focusMode)
    document.body.style.zoom = s.fontScale && s.fontScale !== 1 ? String(s.fontScale) : ''
  }, [s.theme, s.fontScale, s.focusMode])
  // Phím tắt toàn app: / tìm kiếm, 1–6 đổi tab ngày, Esc đóng dock. Không ăn khi đang gõ.
  useEffect(() => {
    const h = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'Escape') { setDockOpen(false); return }
      if (e.key === '/') { e.preventDefault(); setView('search'); window.scrollTo(0, 0); setTimeout(() => document.getElementById('search-input')?.focus(), 60); return }
      if (view === 'day' && /^[1-6]$/.test(e.key)) setDayTab(DAY_TABS[Number(e.key) - 1])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [view])
  // Focus mode: mở một ngày là tự chạy phiên Pomodoro 25 phút (1 lần mỗi lần vào ngày đó).
  const autoPomoRef = useRef('')
  useEffect(() => {
    if (!s.focusMode || view !== 'day') return
    const key = 'day-' + dayId
    if (autoPomoRef.current === key) return
    autoPomoRef.current = key
    if (pomoRef.current.run || pomoRef.current.started) return
    setPomo({ sec: 25 * 60, duration: 25 * 60, run: true, started: true })
  }, [view, dayId, s.focusMode])
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
      if (s.focusMode && view === 'day') { setDayTab('do'); window.scrollTo(0, 0) }
    }
    prevSecRef.current = pomo.sec
  }, [pomo.sec, pomo.run])
  const day = DAY_BY_ID[dayId] || ALL_DAYS[0]
  useReveal(view + dayId)
  useEffect(() => { if (view !== 'day') patch({ lastView: { view, dayId } }) }, [view, dayId]) // eslint-disable-line react-hooks/exhaustive-deps
  const go = (v, id, week, tab, q) => {
    if (id) setDayId(id)
    if (week !== undefined) setTimelineWeek(week)
    if (tab) setDayTab(tab)
    else if (v === 'day' && view !== 'day') setDayTab('learn')
    if (q !== undefined) setSearchQ(q)
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
      <nav className="nav"><button className={view === 'home' ? 'on' : ''} onClick={() => go('home')}>Trang chính</button><button className={view === 'timeline' ? 'on' : ''} onClick={() => go('timeline')}>Timeline</button><button className={view === 'review' ? 'on' : ''} onClick={() => go('review')}>Hôm nay ôn gì</button><button className={view === 'mock' ? 'on' : ''} onClick={() => go('mock')}>Phỏng vấn</button><button className={view === 'search' ? 'on' : ''} onClick={() => go('search')}>Tìm kiếm</button><button className={view === 'settings' ? 'on' : ''} onClick={() => go('settings')}>Cài đặt</button></nav>
      <button className={`focus-toggle ${s.focusMode ? 'on' : ''}`} title="Chế độ tập trung: ẩn điều hướng, tự chạy Pomodoro khi vào ngày học, hết phiên nhảy vào bài tập" onClick={() => patch({ focusMode: !s.focusMode })}>🎯 {s.focusMode ? 'Tắt tập trung' : 'Tập trung'}</button>
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
        {view === 'review' && <ReviewView go={go} s={s} />}
        {view === 'day' && <DayView day={day} go={go} p={p} pomo={pomo} onTogglePomo={togglePomo} onResetPomo={resetPomo} onSetPomo={setPomoDur} tab={dayTab} setTab={setDayTab} />}
        {view === 'mock' && <MockInterviewView go={go} s={s} />}
        {view === 'search' && <SearchView go={go} s={s} initialQ={searchQ} />}
        {view === 'settings' && <Settings p={p} />}
      </Boundary>
      <ChatDock s={s} open={dockOpen} onToggle={() => setDockOpen(v => !v)} onClose={() => setDockOpen(false)} onOpen={() => setDockOpen(true)} />
      <footer>BEApp v1 · Nội dung từ lộ trình 30 ngày trong Google Doc "Theory domains for backend dev". Tiến độ lưu ở localStorage trên máy bạn, không gửi lên server. Mở bằng Chrome/Edge và Install app để dùng như app trên laptop.</footer>
    </main>
  </div>
}
