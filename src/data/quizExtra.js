// Quiz bổ sung cho 78 khái niệm chưa có quiz trong conceptExplain.js (ngày 1–10, 21–30).
// Key "day-index" khớp index khái niệm đã enrich. Merge ở ExplainView: e.quiz || QUIZ_EXTRA[key].
// Mục tiêu: `masteryLevel` yêu cầu ≥2 lần đúng quiz giãn cách để đạt "giải thích được" —
// thiếu quiz ở 20 ngày làm pipeline thông thạo gãy nửa đường; file này khôi phục nó.
export const QUIZ_EXTRA = {
  "1-0": {
    q: "Ứng dụng chỉ tạo object ngắn hạn trong vòng lặp, không giữ tham chiếu nào sau mỗi vòng. Vì sao GC vẫn bận và CPU vẫn tăng?",
    answer: "Object ngắn hạn nằm trong Eden, mỗi vòng lặp tạo hàng nghìn object thì young GC phải chạy liên tục để dọn. Chi phí GC nằm ở số object được cấp phát và dọn, không chỉ ở số object sống lâu.",
    why: "Sửa bằng cách giảm cấp phát trong vòng lặp (tái dùng buffer, tránh tạo object không cần), chứ không phải 'đổi GC mạnh hơn'.",
  },
  "1-1": {
    q: "Service dùng G1, latency trung bình vẫn đẹp nhưng p99 vài lần mỗi ngày vọt lên ~2 giây. Nghi ngờ đầu tiên nên là gì?",
    answer: "Full GC stop-the-world của G1: pause vài giây dừng mọi request, trung bình che giấu được nhưng p99 lộ ra.",
    why: "MaxGCPauseMillis chỉ là mục tiêu, không phải cam kết; full GC hiếm nhưng vẫn xảy ra. Xác nhận bằng GC log trước khi tối ưu chỗ khác.",
  },
  "1-2": {
    q: "Vì sao không nên dùng record làm JPA entity?",
    answer: "Record được thiết kế cho dữ liệu bất biến, còn entity cần identity, vòng đời và trạng thái thay đổi do Hibernate quản (dirty checking, lazy loading). Nhét record vào entity sẽ vỡ các cơ chế đó.",
    why: "Đúng công cụ cho đúng việc: record cho DTO/value object, class thường cho entity.",
  },
  "1-3": {
    q: "Đội bật virtual thread cho toàn service nhưng throughput không tăng, thread dump thấy nhiều carrier thread BLOCKED. Vì sao?",
    answer: "Task giữ synchronized kéo dài làm pin carrier thread — virtual thread chỉ rẻ khi chờ IO, không khi giữ lock hay shared state.",
    why: "Thu hẹp vùng lock, dùng AtomicLong, hoặc bỏ synchronized ôm cả tác vụ IO thì virtual thread mới phát huy.",
  },
  "1-4": {
    q: "Request bị đổi thread giữa chừng và mất SecurityContext cùng trace id. Đây là lỗi loại gì và sửa hướng nào?",
    answer: "Lỗi mất context khi đổi thread không truyền context. Sửa bằng cơ chế truyền context tường minh qua chỗ đổi thread (context propagation, TaskDecorator cho executor), không dựa vào biến cục bộ của thread cũ.",
    why: "Thread giữ stack và local state riêng; mọi chỗ nhảy thread (executor, async) đều phải chở context theo.",
  },
  "2-0": {
    q: "App có bean không mong muốn tự xuất hiện khi khởi động. Cách kiểm tra auto-config nào đã bật và vì sao?",
    answer: "Chạy với --debug để xem conditions evaluation report: từng auto-config bật hay tắt vì điều kiện nào (@ConditionalOnClass…). Loại trừ bằng exclude khi không muốn.",
    why: "Auto-config đoán theo classpath; report biến 'phép màu' thành danh sách quyết định có thể kiểm chứng.",
  },
  "2-1": {
    q: "Đổi biến môi trường SERVER_PORT=9090 nhưng app vẫn chạy port 8080. Nguyên nhân khả dĩ nhất?",
    answer: "Có JVM system property (-Dserver.port) hoặc command-line argument đang thắng biến môi trường — system property đứng cao hơn env var trong thứ tự ưu tiên.",
    why: "Thứ tự: command-line > SPRING_APPLICATION_JSON > JVM system property > env var > profile yml > yml. Debug bằng /actuator/env hoặc --debug.",
  },
  "2-2": {
    q: "URI MongoDB không có tên database thì app ghi vào đâu, và vì sao đây là lỗi nguy hiểm?",
    answer: "Driver lặng lẽ dùng database 'test'. Nguy hiểm vì app vẫn boot, API vẫn 200, chỉ là dữ liệu trôi vào nhầm DB — phát hiện muộn khi xem dữ liệu thật.",
    why: "Khai báo tường minh spring.data.mongodb.database (thắng URI) và xác minh tên DB thật lúc boot, đừng tin 'app chạy ngon'.",
  },
  "2-3": {
    q: "Thiếu secret, app vẫn boot rồi NullPointerException ở request đầu tiên. Thiếu cơ chế nào?",
    answer: "Thiếu fail-fast lúc boot: dùng @ConfigurationProperties + @Validated để validate cấu hình bắt buộc, thiếu thì chết rõ ràng với thông báo field nào thiếu.",
    why: "Chạy nửa vời là tồi tệ hơn chết sớm: lỗi cấu hình phải lộ lúc deploy, không phải lúc user gõ request đầu tiên.",
  },
  "3-0": {
    q: "Đặt logic cần biết controller nào sẽ xử lý request vào một Servlet Filter. Có chạy đúng không?",
    answer: "Không. Filter chạy ở tầng servlet trước khi DispatcherServlet chọn handler, nên nó không biết controller nào sẽ xử lý; logic theo handler phải đặt vào HandlerInterceptor.",
    why: "Nhầm hai tầng là nhầm vị trí kiểm tra và vị trí xử lý lỗi: Filter thấy mọi request, Interceptor thấy handler đã chọn.",
  },
  "3-1": {
    q: "Browser báo CORS error, log server không thấy request thật nào, chỉ thấy OPTIONS trả 403. Đang xảy ra gì?",
    answer: "Security filter chặn preflight OPTIONS (request này không mang token) trước khi tới CORS handler, nên browser hủy luôn request thật — lỗi là thứ tự rule trong Security chain.",
    why: "Permit OPTIONS /** trước mọi rule authenticated, hoặc cấu hình CorsConfigurationSource ở tầng security.",
  },
  "3-2": {
    q: "Sửa CORS ở WebMvcConfigurer xong nhưng lỗi vẫn còn nguyên. Vì sao?",
    answer: "Security filter chain chạy trước tầng MVC nên chặn request trước khi cấu hình CORS của WebMvc kịp hiệu lực; phải sửa ở tầng security.",
    why: "CorsFilter nằm trong security chain — sửa CORS ở đúng tầng nó bị chặn, không phải ở tầng sau nó.",
  },
  "3-3": {
    q: "API public vẫn chạy, API cần login lỗi hàng loạt, browser báo CORS error. Bước chẩn đoán đầu tiên?",
    answer: "curl OPTIONS kèm header Origin và Access-Control-Request-Method, đọc status và header: 403 không có header CORS = Security chặn preflight, khác hẳn backend chết (không kết nối được/502).",
    why: "Nhìn bằng chứng trước khi đoán: status + header phân biệt 3 trường hợp preflight đúng, bị Security chặn, backend chết.",
  },
  "4-0": {
    q: "Vì sao tuyệt đối không nhét password hay số thẻ vào JWT payload?",
    answer: "Payload chỉ được encode base64, ai cầm token cũng đọc được; signature để kiểm chứng tính nguyên vẹn, không mã hóa.",
    why: "JWT xác thực chứ không bảo mật nội dung: chỉ đặt payload những gì chấp nhận công khai, nhạy cảm để server-side.",
  },
  "4-1": {
    q: "Access token có thời hạn 30 ngày và bị lộ. Thu hồi nó bằng cách nào?",
    answer: "Không thu hồi được — JWT stateless, server không giữ phiên. Vì vậy access phải ngắn (15 phút), thu hồi thật sự nằm ở refresh token xoay vòng + denylist.",
    why: "Thiết kế revoke lúc chọn thời hạn token, đừng đợi token lộ mới nhận ra không revoke được.",
  },
  "4-2": {
    q: "User login thành công, dashboard render, nhưng mọi API trả 403. Nghi ngờ đầu tiên là gì?",
    answer: "Nơi ghi token và nơi đọc token khác nhau (VD: ghi sessionStorage key 'token', interceptor đọc localStorage key 'accessToken') — API đi không header Authorization.",
    why: "Dashboard vẫn render vì guard đọc cả hai nơi; một hàm getToken()/setSession() duy nhất, cùng key cùng storage, là sửa gốc.",
  },
  "4-3": {
    q: "API login trả thông báo khác nhau cho 'tài khoản không tồn tại' và 'sai mật khẩu'. Rủi ro bảo mật gì?",
    answer: "User enumeration: attacker liệt kê được tài khoản nào tồn tại rồi chỉ cần dò mật khẩu. Thông báo nên chung chung, chi tiết để log server.",
    why: "Thông báo lỗi cũng là bề mặt tấn công; kiểm tra đủ 4 bước (tồn tại, BCrypt khớp, đã xác minh, chưa khóa) nhưng trả lời ngoài không phân biệt.",
  },
  "5-0": {
    q: "Client dùng PUT /orders/{id} nhưng chỉ gửi đúng 1 field muốn đổi. Hậu quả gì xảy ra?",
    answer: "PUT thay toàn bộ resource: các field không gửi bị mất hoặc về mặc định. Sửa một phần phải dùng PATCH.",
    why: "Method sai không chỉ sai chuẩn — nó xóa dữ liệu thật: path đúng mà method sai vẫn là bug.",
  },
  "5-1": {
    q: "Backend trả 200 kèm message lỗi cho mọi trường hợp thất bại. Hậu quả về vận hành?",
    answer: "Monitoring không đếm được lỗi qua status, frontend không phân biệt được 401/403/404 để dẫn user đi đúng chỗ, retry tự động trở nên nguy hiểm.",
    why: "Status code là contract: 2xx/4xx/5xx phải đúng nghĩa, lỗi trả kèm mã lỗi thống nhất (Problem Details) chứ không phải message tự do.",
  },
  "5-2": {
    q: "Feed có dữ liệu chèn liên tục và dùng phân trang offset (page & size). Lỗi gì người dùng sẽ thấy?",
    answer: "Item trùng hoặc thiếu giữa các trang: mỗi lần chèn/xóa đầu danh sách, offset của các trang sau bị dịch — nên dùng cursor cho danh sách kiểu này.",
    why: "Page ổn cho dữ liệu tĩnh; cursor lấy tiếp sau item cuối đã thấy nên không lệch khi dữ liệu đổi.",
  },
  "5-3": {
    q: "Thêm field bắt buộc (couponCode) vào request tạo đơn. Thay đổi này tương thích ngược không?",
    answer: "Không — client cũ không gửi couponCode sẽ bị 400. Phải để optional với giá trị mặc định, hoặc ra version mới kèm lộ trình cho client cũ.",
    why: "Thêm field vào response là tương thích; thêm field bắt buộc vào request là vỡ client cũ — hai chiều khác nhau hoàn toàn.",
  },
  "6-0": {
    q: "Return thẳng JPA entity ra controller cho Jackson serialize. Ba nguy cơ cụ thể là gì?",
    answer: "Lộ field nội bộ (deletedAt, internalNote), lazy loading gây lỗi serialization hoặc N+1 lúc serialize, và đổi model persistence là vỡ API trực tiếp.",
    why: "Entity là model DB, DTO là contract API: map qua DTO là ranh giới bảo vệ cả hai phía.",
  },
  "6-1": {
    q: "Controller đã @Valid đầy đủ. Vì sao vẫn cần ràng buộc (unique, NOT NULL) ở database?",
    answer: "Vì có đường ghi không qua controller: service nội bộ khác, migration, seed script, đồng bộ. DB là lớp chặn cuối cùng cho dữ liệu rác.",
    why: "Validation 3 lớp (định dạng ở controller, nghiệp vụ ở service, ràng buộc ở DB) — thiếu một lớp là có đường lọt.",
  },
  "6-2": {
    q: "Backend trả status 'NEW', frontend đọc data.status === 'new' → số liệu hiện 0 mà không có lỗi nào. Đó là loại lỗi gì, bắt bằng cách nào?",
    answer: "Lỗi contract lệch case ở biên hệ thống (Jackson phân biệt hoa thường). Bắt bằng diff thật: liệt kê key JSON frontend gửi đối chiếu từng field DTO, không tin JSDoc hay trí nhớ.",
    why: "Cả hai phía sai giống nhau thì review lướt không thấy; đối chiếu argument thật mới lượm được lỗi này.",
  },
  "6-3": {
    q: "Giá sản phẩm được lưu bằng double và tổng giỏ hàng thi thoảng lệch vài đồng. Nguyên nhân và sửa?",
    answer: "Double có sai số biểu diễn thập phân; tiền phải dùng BigDecimal (và lưu đúng scale), thời gian dùng ISO-8601 kèm timezone.",
    why: "Lỗi tiền không hiện ở unit test thông thường nhưng sai thật ở production — chọn kiểu dữ liệu đúng từ đầu rẻ hơn dọn dữ liệu sau.",
  },
  "7-0": {
    q: "Một audit kết luận 'API này không có lỗi' sau khi đọc code, không chạy request nào. Thiếu gì?",
    answer: "Thiếu bằng chứng: audit phải có request/response/log cho từng mục. Đọc code chỉ tạo giả thuyết; chạy thật mới xác nhận hoặc loại bỏ.",
    why: "Config sai, middleware khác biệt, dữ liệu thật là những thứ chỉ lộ khi chạy — audit bằng reading là audit happy path trong đầu.",
  },
  "7-1": {
    q: "Tại sao phải phân loại lỗi (contract/auth/config/validation) trước khi sửa?",
    answer: "Vì mỗi loại sửa ở chỗ khác nhau: contract sửa ở DTO/API, auth sửa ở filter/service, config sửa ở env/uri. Sửa nhầm lớp tốn thời gian và có thể che tạm lỗi khiến nó quay lại.",
    why: "Phân loại là bước xác định 'lỗi sống ở đâu' — không phân loại thì sửa theo cảm giác.",
  },
  "7-2": {
    q: "Ba lỗi cùng lúc: UI lệch font, CORS chặn cả luồng login, API cho phép user A ghi đè dữ liệu user B. Sửa theo thứ tự nào?",
    answer: "Ghi đè dữ liệu (mất dữ liệu) trước, CORS chặn login (mất chức năng/bảo mật) sau, UI cuối cùng — thứ tự: mất dữ liệu → bảo mật → trải nghiệm.",
    why: "Thứ tự sửa theo mức thiệt hại, không theo mức dễ sửa: lỗi mất dữ liệu tích lũy theo thời gian.",
  },
  "8-0": {
    q: "Khi nào chấp nhận denormalization dù nó tạo trùng lặp dữ liệu?",
    answer: "Khi đọc cần tốc độ hoặc cần gom dữ liệu nhiều nơi cho một query báo cáo, và chấp nhận chi phí đồng bộ khi ghi — đó là đánh đổi có chủ đích, không phải quên normalize.",
    why: "Normalize là mặc định cho ghi an toàn; denormalize là quyết định mua tốc độ đọc bằng chi phí ghi — phải nêu rõ ai chịu trách nhiệm đồng bộ.",
  },
  "8-1": {
    q: "Có composite index (a, b, c). Query WHERE b = ? AND c = ? có dùng được index này không?",
    answer: "Không dùng (hoặc dùng rất kém): index B-tree chỉ truy được phần đầu theo thứ tự cột, bỏ qua a là mất toàn bộ dải tìm kiếm.",
    why: "Thứ tự cột của composite index là quyết định thiết kế, không phải chi tiết cú pháp — thứ tự ngược là index vô dụng.",
  },
  "8-2": {
    q: "EXPLAIN cho thấy type=ALL và rows≈1.000.000. Nghĩa là gì và việc cần làm tiếp?",
    answer: "Query đang full scan cả triệu dòng. Tiếp theo: xem WHERE/ORDER khớp index nào, đề xuất composite index đúng thứ tự, rồi chạy lại EXPLAIN để xác nhận số dòng quét giảm.",
    why: "EXPLAIN là bằng chứng trước/sau: tối ưu index mà không đo lại là tối ưu mù.",
  },
  "8-3": {
    q: "Bảng log ghi nhiều đọc ít. Thêm index cho hầu hết cột sẽ gây hậu quả gì?",
    answer: "Mỗi INSERT phải cập nhật toàn bộ index: ghi chậm rõ rệt, dung lượng phình, trong khi index ít được dùng để đọc — lãng phí kép.",
    why: "Index cũng là dữ liệu phải duy trì: thêm index là mua tốc độ đọc bằng chi phí ghi, cân theo pattern thật của bảng.",
  },
  "9-0": {
    q: "Entity đặt eager fetch cho mọi quan hệ. Trang danh sách 50 dòng sẽ nạp bao nhiêu và hệ quả gì?",
    answer: "Nạp cả đồ thị quan hệ của 50 dòng kể cả field không dùng: query phình, heap phình, thời gian trả về tăng — eager bừa là leak hiệu năng âm thầm.",
    why: "Lazy là mặc định hợp lý; eager chỉ bật có chủ đích cho quan hệ luôn cần kèm theo.",
  },
  "9-1": {
    q: "Danh sách 100 đơn hàng, mỗi đơn query riêng item. Tổng bao nhiêu query và cách sửa?",
    answer: "101 query (1 + N): 1 lấy danh sách, 100 lấy item từng đơn. Sửa bằng join fetch hoặc batch fetch thành 1-2 query, ước tính lại số query sau khi sửa.",
    why: "N+1 chậm tuyến tính theo số dòng: test với 5 dòng không thấy, production với 500 dòng thì chết — đếm query bằng log SQL, đừng cảm nhận.",
  },
  "9-2": {
    q: "@Transactional đặt ở controller. Vấn đề thật sự là gì?",
    answer: "Transaction mở suốt request kể cả phần không cần DB, giữ connection pool lâu, và rollback khó suy luận khi exception nổ ở tầng nào cũng quét hết. Ranh giới nên ở service, gọn quanh nghiệp vụ.",
    why: "Transaction boundary là quyết định thiết kế: đặt sai chỗ thì không chỉ chậm mà còn commit nửa vời khi bắt exception nuốt đi.",
  },
  "9-3": {
    q: "Frontend gửi total đã tính sẵn cho API tạo đơn. Vì sao không được tin con số đó?",
    answer: "Ai gửi số thì người đó sửa được số: dùng Burp/curl gửi total=0 là mua giá 0. Backend phải tự tính lại giá/tổng từ dữ liệu server-side.",
    why: "Quy tắc biên: dữ liệu quyết định tiền bạc phải sinh và xác thực phía server, frontend chỉ hiển thị.",
  },
  "10-0": {
    q: "Document order nhúng mảng comment tăng không giới hạn. Hai vấn đề cụ thể?",
    answer: "Document phình tới giới hạn 16MB của MongoDB và mỗi lần sửa/sđọc phải tải cả mảng khổng lồ — phải tách collection riêng khi mảng tăng không giới hạn.",
    why: "Embedding cho dữ liệu con gắn chặt và có biên; referencing cho dữ liệu tăng vô hạn hoặc dùng độc lập.",
  },
  "10-1": {
    q: "Aggregation pipeline báo cáo quét cả triệu document mỗi lần chạy. Tối ưu hướng nào trước?",
    answer: "Đẩy $match lên sớm nhất trong pipeline kèm index cho điều kiện đó, để giai đoạn sau xử lý ít document hơn; index cũng hỗ trợ $sort đầu pipeline.",
    why: "Pipeline chạy tuần tự: mọi document lọt qua giai đoạn đầu là chi phí của toàn bộ pipeline — lọc sớm là tối ưu rẻ nhất.",
  },
  "10-2": {
    q: "Nhận định 'MongoDB không cần thiết kế schema' sai ở đâu?",
    answer: "MongoDB không ÉP schema như SQL, nhưng không ÉP không có nghĩa là KHÔNG CẦN: kỷ luật field (bắt buộc, kiểu, version) phải tự quản trong code và seed, model sai thì trả giá bằng code phức tạp.",
    why: "Schema-less là chuyển nghĩa vụ từ database sang người viết code — bỏ nghĩa vụ đó là sinh dữ liệu rác có tổ chức.",
  },
  "10-3": {
    q: "Seed script có giá trị mặc định database 'test' khi thiếu env. Nguy cơ và sửa?",
    answer: "Chạy thiếu env var là seed lặng lẽ vào nhầm DB, dữ liệu test trộn dữ liệu thật. Sửa: fail-fast khi thiếu tên DB, và log in tên DB thật sau khi seed để kiểm chứng.",
    why: "Giá trị mặc định cho tên DB là fallback lặng lẽ — config quan trọng phải thiếu-là-chết, không thiếu-là-mặc-định.",
  },
  "21-0": {
    q: "Monolith bắt đầu rối. Vì sao tách microservices ngay chưa chắc là đáp án đúng?",
    answer: "Tách sớm là trả giá hệ phân tán (network, consistency, deploy phức tạp) khi vấn đề thật chỉ là thiếu ranh giới module trong code — sửa ranh giới trước, tách service khi có lý do vận hành thật.",
    why: "Rối code và rối deploy là hai bài toán: monolith rối sửa bằng modular hóa, không phải bằng distributed system.",
  },
  "21-1": {
    q: "Điểm mạnh của modular monolith so với microservices?",
    answer: "Có ranh giới nghiệp vụ rõ (module sở hữu dữ liệu, giao tiếp qua contract) mà không trả giá network/consistency/deploy; khi cần tách service sau này, ranh giới đã sẵn.",
    why: "Modular monolith là đáp án hay bị bỏ qua: nó mua 80% lợi ích kiến trúc với 20% chi phí hệ phân tán.",
  },
  "21-2": {
    q: "Chi phí thật của microservices là gì, ngoài phần khen ngợi scale độc lập?",
    answer: "Mọi gọi nội bộ thành network (timeout, retry, serialization), consistency khó hơn, pipeline deploy phức tạp, debug một request xuyên nhiều service cần tracing.",
    why: "Microservices mua tự động hóa vận hành bằng tiền hệ phân tán — chỉ đáng khi team và scale thật cần.",
  },
  "21-3": {
    q: "Controller import JPA entity rồi trả thẳng ra response. Vi phạm quy tắc kiến trúc nào?",
    answer: "Tầng ngoài (web) phụ thuộc trực tiếp model persistence — vỡ ranh giới hexagonal: domain phải độc lập framework, DB đổi không được làm vỡ API.",
    why: "Quy tắc dependency hướng vào trong: controller nói với DTO, service nói với domain, entity chỉ sống ở tầng persistence.",
  },
  "22-0": {
    q: "Model 'Order' dùng chung cho cả bán hàng và kế toán. Vì sao đó là lỗi thiết kế?",
    answer: "Hai bounded context quan tâm field và bất biến khác nhau của cùng khái niệm; dùng chung một model khiến mỗi thay đổi của bên này phá vỡ bên kia. Mỗi context có model riêng, giao tiếp qua event/contract.",
    why: "Bounded context tồn tại vì ngôn ngữ nghiệp vụ mơ hồ: 'Order' của kế toán và của bán hàng là hai thứ khác nhau mang cùng tên.",
  },
  "22-1": {
    q: "Vì sao mọi sửa đổi OrderItem phải đi qua phương thức của Order?",
    answer: "Order là aggregate root giữ invariant (tổng tiền khớp items, trạng thái hợp lệ). Sửa OrderItem lẻ tẻ từ ngoài là bỏ qua invariant — aggregate chính là ranh giới transaction và nhất quán.",
    why: "Aggregate không phải khái niệm trang trí: nó quyết định chỗ nào được chạm dữ liệu và transaction nào là nguyên tử.",
  },
  "22-2": {
    q: "Địa chỉ giao hàng nên là entity hay value object? Vì sao?",
    answer: "Value object: nó quan trọng bởi giá trị, không có identity riêng — đổi địa chỉ là gán địa chỉ mới, không phải 'sửa cùng một địa chỉ'.",
    why: "Câu hỏi phân biệt: 'hai địa chỉ giống nhau về nội dung có phải là cùng một thứ không?' Đúng thì là value object.",
  },
  "22-3": {
    q: "Module bán hàng query thẳng vào bảng của module kế toán. Vi phạm điều gì?",
    answer: "Vi phạm ranh giới context và sở hữu dữ liệu: schema kế toán trở thành contract công khai, sửa bên kế toán vỡ bên bán hàng. Giao tiếp phải qua event (OrderCreated…) hoặc API của module sở hữu.",
    why: "Domain event để module phối hợp mà không ràng buộc schema lẫn nhau — tên event cũng phải nói đúng ngôn ngữ nghiệp vụ.",
  },
  "23-0": {
    q: "OAuth2 flow nào dùng cho service-to-service (không có user tham gia)?",
    answer: "Client Credentials: service tự xác thực bằng client_id/secret để lấy token. Authorization Code + PKCE dành cho app có user login.",
    why: "Chọn flow theo chủ thể xác thực: có user thì PKCE, chỉ service thì client credentials — nhầm flow là mở lỗ hổng hoặc không chạy được.",
  },
  "23-1": {
    q: "Yêu cầu 'chỉ chủ đơn hàng được xem đơn của mình' — role (RBAC) đủ chưa?",
    answer: "Không đủ: role là quyền theo chức năng, còn đây là quyền phụ thuộc dữ liệu (sở hữu). Cần check sở hữu ở service/repository — kiểu ABAC hoặc check chủ sở hữu tường minh.",
    why: "Nhiều hệ có role đầy đủ vẫn bị IDOR vì thiếu check per-record: role trả lời 'được làm gì', ownership trả lời 'được làm với dữ liệu nào'.",
  },
  "23-2": {
    q: "GET /orders/123 trả đơn của user khác cho user A. Lỗi gì, sửa ở tầng nào?",
    answer: "IDOR (Insecure Direct Object Reference). Sửa bằng check sở hữu ở service/repository — nơi mọi đường vào đều qua, không chỉ ẩn nút frontend hay check lẻ ở controller.",
    why: "Ẩn nút là ẩn UI, không phải bảo mật: attacker gọi API trực tiếp bỏ qua giao diện.",
  },
  "23-3": {
    q: "Frontend gửi thêm field role=ADMIN vào request cập nhật hồ sơ. Server phải làm gì?",
    answer: "Mass assignment: server phải bỏ qua (whitelist DTO) hoặc tự sinh các field nhạy cảm (role, giá, trạng thái), không bind mù toàn bộ payload vào entity.",
    why: "Nguyên tắc biên: field nào frontend được quyết định phải liệt kê tường minh — phần còn lại server tự làm chủ.",
  },
  "24-0": {
    q: "Thêm 3 instance mà hệ thống vẫn chậm như cũ. Vì sao scale ngang không đúng thuốc?",
    answer: "Vì bottleneck không phải CPU của app: query chậm thiếu index, pool cạn, hay lock không scale theo số instance. Đo bottleneck trước (CPU/IO/DB/lock) rồi scale đúng chỗ.",
    why: "Thêm instance là thuốc cho nghẽn tính toán; nghẽn ở DB thì thêm instance còn làm DB nghẽn thêm.",
  },
  "24-1": {
    q: "Latency trung bình 80ms, user vẫn phàn nàn. Nhìn chỉ số nào và vì sao?",
    answer: "p95/p99 — trung bình che giấu đuôi phân phối: 5% user chậm nhất chịu vài giây và họ là người tạo ticket.",
    why: "SLA đặt theo percentile, load test đọc theo percentile: tối ưu trung bình thường là tối ưu sai chỗ.",
  },
  "24-2": {
    q: "Đã cache Redis rồi, vì sao vẫn phải quan tâm invalidate ở tầng khác?",
    answer: "Vì browser, CDN, gateway, Caffeine in-process mỗi tầng đều giữ bản sao riêng với TTL/invalidate riêng: dữ liệu mới không tới user nếu chỉ xóa Redis.",
    why: "Caching nhiều tầng = nhiều bài toán invalidate chồng nhau; mỗi tầng thêm phải trả lời 'xóa cache ở đâu khi dữ liệu đổi'.",
  },
  "24-3": {
    q: "Session lưu trong bộ nhớ của instance và app scale lên 3 instance. Lỗi gì xảy ra?",
    answer: "Load balancer rải request sang instance khác không có session → user bị văng login ngẫu nhiên. Session phải ra ngoài (Redis), file upload ra S3/R2 — instance phải stateless.",
    why: "Stateless mới scale ngang được: mọi state in-instance là mìn nổ khi nhân bản hoặc restart.",
  },
  "25-0": {
    q: "Cần lần theo 1 request cụ thể đi qua 5 service và tìm bước nào chậm. Dùng trụ nào trong 3 trụ?",
    answer: "Traces (OpenTelemetry): trace tái hiện từng hop của đúng request đó kèm thời gian từng bước. Logs cho sự kiện, metrics cho xu hướng — traces cho hành trình của một request.",
    why: "Ba trụ trả lời ba câu hỏi: gì đã xảy ra (logs), xu hướng ra sao (metrics), request này đi qua đâu và chậm ở đâu (traces).",
  },
  "25-1": {
    q: "Hệ nhiều service mà không có correlation ID. Debug khi có khiếu nại sẽ như thế nào?",
    answer: "Không ghép được log các service của cùng một request: mỗi service một mảnh trùng lặp và giống nhau, lần dấu gần như mù — phải dựa vào thời gian và đoán.",
    why: "Correlation ID là chi phí gần bằng 0 lúc implement và là phao cứu sinh duy nhất lúc 2 giờ sáng.",
  },
  "25-2": {
    q: "Alert CPU > 80% cho mọi service, mọi người tắt alert vì noise. Sai nguyên tắc nào?",
    answer: "Alert cái hệ thống chịu chứ không alert cái user cảm nhận: nên alert tỉ lệ 5xx, latency p95 vượt ngưỡng — mỗi alert phải có ngưỡng, thời gian duy trì, người nhận và hành động đầu tiên.",
    why: "Alert không hành động được là alert chết: chai alert khiến alert thật cũng bị bỏ qua.",
  },
  "25-3": {
    q: "Để debug tiện, service log full header kèm Authorization token. Sai gì và hậu quả?",
    answer: "Log dữ liệu nhạy cảm: token/password đi vào log aggregator, ai đọc log là có credential thật. Log sự kiện nghiệp vụ và lỗi kèm context, redact mọi secret.",
    why: "Log là nơi dữ liệu sống lâu hơn code: một dòng log sai có thể lộ credential cho cả team đọc log.",
  },
  "26-0": {
    q: "Image production 1.2GB chứa cả Maven, JDK full và source code. Sai gì và sửa?",
    answer: "Không dùng multi-stage build: stage build chứa Maven + source, stage chạy chỉ chép artifact sang image gọn với JRE. Secret (cache Maven, .env) phải không lọt vào image cuối.",
    why: "Image là nơi secret hay chìm: review Dockerfile phải tìm secret, layer thừa và user chạy container.",
  },
  "26-1": {
    q: "HPA scale theo CPU nhưng nghẽn thật là connection pool database. Scale lên sẽ ra sao?",
    answer: "Thêm instance = thêm connection vào DB, nghẽn nặng hơn và DB chết trước khi app kịp 'scale'. Phải đo bottleneck đúng trước khi cấu hình HPA.",
    why: "Autoscaler tối ưu chỉ số nó được cho; cho nó chỉ số sai là tự động làm tình hình xấu đi.",
  },
  "26-2": {
    q: "Pipeline CI/CD chỉ có build → deploy. Thiếu những bước bắt buộc nào?",
    answer: "Test tự động, security scan (secret, dependency), health check sau deploy, và cơ chế rollback. Môi trường dev/staging/prod tách biệt.",
    why: "Deploy không có rollback là đặt cược mọi deploy đều hoàn hảo — một lần không hoàn hảo là đủ để trả giá.",
  },
  "26-3": {
    q: "Deploy code mới cùng lúc với migration xóa một cột. Rủi ro gì?",
    answer: "Trong lúc deploy, instance cũ còn sống song song và vẫn SELECT/INSERT cột đã bị xóa → lỗi runtime hàng loạt. Migration phải backward compatible trước, dọn cột sau khi code cũ chết hẳn.",
    why: "Quy tắc: migration đi trước code, mọi migration giữa hai version phải làm cả hai version chạy được.",
  },
  "27-0": {
    q: "Bộ test chỉ toàn E2E chạy qua UI. Vấn đề của hình tháp ngược này?",
    answer: "Chậm, giòn (vỡ vì UI đổi), feedback dài — lỗi thật nằm lâu mới được phát hiện. Pyramid đúng: unit nhiều và nhanh ở đáy, integration ít hơn, E2E ít nhất trên đỉnh.",
    why: "Giá trị test = số lỗi bắt được / thời gian chờ: E2E đắt nhất nên chỉ dành cho luồng sống còn.",
  },
  "27-1": {
    q: "Mock toàn bộ repository rồi kết luận persistence layer đúng. Sai ở đâu?",
    answer: "Mock không bắt lỗi SQL, constraint, transaction hay mapping — nó đúng vì bạn cho nó đúng. Persistence phải test với database thật (Testcontainers).",
    why: "Mock dành cho biên ngoài chậm/không kiểm soát được; database là thứ cần test thật nhất lại hay bị mock nhất — ngược đời nhưng phổ biến.",
  },
  "27-2": {
    q: "Frontend và backend lệch contract (đổi tên field) mà test hai bên vẫn xanh. Cơ chế nào bắt sớm?",
    answer: "Contract test: Pact hoặc validate OpenAPI — hai bên cùng kiểm tra một bản contract, lệch là đỏ trước khi deploy.",
    why: "Test riêng từng bên xanh không có nghĩa là hai bên khớp nhau: chỉ một artifact chung mới chứng minh được sự khớp.",
  },
  "27-3": {
    q: "Luồng thanh toán chỉ có test happy path. Thiếu những nhóm test nào bắt buộc?",
    answer: "Invariant nghiệp vụ (số dư không âm), phân quyền, idempotency (retry không nhân đôi giao dịch), rollback, và trường hợp biên (null, rỗng, số âm, timezone, tiền lẻ).",
    why: "Tiền bạc không test lỗi là chờ production dạy bằng tiền thật: happy path chỉ chứng minh đường thẳng đi được.",
  },
  "28-0": {
    q: "Review code agent: build pass, code đọc có vẻ đúng. Hai việc bắt buộc trước khi chốt?",
    answer: "Chạy checklist từng mục (contract, ranh giới tầng, auth, token storage, persistence, transaction, secret, test) với bằng chứng từng dòng — và chạy thật/test thật, build pass không phải bằng chứng.",
    why: "Agent viết code nhìn đúng nhưng sai invariant là lỗi phổ biến nhất: review là kiểm chứng theo checklist, không phải đọc lướt tìm cái xấu xí.",
  },
  "28-1": {
    q: "Vite build xanh và Java compile pass. Hai điều đó CHỨNG MINH được điều gì và KHÔNG chứng minh điều gì?",
    answer: "Chỉ chứng minh cú pháp đúng và bundle được — không chứng minh undefined identifier runtime, sai logic nghiệp vụ, lệch contract, hay dữ liệu ghi đúng. Chỉ test xanh và chạy thật mới tính bằng chứng.",
    why: "Nhầm build pass với 'đã xong' là cổng vào của mọi sự cố production do code agent sinh ra.",
  },
  "28-2": {
    q: "Site lỗi sau deploy. Đội nghi browser cache ngay từ phút đầu. Đúng thứ tự chẩn đoán chưa?",
    answer: "Chưa: thứ tự đúng là version server đang chạy gì trước (bằng chứng mạnh nhất), rồi file trên main có khớp bản đã deploy không, cache là nghi cuối cùng.",
    why: "Chẩn đoán theo bằng chứng mạnh trước: đổ lỗi cache sớm là cách chôn lỗi thật dưới một lớp lấp liếm tiện lợi.",
  },
  "29-0": {
    q: "ADR viết sau khi code xong, chỉ liệt kê lý do biện minh cho lựa chọn đã làm. Sai gì về bản chất?",
    answer: "ADR phải so sánh phương án TRƯỚC khi chọn: có bối cảnh, các phương án cân nhắc, tiêu chí, phương án bị loại và hậu quả chấp nhận. Viết sau thành văn tự biện hộ, không còn giá trị ra quyết định cho người sau.",
    why: "Giá trị ADR nằm ở 'vì sao KHÔNG chọn phương án kia' — bỏ phần đó là mất cả ý nghĩa của tài liệu.",
  },
  "29-1": {
    q: "JWT secret đang hardcode trong repo. Xoay secret sẽ gây hậu quả gì và phải kèm kế hoạch gì?",
    answer: "Toàn bộ token cũ ký bằng secret cũ vô hiệu ngay: mọi user bị văng, hệ thống khác dùng token cùng key chết theo. Phải có kế hoạch thông báo, đăng nhập lại, và lộ trình chuyển tiếp — đồng thời chuyển secret sang env/Vault, không commit.",
    why: "Xoay secret là thao tác có tính lan tỏa: ai cầm secret đó ký gì thì cái đó chết cùng — liệt kê trước khi xoay, không phải sau.",
  },
  "29-2": {
    q: "Thiếu config cache khiến cả app không boot được. Phân loại config này sai ở đâu?",
    answer: "Cache là degraded-if-missing (thiếu thì mất chức năng phụ, app vẫn sống), không phải boot-required. Phân loại sai làm một cấu hình phụ có quyền giết cả hệ thống.",
    why: "Phân loại boot-required vs degraded quyết định app chết vì cái gì: cái bắt buộc phải chết rõ, cái phụ phải suy giảm nhẹ nhàng.",
  },
  "29-3": {
    q: "ADR ghi 'phương án A nhanh hơn đáng kể'. Thiếu gì để câu này có giá trị?",
    answer: "Số: nhanh hơn bao nhiêu (p95 từ X xuống Y), tốn thêm bao nhiêu (RAM/chi phí), rủi ro gì. 'Tốt hơn' không có số là cảm tính — không kiểm chứng được, không kế thừa được.",
    why: "Tradeoff phải đo được thì 6 tháng sau mới đối chiếu được: ADR có số là hợp đồng, ADR có tính từ là lời hứa.",
  },
  "30-0": {
    q: "Sơ đồ kiến trúc capstone có đủ khối và mũi tên nhưng không ghi giao thức. Thiếu thông tin gì và vì sao quan trọng?",
    answer: "Mỗi mũi tên phải ghi: giao thức gì (REST/gRPC/event), dữ liệu gì, đồng bộ hay bất đồng bộ — vì đó chính là nơi timeout, retry, nhất quán sống.",
    why: "Sơ đồ không có giao thức là sơ đồ mô hình hóa mong muốn, không phải kiến trúc: mũi tên vô tên giấu cả nghẽn và cả rủi ro.",
  },
  "30-1": {
    q: "Capstone có API tạo đơn/thanh toán nhưng không có idempotency key và error contract. Bị trừ ở phần nào của rubric và vì sao?",
    answer: "Phần Contract: thao tác tiền bắt buộc idempotent (retry bị timeout không được tạo hai đơn) và lỗi phải thống nhất theo Problem Details với mã lỗi riêng — frontend và monitor đọc được.",
    why: "Idempotency và error contract là hai thứ client khác implement được mà không cần hỏi — thiếu là contract chỉ dùng được trong trình diễn.",
  },
  "30-2": {
    q: "Thiết kế capstone chỉ có happy path. Rubric chấm phần Failure mode tối đa bao nhiêu điểm và lý do?",
    answer: "Gần như 0/2: rubric yêu cầu bảng failure mode (user thấy gì, dữ liệu ra sao, ai sửa, phát hiện từ log/metric nào), có hành động bù, không có ca nào chỉ ghi 'hiếm khi xảy ra'.",
    why: "Hệ thống thật sống phần lớn đời ở trạng thái lỗi cục bộ: thiết kế không có failure mode là thiết kế cho ngày mượt duy nhất.",
  },
}
