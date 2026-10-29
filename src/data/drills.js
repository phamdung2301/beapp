// Kịch bản Incident Drill cho engine IncidentDrill.jsx — key theo day.id.
// Nội dung gắn với bài học của ngày đó: ngày 20 (checkpoint drill lỗi phân tán),
// ngày 28 (debug sự cố theo thứ tự chẩn đoán). Thêm ngày mới = thêm entry.
export const DRILLS = {
  20: {
    title: '2 giờ sáng: đơn tạo được, tiền trừ được, kho không trừ',
    intro: 'Bạn là người trực. Đọc bằng chứng dưới đây và đi theo thứ tự kiểm chứng: tín hiệu mạnh nhất → giả thuyết → lệnh kiểm chứng. Đừng đoán trước khi nhìn số liệu.',
    log: `[02:04] order-service: POST /orders 201 Created (correlationId=a1b2) — đơn #8814 PAID
[02:04] payment-service: thanh toán thành công, tx=TX-5521
[02:05] warehouse-service: KHÔNG có log nhận đơn #8814
[02:05] metrics: outbox_pending_events = 1.847 (tăng đều 40 phút nay), consumer_lag(order-events) = 1.847
[02:05] metrics: warehouse-service pods 3/3 Running, CPU 12%, DB 4ms
[02:06] DLQ: 0 message`,
    steps: [
      {
        q: 'Tín hiệu mạnh nhất trong bộ số liệu này là gì?',
        options: [
          { t: 'outbox_pending 1.847 + consumer_lag 1.847 cùng tăng 40 phút', ok: true, fb: 'Đúng. Outbox đang ghi event nhưng consumer không tiêu: lag = số event chờ, hai số khớp nhau tăng dần là bằng chứng trực tiếp của đứt dây giữa order và warehouse — không phải suy đoán.' },
          { t: 'CPU warehouse chỉ 12%, hệ thống vẫn khỏe', ok: false, fb: 'CPU thấp không phải tín hiệu khỏe ở đây — nó LoẠI giả thuyết warehouse quá tải, giúp thu hẹp về phía message không tới. Đọc số là để loại trừ, không chỉ để báo động.' },
          { t: 'DLQ = 0 nên chắc chắn không có lỗi', ok: false, fb: 'DLQ 0 nghĩa là không có message nào bị từ chối — nhưng 1.847 event đang nằm trong outbox chưa ai chạm tới thì DLQ dĩ nhiên 0. Zero trong DLQ không bác được đứt dây phía trước DLQ.' },
        ],
      },
      {
        q: 'Từ tín hiệu đó, giả thuyết đầu tiên cần kiểm tra là gì?',
        options: [
          { t: 'Consumer của order-events chết/treo từ ~40 phút trước (lúc lag bắt đầu tăng)', ok: true, fb: 'Đúng. Event được ghi outbox (order vẫn tạo được, tiền vẫn trừ) nhưng không ai tiêu: consumer chết hoặc treo là giả thuyết giải thích trọn bộ số liệu với ít giả định nhất.' },
          { t: 'Warehouse bị lỗi logic nên bỏ qua message', ok: false, fb: 'Nếu warehouse nhận mà bỏ qua, lag sẽ không tăng dần đều và sẽ thấy log xử lý hoặc message vào DLQ. Hiện không có log nào ở warehouse — giả thuyết này đòi thêm bằng chứng mà số liệu không có.' },
          { t: 'Redis sập làm đơn tạo chậm', ok: false, fb: 'Đơn đã tạo 201 và tiền đã trừ: phần trước đường message chạy bình thường. Redis sập không giải thích được outbox_pending tăng — giả thuyết không khớp bằng chứng.' },
        ],
      },
      {
        q: 'Lệnh/metric nào kiểm chứng giả thuyết consumer chết — và phải kiểm tra cả điều gì kèm theo?',
        options: [
          { t: 'kubectl logs consumer gần 40 phút + restart count của pod + lag metric theo thời gian', ok: true, fb: 'Đúng. Log cho biết consumer chết vì sao (OOM, panic, mất kết nối), restart count cho biết có CrashLoop không, và graph lag xác nhận thời điểm đứt — ba bằng chứng khớp nhau mới kết luận.' },
          { t: 'Restart deployment warehouse để "thử xem"', ok: false, fb: 'Restart trước khi có chẩn đoán là xoá bằng chứng: log crasch trước đó sẽ mất, và nếu nguyên nhân ở phía message thì restart không hết. Chẩn đoán xong mới hành động — và hành động có rollback.' },
          { t: 'Chỉ xem dashboard tổng tổng số đơn lỗi', ok: false, fb: 'Đơn không hề lỗi — chúng PAID nhưng kho không trừ. Đây chính là ca "dữ liệu nửa vời" trong bảng failure mode: nhìn số đơn là nhìn sai tầng sự cố.' },
        ],
      },
      {
        q: 'Log xác nhận: consumer bị OOMKilled lúc 01:24, restart count 2, lag bắt đầu tăng đúng 01:24. Sau khi consumer sống lại, điều gì bắt buộc phải kiểm tra tiếp?',
        options: [
          { t: '1.847 event tồn dư có được tiêu lại đúng thứ tự và trừ kho không trùng (idempotent consumer)', ok: true, fb: 'Đúng — và đây là điểm quan trọng nhất: consumer sống lại sẽ replay cả đống event tồn; nếu consumer không idempotent, kho có thể bị trừ hai lần cho message trùng. Chỉ số lag về 0 mới là hết sự cố, và phải đối chiếu tổng kho.' },
          { t: 'Không cần gì nữa, consumer sống là tự ổn', ok: false, fb: 'Chưa xong: 40 phút rưỡi đơn đã PAID mà kho không trừ là dữ liệu nửa vời thật — phải liệt kê và xử lý tay từng đơn trong cửa sổ sự cố, đồng thời xác nhận replay không trùng.' },
          { t: 'Cấp vốn để tăng partition cho Kafka', ok: false, fb: 'Tăng partition là tối ưu thông lượng, không phải chữa nguyên nhân OOMKilled — và thêm partition còn phá thứ tự trong partition cũ. Sửa đúng bệnh: giới hạn bộ nhớ/retry, rồi mới nói tới scale.' },
        ],
      },
    ],
    conclusion: 'Consumer order-events OOMKilled lúc 01:24 → outbox chất 1.847 event, kho không trừ cho đơn đã PAID. Sự cố loại "dữ liệu nửa vời": đơn thành công, kho bỏ trống.',
    note: 'Bài học gắn với ngày 20: ca này phải có sẵn trong bảng failure mode của bạn với 4 cột — user thấy gì (đơn OK, kho trừ sau), dữ liệu ra sao (outbox tồn dư), ai sửa (trực vận hành + điều kho tay), phát hiện từ metric nào (consumer_lag + outbox_pending). Alert consumer_lag > 0 trong 5 phút sẽ bắt được ca này lúc 01:25, không phải lúc user khiếu nại.',
  },
  28: {
    title: 'Sau deploy, user báo "đổi cài đặt không lưu được"',
    intro: 'Bài học ngày 28: chẩn đoán theo thứ tự có bằng chứng — version server trước, file trên main sau, browser cache cuối cùng. Đừng đổ lỗi cho cache trước khi có bằng chứng.',
    log: `[14:02] Deploy v1.8.2 xong, CI báo build pass, health check 200
[14:05] User ticket: "bấm Lưu cài đặt, hiện báo thành công, vào lại thì mất"
[14:06] Bạn mở app trên máy mình: đổi cài đặt → lưu → báo "Đã lưu" → vào lại vẫn cũ
[14:06] Code local (nhánh main) đọc rất đúng: PUT /settings gửi { theme: "dark" }`,
    steps: [
      {
        q: 'Bước chẩn đoán đầu tiên theo đúng thứ tự ngày 28 là gì?',
        options: [
          { t: 'Xác nhận version server đang chạy thật sự là v1.8.2 (banner version / /actuator/info / build metadata)', ok: true, fb: 'Đúng — bằng chứng mạnh nhất đứng trước: nếu server vẫn chạy bản cũ, mọi đọc code phía trên đều vô nghĩa. Ngày 28 gọi đây là "banner version server trước".' },
          { t: 'Xoá browser cache rồi thử lại', ok: false, fb: 'Đây là nghi phạm CUỐI trong thứ tự chẩn đoán. Xoá cache trước khi biết server chạy bản gì là chẩn đoán theo cảm giác — nếu hết lỗi bạn cũng không biết vì sao hết.' },
          { t: 'Đọc lại code PUT /settings trên máy', ok: false, fb: 'Code local bạn đã đọc (bước log 14:06) — nhưng code trên main KHÔNG phải bằng chứng server đang chạy gì. Xác nhận version trước, đọc code sau.' },
        ],
      },
      {
        q: 'Server xác nhận đang chạy v1.8.2. Bước tiếp theo?',
        options: [
          { t: 'Đối chiếu file đang chạy trên server với main: kiểm tra backend thật nhận PUT /settings gì (log request body)', ok: true, fb: 'Đúng. Tiếp theo thứ tự: "file trên main sau" — nhưng lật ngược bề mặt: log backend ghi body thật nhận được, vì nếu backend nhận { theme: "DARK" } thì code frontend gửi đúng vẫn thành sai.' },
          { t: 'Ghém ngay JSX component Settings vì nghi state không cập nhật', ok: false, fb: 'Đi vào component trước khi có bằng chứng về dữ liệu trên dây là đọc code theo cảm tính. Bằng chứngnetwork/request mới quyết định nghi ở frontend hay backend.' },
          { t: 'Deploy lại v1.8.2 để chắc chắn', ok: false, fb: 'Deploy lại không tạo bằng chứng mới — nếu lỗi còn, bạn vẫn đứng ở chỗ cũ; nếu hết, bạn không biết tại sao. Không hành động mù khi chưa chẩn đoán xong.' },
        ],
      },
      {
        q: 'Log backend hiện: PUT /settings body = {"THEME": "dark"} → 400 UNKNOWN_PROPERTY. Bước kiểm chứng cuối?',
        options: [
          { t: 'Tái hiện bằng curl với cả hai payload (THEME vs theme) để khoanh chắc lỗi case ở tầng serialize, rồi mới tìm chỗ sinh ra', ok: true, fb: 'Đúng — tái hiện có kiểm soát để tách biến: cùng code, khác mỗi chữ case. Bằng chứng này chỉ thẳng vào chỗ serialize DTO (Jackson case-sensitive) — lỗi contract đúng như app cảnh báo ở ngày 6.' },
          { t: 'Sửa ngay backend cho chấp nhận cả THEME lẫn theme', ok: false, fb: 'Sửa hai đầu nhận case là phủ khăn giấu nguyên nhân: một field khác lệch case sẽ lặp lại. Tìm chỗ nào sinh chữ hoa (alias/serializer), sửa gốc, và thêm test contract cho case.' },
          { t: 'Kết luận là lỗi cache của user vì trên máy bạn "thành công"', ok: false, fb: 'Báo "Đã lưu" trên máy bạn chính là manh mối: 400 bị nuốt ở đâu đó rồi vẫn hiện thành công — nghĩa là frontend không kiểm tra response. Lỗi đó phải sửa cùng, chứ không phải đổ cho cache.' },
        ],
      },
    ],
    conclusion: 'Tầng serialize biến "theme" thành "THEME" trước khi gửi → backend 400 → frontend nuốt lỗi vẫn báo thành công. Hai lỗi: lệch case contract + không kiểm tra response.',
    note: 'Bài học gắn với ngày 28: build pass không bắt được lỗi này (cú pháp đúng cả hai phía), "nhìn có vẻ đúng" cũng không. Checklist review ngày 28 có mục Contract — dùng chính nó khi review code agent sinh ra; thứ tự chẩn đoán (version → file → cache) giữ cho bạn không đi vòng vòng.',
  },
}
