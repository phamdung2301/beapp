import React, { useState, useRef } from 'react'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { LABS } from '../data/labs.js'
import { chatCompletion, detectProvider } from '../llm.js'
import { TutorChat } from './TutorChat.jsx'

// Lab thực hành: mỗi lab có code lỗi/skeleton, bằng chứng lỗi, đáp án, vì sao, gợi ý.
// Engine KHÔNG tự chấm code bằng test ẩn (dữ liệu lab không mang assertion) —
// người học sửa/đoán rồi đối chiếu đáp án và tự đánh dấu. Đây là vòng luyện có kiểm
// chứng bằng đáp án + vì sao, không phải "đọc rồi tick".

function normLines(code) {
  return (code || '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

function LabCard({ lab, mKey, day, s, patch }) {
  const [code, setCode] = useState(lab.code)
  const [attempt, setAttempt] = useState('')
  const [hintIdx, setHintIdx] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [compare, setCompare] = useState(null)
  const done = s.labDone?.[lab.id]

  const mark = (ok) => {
    const m = s.mastery?.[mKey] || {}
    patch({
      labDone: { ...s.labDone, [lab.id]: ok },
      mastery: { ...s.mastery, [mKey]: { ...m, tries: (m.tries || 0) + 1, okCount: (m.okCount || 0) + (ok ? 1 : 0), labOk: ok || !!m.labOk, lastOk: ok ? new Date().toISOString().slice(0, 10) : m.lastOk } },
    })
  }
  const doCompare = () => {
    const mine = new Set(normLines(code))
    const sol = normLines(lab.solution)
    const hit = sol.filter(l => mine.has(l)).length
    setCompare({ hit, total: sol.length })
    setShowSolution(true)
  }
  const typeLabel = { 'fix-bug': 'Sửa lỗi', predict: 'Đoán trước', skeleton: 'Điền khung code', decision: 'Ra quyết định', terminal: 'Chạy lệnh' }[lab.type] || lab.type

  return <div className="card" style={{ marginBottom: 14 }}>
    <div className="eyebrow">Lab {lab.id} · {typeLabel} · {lab.concept}</div>
    <h3 style={{ margin: '6px 0' }}>{lab.title}</h3>
    <p>{lab.prompt}</p>
    {(lab.type === 'fix-bug' || lab.type === 'skeleton') && <>
      <label>Code của bạn — sửa trực tiếp ở đây{lab.type === 'skeleton' ? ' (điền vào chỗ // TODO)' : ' (tìm và sửa dòng lỗi)'}</label>
      <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} style={{ width: '100%', minHeight: 180, fontFamily: 'monospace', fontSize: 13 }} />
      <div className="row">
        <button className="btn small" onClick={doCompare}>So sánh với đáp án</button>
        <button className="btn ghost small" onClick={() => { setCode(lab.code); setCompare(null); setShowSolution(false) }}>Về lại code gốc</button>
      </div>
      {compare && <p className="mut">Code của bạn trùng {compare.hit}/{compare.total} dòng của đáp án (so theo dòng đã chuẩn hóa khoảng trắng). Trùng cao chưa chắc đúng hoàn toàn — đọc phần "Vì sao" để đối chiếu logic.</p>}
    </>}
    {(lab.type === 'predict' || lab.type === 'decision') && <>
      <label>{lab.type === 'predict' ? 'Dự đoán của bạn (chuyện gì sẽ xảy ra / output là gì?)' : 'Quyết định của bạn + lý do (chọn phương án nào, vì sao?)'}</label>
      <textarea value={attempt} onChange={e => setAttempt(e.target.value)} placeholder="Viết dự đoán/quyết định trước khi mở đáp án — đoán sai mới là lúc học được nhiều nhất." style={{ width: '100%', minHeight: 90 }} />
      <div className="row"><button className="btn small" onClick={() => setShowSolution(true)}>Hiện đáp án</button></div>
    </>}
    {lab.type === 'terminal' && <TerminalSim lab={lab} />}
    <details style={{ marginTop: 12 }}><summary><strong>Bằng chứng lỗi / hiện tượng</strong></summary><pre className="code">{lab.failingEvidence}</pre></details>
    <div className="row" style={{ marginTop: 8 }}>
      <button className="btn ghost small" onClick={() => setHintIdx(h => Math.min(lab.hints.length, h + 1))}>Gợi ý {hintIdx > 0 ? `(${hintIdx}/${lab.hints.length})` : ''}</button>
      {lab.language === 'sql' && <SqlPlayground initialSql={lab.code} />}
    </div>
    {hintIdx > 0 && lab.hints.slice(0, hintIdx).map((h, i) => <p key={i} className="banner">Gợi ý {i + 1}: {h}</p>)}
    {showSolution && <div style={{ marginTop: 12 }}>
      <strong>Đáp án</strong><pre className="code">{lab.solution}</pre>
      <p><strong>Vì sao:</strong> {lab.why}</p>
    </div>}
    <div className="row" style={{ marginTop: 12 }}>
      <button className="btn small" onClick={() => mark(true)}>Tôi làm được ✓</button>
      <button className="btn ghost small" onClick={() => mark(false)}>Chưa làm được, ôn lại sau</button>
      {done !== undefined && <span className="mut">{done ? 'Đã đánh dấu làm được.' : 'Đã đánh dấu chưa làm được — lab này sẽ được ưu tiên ôn lại.'}</span>}
    </div>
    <TutorChat s={s} day={day} kind="lab" lab={lab} openedHints={hintIdx} />
  </div>
}

function TerminalSim({ lab }) {
  const [run, setRun] = useState(0)
  const cmds = lab.terminal?.commands || []
  if (!cmds.length) return <p className="mut">Lab terminal này chưa có kịch bản lệnh.</p>
  return <div className="paper" style={{ padding: 14 }}>
    <strong>Terminal mô phỏng</strong>
    <p className="mut">Bấm ▶ để chạy từng lệnh và xem output — giống terminal thật nhưng chạy offline, không cần cluster hay database thật.</p>
    {cmds.map((c, i) => <div key={i} style={{ marginBottom: 10 }}>
      <div className="row"><code>$ {c.cmd}</code>{i >= run && <button className="btn ghost small" onClick={() => setRun(i + 1)}>▶ Chạy</button>}</div>
      {i < run && <pre className="code" style={{ marginTop: 6 }}>{c.output}</pre>}
    </div>)}
    <button className="btn ghost small" onClick={() => setRun(cmds.length)}>Chạy tất cả</button>
    {run > 0 && <button className="btn ghost small" onClick={() => setRun(0)}>Chạy lại từ đầu</button>}
  </div>
}

function SqlPlayground({ initialSql }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle')
  const [sql, setSql] = useState(initialSql)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const dbRef = useRef(null)

  const initDb = async () => {
    setStatus('loading')
    try {
      const initSqlJs = (await import('sql.js')).default
      const SQL = await initSqlJs({ locateFile: () => wasmUrl })
      const db = new SQL.Database()
      db.run(`CREATE TABLE orders(id INTEGER PRIMARY KEY, customer TEXT, total INTEGER, status TEXT, created_at TEXT);
        CREATE TABLE order_items(id INTEGER PRIMARY KEY, order_id INTEGER, product TEXT, qty INTEGER, price INTEGER);
        CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price INTEGER);`)
      db.run(`INSERT INTO orders VALUES(1,'An',250000,'PAID','2026-10-01'),(2,'Bình',120000,'PAID','2026-10-02'),(3,'Chi',980000,'PENDING','2026-10-03'),(4,'An',45000,'PAID','2026-10-04'),(5,'Dũng',760000,'CANCELLED','2026-10-05');
        INSERT INTO order_items VALUES(1,1,'Bàn phím',1,150000),(2,1,'Chuột',1,100000),(3,2,'Cáp USB',2,60000),(4,3,'Màn hình',1,980000),(5,4,'Chuột',1,45000),(6,5,'Ghế',1,760000);
        INSERT INTO products VALUES(1,'Bàn phím',150000),(2,'Chuột',100000),(3,'Cáp USB',30000),(4,'Màn hình',980000),(5,'Ghế',760000);`)
      dbRef.current = db
      setStatus('ready')
    } catch (e) { setStatus('error'); setErr(String(e.message || e)) }
  }
  const runSql = () => {
    if (!dbRef.current) return
    try {
      const res = dbRef.current.exec(sql)
      setErr('')
      setResult(res.length ? res[0] : { columns: [], values: [], empty: true })
    } catch (e) { setResult(null); setErr(String(e.message || e)) }
  }
  if (!open) return <button className="btn ghost small" onClick={() => { setOpen(true); initDb() }}>Chạy SQL thật (SQLite trong trình duyệt)</button>
  return <div className="paper" style={{ padding: 14, marginTop: 8 }}>
    <strong>SQL Playground — chạy thật, dữ liệu mẫu orders / order_items / products</strong>
    {status === 'loading' && <p className="mut">Đang tải engine SQLite…</p>}
    {status === 'error' && <p className="warn">Không tải được engine SQLite: {err}. Thử tải lại trang.</p>}
    {status === 'ready' && <>
      <textarea value={sql} onChange={e => setSql(e.target.value)} spellCheck={false} style={{ width: '100%', minHeight: 90, fontFamily: 'monospace', fontSize: 13 }} />
      <div className="row"><button className="btn small" onClick={runSql}>▶ Chạy</button><button className="btn ghost small" onClick={() => { setSql(initialSql); setResult(null); setErr('') }}>Về lại SQL gốc của lab</button><button className="btn ghost small" onClick={() => { dbRef.current = null; setOpen(false); setStatus('idle') }}>Đóng</button></div>
      {err && <p className="warn">Lỗi SQL: {err}</p>}
      {result && (result.empty ? <p className="mut">Chạy xong, không trả về dòng nào (có thể là INSERT/UPDATE/DELETE hoặc WHERE không khớp).</p>
        : <div style={{ overflowX: 'auto' }}><table><thead><tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{result.values.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j}>{v === null ? 'NULL' : String(v)}</td>)}</tr>)}</tbody></table><p className="mut">{result.values.length} dòng.</p></div>)}
    </>}
  </div>
}

