import { useState } from 'react'

// Ngày 1 pilot: học bằng làm từng bước, có phản hồi ngay, không đưa đáp án trọn vẹn trước.
// Log Simulator: tín hiệu -> giả thuyết -> lệnh kiểm chứng -> kết luận.
// Spec Calculator: nhập ràng buộc -> tính RAM -> gợi ý TTL/evict, không bịa số.
// Misconception Corner: 5 hiểu lầm lấy từ chính cuộc trò chuyện JVM/Spring của người học.

export function LogSimulator() {
  const [step, setStep] = useState(0)
  const [signal, setSignal] = useState('')
  const [hypo, setHypo] = useState('')
  const [cmd, setCmd] = useState('')
  const reset = () => { setStep(0); setSignal(''); setHypo(''); setCmd('') }
  return <div className="card" style={{ borderColor: '#c6f24e' }}>
    <h3>🧪 Log Simulator — Bài 1: Chẩn đoán app chậm rồi OOM (làm từng bước)</h3>
    <p className="mut">Đừng đọc đáp án mẫu trước. Bấm từng bước, sai thì sửa ngay ở bước đó. Thứ tự kiểm chứng KHÔNG cố định — ưu tiên theo bằng chứng mạnh nhất trong log này.</p>
    <pre className="code">{`[10:01] WARN HikariPool - connection pool: active=50, idle=0, waiting=37 (pool max=50)
[10:02] ERROR OutOfMemoryError: Java heap space, heap used 3.8GB/4GB, GC time 42% trong 5 phút
Thread dump (rút gọn): 180 thread BLOCKED chờ lock, 40 thread WAITING ở connection pool.`}</pre>

    <p><strong>Bước 1/4 — Tín hiệu mạnh nhất trong log này là gì?</strong></p>
    <div className="row">
      <button className="btn ghost small" onClick={() => { setSignal('pool'); setStep(1) }}>Pool cạn: active=50/50, waiting=37</button>
      <button className="btn ghost small" onClick={() => { setSignal('heap'); setStep(1) }}>Heap gần tràn: 3.8/4GB</button>
      <button className="btn ghost small" onClick={() => { setSignal('blocked'); setStep(1) }}>180 thread BLOCKED</button>
    </div>
    {step >= 1 && <p className={signal === 'pool' ? '' : 'warn'}>
      {signal === 'pool'
        ? '✓ Đúng. Pool cạn là tín hiệu trực tiếp nhất: 50/50 connection đang bận và 37 request đang chờ, không cần suy đoán thêm.'
        : 'Chưa phải mạnh nhất. Heap tràn và thread BLOCKED có thể là hệ quả của việc request dồn ứ, còn pool cạn là nguyên nhân trực tiếp thấy rõ nhất. Hãy thử lại bước 1.'}
    </p>}

    {step >= 1 && <>
      <p><strong>Bước 2/4 — Từ tín hiệu đó, giả thuyết đầu tiên nên kiểm tra là gì?</strong></p>
      <div className="row">
        <button className="btn ghost small" onClick={() => { setHypo('conn'); setStep(2) }}>Leak connection (quên đóng connection)</button>
        <button className="btn ghost small" onClick={() => { setHypo('cache'); setStep(2) }}>Cache không giới hạn</button>
        <button className="btn ghost small" onClick={() => { setHypo('thread'); setStep(2) }}>Leak thread / nghẽn lock</button>
      </div>
      {step >= 2 && <p className={hypo === 'conn' ? '' : 'warn'}>
        {hypo === 'conn'
          ? '✓ Đúng. Pool cạn + 40 thread WAITING ở pool trỏ thẳng tới connection không được trả lại pool.'
          : 'Chưa khớp với tín hiệu mạnh nhất. Cache và lock có thể gây OOM và BLOCKED, nhưng chúng không giải thích vì sao pool cạn sạch và có 37 request chờ connection. Hãy thử lại bước 2.'}
      </p>}
    </>}

    {step >= 2 && <>
      <p><strong>Bước 3/4 — Lệnh/metric nào kiểm chứng giả thuyết leak connection?</strong></p>
      <div className="row">
        <button className="btn ghost small" onClick={() => { setCmd('hikari'); setStep(3) }}>Hikari metrics: active / pending qua Actuator</button>
        <button className="btn ghost small" onClick={() => { setCmd('heap'); setStep(3) }}>jmap heap dump + Eclipse MAT</button>
        <button className="btn ghost small" onClick={() => { setCmd('stack'); setStep(3) }}>jstack, so sánh 2 dump cách 10 giây</button>
      </div>
      {step >= 3 && <p className={cmd === 'hikari' ? '' : 'warn'}>
        {cmd === 'hikari'
          ? '✓ Đúng. Hikari metrics là công cụ trực tiếp cho pool. jmap dùng cho cache/heap, jstack dùng cho thread/lock — mỗi giả thuyết có đúng một công cụ chính.'
          : 'Sai công cụ cho giả thuyết này. jmap để tìm Map phình to trên heap, jstack để tìm thread BLOCKED ở cùng một dòng code. Leak connection thì xem Hikari metrics trước.'}
      </p>}
    </>}

    {step >= 3 && <>
      <p><strong>Bước 4/4 — Kết quả giả lập: traffic đã giảm nhưng active vẫn giữ 50/50. Kết luận?</strong></p>
      <p>→ <strong>Xác nhận leak connection.</strong> Connection không được trả lại pool dù request đã giảm, nên phải rà code xem chỗ nào mở connection mà thiếu try-with-resources hoặc @Transactional bị treo. Sau đó mới kiểm tra tiếp cache (heap dump) và lock (jstack) — vì OOM và BLOCKED có thể chỉ là hệ quả của request dồn ứ.</p>
      <p className="mut">Ghi nhớ: thứ tự trong đề gốc (thread → connection → cache) chỉ là danh sách để liệt kê, không phải thứ tự kiểm chứng. Thứ tự kiểm chứng luôn theo bằng chứng mạnh nhất trong log bạn đang cầm.</p>
    </>}
    <div className="row"><button className="btn ghost small" onClick={reset}>Chơi lại từ đầu</button></div>
  </div>
}

