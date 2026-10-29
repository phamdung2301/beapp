// Engine sinh prompt cho agent — dữ liệu lấy thẳng từ kho lý thuyết BEApp:
// days.js (khái niệm, tiêu chí, bẫy agent) + conceptExplain.js (giải thích sâu).
// Hai chế độ:
//   1. dayPrompt(day)       — prompt chỉ đạo agent cho MỘT phần lý thuyết (offline).
//   2. masterPrompt(form)   — prompt tổng cho cả dự án theo scale + tính năng (offline).
//   3. aiBriefSystem(form)  — system prompt cho chatbot "tổng nhận" (cần key AI):
//                             phỏng vấn scale/nhu cầu, mỗi lượt trả về bản prompt tổng
//                             cập nhật dần trong khối ```markdown để app nạp và xuất .md.

import { CONCEPT_EXPLAIN } from './data/conceptExplain.js'

const FENCE = '```'

// Quy tắc chung áp cho mọi prompt agent — đúc từ chính 30 ngày của BEApp.
export const GLOBAL_RULES = [
  'Khai báo persistence contract cho mọi dữ liệu: sống ở DB nào, entity nào, API nào đọc/ghi, sync lúc nào. Cấm local-only lén khi spec không nói rõ (Ngày 11).',
  'Migration backward compatible: thêm cột nullable trước, deploy code mới sau, dọn cột cũ cuối cùng. Cấm sửa migration đã chạy (Ngày 11, 26).',
  'Không tin frontend: tiền/tổng tiền/role/trạng thái do server tự tính hoặc whitelist field. Bind mù toàn bộ payload là lỗi mass assignment (Ngày 9, 23).',
  'Mọi thao tác tiền/tồn kho phải idempotent (idempotency key hoặc optimistic lock). Consumer queue phải idempotent — message trùng là chuyện bình thường, không phải lỗi hiếm (Ngày 13, 16).',
  'Transaction boundary đặt ở service, có test rollback thật. Bắt exception rồi nuốt là commit nửa vời (Ngày 9).',
  'Config thiếu phải fail-fast lúc boot (@ConfigurationProperties + @Validated). Phân biệt boot-required và degraded-if-missing — không để config phụ giết cả app (Ngày 2, 29).',
  'Mọi dependency ngoài phải có timeout; retry có backoff + jitter; circuit breaker có fallback là thông báo rõ ràng, không phải dữ liệu giả (Ngày 18).',
  'Log structured kèm correlationId; không log password/token/secret; alert theo tỉ lệ 5xx và p95 — những gì user cảm nhận được (Ngày 25).',
  'Test bắt buộc: invariant nghiệp vụ, idempotency, phân quyền (bằng tài khoản người khác, không phải admin), rollback, trường hợp biên. Persistence test với database thật (Testcontainers) — không mock database rồi tự kết luận đúng (Ngày 27).',
  'Quyết định kiến trúc lớn viết ADR ngắn: bối cảnh, phương án cân nhắc, vì sao chọn, hậu quả chấp nhận. Tradeoff phải ghi số — "tốt hơn" không có số là cảm tính (Ngày 29).',
  'Secret không commit, không hardcode, không nhét vào image. Có secret trong Dockerfile/log là fail (Ngày 26, 29).',
  'Build pass không phải bằng chứng: chỉ test xanh và chạy thật mới tính "xong". Review theo checklist contract/auth/persistence/transaction/secret/test (Ngày 28).',
]