export function QuizBox({ quiz, mKey, s, patch }) {
  const [attempt, setAttempt] = useState('')
  const [show, setShow] = useState(false)
  if (!quiz) return null
  const mark = (ok) => {
    const m = s.mastery?.[mKey] || {}
    patch({ mastery: { ...s.mastery, [mKey]: { ...m, tries: (m.tries || 0) + 1, okCount: (m.okCount || 0) + (ok ? 1 : 0), lastOk: ok ? new Date().toISOString().slice(0, 10) : m.lastOk } } })
    setShow(true)
  }
  return <div className="paper" style={{ padding: 14, marginTop: 12 }}>
    <strong>Câu hỏi kiểm tra hiểu</strong>
    <p>{quiz.q}</p>
    <textarea value={attempt} onChange={e => setAttempt(e.target.value)} placeholder="Đoán trước rồi mới mở đáp án — đoán sai mới là lúc học được nhiều nhất." style={{ width: '100%', minHeight: 70 }} />
    <div className="row"><button className="btn small" onClick={() => setShow(true)}>Hiện đáp án</button></div>
    {show && <><p><strong>Đáp án:</strong> {quiz.answer}</p><p><strong>Vì sao:</strong> {quiz.why}</p>
      <div className="row"><button className="btn small" onClick={() => mark(true)}>Tôi trả lời đúng ✓</button><button className="btn ghost small" onClick={() => mark(false)}>Tôi trả lời sai, cần ôn lại</button></div></>}
  </div>
}

