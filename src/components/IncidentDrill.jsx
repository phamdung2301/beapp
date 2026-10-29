import { useState } from 'react'

// Incident Drill Engine: tổng quát mô hình Log Simulator ngày 1 thành dữ liệu —
// tín hiệu mạnh nhất → giả thuyết → lệnh kiểm chứng → kết luận, mỗi bước chọn sai
// thì sửa ngay ở bước đó. Thêm drill mới = thêm dữ liệu vào data/drills.js, không sửa engine.
// drill: { id, title, intro, log, steps: [{ q, options: [{ t, ok, fb }] }], conclusion, note }
export function IncidentDrill({ drill }) {
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState({}) // stepIdx -> optionIdx
  const done = step >= drill.steps.length
  const allCorrect = done && drill.steps.every((s, i) => s.options[picked[i]]?.ok)
  const reset = () => { setStep(0); setPicked({}) }
  return <div className="card" style={{ borderColor: '#c6f24e' }}>
    <h3>🚨 Incident Drill — {drill.title}</h3>
    <p className="mut">{drill.intro}</p>
    <pre className="code">{drill.log}</pre>
    {drill.steps.map((st, i) => {
      if (i > step) return null
      const p = picked[i]
      return <div key={i} style={{ marginTop: 14 }}>
        <p><strong>Bước {i + 1}/{drill.steps.length} — {st.q}</strong></p>
        <div className="row">
          {st.options.map((o, j) => <button key={j} className="btn ghost small" onClick={() => setPicked(prev => ({ ...prev, [i]: j }))}>{o.t}</button>)}
        </div>
        {p !== undefined && <p className={st.options[p].ok ? '' : 'warn'}>{st.options[p].ok ? '✓ ' : '✗ '}{st.options[p].fb}</p>}
      </div>
    })}
    {step < drill.steps.length && picked[step] !== undefined &&
      <div className="row" style={{ marginTop: 10 }}>
        {drill.steps[step].options[picked[step]].ok
          ? <button className="btn small" onClick={() => setStep(step + 1)}>Bước tiếp theo →</button>
          : <span className="mut">Chọn lại đáp án đúng của bước này để đi tiếp.</span>}
      </div>}
    {done && <div className="banner" style={{ marginTop: 14 }}>
      <strong>Kết luận: {drill.conclusion}</strong>
      <p className="mut" style={{ marginTop: 8 }}>{drill.note}</p>
      <p className="mut">{allCorrect ? 'Bạn đi đúng cả 4 bước — đây là thứ tự kiểm chứng theo bằng chứng mạnh nhất.' : 'Bạn đã đi hết drill — xem lại các bước từng chọn sai ở trên, đó chính là chỗ cần luyện thêm.'}</p>
      <button className="btn ghost small" onClick={reset}>Chơi lại từ đầu</button>
    </div>}
  </div>
}