// Tính năng dự án → ngày BEApp liên quan + chỉ đạo riêng.
export const FEATURES = [
  { id: 'auth', label: 'Đăng nhập & phân quyền', days: [4, 23], directive: 'JWT access ngắn + refresh xoay vòng; nơi ghi và nơi đọc token là một; phân quyền kiểm tra ở tầng dữ liệu (chống IDOR), không chỉ ẩn nút frontend; phân biệt 401/403 đúng.' },
  { id: 'orders', label: 'Đặt hàng / nghiệp vụ lõi', days: [5, 6, 9, 13, 17], directive: 'Contract REST + DTO rõ ràng; transaction boundary ở service; lock đúng cho trừ kho/tiền (optimistic hay pessimistic theo xung đột); saga + outbox cho luồng nhiều bước, có hành động bù.' },
  { id: 'payments', label: 'Thanh toán', days: [13, 16, 17, 18], directive: 'Idempotency key bắt buộc cho mọi API tiền; consumer idempotent; outbox pattern; circuit breaker + fallback là thông báo rõ ràng; retry có backoff + jitter.' },
  { id: 'catalog', label: 'Danh mục / tìm kiếm', days: [8, 10, 12], directive: 'Composite index đúng thứ tự cột (đối chiếu EXPLAIN); embedding vs referencing có lý do; cache có TTL + chính sách invalidate + chống stampede/penetration.' },
  { id: 'social', label: 'Feed / mạng xã hội', days: [5, 16, 19], directive: 'Phân trang cursor (không offset); fan-out qua queue; eventual consistency được khai báo rõ cho user và code không giả định read-after-write.' },
  { id: 'chat', label: 'Chat / real-time', days: [15, 16, 19], directive: 'Thread pool có giới hạn + hành vi khi đầy; queue chịu tải đột biến; thứ tự và nhất quán causal cho tin nhắn.' },
  { id: 'upload', label: 'Tệp / media', days: [24, 26], directive: 'File ra object storage (S3/R2), không nằm trong instance; presigned URL; xử lý ảnh/video tách worker qua queue.' },
  { id: 'reports', label: 'Báo cáo / thống kê', days: [8, 10, 12, 25], directive: 'Báo cáo tách khỏi đường OLTP; aggregation có index hỗ trợ; cache kết quả báo cáo; không full-scan bảng lớn giờ cao điểm.' },
  { id: 'notifications', label: 'Thông báo / email', days: [16, 18], directive: 'Gửi qua queue + retry backoff; consumer idempotent; DLQ cho message chết; không gửi sync trong request path.' },
  { id: 'admin', label: 'Quản trị & audit', days: [23, 25], directive: 'RBAC/ABAC rõ ràng; audit log hành vi nhạy cảm; alert có ngưỡng, người nhận và hành động đầu tiên.' },
  { id: 'i18n', label: 'Đa ngôn ngữ / múi giờ', days: [6], directive: 'Thời gian ISO-8601 kèm timezone; enum mới có fallback; validation 3 lớp (controller/service/DB).' },
]

// Quy mô dự án → kiến trúc khuyến nghị + yêu cầu phi chức năng.
export const SCALES = [
  { id: 'personal', label: 'Cá nhân / học tập', arch: 'Monolith 1 service + 1 database, deploy 1 instance, ưu tiên đơn giản và rẻ.', nfr: 'p95 < 1s chấp nhận được; backup hàng ngày; chi phí gần 0 (free tier); không cần microservices — cấm tách service khi chưa cần.' },
  { id: 'mvp', label: 'MVP / sản phẩm đầu tay', arch: 'Modular monolith (module theo nghiệp vụ) + Postgres/Mongo + Redis cache; 1–2 instance sau load balancer.', nfr: 'p95 < 500ms; uptime 99%; backup + test restore; CI/CD có health check và rollback; migration backward compatible.' },
  { id: 'growth', label: 'Tăng trưởng (10k–100k DAU)', arch: 'Modular monolith với ranh giới module sẵn sàng tách; read replica; cache nhiều tầng; queue cho tác vụ nặng; autoscaling stateless.', nfr: 'p95 < 300ms, p99 < 1s; uptime 99.5%; load test trước release lớn; session/file ra ngoài instance (Redis/S3).' },
  { id: 'scale', label: 'Quy mô lớn (1M+ DAU)', arch: 'Service theo bounded context khi có lý do vận hành thật (team/scale/deploy khác nhau); event-driven cho tích hợp; multi-layer cache; observability đầy đủ.', nfr: 'p99 < 200ms API nóng; uptime 99.9+; disaster recovery drill; chi phí có dashboard theo 3 mức tải; CAP/PACELC được chọn có chủ đích từng tính năng.' },
]