export function TeachBackBox({ cKey, c, e, s, patch }) {
  const [text, setText] = useState(s.teachBack?.[cKey]?.text || '')
  const [review, setReview] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const saved = s.teachBack?.[cKey]
  const save = () => {
    patch({ teachBack: { ...s.teachBack, [cKey]: { text, at: new Date().toISOString() } }, mastery: { ...s.mastery, [cKey]: { ...(s.mastery?.[cKey] || {}), teachBack: true } } })
  }
  // AI đối chiếu (không chấm điểm, không tick giúp): so bản teach-back với nội dung gốc.
  const askAI = async () => {
    const cfg = s.llm || {}
    if (!(cfg.key || detectProvider(cfg) === 'custom')) { setErr('Chưa có API key. Vào Cài đặt → AI Gia sư để nhập key, hoặc bỏ qua — bản này để bạn tự so lại cũng được.'); return }
    setBusy(true); setErr(''); setReview('')
    try {
      const out = await chatCompletion(cfg, [
        { role: 'system', content: 'Bạn là reviewer backend senior. Đối chiếu bản giải thích lại của học viên với nội dung gốc của khái niệm. Nêu 3 phần ngắn: (1) ý học viên nêu đúng, (2) ý còn thiếu, (3) ý sai hoặc không chính xác kèm cách sửa. KHÔNG chấm điểm, không viết lại toàn bộ bản giải thích, không tick giúp tiến độ. Tối đa 220 từ, tiếng Việt.' },
        { role: 'user', content: `Khái niệm: ${c?.t || ''}\nNội dung gốc:\n${e?.what || ''}\n${e?.role || c?.d || ''}\n\nBản học viên viết:\n${text || '(trống)'}` },
      ], { maxTokens: 600 })
      setReview(out || '(Không có nội dung trả về)')
    } catch (ex) { setErr(String(ex.message || ex)) }
    setBusy(false)
  }
  return <div className="paper" style={{ padding: 14, marginTop: 12 }}>
    <strong>Giải thích lại bằng lời của bạn (khuyến khích, không bắt buộc)</strong>
    <p className="mut">Viết như đang giảng cho một bạn junior. Không có máy chấm — bản này để bạn tự so lại sau 1 tuần xem mình đã hiểu sâu hơn chưa. Không bắt buộc để đạt điểm 5, nhưng là bằng chứng mạnh nhất cho mức "giải thích được".</p>
    <textarea value={text} onChange={e => setText(e.target.value)} placeholder="VD: N+1 là khi… vì… nên sửa bằng…" style={{ width: '100%', minHeight: 90 }} />
    <div className="row"><button className="btn small" onClick={save}>Lưu bản giải thích</button>
      {e && <button className="btn ghost small" disabled={busy || !text.trim()} onClick={askAI}>{busy ? 'AI đang đối chiếu…' : '🤖 Xin AI đối chiếu với nội dung gốc'}</button>}
      {saved && <span className="mut">Đã lưu{saved.at ? ` lúc ${new Date(saved.at).toLocaleString('vi-VN')}` : ''}.</span>}
    </div>
    {err && <p className="warn">{err}</p>}
    {review && <div className="ai-review"><strong>AI đối chiếu (tham khảo, không chấm điểm):</strong><p style={{ whiteSpace: 'pre-wrap' }}>{review}</p></div>}
  </div>
}