export function SpecCalculator({ onInsert }) {
  const [items, setItems] = useState(15000)
  const [kb, setKb] = useState(2)
  const [maxItems, setMaxItems] = useState(20000)
  const [ttl, setTtl] = useState(15)
  const memMB = (maxItems * kb) / 1024
  const memItemsMB = (items * kb) / 1024
  const spec = `Cache sản phẩm: tối đa ${maxItems.toLocaleString('vi-VN')} mục, TTL ${ttl} phút, evict LRU, metric: cache_size, cache_evictions, cache_hit_rate. Ước tính: ${maxItems.toLocaleString('vi-VN')} mục x ${kb}KB = ${memMB.toFixed(1)}MB RAM (riêng ${items.toLocaleString('vi-VN')} sản phẩm hiện có tốn khoảng ${memItemsMB.toFixed(1)}MB). Khi vượt giới hạn: evict mục ít dùng nhất, không chặn request, ghi log WARN nếu evictions tăng đột biến.`
  return <div className="card" style={{ borderColor: '#c6f24e' }}>
    <h3>🧮 Máy tính Spec — Bài 2: Đừng bịa số, hãy tính số</h3>
    <p className="mut">Bài spec chỉ làm được khi có ràng buộc đầu vào. Điền số của bạn, app tính hộ RAM, rồi bạn mới viết lý do cho TTL và chính sách evict.</p>
    <label>Số sản phẩm hiện có (mục)</label>
    <input type="number" value={items} onChange={e => setItems(Number(e.target.value) || 0)} />
    <label>Kích thước mỗi DTO (KB)</label>
    <input type="number" value={kb} onChange={e => setKb(Number(e.target.value) || 0)} />
    <label>Giới hạn cache tối đa (mục)</label>
    <input type="number" value={maxItems} onChange={e => setMaxItems(Number(e.target.value) || 0)} />
    <label>TTL (phút) — ghi lý do của bạn vào ghi chú, ví dụ giá/tồn kho đổi mỗi bao lâu?</label>
    <input type="number" value={ttl} onChange={e => setTtl(Number(e.target.value) || 0)} />
    <p><strong>Kết quả tính:</strong> {items.toLocaleString('vi-VN')} sản phẩm hiện có tốn khoảng <strong>{memItemsMB.toFixed(1)} MB</strong>. Giới hạn {maxItems.toLocaleString('vi-VN')} mục tốn tối đa <strong>{memMB.toFixed(1)} MB</strong>.</p>
    {memMB > 200
      ? <p className="warn">⚠️ Vượt 200MB cho riêng cache này là dấu hiệu cần xem lại: giảm maxItems, giảm kích thước DTO, hoặc chia cache theo nhóm sản phẩm. Đừng để cache ăn hết heap 4GB rồi mới phát hiện bằng OOM.</p>
      : <p>✓ Con số này an toàn so với heap vài GB: cache không phải là thủ phạm OOM nếu giữ đúng giới hạn và evict LRU.</p>}
    <pre className="code">{spec}</pre>
    <p className="mut">Công thức: RAM tối đa = maxItems × kích thước mỗi mục. TTL không tính từ cảm giác, mà từ tần suất dữ liệu đổi: giá đổi chậm thì TTL dài được, tồn kho đổi nhanh thì TTL phải ngắn.</p>
    <div className="row">
      <button className="btn small" onClick={() => onInsert && onInsert(spec)}>Chèn spec đã tính vào cuối ghi chú Bài 2</button>
      <button className="btn ghost small" onClick={async () => { try { await navigator.clipboard.writeText(spec); alert('Đã sao chép spec.') } catch { alert('Không sao chép được, hãy bôi đen spec và sao chép thủ công.') } }}>Sao chép spec</button>
    </div>
  </div>
}