export const STACKS = [
  'Java 21 + Spring Boot + PostgreSQL',
  'Java 21 + Spring Boot + MongoDB',
  'Java 21 + Spring Boot + PostgreSQL + Redis + Kafka',
  'Để agent đề xuất — phải viết ADR so sánh trước khi chọn',
]

const clip = (t, n) => { t = String(t || '').trim(); return t.length <= n ? t : t.slice(0, n - 1) + '…' }
const list = (arr) => arr.map(x => '- ' + x).join('\n')

// ---------- 1) Prompt theo một ngày lý thuyết ----------
export function dayPrompt(day) {
  const explains = CONCEPT_EXPLAIN[day.id] || []
  const must = [], nice = []
  day.concepts.forEach((c, i) => {
    const e = explains[i]
    const deep = e ? ' ' + clip(e.what, 160) : ''
    const line = `**${c.t}**: ${clip(c.d, 260)}${deep}`
    if ((c.priority || '').includes('Bắt buộc') || !c.priority) must.push(line)
    else nice.push(line)
  })
  const lines = [
    `# PROMPT CHO AGENT — Ngày ${day.id}: ${day.title}`,
    '',
    '## 1. Vai trò và bối cảnh',
    `Bạn là backend senior (Java 21 + Spring Boot) đang thực hiện phần "${day.title}" của dự án. Mục tiêu của phần này: ${day.goal}`,
    'Làm đúng phạm vi phần này, không tự ý mở rộng scope; thiếu thông tin spec thì hỏi lại thay vì tự bịa.',
    '',
    '## 2. Kiến thức bắt buộc phải áp dụng đúng',
    list(must),
    nice.length ? '\nNên biết (không bắt buộc áp ở phần này):\n' + list(nice) : '',
    '',
    '## 3. Ràng buộc cứng — bẫy agent thường gặp ở phần này (vi phạm là fail review dù build pass)',
    list([day.trap, ...GLOBAL_RULES].map(x => clip(x, 300))),
    '',
    '## 4. Điều kiện đạt — tự kiểm tra trước khi báo xong',
    list(day.criteria || []),
    '',
    '## 5. Bài kiểm chứng chuẩn BEApp cho phần này (dùng để tự kiểm thiết kế, không bỏ qua)',
    list((day.exercises || []).map((e, i) => `Bài ${i + 1} — ${e.t}: ${clip(e.d, 200)}`)),
    '',
    '## 6. Cách làm việc',
    '- Trước khi code: nêu giả thuyết thiết kế + phương án cân nhắc (ngắn gọn).',
    '- Mỗi thay đổi đáng kể kèm lý do; quyết định kiến trúc lớn viết ADR ngắn.',
    '- Không bịa số (TTL, giới hạn, kích thước) — thiếu input thì hỏi, có input thì tính ra số có căn cứ.',
    '- Báo cáo kết quả theo đúng "Điều kiện đạt" ở mục 4, liệt kê từng mục: đạt/chưa đạt và bằng chứng (code, test, log).',
  ]
  return lines.filter(l => l !== '').join('\n')
}

