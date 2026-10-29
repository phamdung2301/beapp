// Bối cảnh mặc định cho AI Gia sư: mỗi phần (bài tập, lab, khái niệm, checkpoint)
// có một "context bundle" gồm lý thuyết của ngày + bối cảnh section + tiến độ người học.
// Bundle này là phần hệ thống (system message) của mỗi request, kèm toàn bộ lịch sử chat.
// Nguyên tắc chống lộ đáp án: rubric được gửi, đáp án mẫu/solution KHÔNG được gửi.

import { CONCEPT_EXPLAIN } from './data/conceptExplain.js'
import { masteryLevel } from './store.js'

const CTX_LIMIT = 9000 // ngân sách ký tự cho phần bối cảnh, giữ token ở mức hợp lý

const clip = (t, n) => { t = String(t || '').trim(); return t.length <= n ? t : t.slice(0, n - 1) + '…' }

export const MODE_LABEL = { exercise: 'Làm bài tập', lab: 'Lab', concept: 'Khái niệm', defend: 'Bảo vệ thiết kế' }

const PROMPT_HEAD = {
  socratic: (kind) => `Bạn là gia sư backend senior trong app BEApp, kèm cặp học viên ${kind === 'lab' ? 'làm lab thực hành' : 'làm bài tập thiết kế/spec'} theo kiểu Socratic.
- KHÔNG đưa đáp án trọn vẹn: hỏi ngược từng bước để học viên tự nghĩ ra.
- Học viên sai thì chỉ ra sai ở bước nào của suy luận, rồi gợi ý lại bằng một câu hỏi.
- TUYỆT ĐỐI không tiết lộ đáp án mẫu / solution nếu chúng không có trong context.
- Trả lời tiếng Việt, tối đa ~180 từ mỗi lượt, dùng bullet khi liệt kê.
- Chỉ dựa vào BỐI CẢNH BÀI HỌC dưới đây; kiến thức ngoài context chỉ dùng khi học viên hỏi rõ và phải nói rõ là ngoài bài học.
- Không bịa số, không bịa lệnh, không tự tick giúp tiến độ.`,
  concept: () => `Bạn là gia sư giải đáp trong app BEApp, đứng cạnh khái niệm đang mở của học viên.
- Trả lời trực tiếp, ngắn gọn (tối đa ~200 từ), dựa trên BỐI CẢNH BÀI HỌC.
- Câu hỏi vượt phạm vi ngày này thì nói rõ và gợi ý ngày liên quan (nếu có trong context) thay vì lan man.
- Được lấy ví dụ code ngắn để làm rõ, không bịa số liệu.`,
  defend: () => `Bạn là reviewer khắt khe đang chất vấn thiết kế của học viên trước khi duyệt checkpoint (kiểu phỏng vấn senior).
- MỖI LƯỢT CHỈ HỎI MỘT CÂU, xoáy vào tiêu chí của ngày và điểm yếu lộ ra trong câu trả lời của học viên.
- Không dạy lý thuyết trừ khi học viên xin; không đưa đáp án thay thế.
- Sau khoảng 4 lượt trả lời của học viên, tổng kết: tiêu chí nào được bảo vệ, tiêu chí nào cần làm lại.
- Trả lời tiếng Việt, ngắn gọn.`,
}

const REVIEW_PROMPT = `Bạn là reviewer backend senior. SO SÁNH bài làm của học viên với TIÊU CHÍ ĐẠT có trong context:
- Từng tiêu chí: ĐẠT / THIẾU / SAI, kèm trích dẫn ngắn từ bài làm làm bằng chứng.
- Không chấm điểm tổng, không viết lại bài, không tick giúp tiến độ.
- Nếu bài làm trống hoặc dưới 3 câu, yêu cầu học viên viết trước thay vì nhận xét.
- Kết thúc bằng đúng 1 việc cụ thể cần sửa tiếp theo. Tối đa ~250 từ, tiếng Việt.`

const SUGGESTIONS = {
  exercise: () => ['Bài này đòi hỏi gì theo tiêu chí đạt?', 'Hướng tiếp cận nào cho ý đầu tiên?', 'Bài làm hiện tại của tôi đang thiếu gì?'],
  lab: (day, o) => [`Khái niệm "${o.lab?.concept || ''}" trong lab này hoạt động ra sao?`, 'Tôi đã thử nhưng vẫn lỗi — đi tiếp hướng nào?', 'Vì sao bằng chứng lỗi lại trỏ tới chỗ đó?'],
  concept: (day, o) => { const c = day.concepts[o.index ?? 0]; return [`Giải thích đơn giản hơn về "${c?.t || ''}"?`, 'Cho ví dụ thật ở production?', 'Nhầm lẫn thường gặp nhất về khái niệm này là gì?'] },
  defend: () => ['Bắt đầu chất vấn thiết kế của tôi', 'Tiêu chí nào tôi dễ trượt nhất?', 'Đặt cho tôi 1 câu hỏi xoáy nhất'],
}