export function LabView({ day, s, patch }) {
  const labs = LABS[day.id] || []
  return <div style={{ marginTop: 16 }}>
    <div className="card"><h3>Lab thực hành — Ngày {day.id}: {day.title}</h3>
      <p className="mut">5 lab gắn với phần cần thiết nhất của ngày này: sửa code lỗi thật, điền khung code, đoán trước khi mở đáp án, ra quyết định, và chạy lệnh trong terminal mô phỏng. Lab SQL có nút chạy thật bằng SQLite trong trình duyệt. Làm được thì bấm "Tôi làm được" — app ghi vào tiến độ thông thạo của bạn.</p>
      <p className="mut">{labs.length}/5 lab{labs.length !== 5 ? ' — cảnh báo: dữ liệu lab chưa đủ 5 cho ngày này.' : ''} Mỗi lab có gia sư AI bám bài (bật ở Cài đặt → AI Gia sư). Lab SQL có nút chạy thật bằng SQLite trong trình duyệt. Làm được thì bấm "Tôi làm được" — app ghi vào tiến độ thông thạo của bạn.</p>
    </div>
    {labs.map(lab => {
      const ci = day.concepts.findIndex(c => c.t === lab.concept)
      const mKey = ci >= 0 ? `${day.id}-${ci}` : `lab-${lab.id}`
      return <LabCard key={lab.id} lab={lab} mKey={mKey} day={day} s={s} patch={patch} />
    })}
    {labs.length === 0 && <p className="mut">Ngày này chưa có lab.</p>}
  </div>
}
