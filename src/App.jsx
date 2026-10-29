import React, { useMemo, useState, useEffect } from 'react'
import { DAYS, WEEKS, REVIEW_CHECKLIST, CAPSTONE_RUBRIC } from './data/days.js'
import { useProgress, useReveal, streakOf } from './store.js'

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

function Pomodoro({ onDone }) {
  const [sec, setSec] = useState(25 * 60)
  const [run, setRun] = useState(false)
  useEffect(() => {
    if (!run) return
    const t = setInterval(() => setSec(s => { if (s <= 1) { setRun(false); onDone && onDone(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(t)
  }, [run])
  const mm = String(Math.floor(sec / 60)).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0')
  return <div className="card"><strong>Pomodoro tập trung</strong><div className="stat">{mm}:{ss}</div><div className="row"><button className="btn small" onClick={() => setRun(!run)}>{run ? 'Tạm dừng' : 'Bắt đầu'}</button><button className="btn ghost small" onClick={() => { setRun(false); setSec(25 * 60) }}>Đặt lại 25 phút</button><button className="btn ghost small" onClick={() => { setRun(false); setSec(50 * 60) }}>50 phút</button></div><p className="mut">Hết 1 phiên thì ghi 1 dòng kết quả vào ghi chú bài tập, đừng chỉ bấm đồng hồ.</p></div>
}

function Dashboard({ go, s }) {
  const doneCount = Object.keys(s.done).length
  const pct = Math.round(doneCount / 30 * 100)
  const next = DAYS.find(d => !s.done[d.id]) || DAYS[29]
  const scores = Object.values(s.scores)
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'
  const weak = [...DAYS].filter(d => s.scores[d.id] !== undefined).sort((a, b) => (s.scores[a.id] || 0) - (s.scores[b.id] || 0)).slice(0, 3)
  return <div>
    <section className="hero reveal"><div className="aurora" aria-hidden="true"><i /><i /></div><div style={{ position: 'relative' }}>
      <div className="eyebrow">01 / Lộ trình · Java Backend Senior</div>
      <h1>Học sâu, <em>làm thật,</em><br />chấm thật.</h1>
      <p>30 ngày theo đúng Doc bạn đã làm. Mỗi ngày có khái niệm, bài tập, tiêu chí đạt và bẫy agent. Mở app là biết hôm nay học gì, không phải đi tìm.</p>
      <div className="row"><button className="btn" onClick={() => go('day', next.id)}>Học tiếp: Ngày {next.id} — {next.title} →</button><button className="btn ghost" onClick={() => go('timeline')}>Xem timeline 30 ngày</button></div>
    </div></section>
    <div className="marquee" aria-hidden="true"><div>{'JVM · Spring Boot · REST · DTO · SQL · JPA · MongoDB · Redis · Kafka · Saga · Resilience · CAP · DDD · OAuth2 · Observability · Docker · Testing · ADR · '.repeat(3)}</div></div>
    <div className="grid">
      <div className="card reveal"><Ring pct={pct} /><p><strong>{doneCount}/30 ngày đã xong</strong><br /><span className="mut">Streak: {streakOf(s.done)} ngày · Điểm tự chấm trung bình: {avg}/5</span></p><div className="progress"><i style={{ width: pct + '%' }} /></div></div>
      <div className="card reveal"><div className="eyebrow">Hôm nay nên học</div><h3>Ngày {next.id} — {next.title}</h3><p className="mut">{next.goal}</p><button className="btn small" onClick={() => go('day', next.id)}>Vào ngày này</button></div>
      <div className="card reveal"><div className="eyebrow">Cần ôn lại</div>{weak.length ? weak.map(d => <p key={d.id}>Ngày {d.id} — {d.title} <span className="mut">({s.scores[d.id]}/5)</span> <button className="btn ghost small" onClick={() => go('day', d.id)}>Ôn</button></p>) : <p className="mut">Chưa có điểm tự chấm. Học xong 1 ngày, chấm điểm thật rồi quay lại đây, app sẽ chỉ ra domain yếu nhất.</p>}</div>
      <div className="card reveal"><div className="eyebrow">Cài app lên laptop</div><p>Mở web này bằng Chrome hoặc Edge, chọn Install app / Cài đặt ứng dụng. Biểu tượng sẽ xuất hiện ngoài desktop và taskbar, mở thành cửa sổ riêng và chạy offline.</p><button className="btn ghost small" onClick={() => go('settings')}>Hướng dẫn cài đặt</button></div>
    </div>
    <h2 style={{ marginTop: 28 }}>5 tuần, nhìn 1 lần là nhớ</h2>
    <div className="grid">{WEEKS.map(w => <div className="card reveal" key={w.n}><div className="eyebrow">Tuần {w.n}</div><h3>{w.name}</h3><p className="mut">Ngày {w.days[0]}–{w.days[w.days.length - 1]} · {w.days.filter(id => s.done[id]).length}/{w.days.length} ngày xong</p><button className="btn ghost small" onClick={() => go('timeline')}>Xem tuần này</button></div>)}</div>
  </div>
}

function Timeline({ go, s }) {
  const [week, setWeek] = useState(0)
  const list = week === 0 ? DAYS : DAYS.filter(d => d.week === week)
  return <div><h2>Timeline 30 ngày</h2><p className="mut">Bấm vào 1 ngày để học. Ngày đã xong có viền xanh, ngày hôm nay theo lịch của bạn có viền đậm.</p>
    <div className="row">{[0, 1, 2, 3, 4, 5].map(w => <button key={w} className={week === w ? 'btn small' : 'btn ghost small'} onClick={() => setWeek(w)}>{w === 0 ? 'Tất cả' : `Tuần ${w}`}</button>)}</div>
    <div className="daygrid" style={{ marginTop: 16 }}>{list.map(d => <button key={d.id} className={`daycard ${s.done[d.id] ? 'done' : ''}`} onClick={() => go('day', d.id)}><small>NGÀY {d.id} · TUẦN {d.week}</small><div><strong>{d.title}</strong></div><small>{s.done[d.id] ? `✓ Xong ${s.done[d.id]}` : (s.scores[d.id] !== undefined ? `Điểm tự chấm: ${s.scores[d.id]}/5` : 'Chưa học')}</small></button>)}</div>
  </div>
}

function SearchView({ go }) {
  const [q, setQ] = useState('')
  const res = useMemo(() => {
    if (q.trim().length < 2) return []
    const k = q.toLowerCase()
    return DAYS.filter(d => (d.title + ' ' + d.goal + ' ' + d.concepts.map(c => c.t + ' ' + c.d).join(' ') + ' ' + d.exercises.map(e => e.t).join(' ')).toLowerCase().includes(k))
  }, [q])
  return <div><h2>Tìm kiếm toàn app</h2><input style={{ width: '100%', padding: 12 }} placeholder="Gõ ít nhất 2 ký tự, ví dụ: JWT, Saga, N+1, cache…" value={q} onChange={e => setQ(e.target.value)} />
    {q.trim().length >= 2 && <p className="mut">{res.length} kết quả</p>}
    <div className="grid">{res.map(d => <div className="card" key={d.id}><div className="eyebrow">Ngày {d.id}</div><h3>{d.title}</h3><p className="mut">{d.goal}</p><button className="btn small" onClick={() => go('day', d.id)}>Vào ngày này</button></div>)}</div>
    <h3 style={{ marginTop: 24 }}>Thuật ngữ hay gặp</h3><p className="mut">Idempotency: gửi lại cùng 1 thao tác mà kết quả không đổi. Circuit Breaker: ngắt mạch khi service lỗi liên tục. Aggregate: ranh giới transaction và invariant trong DDD. Outbox: ghi event cùng transaction với dữ liệu nghiệp vụ rồi gửi sau. N+1: 1 query lấy danh sách rồi N query lấy từng item con.</p></div>
}

function DayView({ day, go, p }) {
  const { s, setDone, setNote, toggleList, patch } = p
  const prev = DAYS.find(d => d.id === day.id - 1), next = DAYS.find(d => d.id === day.id + 1)
  const [tab, setTab] = useState('learn')
  const doneCriteria = day.criteria.filter((_, i) => s.criteria?.[day.id]?.[i]).length
  return <div>
    <div className="eyebrow">Ngày {day.id} · Tuần {day.week} {day.isCheckpoint ? '· Checkpoint' : ''}</div>
    <h2 style={{ fontSize: 34, letterSpacing: '-.03em', margin: '6px 0' }}>{day.title}</h2>
    <p className="mut">{day.goal}</p>
    <div className="row">
      <button className={tab === 'learn' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('learn')}>Học</button>
      <button className={tab === 'do' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('do')}>Làm bài tập</button>
      <button className={tab === 'flash' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('flash')}>Flashcard ôn tập</button>
      <button className={tab === 'check' ? 'btn small' : 'btn ghost small'} onClick={() => setTab('check')}>Tự chấm</button>
    </div>
    {tab === 'learn' && <div className="paper" style={{ marginTop: 16 }}>
      <h3>Khái niệm phải nắm</h3>
      {day.concepts.map((c, i) => <details key={i} open={i === 0}><summary>{c.t}</summary><p>{c.d}</p></details>)}
      <div className="warn" style={{ marginTop: 16 }}><strong>Bẫy agent thường gặp:</strong> {day.trap}</div>
      <div style={{ marginTop: 16 }}><Pomodoro onDone={() => patch({ pomodoroDone: (s.pomodoroDone || 0) + 1 })} /></div>
    </div>}
    {tab === 'do' && <div style={{ marginTop: 16 }}>
      {day.exercises.map((e, i) => {
        const key = `${day.id}-${i}`
        return <div className="card" key={i} style={{ marginBottom: 14 }}><h3>Bài {i + 1}: {e.t}</h3><p className="mut">{e.d}</p>
          <div className="row"><button className="btn ghost small" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(e.template); alert('Đã sao chép template vào clipboard') }}>Sao chép template</button><button className="btn ghost small" onClick={() => setNote(key, e.template)}>Điền template vào ghi chú</button></div>
          <label>Ghi chú / output của bạn</label><textarea value={s.notes[key] || ''} onChange={ev => setNote(key, ev.target.value)} placeholder="Viết output ở đây: sơ đồ, contract, bảng review, ADR… Người khác đọc được mới tính là xong." />
        </div>
      })}
      {day.id === 28 && <div className="card"><h3>Checklist review code agent (tick từng mục khi đã kiểm tra)</h3>{REVIEW_CHECKLIST.map((c, i) => <label key={i} style={{ fontWeight: 400 }}><input type="checkbox" checked={!!s.review?.[day.id]?.[i]} onChange={() => toggleList('review', day.id, i)} /> {c}</label>)}</div>}
      {day.id === 30 && <div className="card"><h3>Rubric capstone (mỗi phần 0–2 điểm)</h3>{CAPSTONE_RUBRIC.map((c, i) => <div key={i}><label>{c.t} — {c.d}</label><select value={s.capstone?.[i] ?? ''} onChange={ev => patch({ capstone: { ...s.capstone, [i]: Number(ev.target.value) } })}><option value="">Chưa chấm</option><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></div>)}<p><strong>Tổng: {Object.values(s.capstone || {}).reduce((a, b) => a + (Number(b) || 0), 0)}/10.</strong> Dưới 7 thì quay lại ngày yếu nhất và làm lại checkpoint tuần đó.</p></div>}
    </div>}
    {tab === 'flash' && <Flashcards day={day} s={s} patch={patch} />}
    {tab === 'check' && <div className="card" style={{ marginTop: 16 }}><h3>Tự chấm ngày này</h3>
      {day.criteria.map((c, i) => <label key={i} style={{ fontWeight: 400 }}><input type="checkbox" checked={!!s.criteria?.[day.id]?.[i]} onChange={() => toggleList('criteria', day.id, i)} /> {c}</label>)}
      <p>Đã tick {doneCriteria}/{day.criteria.length} tiêu chí.</p>
      <label>Điểm tự chấm cho ngày này (0–5)</label>
      <select value={s.scores[day.id] ?? ''} onChange={ev => patch({ scores: { ...s.scores, [day.id]: Number(ev.target.value) } })}><option value="">Chưa chấm</option>{[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select>
      <div className="row" style={{ marginTop: 14 }}><button className="btn" onClick={() => setDone(day.id, true)}>Đánh dấu đã xong ngày này ✓</button>{s.done[day.id] && <button className="btn ghost" onClick={() => setDone(day.id, false)}>Bỏ đánh dấu xong</button>}</div>
      <p className="mut">Chỉ đánh dấu xong khi đã có output ở tab Làm bài tập, không chỉ đọc xong.</p>
    </div>}
    <div className="row" style={{ marginTop: 20 }}>
      {prev && <button className="btn ghost" onClick={() => go('day', prev.id)}>← Ngày {prev.id}: {prev.title}</button>}
      {next && <button className="btn" onClick={() => go('day', next.id)}>Ngày {next.id}: {next.title} →</button>}
    </div>
  </div>
}

function Flashcards({ day, s, patch }) {
  const [idx, setIdx] = useState(0)
  const [flip, setFlip] = useState(false)
  const c = day.concepts[idx]
  const known = s.flashKnown?.[`${day.id}-${idx}`]
  return <div style={{ marginTop: 16 }}>
    <p className="mut">Thẻ {idx + 1}/{day.concepts.length} · Bấm vào thẻ để lật. Thẻ nào chưa thuộc sẽ được ôn lại trước.</p>
    <div className={`flash ${flip ? 'flipped' : ''}`} onClick={() => setFlip(!flip)}><div className="flash-in">
      <div className="flash-face"><div className="eyebrow">Khái niệm</div><h3>{c.t}</h3><p className="mut">Bấm để xem giải thích</p></div>
      <div className="flash-face flash-back"><div className="eyebrow">Giải thích</div><p>{c.d}</p></div>
    </div></div>
    <div style={{ height: 220 }} />
    <div className="row"><button className="btn ghost small" onClick={() => { setIdx(Math.max(0, idx - 1)); setFlip(false) }}>← Thẻ trước</button><button className="btn small" onClick={() => { setIdx(Math.min(day.concepts.length - 1, idx + 1)); setFlip(false) }}>Thẻ sau →</button>
      <button className="btn small" onClick={() => patch({ flashKnown: { ...s.flashKnown, [`${day.id}-${idx}`]: true } })}>Đã thuộc ✓</button>
      <button className="btn ghost small" onClick={() => patch({ flashKnown: { ...s.flashKnown, [`${day.id}-${idx}`]: false } })}>Chưa thuộc, ôn lại</button></div>
    <p className="mut">{known === true ? 'Thẻ này bạn đã đánh dấu thuộc.' : known === false ? 'Thẻ này bạn đã đánh dấu chưa thuộc.' : 'Chưa đánh dấu thẻ này.'}</p>
  </div>
}

function Settings({ p }) {
  const { s, patch, exportJSON, importJSON, clearAll } = p
  const [msg, setMsg] = useState('')
  return <div><h2>Cài đặt và cài app lên laptop</h2>
    <div className="card"><h3>1. Cài đặt PWA</h3><ol><li>Mở web này bằng Chrome hoặc Edge trên laptop.</li><li>Trên thanh địa chỉ, bấm biểu tượng Install / Cài đặt, hoặc menu ⋮ → Install app / Cài đặt ứng dụng.</li><li>Biểu tượng BEApp sẽ xuất hiện ngoài desktop, taskbar và Start Menu. Mở từ biểu tượng sẽ ra cửa sổ riêng, không có thanh địa chỉ.</li><li>App chạy offline cho nội dung 30 ngày và bài làm của bạn. Khi có bản mới, app sẽ hiện banner "Có bản mới" — bấm cập nhật, đừng để bản cũ kẹt lại.</li></ol><p className="mut">Lưu ý: nội dung và tiến độ lưu trên trình duyệt của máy bạn. Đổi máy thì dùng Xuất dữ liệu ở dưới rồi Nhập lại.</p></div>
    <div className="card" style={{ marginTop: 14 }}><h3>2. Lịch học của bạn</h3>
      <label>Ngày bắt đầu lộ trình</label><input type="date" value={s.startDate || ''} onChange={e => patch({ startDate: e.target.value })} />
      <label>Giờ nhắc học hàng ngày</label><input type="time" value={s.reminder || '07:00'} onChange={e => patch({ reminder: e.target.value })} />
      <p className="mut">App chưa gửi thông báo nền khi chưa mở app. Cách chắc chắn nhất: ghim BEApp lên taskbar và mở vào giờ đã chọn. Số phiên Pomodoro đã xong: {s.pomodoroDone || 0}.</p></div>
    <div className="card" style={{ marginTop: 14 }}><h3>3. Sao lưu tiến độ</h3><div className="row"><button className="btn small" onClick={exportJSON}>Xuất dữ liệu ra file JSON</button><label className="btn ghost small">Nhập dữ liệu từ file<input type="file" accept="application/json" hidden onChange={e => e.target.files[0] && importJSON(e.target.files[0], ok => setMsg(ok ? 'Nhập xong.' : 'File không đọc được.'))} /></label><button className="btn ghost small" onClick={() => { if (confirm('Xóa toàn bộ tiến độ và ghi chú? Hành động này không hoàn tác được.')) clearAll() }}>Xóa toàn bộ dữ liệu</button></div>{msg && <p>{msg}</p>}</div>
  </div>
}

export default function App() {
  const p = useProgress()
  const { s } = p
  const [view, setView] = useState('home')
  const [dayId, setDayId] = useState(1)
  const [update, setUpdate] = useState(false)
  useEffect(() => { const h = () => setUpdate(true); window.addEventListener('beapp-update', h); return () => window.removeEventListener('beapp-update', h) }, [])
  const day = DAYS.find(d => d.id === dayId) || DAYS[0]
  useReveal(view + dayId)
  const go = (v, id) => { if (id) setDayId(id); setView(v); window.scrollTo(0, 0) }
  return <div>
    <header className="topbar"><div className="topbar-in"><div className="logo">BE<span>App</span> <small style={{ fontSize: 13, color: '#93a0be' }}>· 30 ngày Backend Senior</small></div>
      <nav className="nav"><button className={view === 'home' ? 'on' : ''} onClick={() => go('home')}>Trang chính</button><button className={view === 'timeline' ? 'on' : ''} onClick={() => go('timeline')}>Timeline</button><button className={view === 'search' ? 'on' : ''} onClick={() => go('search')}>Tìm kiếm</button><button className={view === 'settings' ? 'on' : ''} onClick={() => go('settings')}>Cài đặt</button></nav>
    </div></header>
    <main className="wrap view" key={view + dayId}>
      {update && <div className="banner">Có bản mới của app. <button className="btn small" onClick={() => window.__beappUpdateSW && window.__beappUpdateSW(true)}>Cập nhật ngay</button></div>}
      <Boundary onHome={() => go('home')}>
        {view === 'home' && <Dashboard go={go} s={s} />}
        {view === 'timeline' && <Timeline go={go} s={s} />}
        {view === 'day' && <DayView day={day} go={go} p={p} />}
        {view === 'search' && <SearchView go={go} />}
        {view === 'settings' && <Settings p={p} />}
      </Boundary>
      <footer>BEApp v1 · Nội dung từ lộ trình 30 ngày trong Google Doc "Theory domains for backend dev". Tiến độ lưu ở localStorage trên máy bạn, không gửi lên server. Mở bằng Chrome/Edge và Install app để dùng như app trên laptop.</footer>
    </main>
  </div>
}