// ---------- 2) Prompt tổng cho cả dự án (offline, từ form) ----------
export function masterPrompt(form) {
  const scale = SCALES.find(s => s.id === form.scale) || SCALES[1]
  const chosen = FEATURES.filter(f => (form.features || []).includes(f.id))
  const mappedDays = [...new Set(chosen.flatMap(f => f.days))].sort((a, b) => a - b)
  const coreDays = [1, 2, 5, 6, 9, 11, 24, 25, 26, 27, 29, 30]
  const allDays = [...new Set([...coreDays, ...mappedDays])].sort((a, b) => a - b)
  const lines = [
    `# PROMPT ĐIỀU PHỐI AGENT — DỰ ÁN ${form.name || '(chưa đặt tên)'}`,
    '',
    '## 1. Bối cảnh dự án',
    `- Mô tả: ${clip(form.desc || '(chưa có mô tả — hỏi lại người dùng trước khi code)', 400)}`,
    `- Quy mô: ${scale.label}`,
    `  - Kiến trúc khuyến nghị: ${scale.arch}`,
    `  - Yêu cầu phi chức năng: ${scale.nfr}`,
    `- Stack: ${form.stack || STACKS[0]}`,
    form.extra ? `- Ràng buộc thêm từ chủ dự án: ${clip(form.extra, 400)}` : '',
    '',
    '## 2. Phạm vi tính năng và chỉ đạo theo domain',
    chosen.length ? chosen.map(f => [
      `### ${f.label}`,
      `- Chỉ đạo: ${f.directive}`,
      `- Kiến thức nền BEApp: ngày ${f.days.join(', ')}.`,
    ].join('\n')).join('\n\n') : '(Chưa chọn tính năng — hỏi lại chủ dự án danh sách tính năng trước khi code.)',
    '',
    '## 3. Domain nền bắt buộc áp dụng cho MỌI phần (bảng tra nhanh)',
    list(allDays.map(id => `Ngày ${id}`)),
    '',
    '## 4. Ràng buộc cứng toàn dự án (vi phạm là fail review dù build pass)',
    list(GLOBAL_RULES.map(x => clip(x, 300))),
    '',
    '## 5. Nghiệm thu',
    '- Mỗi tính năng phải có: contract API (method/path/DTO/status), model dữ liệu + index, transaction boundary, error contract thống nhất (Problem Details), test invariant + idempotency + phân quyền + biên.',
    '- Với tính năng tiền/tồn kho: idempotency key + test message trùng + hành động bù khi thất bại giữa chừng.',
    '- Bàn giao kèm: sơ đồ kiến trúc (mỗi mũi tên ghi giao thức + dữ liệu), bảng failure mode (user thấy gì, dữ liệu ra sao, ai sửa, phát hiện từ log/metric nào), chi phí ước tính theo 3 mức tải.',
    '- Tự chấm theo rubric: Kiến trúc, Contract, Dữ liệu, Failure mode, Vận hành — mỗi phần 0–2 điểm; dưới 7/10 thì tự soát lại trước khi báo xong.',
  ]
  return lines.filter(l => l !== '').join('\n')
}

