import React from 'react'

const RX_NUM = /^\d+ · /

// StepFlow — lộ trình học trong ngày: 6 bước theo thứ tự sư phạm BEApp
// (đọc → lấy lại trí nhớ bằng quiz → lab → viết bài → flashcard SM-2 → tự chấm).
// Nghiên cứu áp dụng: retrieval practice (Roediger & Karpicke) — quiz TRƯỚC khi
// đối chiếu đáp án; cognitive load (Sweller) — một bước một lúc thay 6 tab rời;
// progressive disclosure — trạng thái suy từ bằng chứng ĐÃ LƯU (quiz ok, lab đạt,
// ghi chú, srs, điểm) nên không thêm schema, không phá dữ liệu cũ.
export function StepFlow({ day, s, curTab, onJump }) {
  const note = i => (s.notes?.[`${day.id}-${i}`] || '').trim()
  const steps = [
    { id: 'learn', label: '1 · Đọc khái niệm', tab: 'learn', hint: `${day.concepts.length} khái niệm`, done: null },
    { id: 'explain', label: '2 · Hiểu & quiz', tab: 'explain', hint: 'tự trả lời trước, mở đáp án sau', done: day.concepts.some((_, i) => (s.mastery?.[`${day.id}-${i}`]?.okCount || 0) > 0) },
    { id: 'lab', label: '3 · Lab', tab: 'lab', hint: 'sửa lỗi, đoán, quyết định', done: Object.keys(s.labDone || {}).some(k => k.startsWith(day.id + '-')) },
    { id: 'do', label: '4 · Bài tập', tab: 'do', hint: `${day.exercises.length} bài có output`, done: day.exercises.every((_, i) => note(i)) ? true : day.exercises.some((_, i) => note(i)) ? 'half' : false },
    { id: 'flash', label: '5 · Flashcard', tab: 'flash', hint: 'ôn lại đúng lúc sắp quên (SM-2)', done: day.concepts.some((_, i) => s.srs2?.[`${day.id}-${i}`]) },
    { id: 'check', label: '6 · Tự chấm', tab: 'check', hint: 'điểm 0–5 có tiêu chí', done: s.scores?.[day.id] !== undefined },
  ]
  const proven = steps.filter(st => st.done === true).length
  const next = steps.find(st => st.done !== true)
  const icon = st => st.done === true ? '✓' : st.done === 'half' ? '◐' : st.done === null ? '·' : '○'
  const cap = proven === 0
    ? 'Mỗi ngày 6 bước: đọc → quiz → lab → bài tập → flashcard → tự chấm. Bắt đầu bước 1 bên dưới.'
    : next ? `Bước nên làm tiếp: ${next.label.replace(RX_NUM, '')} — ${next.hint}.` : `Cả ${steps.length - 1} bước hành động đã lưu — tự chấm lại nếu muốn.`
  return <div className="stepflow" role="navigation" aria-label={`Lộ trình học ngày ${day.id}: đã lưu ${proven}/${steps.length - 1} bước`}>
    <div className="row stepflow-row">
      {steps.map(st => <button key={st.id} className={`sf-step ${curTab === st.tab ? 'cur' : ''} ${st.done === true ? 'ok' : ''} ${st.done === 'half' ? 'half' : ''} ${next && st.id === next.id && curTab !== st.tab ? 'next' : ''}`}
        onClick={() => onJump(st.tab)}
        title={`${st.label} — ${st.hint}${st.done === true ? ' · đã lưu' : ''}`}>
        <span className="sf-ico">{icon(st)}</span><span>{st.label}</span>{next && st.id === next.id && curTab !== st.tab ? <span className="sf-arrow">→</span> : null}
      </button>)}
    </div>
    <p className="mut" style={{ margin: '6px 2px 0' }}>{cap} Đã lưu: <strong>{proven}/{steps.length - 1}</strong> bước.</p>
  </div>
}