const MYTHS = [
  { q: 'JVM đọc và hiểu annotation @RestController của Spring.', a: false, why: 'Sai. javac chỉ dịch annotation thành metadata trong file .class, JVM chỉ chạy bytecode và không biết @RestController là gì. Chính code của Spring, lúc ứng dụng khởi động, dùng Reflection để soi class, thấy @RestController thì tự tạo bean, thấy @Autowired thì tự inject, thấy @GetMapping thì tự map đường dẫn.' },
  { q: 'Spring chạy được là vì code nằm trong file JAR.', a: false, why: 'Sai. JAR chỉ là file nén giống file zip, chứa các file .class. JVM mở JAR ra, đọc bytecode bên trong và chạy. Spring cũng chỉ là tập hợp các file .class đã biên dịch sẵn, nằm chung trong JAR với code của bạn.' },
  { q: 'Có Spring Boot rồi thì Servlet đã chết, không cần học nữa.', a: false, why: 'Sai. DispatcherServlet chính là một Servlet. Spring MVC chạy trên nền Servlet API. Filter, CORS, Security đều bắt nguồn từ FilterChain và HttpServletRequest/Response — không hiểu Servlet thì debug các lỗi này sẽ thấy như ma thuật.' },
  { q: 'Cấu hình GC là việc của lập trình viên junior khi viết code.', a: false, why: 'Sai vai trò. Tech Lead quyết chọn G1 hay ZGC theo SLA và ngân sách RAM, DevOps gõ cờ -XX:+UseZGC vào Dockerfile/YAML lúc deploy. Junior cần hiểu GC đủ để khi gặp OOM thì biết đọc log và trao đổi với Tech Lead, không phải tự config bừa trên production.' },
  { q: 'Chạy mvn spring-boot:run ở local cũng là cách chạy trên production.', a: false, why: 'Sai môi trường. Local dùng Maven để biên dịch và chạy cho nhanh. Production không có Maven hay IntelliJ, chỉ có JRE/JVM, và chạy bằng java -jar app.jar sau khi code đã được đóng gói bằng mvn clean package ở bước build.' },
]

export function MisconceptionCorner() {
  const [picked, setPicked] = useState({})
  const done = Object.keys(picked).length
  const correct = MYTHS.filter((m, i) => picked[i] === m.a).length
  return <div className="card" style={{ borderColor: '#c6f24e' }}>
    <h3>🚩 Góc hiểu lầm — 5 câu lấy từ chính những chỗ bạn từng rối</h3>
    <p className="mut">Chọn Đúng/Sai cho từng câu, phản hồi hiện ngay. Đúng {correct}/{MYTHS.length} câu sau khi làm {done} câu. Hiểu lầm sửa được lúc này sẽ không quay lại lúc debug production.</p>
    {MYTHS.map((m, i) => <div key={i} style={{ marginBottom: 14 }}>
      <p><strong>{i + 1}. {m.q}</strong></p>
      <div className="row">
        <button className="btn ghost small" onClick={() => setPicked(p => ({ ...p, [i]: true }))}>Đúng</button>
        <button className="btn ghost small" onClick={() => setPicked(p => ({ ...p, [i]: false }))}>Sai</button>
      </div>
      {picked[i] !== undefined && <p className={picked[i] === m.a ? '' : 'warn'}>{picked[i] === m.a ? '✓ Đúng rồi. ' : '✗ Chưa đúng. '}{m.why}</p>}
    </div>)}
    <div className="row"><button className="btn ghost small" onClick={() => setPicked({})}>Làm lại 5 câu</button></div>
  </div>
}