// ---------- 3) Chatbot tổng nhận (cần key AI) ----------
export function aiBriefSystem(form) {
  const scale = SCALES.find(s => s.id === form.scale)
  const domainMap = [
    'BẢN ĐỒ DOMAIN BEApp (30 ngày backend senior — trích chỉ đạo từ đây, không bịa ngoài):',
    [
      { id: 1, t: 'JVM và Java 21' }, { id: 2, t: 'Spring Boot & cấu hình' }, { id: 3, t: 'MVC, Filter, CORS' },
      { id: 4, t: 'JWT' }, { id: 5, t: 'REST & OpenAPI' }, { id: 6, t: 'DTO & Validation' },
      { id: 7, t: 'Checkpoint: audit API' }, { id: 8, t: 'SQL & Index' }, { id: 9, t: 'JPA & Transaction' },
      { id: 10, t: 'MongoDB' }, { id: 11, t: 'Migration & persistence contract' }, { id: 12, t: 'Redis & Caching' },
      { id: 13, t: 'Isolation, Lock, Tiền' }, { id: 14, t: 'Checkpoint: thiết kế dữ liệu' }, { id: 15, t: 'Concurrency' },
      { id: 16, t: 'Kafka & RabbitMQ' }, { id: 17, t: 'Outbox & Saga' }, { id: 18, t: 'Resilience' },
      { id: 19, t: 'CAP & Consistency' }, { id: 20, t: 'Checkpoint: drill lỗi phân tán' }, { id: 21, t: 'Kiến trúc' },
      { id: 22, t: 'DDD' }, { id: 23, t: 'OAuth2, OIDC, OWASP' }, { id: 24, t: 'Hiệu năng, Scale, Chi phí' },
      { id: 25, t: 'Observability' }, { id: 26, t: 'Docker, K8s, CI/CD' }, { id: 27, t: 'Testing' },
      { id: 28, t: 'Checkpoint: review code agent' }, { id: 29, t: 'ADR, Secret, Tradeoff' }, { id: 30, t: 'Capstone' },
    ].map(d => `- Ngày ${d.id}: ${d.t}`).join('\n'),
  ].join('\n')
  const chosen = FEATURES.filter(f => (form.features || []).includes(f.id)).map(f => f.label).join(', ') || '(chưa chọn)'
  return `Bạn là kiến trúc sư trưởng đảm nhận TỔNG NHẬN YÊU CẦU (intake) cho một dự án backend, nói tiếng Việt.

NHIỆM VỤ: từ scale và nhu cầu dự án, phỏng vấn làm rõ những điểm thiếu, rồi trả về MỘT BẢN PROMPT TỔNG đầy đủ các domain để chủ dự án dán cho coding agent.

THÔNG TIN ĐÃ CÓ TỪ FORM:
- Tên dự án: ${form.name || '(chưa có)'}
- Mô tả: ${clip(form.desc || '(chưa có)', 400)}
- Quy mô: ${scale ? scale.label : '(chưa chọn)'}
- Stack: ${form.stack || '(chưa chọn)'}
- Tính năng đã chọn: ${chosen}
- Ràng buộc thêm: ${clip(form.extra || '(không có)', 300)}

QUY TRÌNH:
1. Soi form: phần nào thiếu hoặc rủi ro cao (auth? tiền? realtime? compliance? scale thật là bao nhiêu?) thì hỏi — TỐI ĐA 5 câu trong toàn bộ phiên, mỗi lượt tối đa 2 câu, hỏi sát để không phí thời gian chủ dự án.
2. Form đã đủ thì chốt ngay, không hỏi cho có.
3. Cuối MỖI lượt trả lời BẮT BUỘC có một khối ${FENCE}markdown chứa BẢN PROMPT TỔNG hiện tại (cập nhật dần theo thông tin mới). Chủ dự án sẽ nạp khối đó để xuất file .md.
4. Bản prompt tổng phải có cấu trúc: 1. Bối cảnh & quy mô · 2. Phạm vi tính năng + chỉ đạo theo domain (trích từ bản đồ domain bên dưới) · 3. Ràng buộc cứng (persistence contract, migration backward compatible, idempotency, fail-fast, timeout/retry/breaker, correlation id, test bắt buộc, ADR + tradeoff ghi số, secret) · 4. Nghiệm thu (contract + test + failure mode + chi phí) · 5. Cách làm việc với agent.
5. Chỉ đạo từng domain phải lấy từ bản đồ domain BEApp bên dưới; không bịa số nếu chủ dự án chưa đưa số — ghi rõ chỗ cần chủ dự án điền số.
6. Ngắn gọn ở phần hội thoại; phần dài chỉ nằm trong khối markdown.

${domainMap}`
}

// Lấy khối ```markdown cuối cùng từ hội thoại tổng nhận để nạp vào khung xuất file.
export function extractMarkdownBlock(text) {
  const re = /```(?:markdown|md)?\r?\n([\s\S]*?)```/g
  let m, last = null
  while ((m = re.exec(String(text || ''))) !== null) last = m[1]
  return last ? last.trim() : null
}