// day là ngày đã enrich (days.js + dayExtra), explains khớp theo index khái niệm.
export function buildContextBundle(day, kind, opts = {}, s = {}) {
  const explains = CONCEPT_EXPLAIN[day.id] || []
  const parts = []
  let primaryIdx = -1
  let sectionTitle = ''

  if (kind === 'exercise') {
    const i = opts.index ?? 0
    const ex = day.exercises[i] || {}
    sectionTitle = `Bài tập ${i + 1}: ${ex.t || ''}`
    parts.push(`PHẦN ĐANG LÀM — ${sectionTitle}\nĐề bài: ${ex.d || ''}`)
    if (ex.material) parts.push(`VẬT LIỆU LÀM BÀI:\n${clip(ex.material, 1800)}`)
    if (ex.template) parts.push(`KHUNG TEMPLATE GỢI Ý:\n${clip(ex.template, 400)}`)
    if (ex.rubric?.length) parts.push(`TIÊU CHÍ ĐẠT (dùng để nhận xét, không hiện cho học viên là "đáp án"):\n${ex.rubric.map(r => '- ' + r).join('\n')}`)
    if (ex.answer) parts.push('(Đáp án mẫu tồn tại trong app nhưng KHÔNG được cung cấp cho bạn — không tiết lộ, không viết giúp nguyên output.)')
    const note = s.notes?.[`${day.id}-${i}`] || ''
    parts.push(note.trim()
      ? `BÀI LÀM HIỆN TẠI CỦA HỌC VIÊN (${note.trim().split(/\s+/).length} từ):\n${clip(note, 2500)}`
      : 'Học viên CHƯA viết bài làm.')
  } else if (kind === 'lab') {
    const lab = opts.lab || {}
    sectionTitle = `Lab ${lab.id} (${lab.type}): ${lab.title}`
    primaryIdx = day.concepts.findIndex(c => c.t === lab.concept)
    parts.push(`PHẦN ĐANG LÀM — ${sectionTitle}\nĐề: ${lab.prompt || ''}`)
    if (lab.code) parts.push(`CODE/BỐI CẢNH CỦA LAB:\n${clip(lab.code, 1500)}`)
    if (lab.failingEvidence) parts.push(`BẰNG CHỨNG LỖI:\n${clip(lab.failingEvidence, 600)}`)
    const hints = (lab.hints || []).slice(0, opts.openedHints || 0)
    if (hints.length) parts.push(`GỢI Ý HỌC VIÊN ĐÃ MỞ (được tham khảo, đừng lặp lại nguyên văn):\n${hints.join('\n')}`)
    parts.push('Solution của lab KHÔNG được cung cấp cho bạn — không tiết lộ trọn vẹn, chỉ dẫn từng bước.')
  } else if (kind === 'concept') {
    const i = opts.index ?? 0
    primaryIdx = i
    const c = day.concepts[i], e = explains[i]
    sectionTitle = `Khái niệm: ${c?.t || ''}`
    if (e) parts.push(`GIẢI THÍCH GỐC CỦA KHÁI NIỆM:\n- Là gì: ${e.what}\n- Nhiệm vụ: ${e.role}${e.thresholds ? `\n- Ngưỡng quyết định: ${e.thresholds}` : ''}${e.dontUse ? `\n- Không dùng khi: ${e.dontUse}` : ''}`)
    if (e?.quiz) parts.push(`Câu hỏi kiểm tra của khái niệm này (tham khảo): ${e.quiz.q}`)
  } else if (kind === 'defend') {
    sectionTitle = 'Checkpoint — bảo vệ thiết kế'
    parts.push(`PHẦN ĐANG LÀM — Checkpoint ngày ${day.id}: ${day.title}\nMục tiêu: ${day.goal}`)
    if (day.criteria?.length) parts.push(`TIÊU CHÍ PHẢI BẢO VỆ ĐƯỢC:\n${day.criteria.map(c => '- ' + c).join('\n')}`)
  }

  // Lý thuyết của ngày: khái niệm chính đầy đủ, còn lại tóm gọn.
  const theory = day.concepts.map((c, i) => {
    const e = explains[i]
    if (i === primaryIdx) return `# ${i + 1}. ${c.t} (KHÁI NIỆM CHÍNH)\n${clip(c.d, 500)}${e ? `\nSâu hơn: ${clip(e.what + ' ' + e.role, 700)}` : ''}`
    return `# ${i + 1}. ${c.t}\n${clip(c.d, 260)}`
  }).join('\n')
  parts.push(`LÝ THUYẾT NGÀY ${day.id} — ${day.title}:\nMục tiêu: ${day.goal}\n${theory}`)
  if (day.trap) parts.push(`BẪY AGENT THƯỜNG GẶP CỦA NGÀY: ${day.trap}`)

  const prog = []
  if (s.scores?.[day.id] !== undefined) prog.push(`điểm tự chấm ngày ${s.scores[day.id]}/5`)
  if (primaryIdx >= 0 && s.mastery?.[`${day.id}-${primaryIdx}`]) prog.push(`khái niệm chính: ${masteryLevel(s.mastery[`${day.id}-${primaryIdx}`])}`)
  if (prog.length) parts.push(`TIẾN ĐỘ HỌC VIÊN: ${prog.join(' · ')}.`)

  const mode = kind === 'concept' ? 'concept' : kind === 'defend' ? 'defend' : 'socratic'
  const system = PROMPT_HEAD[mode](kind) + '\n\n=== BỐI CẢNH BÀI HỌC ===\n' + clip(parts.join('\n\n'), CTX_LIMIT) + '\n=== HẾT BỐI CẢNH ==='
  return {
    system,
    reviewSystem: kind === 'exercise' ? REVIEW_PROMPT + '\n\n=== BỐI CẢNH BÀI HỌC ===\n' + clip(parts.join('\n\n'), CTX_LIMIT) + '\n=== HẾT BỐI CẢNH ===' : null,
    meta: `Ngày ${day.id} — ${day.title}${sectionTitle ? ' · ' + sectionTitle : ''}`,
    suggestions: SUGGESTIONS[kind](day, opts),
  }
}
