// Bài tập thực hành (lab) cho tab lab — 5 lab/ngày, 30 ngày, 150 lab.
// Mỗi lab: { id, concept, type, title, prompt, code, language, failingEvidence, checks, solution, why, hints, terminal? }.
// type: fix-bug | predict | skeleton | decision | terminal. App tĩnh nên checks chỉ kiểm tra bằng tay
// (chọn dòng lỗi / chọn diff đúng / đoán output), KHÔNG chạy code thật. Engine render lab là việc của App.jsx (parent).
export const LABS = {
  "1":   [
    {
      "id": "1-1",
      "concept": "Virtual Threads (Project Loom)",
      "type": "fix-bug",
      "title": "Virtual thread bị kẹt vì synchronized kéo dài",
      "prompt": "Lúc 10 giờ sáng, dashboard báo throughput không tăng dù đã chuyển sang virtual thread, kèm thread dump cho thấy nhiều carrier thread ở trạng thái BLOCKED. Đoạn code dưới dùng synchronized ôm trọn một tác vụ gọi API chậm. Hãy tìm dòng gây kẹt và sửa sao cho virtual thread phát huy tác dụng mà vẫn giữ tính đúng đắn của việc cộng điểm.",
      "code": "public long addPoints(long current, long delta) {\n    synchronized (this) {\n        long updated = current + delta;\n        callSlowExternalApi(updated); // chờ IO 800ms\n        return updated;\n    }\n}",
      "language": "java",
      "failingEvidence": "Thread dump: 180 thread BLOCKED chờ lock, carrier thread bị pin, throughput không tăng sau khi bật virtual thread dù CPU còn rảnh.",
      "checks": [
        "Chọn đúng dòng code gây lỗi (khối synchronized ôm cả tác vụ IO chậm)",
        "Chọn diff đúng: thu hẹp vùng synchronized chỉ quanh phép cộng, hoặc dùng AtomicLong, đưa gọi API ra ngoài lock"
      ],
      "solution": "public long addPoints(AtomicLong balance, long delta) {\n    long updated = balance.addAndGet(delta);\n    callSlowExternalApi(updated); // ngoài lock, virtual thread nhường carrier khi chờ IO\n    return updated;\n}",
      "why": "Ở Java 21, virtual thread giữ synchronized lâu sẽ pin carrier thread, làm mất lợi thế rẻ khi chờ IO. Thu hẹp lock chỉ quanh đoạn cần tương hỗ, hoặc dùng AtomicLong, thì virtual thread mới nhường carrier trong lúc chờ API. Không sửa, càng tăng tải càng kẹt carrier và throughput dậm chân.",
      "hints": [
        "Gợi ý 1: Hỏi xem đoạn nào thật sự cần giữ lock, đoạn nào chỉ chờ IO.",
        "Gợi ý 2: synchronized đang ôm cả callSlowExternalApi 800ms — tách gọi API ra ngoài, chỉ giữ lock quanh phép cộng, hoặc thay bằng AtomicLong."
      ]
    },
    {
      "id": "1-2",
      "concept": "GC: G1 và ZGC",
      "type": "predict",
      "title": "Đoán p99 khi G1 gặp full GC",
      "prompt": "Một service dùng G1, heap 4GB, cấu hình -XX:MaxGCPauseMillis=200. Trong giờ cao điểm, GC log cho thấy một đợt full GC kéo dài 2,4 giây. Trước khi xem đáp án, hãy đoán: p99 latency của request trong cửa sổ đó sẽ ra sao, và request đang chờ xử lý sẽ thấy gì?",
      "code": "// Cấu hình JVM\n// -XX:+UseG1GC -Xms4g -Xmx4g -XX:MaxGCPauseMillis=200\n// GC log trong giờ cao điểm:\n// [GC Pause Full (Allocation Failure) 2.4s]",
      "language": "java",
      "failingEvidence": "Đáp án đối chiếu: p99 vọt lên trên 2,4 giây trong cửa sổ full GC; request bị đứng theo kiểu stop-the-world, một số request timeout ở client dù code không có lỗi.",
      "checks": [
        "Đoán đúng p99 vọt lên cỡ vài giây (ít nhất trên 2 giây), không phải chỉ tăng vài mili-giây",
        "Đoán đúng cơ chế: full GC của G1 là stop-the-world nên mọi request đứng theo"
      ],
      "solution": "p99 vọt lên trên 2,4 giây vì full GC của G1 dừng toàn bộ ứng dụng (stop-the-world) trong 2,4 giây. MaxGCPauseMillis chỉ là mục tiêu cho G1, không phải cam kết cứng, và full GC hiếm nhưng vẫn có thể xảy ra. Nếu p99 là ưu tiên hàng đầu, cân nhắc ZGC (pause thường dưới 1ms) đổi lấy CPU và bộ nhớ cao hơn.",
      "why": "Nhầm G1 full GC với young GC là nhầm mức độ nghiêm trọng: young/mixed GC pause ngắn, full GC dừng mọi thứ. Không phân biệt được, team sẽ tối ưu sai chỗ (ví dụ tăng thread) trong khi nguyên nhân là GC.",
      "hints": [
        "Gợi ý 1: Full GC khác young GC ở điểm nào về việc dừng ứng dụng?",
        "Gợi ý 2: Stop-the-world nghĩa là mọi request đều đứng 2,4 giây, nên p99 phải ít nhất cỡ đó."
      ]
    },
    {
      "id": "1-3",
      "concept": "Heap, stack và vòng đời đối tượng",
      "type": "skeleton",
      "title": "Điền giới hạn cho cache sản phẩm",
      "prompt": "Senior gửi review comment: cache sản phẩm hiện không có giới hạn, không TTL, không metric — đúng kiểu leak mà ngày 1 cảnh báo. Bạn nhận khung code dưới, trong đó 3 chỗ // TODO đang bỏ trống. Hãy điền giới hạn cụ thể, TTL và hành vi khi vượt giới hạn sao cho không bao giờ chặn request.",
      "code": "// TODO 1: khai báo giới hạn số mục và TTL\nCache<String, Product> cache = Caffeine.newBuilder()\n    // TODO 2: giới hạn + TTL + chính sách evict\n    .build();\n// TODO 3: khi vượt giới hạn, hành vi là gì? Ghi metric nào?",
      "language": "java",
      "failingEvidence": "Nếu điền sai (không giới hạn, hoặc chặn request khi đầy): heap tăng dần theo traffic, GC chạy ngày càng dày, cuối cùng OutOfMemoryError dù traffic không tăng; hoặc request bị chặn khi cache đầy.",
      "checks": [
        "Chọn đúng phương án điền: có số mục tối đa cụ thể, có TTL, có evict LRU",
        "Chọn đúng hành vi khi vượt giới hạn: evict mục ít dùng nhất và ghi metric, không chặn request"
      ],
      "solution": "Cache<String, Product> cache = Caffeine.newBuilder()\n    .maximumSize(10_000)\n    .expireAfterWrite(10, TimeUnit.MINUTES)\n    .evictionListener((k, v, cause) -> metrics.increment(\"cache_evictions\"))\n    .recordStats()\n    .build();\n// Khi vượt giới hạn: evict mục ít dùng nhất (LRU), ghi metric cache_size, cache_evictions, cache_hit_rate, không chặn request.",
      "why": "Cache không giới hạn chính là leak bộ nhớ dạng collection phình vô hạn. Số cụ thể + TTL + evict + metric biến cache từ quả bom hẹn giờ thành tài nguyên có thể quan sát và kiểm soát.",
      "hints": [
        "Gợi ý 1: Một cache an toàn cần 3 thứ: giới hạn, thời hạn sống, và cách biết nó đang đầy.",
        "Gợi ý 2: Điền maximumSize(10_000) + expireAfterWrite 10 phút + evict LRU, và ghi metric thay vì chặn request."
      ]
    },
    {
      "id": "1-4",
      "concept": "GC: G1 và ZGC",
      "type": "decision",
      "title": "Chọn GC cho service yêu cầu p99 dưới 50ms",
      "prompt": "Product yêu cầu p99 latency dưới 50ms cho API thanh toán, ngân sách CPU còn dư nhưng heap giới hạn 8GB. Hai phương án dưới đều chạy được. Hãy chọn một và biện minh bằng đánh đổi thật, không chọn theo cảm tính.",
      "code": "// Phương án A: G1\n// -XX:+UseG1GC -Xms8g -Xmx8g -XX:MaxGCPauseMillis=200\n// Ưu: cân bằng throughput, tốn ít CPU và bộ nhớ hơn.\n// Nhược: vẫn có thể full GC stop-the-world.\n\n// Phương án B: ZGC\n// -XX:+UseZGC -Xms8g -Xmx8g\n// Ưu: pause thường dưới 1ms, không có full GC stop-the-world kiểu G1.\n// Nhược: tốn thêm CPU và bộ nhớ cho colored pointers và load barriers.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (G1 cho yêu cầu p99 dưới 50ms): một đợt full GC hiếm cũng đủ phá vỡ SLA p99, dù latency trung bình vẫn đẹp. Nếu chọn ZGC mà heap quá chật: CPU và bộ nhớ tăng vọt không còn dư địa.",
      "checks": [
        "Chọn đúng phương án B (ZGC) cho yêu cầu p99 dưới 50ms",
        "Chọn đúng lý do: pause dưới 1ms, đổi lấy CPU và bộ nhớ cao hơn, và CPU còn dư nên đánh đổi này chấp nhận được"
      ],
      "solution": "Chọn phương án B (ZGC). Với yêu cầu p99 dưới 50ms, một full GC stop-the-world của G1 là rủi ro phá SLA dù hiếm. ZGC giữ pause thường dưới 1ms, phù hợp khi độ trễ quan trọng hơn chi phí CPU, và ngân sách CPU còn dư khiến đánh đổi này chấp nhận được. Cần theo dõi CPU và bộ nhớ sau khi đổi để xác nhận.",
      "why": "Chọn GC là chọn đánh đổi, không có đáp án đúng cho mọi service. G1 cân bằng throughput, ZGC ưu tiên độ trễ. Không nêu được đánh đổi, lựa chọn chỉ là đoán mò và SLA p99 sẽ là thứ trả giá.",
      "hints": [
        "Gợi ý 1: Hỏi xem yêu cầu nào là cứng: p99, hay tiết kiệm CPU?",
        "Gợi ý 2: p99 dưới 50ms thì full GC vài giây của G1 là không chấp nhận được, còn CPU dư thì ZGC là lựa chọn hợp lý."
      ]
    },
    {
      "id": "1-5",
      "concept": "Heap, stack và vòng đời đối tượng",
      "type": "terminal",
      "title": "Dùng jstat và jstack để xếp thứ tự 3 giả thuyết OOM",
      "prompt": "PagerDuty réo lúc nửa đêm: app chậm dần rồi OOM, bạn chỉ có terminal và 5 phút trước khi sếp gọi lại. Kịch bản dưới là những lệnh bạn chạy và output nhận được. Hãy xếp 3 giả thuyết (leak thread, leak connection, cache không giới hạn) theo thứ tự kiểm chứng và nói lệnh nào xác nhận hoặc loại bỏ từng giả thuyết.",
      "code": "# Các lệnh đã chạy:\n# jstat -gcutil <pid> 1000 5\n# jstack <pid> | grep -c BLOCKED\n# Lệnh kiểm chứng tiếp theo cần chọn: kiểm tra Hikari metrics, heap dump, hay thread dump chi tiết?",
      "language": "bash",
      "failingEvidence": "Heap used 3.8GB/4GB, GC time 42% trong 5 phút; pool active=50, idle=0, waiting=37; 180 thread BLOCKED chờ lock. Cả 3 triệu chứng cùng xuất hiện nên phải xếp thứ tự, không liệt kê chung chung.",
      "checks": [
        "Chọn đúng thứ tự kiểm chứng: leak connection trước (pool waiting=37 là bằng chứng rõ nhất), rồi cache không giới hạn (heap 3.8/4GB, GC 42%), rồi leak thread/lock (180 BLOCKED)",
        "Chọn đúng lệnh cho từng giả thuyết: Hikari metrics cho connection, heap dump và cache size metric cho cache, jstack chi tiết cho lock"
      ],
      "solution": "Thứ tự: (1) Leak connection — pool active=50, idle=0, waiting=37 là bằng chứng trực tiếp nhất, kiểm tra bằng Hikari metrics và rà code mở connection không đóng (thiếu try-with-resources). (2) Cache không giới hạn — heap 3.8/4GB và GC 42% trỏ tới collection phình, kiểm tra bằng heap dump và cache size metric. (3) Leak thread/lock — 180 BLOCKED, kiểm tra bằng jstack đầy đủ và thứ tự khóa.",
      "why": "OOM có nhiều nguyên nhân cùng triệu chứng. Không xếp thứ tự theo bằng chứng, team sẽ sửa lung tung và bỏ sót nguyên nhân thật. Lệnh và metric cụ thể là thứ phân biệt chẩn đoán với đoán mò.",
      "hints": [
        "Gợi ý 1: Số liệu nào là bằng chứng trực tiếp nhất, không cần suy diễn thêm?",
        "Gợi ý 2: Pool waiting=37 trỏ thẳng tới connection, heap 3.8/4GB trỏ tới cache, còn BLOCKED cần jstack chi tiết mới kết luận."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "jstat -gcutil <pid> 1000 5",
            "output": "S0 S1 E O M CCS YGC YGCT FGC FGCT GCT\n0.0 100.0 92.1 94.8 97.2 91.0 412 18.2 3 8.4 42% (GC time)"
          },
          {
            "cmd": "curl -s localhost:8080/actuator/metrics/hikaricp.connections.active",
            "output": "{\"name\":\"hikaricp.connections.active\",\"measurements\":[{\"value\":50.0}]} # pool max=50, idle=0, waiting=37"
          },
          {
            "cmd": "jstack <pid> | grep -c BLOCKED",
            "output": "180"
          }
        ]
      }
    }
  ],
  "2":   [
    {
      "id": "2-1",
      "concept": "Tên database phải tường minh",
      "type": "fix-bug",
      "title": "App chạy 200 nhưng dữ liệu trống vì URI thiếu tên DB",
      "prompt": "Sáng thứ hai, QA báo API trả 200 nhưng danh sách trống trơn, trong khi hôm thứ sáu dữ liệu vẫn đầy. Không ai đổi code, chỉ có người đổi URI MongoDB trong file config. Hãy tìm dòng config gây lỗi và sửa sao cho app không bao giờ lặng lẽ ghi nhầm DB nữa.",
      "code": "# application.yml hiện tại\nspring:\n  data:\n    mongodb:\n      uri: mongodb://localhost:27017",
      "language": "yaml",
      "failingEvidence": "API trả 200, app lên bình thường, nhưng dữ liệu nhìn thấy trống vì app đang ghi vào database \"test\" thay vì DB thật. Log khởi động không báo lỗi nào.",
      "checks": [
        "Chọn đúng dòng gây lỗi: URI không có tên DB",
        "Chọn diff đúng: khai báo tường minh spring.data.mongodb.database, không chỉ sửa URI một chỗ"
      ],
      "solution": "# application.yml đã sửa\nspring:\n  data:\n    mongodb:\n      uri: mongodb://localhost:27017/masterjp\n      database: masterjp\n# database property thắng URI nên khai báo tường minh ở cả 3 môi trường.\n# Kèm checklist: in tên DB lúc boot, ghi 1 document test, đọc lại từ chính DB đó.",
      "why": "Driver MongoDB lặng lẽ dùng database \"test\" khi URI không có tên DB, và spring.data.mongodb.database thắng URI. Không khai báo tường minh, mọi debug code đều vô ích vì dữ liệu nằm sai chỗ ngay từ đầu.",
      "hints": [
        "Gợi ý 1: App vẫn lên và trả 200 thì lỗi nằm ở đâu: code, hay nơi dữ liệu được ghi?",
        "Gợi ý 2: URI không có tên DB thì driver fallback về test — thêm database property tường minh."
      ]
    },
    {
      "id": "2-2",
      "concept": "Thứ tự ưu tiên config (giảm dần)",
      "type": "predict",
      "title": "Đoán port thật khi system property thắng env var",
      "prompt": "Đồng nghiệp đổi biến môi trường SERVER_PORT=8080 và restart, nhưng app vẫn nghe ở 9090. Bạn được cho thêm một mẩu thông tin: lệnh khởi động có cờ -Dserver.port=9090, còn application.yml ghi 8081. Trước khi xem đáp án, hãy đoán app nghe ở port nào và vì sao đổi env không có tác dụng.",
      "code": "# application.yml: server.port=8081\n# Biến môi trường: SERVER_PORT=8080\n# Lệnh khởi động: java -Dserver.port=9090 -jar app.jar",
      "language": "bash",
      "failingEvidence": "Đáp án đối chiếu: app nghe ở 9090. Đổi env var không đổi hành vi vì JVM system property đứng trên biến môi trường trong thứ tự ưu tiên của Spring Boot.",
      "checks": [
        "Đoán đúng port 9090",
        "Đoán đúng lý do: JVM system property thắng biến môi trường, thắng cả application.yml"
      ],
      "solution": "App nghe ở 9090. Thứ tự giảm dần: command-line > SPRING_APPLICATION_JSON > JVM system properties > biến môi trường > application-{profile}.yml > application.yml > mặc định. System property -Dserver.port=9090 thắng env SERVER_PORT=8080 và thắng file 8081, nên đổi env không có tác dụng. Debug bằng --debug và /actuator/env (chỉ ở dev).",
      "why": "Người chỉ nhớ env thắng file sẽ ngạc nhiên và sửa sai chỗ. Nhớ đúng thứ tự mới biết cờ khởi động đang thắng, thay vì nghi file config bị hỏng.",
      "hints": [
        "Gợi ý 1: Trong thứ tự Spring Boot, system property đứng ở đâu so với env var?",
        "Gợi ý 2: -Dserver.port là JVM system property, nó thắng cả env lẫn file yml."
      ]
    },
    {
      "id": "2-3",
      "concept": "Fail-fast khi boot",
      "type": "skeleton",
      "title": "Điền validation để app chết rõ ràng lúc boot",
      "prompt": "Một incident cũ: app lên được, nhưng request đầu tiên mới nổ NullPointerException vì thiếu URI database — mất cả buổi mới truy vết ra config thiếu. Bạn nhận khung config dưới với 2 chỗ // TODO. Hãy điền sao cho thiếu config bắt buộc thì app chết ngay lúc boot với thông báo rõ field nào thiếu.",
      "code": "@ConfigurationProperties(prefix = \"app\")\n@Validated\npublic class AppProperties {\n    // TODO 1: annotation cho field bắt buộc\n    private String mongodbUri;\n    // TODO 2: annotation cho field bắt buộc\n    private String jwtSecret;\n    // getters, setters...\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai (không có validation): app lên bình thường, request đầu tiên mới lỗi NullPointer hoặc connection, khó truy vết và trông như lỗi code nghiệp vụ.",
      "checks": [
        "Chọn đúng annotation cho cả hai field: @NotBlank (hoặc @NotNull) kèm @Validated đã có",
        "Chọn đúng hành vi mong đợi: app fail-fast lúc boot, báo rõ field nào thiếu, không chạy nửa vời"
      ],
      "solution": "@ConfigurationProperties(prefix = \"app\")\n@Validated\npublic class AppProperties {\n    @NotBlank\n    private String mongodbUri;\n    @NotBlank\n    private String jwtSecret;\n    // getters, setters...\n}\n// Thiếu config: app chết lúc boot, báo rõ field nào vi phạm, thay vì NullPointer ở request đầu tiên.",
      "why": "Fail-fast biến lỗi config từ lỗi runtime khó truy vết thành lỗi boot rõ ràng. Không validate, app chạy nửa vời và mọi request đầu tiên đều là một lần debug lại từ đầu.",
      "hints": [
        "Gợi ý 1: Cần annotation nào để một String bắt buộc không được rỗng?",
        "Gợi ý 2: @NotBlank cho cả mongodbUri và jwtSecret, kết hợp với @Validated sẵn có."
      ]
    },
    {
      "id": "2-4",
      "concept": "Auto-configuration và starter",
      "type": "decision",
      "title": "Khi chưa cần DB, có nên để Boot tự tạo DataSource?",
      "prompt": "Team đang tách một service chỉ làm nhiệm vụ gửi email, chưa cần database, nhưng starter-data-jpa đang kéo theo DataSource tự động và service cứ đòi connection lúc boot. Hai phương án dưới đều chạy được ở máy dev. Hãy chọn phương án đúng cho service này và nêu cái giá của phương án còn lại.",
      "code": "// Phương án A: để nguyên, cứ để Boot tự tạo DataSource\n// Giá: boot đòi DB dù service không dùng DB, sai DB là sập service email.\n\n// Phương án B: loại trừ auto-config chưa cần\n// @SpringBootApplication(exclude = DataSourceAutoConfiguration.class)\n// Giá: khi nào cần DB thật thì phải bỏ exclude và cấu hình lại.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (để nguyên): service email sập theo DB dù nó không cần DB; hoặc DataSource tự tạo trỏ sai DB và gây lỗi khó hiểu lúc boot.",
      "checks": [
        "Chọn đúng phương án B (exclude DataSourceAutoConfiguration khi chưa cần DB)",
        "Chọn đúng lý do: auto-config đoán sai ý bạn thì app vẫn chạy nhưng sai hành vi, và service không dùng DB không nên phụ thuộc DB lúc boot"
      ],
      "solution": "Chọn phương án B: @SpringBootApplication(exclude = DataSourceAutoConfiguration.class) khi service chưa cần DB. Auto-configuration chỉ đúng khi điều kiện của nó khớp ý bạn; khi nó đoán sai, app vẫn chạy nhưng sai hành vi. Cái giá của B là khi cần DB thật phải bỏ exclude và cấu hình lại — một cái giá rõ ràng và có chủ đích, tốt hơn sập service vì dependency không cần thiết.",
      "why": "Boot tự cấu hình nhiều thứ là tiện, nhưng tiện không có nghĩa là đúng. Loại trừ tường minh khi chưa cần là cách nói rõ ý định với framework, thay vì để nó đoán.",
      "hints": [
        "Gợi ý 1: Service email có thật sự cần DB lúc boot không?",
        "Gợi ý 2: Exclude DataSourceAutoConfiguration là cách nói với Boot rằng chưa cần DB."
      ]
    },
    {
      "id": "2-5",
      "concept": "Thứ tự ưu tiên config (giảm dần)",
      "type": "terminal",
      "title": "Dùng --debug để tìm ai đang thắng config của bạn",
      "prompt": "Bạn đổi giá trị trong application.yml nhưng app không đổi hành vi, và nghi có một nguồn config khác đang thắng. Không được đoán, chỉ được dùng terminal. Kịch bản dưới là output của conditions report và actuator env. Hãy chỉ ra nguồn nào đang thắng và bước sửa tiếp theo.",
      "code": "# Lệnh đã chạy: java -jar app.jar --debug\n# Lệnh tiếp theo cần chọn: kiểm tra /actuator/env, hay sửa application.yml lần nữa?",
      "language": "bash",
      "failingEvidence": "Conditions report cho thấy property server.port có giá trị 9090 từ systemProperties, trong khi application.yml ghi 8081 và env ghi 8080. Sửa file lần nữa không thay đổi gì.",
      "checks": [
        "Chọn đúng nguồn đang thắng: JVM system property (systemProperties)",
        "Chọn đúng bước tiếp theo: kiểm tra lệnh khởi động và cờ -D, sửa ở đó thay vì sửa file yml"
      ],
      "solution": "Nguồn thắng là JVM system property: server.port=9090 từ systemProperties. Thứ tự: command-line > SPRING_APPLICATION_JSON > system properties > env > profile yml > application.yml. Bước sửa: tìm cờ -Dserver.port=9090 trong lệnh khởi động, script deploy hoặc cấu hình Render, sửa hoặc bỏ nó; đừng sửa application.yml thêm lần nữa. Xác nhận bằng /actuator/env ở dev sau khi sửa.",
      "why": "Debug config bằng --debug và /actuator/env cho bằng chứng về nguồn thắng, thay vì sửa file theo cảm tính. Không có bằng chứng, team sẽ sửa vòng quanh mãi mà hành vi không đổi.",
      "hints": [
        "Gợi ý 1: Conditions report nói giá trị đến từ đâu: file, env, hay systemProperties?",
        "Gợi ý 2: systemProperties thắng cả env lẫn file, nên phải sửa cờ -D ở lệnh khởi động."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "java -jar app.jar --debug 2>&1 | grep -A3 server.port",
            "output": "server.port=9090 (source: systemProperties)\napplication.yml: server.port=8081 (overridden)\nenvironment: SERVER_PORT=8080 (overridden)"
          },
          {
            "cmd": "ps aux | grep java",
            "output": "java -Dserver.port=9090 -jar app.jar"
          }
        ]
      }
    }
  ],
  "3":   [
    {
      "id": "3-1",
      "concept": "CORS ở tầng Security, không chỉ WebMvc",
      "type": "fix-bug",
      "title": "Sửa Security chain để preflight không bị chặn 403",
      "prompt": "Incident đêm qua: mọi API cần login lỗi hàng loạt, API public vẫn chạy ngon, frontend báo lỗi CORS chung chung còn backend log không thấy request thật nào. Đoạn Security chain dưới là nghi phạm số một. Hãy tìm rule thiếu và viết lại thứ tự đúng.",
      "code": "http.authorizeHttpRequests(a -> a\n      .requestMatchers(\"/admin/**\").hasRole(\"ADMIN\")\n      .anyRequest().authenticated())\n    .cors(c -> c.configurationSource(corsSource()));",
      "language": "java",
      "failingEvidence": "DevTools: OPTIONS trả 403, không có header Access-Control-Allow-Origin, request thật không bao giờ được gửi. API public vẫn chạy vì được permitAll nên preflight qua được.",
      "checks": [
        "Chọn đúng lỗi: thiếu permitAll cho OPTIONS trước mọi rule authenticated",
        "Chọn diff đúng: thêm .requestMatchers(HttpMethod.OPTIONS, \"/**\").permitAll() đặt TRƯỚC rule /admin/** và anyRequest"
      ],
      "solution": "http.authorizeHttpRequests(a -> a\n      .requestMatchers(HttpMethod.OPTIONS, \"/**\").permitAll()\n      .requestMatchers(\"/admin/**\").hasRole(\"ADMIN\")\n      .anyRequest().authenticated())\n    .cors(c -> c.configurationSource(corsSource()));\n// Hoặc: cấu hình CorsConfigurationSource ở tầng Security. Chỉ sửa WebMvcConfigurer là chưa đủ vì nó chạy sau Security filter.",
      "why": "Preflight OPTIONS không mang token. Nếu rule authenticated đứng trước, preflight chết 403 trước khi tới CORS handler và browser hủy luôn request thật. CORS ở WebMvc chạy sau Security nên sửa ở đó không cứu được preflight.",
      "hints": [
        "Gợi ý 1: Preflight có mang token không, và nó đi qua rule nào đầu tiên?",
        "Gợi ý 2: Permit OPTIONS trước mọi rule authenticated, vì preflight không có credentials để kiểm tra."
      ]
    },
    {
      "id": "3-2",
      "concept": "Phân biệt lỗi CORS, token và backend chết",
      "type": "predict",
      "title": "Đoán kết quả curl OPTIONS cho 3 tình huống",
      "prompt": "Ba đồng nghiệp báo ba triệu chứng khác nhau và đều gọi chung là lỗi CORS. Bạn chưa được xem code, chỉ được xem bảng curl OPTIONS dưới. Trước khi xem đáp án, hãy đoán từng dòng tương ứng với tình huống nào: preflight đúng, preflight bị Security chặn, hay backend chết.",
      "code": "# Lệnh: curl -X OPTIONS https://api.example.com/orders\n#   -H \"Origin: https://fe.example.com\"\n#   -H \"Access-Control-Request-Method: POST\" -i\n# Trường hợp A: HTTP 200 + Access-Control-Allow-Origin: https://fe.example.com\n# Trường hợp B: HTTP 403, không có header Access-Control-Allow-Origin\n# Trường hợp C: curl: Failed to connect",
      "language": "bash",
      "failingEvidence": "Đáp án đối chiếu: A là preflight đúng; B là Security chặn preflight; C là backend chết hoặc không tới được server. Nhầm B với C sẽ sửa sai chỗ.",
      "checks": [
        "Ghép đúng cả 3: A là preflight đúng, B là Security chặn, C là backend chết",
        "Nêu đúng bước tiếp theo cho B: sửa thứ tự rule Security, không debug controller"
      ],
      "solution": "A — preflight đúng: 200 kèm header CORS, browser sẽ gửi request thật. B — Security chặn preflight: 403, không header CORS, sửa thứ tự rule (permit OPTIONS trước). C — backend chết: không kết nối được hoặc 502, kiểm tra server có sống không, đừng sửa CORS. Nhìn status và header, đừng đoán từ message chung chung của frontend.",
      "why": "Ba nguyên nhân khác nhau nhưng frontend đều báo CORS error. Phân biệt bằng status và header là kỹ năng chẩn đoán nhanh nhất của ngày 3, và nó quyết định sửa ở Security, ở CORS config, hay ở hạ tầng.",
      "hints": [
        "Gợi ý 1: 403 khác 502 và khác không kết nối được ở điểm nào?",
        "Gợi ý 2: Có header CORS nghĩa là đã qua CORS handler; 403 không header nghĩa là chết trước đó."
      ]
    },
    {
      "id": "3-3",
      "concept": "DispatcherServlet, Filter và Interceptor",
      "type": "skeleton",
      "title": "Điền CorsConfigurationSource ở tầng Security",
      "prompt": "Reviewer yêu cầu: đừng chỉ sửa CORS ở WebMvcConfigurer nữa, hãy cấu hình CORS ngay ở tầng Security cho chắc. Bạn nhận khung code dưới với 2 chỗ // TODO. Hãy điền allowedOrigins khớp chính xác origin thật và exposedHeaders cho header tùy chỉnh mà frontend cần đọc.",
      "code": "@Bean\nCorsConfigurationSource corsSource() {\n    CorsConfiguration config = new CorsConfiguration();\n    // TODO 1: origin chính xác, không dùng \"*\" khi có credentials\n    // TODO 2: exposed header để frontend đọc X-Total-Count\n    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();\n    source.registerCorsConfiguration(\"/**\", config);\n    return source;\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai (origin có trailing slash, sai port, hoặc \"*\" kèm allowCredentials=true): OPTIONS có thể 200 nhưng request thật vẫn bị chặn, hoặc browser từ chối vì credentials đi kèm \"*\"; thiếu exposedHeaders thì frontend đọc response được nhưng không đọc được X-Total-Count.",
      "checks": [
        "Chọn đúng origin khớp chính xác cả scheme, host và port, không trailing slash, không dùng * khi có credentials",
        "Chọn đúng exposedHeaders chứa X-Total-Count"
      ],
      "solution": "CorsConfiguration config = new CorsConfiguration();\nconfig.setAllowedOrigins(List.of(\"https://fe.example.com\"));\nconfig.setAllowCredentials(true);\nconfig.setAllowedMethods(List.of(\"GET\", \"POST\", \"PATCH\", \"DELETE\"));\nconfig.setAllowedHeaders(List.of(\"Authorization\", \"Content-Type\"));\nconfig.setExposedHeaders(List.of(\"X-Total-Count\"));\n// Origin phải khớp chính xác: khác port là khác origin, trailing slash cũng làm khớp sai.",
      "why": "Origin là scheme + host + port, cả ba phải khớp. allowCredentials=true đi với \"*\" là cấu hình không hợp lệ mà browser từ chối. Header tùy chỉnh muốn frontend đọc phải được exposed, nếu không server trả rồi mà frontend vẫn không thấy.",
      "hints": [
        "Gợi ý 1: Origin gồm mấy thành phần, và cái nào hay bị sai nhất?",
        "Gợi ý 2: Khớp chính xác cả port, bỏ trailing slash, và exposed X-Total-Count."
      ]
    },
    {
      "id": "3-4",
      "concept": "DispatcherServlet, Filter và Interceptor",
      "type": "decision",
      "title": "Đặt kiểm tra bảo mật ở Filter hay Interceptor?",
      "prompt": "Một đề xuất trong review: chuyển kiểm tra đăng nhập từ Security Filter sang HandlerInterceptor cho tiện vì interceptor biết controller nào sẽ xử lý. Hai phương án dưới đều biên dịch được. Hãy chọn phương án đúng cho kiểm tra bảo mật và nêu hậu quả của phương án còn lại.",
      "code": "// Phương án A: kiểm tra ở Security Filter (FilterChainProxy)\n// Chạy trước DispatcherServlet, thấy mọi request, chặn trước khi tới controller.\n\n// Phương án B: kiểm tra ở HandlerInterceptor.preHandle\n// Chạy sau HandlerMapping, biết controller nào, nhưng chỉ chạy sau khi request\n// đã qua Filter chain và DispatcherServlet đã chọn handler.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (B cho bảo mật): request đi qua Filter chain mà không bị chặn ở tầng bảo mật, và logic cần chặn sớm lại phụ thuộc vào việc DispatcherServlet đã chọn handler — sai tầng là sai vị trí bảo mật.",
      "checks": [
        "Chọn đúng phương án A (Security Filter) cho kiểm tra bảo mật",
        "Chọn đúng lý do: Filter chạy trước mọi thứ, Interceptor chỉ phù hợp logic theo handler như ghi log theo controller"
      ],
      "solution": "Chọn phương án A. Security filter chain chạy trước DispatcherServlet và thấy mọi request, nên là nơi chặn truy cập. Interceptor chạy sau khi đã chọn handler, phù hợp cho logic cần biết controller (ví dụ log theo handler, đo metric theo endpoint), không phải để thay thế tầng bảo mật. Đặt Security vào Interceptor là đặt chốt chặn sau cánh cổng đã mở.",
      "why": "Nhầm hai tầng là nhầm vị trí kiểm tra và vị trí xử lý lỗi. Bảo mật phải chặn sớm nhất có thể; logic theo handler mới cần biết controller là ai.",
      "hints": [
        "Gợi ý 1: Thứ tự chạy: Filter trước hay Interceptor trước DispatcherServlet?",
        "Gợi ý 2: Bảo mật cần chặn trước khi tới controller, nên phải ở Filter."
      ]
    },
    {
      "id": "3-5",
      "concept": "Preflight OPTIONS",
      "type": "terminal",
      "title": "Chạy curl OPTIONS để kết luận trước khi sửa code",
      "prompt": "Frontend báo lỗi, bạn chưa biết lỗi ở frontend, Security hay backend. Quy tắc của ngày 3: chạy curl OPTIONS trước, sửa code sau. Kịch bản dưới là output bạn nhận được. Hãy kết luận nguyên nhân và nêu bước sửa duy nhất tiếp theo, không sửa lung tung.",
      "code": "# Lệnh đã chạy:\n# curl -X OPTIONS https://api.example.com/orders\n#   -H \"Origin: https://fe.example.com\"\n#   -H \"Access-Control-Request-Method: POST\" -i",
      "language": "bash",
      "failingEvidence": "HTTP 403, không có header Access-Control-Allow-Origin, backend log không ghi nhận request thật nào. Frontend báo CORS error chung chung.",
      "checks": [
        "Kết luận đúng: preflight bị Security chặn, không phải lỗi controller hay backend chết",
        "Chọn đúng bước sửa: permit OPTIONS trước rule authenticated, không sửa WebMvcConfigurer một mình"
      ],
      "solution": "Kết luận: Security chặn preflight. Bằng chứng là 403 kèm việc không có header CORS và không có request thật trong log. Bước sửa duy nhất tiếp theo: thêm .requestMatchers(HttpMethod.OPTIONS, \"/**\").permitAll() trước mọi rule authenticated, hoặc cấu hình CorsConfigurationSource ở tầng Security, rồi chạy lại curl OPTIONS để xác nhận trả 200 kèm header CORS.",
      "why": "Chẩn đoán bằng curl OPTIONS tách được 3 nguyên nhân chỉ trong một lệnh. Sửa code trước khi có bằng chứng là cách nhanh nhất để sửa sai chỗ và sinh thêm lỗi.",
      "hints": [
        "Gợi ý 1: 403 không header CORS nghĩa là request chết ở tầng nào?",
        "Gợi ý 2: Chết trước CORS handler thì phải sửa Security chain, không phải controller."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "curl -X OPTIONS https://api.example.com/orders -H \"Origin: https://fe.example.com\" -H \"Access-Control-Request-Method: POST\" -i",
            "output": "HTTP/1.1 403 Forbidden\nContent-Length: 0\n# Không có header Access-Control-Allow-Origin"
          },
          {
            "cmd": "curl -X OPTIONS https://api.example.com/orders -H \"Origin: https://fe.example.com\" -H \"Access-Control-Request-Method: POST\" -i",
            "output": "HTTP/1.1 200 OK\nAccess-Control-Allow-Origin: https://fe.example.com\nAccess-Control-Allow-Methods: GET, POST\nAccess-Control-Allow-Headers: Authorization, Content-Type"
          }
        ]
      }
    }
  ],
  "4":   [
    {
      "id": "4-1",
      "concept": "Nơi ghi và nơi đọc token phải là một",
      "type": "fix-bug",
      "title": "Dashboard render nhưng API 403 vì ghi đọc lệch storage",
      "prompt": "User vừa login xong, dashboard hiện ngon lành, nhưng mọi API đều trả 403. Người khác nghi phân quyền, nhưng bạn nghi token storage trước theo đúng bài học ngày 4. Đoạn code dưới là bằng chứng. Hãy tìm cặp ghi đọc lệch nhau và sửa bằng một hàm duy nhất.",
      "code": "// Lúc login:\nsessionStorage.setItem(\"token\", res.accessToken);\n// Lúc interceptor gắn header:\nconst t = localStorage.getItem(\"accessToken\");\nif (t) headers.Authorization = \"Bearer \" + t;\n// Guard trang: getUser() đọc cả localStorage và sessionStorage.",
      "language": "java",
      "failingEvidence": "API trả 403 dù vừa login xong; dashboard vẫn render vì guard đọc cả hai storage nên tưởng login thành công. Không có lỗi nào ở backend phân quyền.",
      "checks": [
        "Chọn đúng cặp lệch: ghi sessionStorage key token, đọc localStorage key accessToken",
        "Chọn diff đúng: một hàm getToken và setSession duy nhất, cùng key và cùng storage, interceptor chỉ đọc qua getToken"
      ],
      "solution": "// Một hàm duy nhất, nơi ghi và nơi đọc là một:\nfunction setSession(token) { localStorage.setItem(\"accessToken\", token); }\nfunction getToken() { return localStorage.getItem(\"accessToken\"); }\n// Interceptor chỉ đọc qua getToken(), không đọc storage trực tiếp.\n// Guard cũng dùng getToken(), không đọc cả hai nơi theo cách khác nhau.",
      "why": "Ghi một nơi, đọc một nơi khác thì mọi API đi không có Authorization và trả 403, trong khi guard đọc cả hai nơi vẫn cho vào dashboard nên user tưởng login thành công. Một hàm duy nhất loại bỏ cả lệch key lẫn lệch storage.",
      "hints": [
        "Gợi ý 1: So sánh key và storage ở nơi ghi với nơi đọc, có mấy điểm khác?",
        "Gợi ý 2: Ghi sessionStorage key token nhưng đọc localStorage key accessToken — lệch cả hai, sửa bằng getToken duy nhất."
      ]
    },
    {
      "id": "4-2",
      "concept": "JWT: header.payload.signature",
      "type": "predict",
      "title": "Đoán ai đọc được gì trong JWT payload",
      "prompt": "Một đồng nghiệp nói cứ nhét số điện thoại và ghi chú nội bộ vào JWT payload cho tiện vì đã ký rồi. Bạn được cho một token mẫu và cách nó được tạo. Trước khi xem đáp án, hãy đoán: người cầm token nhưng không có secret thì đọc được gì, và sửa được gì?",
      "code": "// header: {\"alg\":\"HS256\",\"typ\":\"JWT\"}\n// payload: {\"sub\":\"123\",\"role\":\"CUSTOMER\",\"phone\":\"0901234567\"}\n// signature = HMACSHA256(base64(header) + \".\" + base64(payload), secret)\n// Token gửi cho client: header.payload.signature",
      "language": "java",
      "failingEvidence": "Đáp án đối chiếu: ai cũng đọc được payload vì nó chỉ là base64, không mã hóa; nhưng không sửa được role thành ADMIN vì không có secret để ký lại signature hợp lệ.",
      "checks": [
        "Đoán đúng: đọc được toàn bộ payload (base64 không phải mã hóa)",
        "Đoán đúng: không sửa được payload mà vẫn qua verify nếu không có secret"
      ],
      "solution": "Người cầm token đọc được toàn bộ payload vì base64 chỉ là mã hóa dạng biểu diễn, không phải mã hóa bảo mật. Họ không sửa được role thành ADMIN mà vẫn qua verify, vì server verify signature bằng secret và signature sẽ không khớp sau khi payload bị sửa. Kết luận: không bao giờ nhét dữ liệu nhạy cảm (password, số thẻ, secret) vào payload; và không verify signature nghĩa là tin bất kỳ ai tự ký.",
      "why": "Nhầm ký với mã hóa là lỗi bảo mật cổ điển: signature chứng minh token do server ký, không hề giấu nội dung. Nhét dữ liệu nhạy cảm vào payload là lộ ngay khi token lọt ra ngoài.",
      "hints": [
        "Gợi ý 1: Base64 có phải là mã hóa không, hay chỉ là cách biểu diễn?",
        "Gợi ý 2: Đọc thì ai cũng đọc được, sửa thì cần secret để ký lại — hai việc khác nhau."
      ]
    },
    {
      "id": "4-3",
      "concept": "Access token ngắn + refresh token xoay vòng",
      "type": "skeleton",
      "title": "Điền luồng refresh xoay vòng và thu hồi",
      "prompt": "Senior yêu cầu luồng token phải ghi rõ thời hạn và cách thu hồi ở từng bước, không chỉ vẽ mũi tên. Bạn nhận khung luồng dưới với 3 chỗ // TODO. Hãy điền thời hạn access, thời hạn refresh và hành vi khi logout, đổi mật khẩu và lộ refresh token.",
      "code": "// Login: cấp access + refresh\n// TODO 1: thời hạn access và refresh\n// Access hết hạn giữa chừng:\n// TODO 2: dùng refresh đổi access mới, refresh cũ ra sao?\n// Logout / đổi mật khẩu / lộ refresh:\n// TODO 3: thu hồi cái gì, access cũ sống thêm bao lâu?",
      "language": "java",
      "failingEvidence": "Nếu điền sai (access 30 ngày không revoke, refresh không xoay vòng): lộ token là mất tài khoản cả tháng; refresh cũ bị đánh cắp vẫn dùng được mãi dù user đã đổi mật khẩu.",
      "checks": [
        "Chọn đúng thời hạn: access ngắn khoảng 15 phút, refresh dài khoảng 7 ngày",
        "Chọn đúng hành vi: refresh xoay vòng (cấp mới, thu hồi cũ), logout thu hồi refresh, đổi mật khẩu thu hồi toàn bộ refresh, access cũ sống tối đa tới khi hết hạn"
      ],
      "solution": "Login cấp access 15 phút + refresh 7 ngày, refresh xoay vòng: mỗi lần refresh cấp refresh mới và thu hồi refresh cũ. Logout thu hồi refresh và xóa phía client, access cũ vẫn sống tối đa 15 phút nên access phải ngắn. Đổi mật khẩu thu hồi toàn bộ refresh. Lộ refresh thì thu hồi refresh đó và toàn bộ phiên của user, bắt đăng nhập lại.",
      "why": "JWT vốn stateless nên revoke không đơn giản. Access ngắn giới hạn thiệt hại khi lộ, refresh xoay vòng khiến token cũ bị đánh cắp nhanh chóng vô hiệu. Không có cả hai, một lần lộ là một lần mất tài khoản dài hạn.",
      "hints": [
        "Gợi ý 1: Access càng ngắn thì lộ token thiệt hại càng nhỏ, nhưng đổi lại phải refresh thường xuyên.",
        "Gợi ý 2: Điền access 15 phút, refresh 7 ngày xoay vòng, logout và đổi mật khẩu đều thu hồi refresh."
      ]
    },
    {
      "id": "4-4",
      "concept": "Login cần kiểm tra đủ",
      "type": "decision",
      "title": "Chọn thông báo login để không lộ tài khoản tồn tại",
      "prompt": "Team tranh cãi về thông báo khi login thất bại: báo rõ tài khoản không tồn tại hay sai mật khẩu thì user dễ hiểu hơn, nhưng security thì lo lộ thông tin. Hai phương án dưới đều chạy được. Hãy chọn phương án đúng và nêu cái giá của nó.",
      "code": "// Phương án A: báo rõ từng trường hợp\n// \"Tài khoản không tồn tại\" / \"Sai mật khẩu\"\n// Tiện cho user thật, nhưng attacker liệt kê được tài khoản nào tồn tại.\n\n// Phương án B: báo chung một câu\n// \"Email hoặc mật khẩu không đúng\"\n// Không lộ tài khoản tồn tại, nhưng user thật phải tự rà lại cả hai trường.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (A): attacker thử hàng loạt email và biết tài khoản nào tồn tại từ thông báo khác nhau, rồi tập trung tấn công những tài khoản đó (enumeration).",
      "checks": [
        "Chọn đúng phương án B (thông báo chung)",
        "Chọn đúng lý do: tránh enumeration, dù user thật kém tiện hơn một chút"
      ],
      "solution": "Chọn phương án B: luôn trả một thông báo chung \"Email hoặc mật khẩu không đúng\" cho cả trường hợp tài khoản không tồn tại và sai mật khẩu. Login vẫn phải kiểm tra đủ 4 điều (tồn tại, BCrypt khớp, phone đã xác minh, chưa bị khóa sau 5 lần sai trong 15 phút), nhưng không để thông báo tiết lộ bước nào đã sai. Cái giá là user thật phải tự kiểm tra lại cả email lẫn mật khẩu.",
      "why": "Thông báo khác nhau cho từng bước sai là kênh rò rỉ thông tin. Enumeration không phá được mật khẩu ngay, nhưng nó thu hẹp mục tiêu cho mọi đòn tấn công tiếp theo.",
      "hints": [
        "Gợi ý 1: Attacker học được gì từ việc thông báo khác nhau?",
        "Gợi ý 2: Một câu chung cho mọi trường hợp sai thì attacker không phân biệt được tài khoản tồn tại hay không."
      ]
    },
    {
      "id": "4-5",
      "concept": "Nơi ghi và nơi đọc token phải là một",
      "type": "fix-bug",
      "title": "localStorage lưu chuỗi undefined vì destructure sai field",
      "prompt": "Một bug khác cùng họ với lab 4-1: user login thành công, backend trả token đàng hoàng, nhưng mọi API sau đó đều gửi Bearer undefined. Đoạn frontend dưới là nghi phạm. Hãy tìm dòng destructure sai và sửa cho khớp với response thật của backend.",
      "code": "// Backend trả: { accessToken: \"eyJ...\" }\n// Frontend viết:\nconst { token } = await loginApi(email, password);\nlocalStorage.setItem(\"accessToken\", token);",
      "language": "java",
      "failingEvidence": "localStorage lưu chuỗi \"undefined\"; mọi API gửi header Authorization: Bearer undefined và trả 401 hoặc 403. Backend không có lỗi nào, token thật vẫn được cấp đúng.",
      "checks": [
        "Chọn đúng dòng gây lỗi: destructure { token } trong khi backend trả { accessToken }",
        "Chọn diff đúng: destructure { accessToken } và lưu đúng giá trị đó"
      ],
      "solution": "const { accessToken } = await loginApi(email, password);\nlocalStorage.setItem(\"accessToken\", accessToken);\n// Quy tắc: diff contract của cả hai phía bằng tên field thật (response backend vs code frontend),\n// không tin JSDoc hay trí nhớ, vì mock trả { token } nhưng backend thật trả { accessToken }.",
      "why": "Destructure sai tên field không báo lỗi, nó chỉ cho undefined rồi lưu thành chuỗi \"undefined\". Bug ẩn mình hoàn toàn khi chỉ test bằng mock, và mọi API auth sau đó đều chết theo một cách trông như lỗi server.",
      "hints": [
        "Gợi ý 1: Backend trả field tên gì, frontend đọc field tên gì?",
        "Gợi ý 2: Backend trả accessToken nhưng code đọc token nên nhận undefined."
      ]
    }
  ],
  "5":   [
    {
      "id": "5-1",
      "concept": "Resource và method đúng nghĩa",
      "type": "fix-bug",
      "title": "PUT thay toàn bộ vô tình xóa field không gửi",
      "prompt": "User chỉ muốn đổi địa chỉ giao hàng của đơn, nhưng sau khi lưu, ghi chú và mã giảm giá của đơn biến mất. Frontend gọi API dưới, backend chỉ có một method cho route đó. Hãy tìm cặp method sai và sửa sao cho sửa một phần không xóa các field còn lại.",
      "code": "// Frontend gọi:\naxios.put(\"/orders/123\", { shippingAddress: \"12 Nguyễn Huệ\" });\n// Backend chỉ có:\n@PatchMapping(\"/orders/{id}\")\npublic Order updateOrder(@PathVariable Long id, @RequestBody OrderPatch patch) { ... }",
      "language": "java",
      "failingEvidence": "Request trả 405 Method Not Allowed vì path đúng mà method sai; và nếu dùng PUT thay toàn bộ với body chỉ có một field thì các field không gửi sẽ bị coi là trống và mất dữ liệu.",
      "checks": [
        "Chọn đúng lỗi: frontend dùng PUT trong khi backend chỉ có PATCH",
        "Chọn diff đúng: đổi frontend sang PATCH cho sửa một phần, hoặc bổ sung PUT thay toàn bộ với đầy đủ field"
      ],
      "solution": "// Sửa frontend sang PATCH cho sửa một phần:\naxios.patch(\"/orders/123\", { shippingAddress: \"12 Nguyễn Huệ\" });\n// PUT chỉ dùng khi gửi toàn bộ resource; PATCH dùng khi sửa một phần.\n// Khi đối chiếu contract, kiểm tra cả method in hoa từng endpoint, không chỉ path.",
      "why": "Path đúng mà method sai vẫn chết 405, và PUT với PATCH khác nhau ở ngữ nghĩa thay toàn bộ hay sửa một phần. Dùng PUT cho sửa một phần là cách xóa dữ liệu một cách hợp lệ theo đúng contract.",
      "hints": [
        "Gợi ý 1: Sửa một field thì cần thay toàn bộ hay sửa một phần?",
        "Gợi ý 2: Backend chỉ có PATCH, frontend gọi PUT nên 405 — đổi sang PATCH."
      ]
    },
    {
      "id": "5-2",
      "concept": "Status code",
      "type": "predict",
      "title": "Đoán status cho 4 tình huống đơn hàng",
      "prompt": "Backend mới trả 200 cho mọi trường hợp kèm message trong body, khiến frontend và monitoring không phân biệt được lỗi. Bạn được cho 4 tình huống dưới. Trước khi xem đáp án, hãy đoán status đúng cho từng tình huống theo quy ước của ngày 5.",
      "code": "// Tình huống A: tạo đơn thành công\n// Tình huống B: user chưa login mà gọi API đơn\n// Tình huống C: user đã login nhưng đòi xem đơn của người khác\n// Tình huống D: tạo đơn trùng với idempotency key đã dùng",
      "language": "java",
      "failingEvidence": "Đáp án đối chiếu: A là 201, B là 401, C là 403, D là 409. Trả 200 cho mọi lỗi khiến frontend không biết khi nào đưa user đi login, khi nào báo không có quyền.",
      "checks": [
        "Đoán đúng cả 4: A 201, B 401, C 403, D 409",
        "Phân biệt đúng 401 (chưa xác thực) với 403 (đã xác thực nhưng không có quyền)"
      ],
      "solution": "A — 201 Created (kèm Location: /orders/123). B — 401 Unauthorized: chưa xác thực, frontend đưa user đi login. C — 403 Forbidden: đã xác thực nhưng không phải chủ đơn. D — 409 Conflict: trùng đơn theo idempotency key. Trả 200 cho mọi lỗi là phá contract mà monitoring và client đều dựa vào.",
      "why": "Status code là ngôn ngữ chung giữa backend, frontend và monitoring. Dùng sai, mọi tầng đều phải đọc message tự chế để đoán lỗi, và sẽ đoán sai.",
      "hints": [
        "Gợi ý 1: Chưa login và không có quyền là hai lỗi khác nhau, status nào cho mỗi loại?",
        "Gợi ý 2: Tạo thành công là 201, trùng là 409, còn 401 và 403 phân biệt ở chỗ đã xác thực hay chưa."
      ]
    },
    {
      "id": "5-3",
      "concept": "Pagination: page hay cursor",
      "type": "skeleton",
      "title": "Điền phân trang cursor cho feed đơn realtime",
      "prompt": "Feed đơn hàng cập nhật liên tục: đơn mới chèn đầu danh sách, user đang lướt trang 2 thì thấy trùng và thiếu đơn. Bạn nhận khung endpoint dưới với 2 chỗ // TODO. Hãy điền phân trang cursor và giới hạn kích thước trang sao cho chèn thêm không làm lệch danh sách.",
      "code": "@GetMapping(\"/orders\")\npublic List<Order> listOrders(\n    // TODO 1: tham số cursor thay cho page\n    // TODO 2: giới hạn limit tối đa\n) { ... }",
      "language": "java",
      "failingEvidence": "Nếu điền sai (giữ page và không giới hạn size): user thấy trùng hoặc thiếu item khi có đơn mới chèn đầu; một request không giới hạn có thể lấy cả triệu dòng và làm chậm hệ thống.",
      "checks": [
        "Chọn đúng tham số: cursor (mã hóa id của item cuối đã thấy) và limit",
        "Chọn đúng giới hạn: limit tối đa cụ thể, ví dụ 100, và mặc định nhỏ hơn như 20"
      ],
      "solution": "@GetMapping(\"/orders\")\npublic List<Order> listOrders(\n    @RequestParam(required = false) String cursor,\n    @RequestParam(defaultValue = \"20\") int limit) {\n    limit = Math.min(limit, 100);\n    // Lấy tiếp sau item ứng với cursor, không dùng offset.\n    // Cursor ổn định khi chèn thêm vì nó neo vào item cuối đã thấy.\n    return orderService.listAfter(cursor, limit);\n}",
      "why": "Page dùng offset nên chèn hoặc xóa làm lệch trang. Cursor neo vào item cuối đã thấy nên danh sách chèn thêm vẫn ổn định. Không giới hạn size là mở cửa cho request lấy cả bảng.",
      "hints": [
        "Gợi ý 1: Cái gì làm page lệch khi có dữ liệu mới: offset hay item neo?",
        "Gợi ý 2: Dùng cursor sau item cuối đã thấy, limit tối đa 100."
      ]
    },
    {
      "id": "5-4",
      "concept": "Versioning và backward compatibility",
      "type": "decision",
      "title": "Đổi tên field total có cần version mới?",
      "prompt": "Team muốn đổi tên field total thành totalAmount cho rõ nghĩa, và có người nói chỉ là sửa nhỏ, deploy luôn là xong. Ba thay đổi dưới đang chờ quyết định cùng lúc. Hãy phân loại thay đổi nào tương thích ngược, thay đổi nào vỡ client cũ và cần lộ trình.",
      "code": "// Thay đổi A: thêm field \"note\" (optional) vào response đơn.\n// Thay đổi B: đổi tên field \"total\" thành \"totalAmount\".\n// Thay đổi C: thêm field bắt buộc \"couponCode\" vào request tạo đơn.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (deploy B và C như sửa nhỏ): app mobile cũ crash hàng loạt vì không tìm thấy total, và client cũ không gửi couponCode sẽ nhận 400 cho mọi lần tạo đơn.",
      "checks": [
        "Phân loại đúng: A tương thích ngược, B vỡ client cũ, C vỡ client cũ",
        "Chọn đúng lộ trình cho B và C: version mới, hoặc giữ cả hai field một thời gian rồi mới bỏ, hoặc để couponCode optional với giá trị mặc định"
      ],
      "solution": "A tương thích ngược: thêm field optional vào response không làm client cũ hỏng. B vỡ client cũ: đổi tên field là đổi contract, cần /v2 hoặc giữ cả total và totalAmount trong giai đoạn chuyển đổi rồi mới bỏ. C vỡ client cũ: thêm field bắt buộc vào request khiến client cũ gửi thiếu sẽ 400, cần version mới hoặc để couponCode optional với mặc định.",
      "why": "Thêm field khác thêm field bắt buộc, và đổi tên khác thêm field. Nhầm ba loại này là nhầm mức độ vỡ, và client cũ là thứ trả giá cho một deploy được gọi là sửa nhỏ.",
      "hints": [
        "Gợi ý 1: Client cũ có bị ảnh hưởng không nếu response thêm một field nó không đọc?",
        "Gợi ý 2: Đổi tên và thêm bắt buộc đều làm client cũ hỏng, chỉ có thêm optional là an toàn."
      ]
    },
    {
      "id": "5-5",
      "concept": "Status code",
      "type": "fix-bug",
      "title": "Error contract trả stack trace thay vì Problem Details",
      "prompt": "Khi tạo đơn sai dữ liệu, API trả 500 kèm stack trace dài, frontend không biết báo user câu nào và cũng không có mã lỗi để tra cứu. Đoạn controller dưới là nghi phạm. Hãy tìm lỗi ở cách trả lỗi và sửa theo Problem Details (RFC 7807) với mã lỗi riêng.",
      "code": "@PostMapping(\"/orders\")\npublic Order create(@RequestBody CreateOrderRequest req) {\n    try {\n        return orderService.create(req);\n    } catch (Exception e) {\n        throw new RuntimeException(e); // trả 500 + stack trace\n    }\n}",
      "language": "java",
      "failingEvidence": "Response lỗi: HTTP 500 kèm stack trace nội bộ, không có mã lỗi, frontend chỉ biết hiện \"Có lỗi xảy ra\". Dữ liệu sai của client bị báo như lỗi server.",
      "checks": [
        "Chọn đúng lỗi: lỗi validation của client bị biến thành 500 và lộ stack trace",
        "Chọn diff đúng: trả 400 hoặc 422 kèm Problem Details có code riêng, không trả stack trace"
      ],
      "solution": "// Dùng exception handler trả Problem Details, không trả stack trace:\n@ExceptionHandler(InvalidOrderException.class)\npublic ResponseEntity<ProblemDetail> handle(InvalidOrderException e) {\n    ProblemDetail pd = ProblemDetail.forStatus(400);\n    pd.setTitle(\"Dữ liệu đơn không hợp lệ\");\n    pd.setProperty(\"code\", \"INVALID_STATUS\");\n    pd.setDetail(e.getMessage());\n    return ResponseEntity.badRequest().body(pd);\n}\n// Sai dữ liệu: 400 + code riêng. Lỗi server thật mới là 5xx, và cũng không kèm stack trace.",
      "why": "Error contract thống nhất là thứ frontend và monitoring dựa vào để xử lý. Trả 500 cho lỗi client và lộ stack trace vừa sai ngữ nghĩa vừa lộ thông tin nội bộ, trong khi mã lỗi riêng cho phép tra cứu và xử lý theo từng trường hợp.",
      "hints": [
        "Gợi ý 1: Sai dữ liệu từ client là lỗi 4xx hay 5xx?",
        "Gợi ý 2: Trả Problem Details với code riêng như INVALID_STATUS, không trả stack trace."
      ]
    }
  ],
  "6":   [
    {
      "id": "6-1",
      "concept": "Jackson phân biệt hoa thường",
      "type": "fix-bug",
      "title": "Số liệu hiện 0 vì frontend đọc NEW thay vì new",
      "prompt": "Dashboard thống kê hiện 0 cho mọi chỉ số dù backend trả số liệu đầy đủ, và không có lỗi nào trong console. Đoạn frontend và response thật dưới là bằng chứng duy nhất bạn cần. Hãy tìm cặp key lệch case và sửa về một phía thống nhất.",
      "code": "// Backend trả: {\"new\": 12, \"mastered\": 5}\n// Frontend đọc:\nconst total = stats.NEW + stats.MASTERED; // hiện 0",
      "language": "java",
      "failingEvidence": "stats.NEW là undefined, stats.MASTERED là undefined, tổng hiện 0 mà không báo lỗi nào. Logic tính toán không sai, dữ liệu backend cũng không sai.",
      "checks": [
        "Chọn đúng cặp lệch: frontend đọc NEW và MASTERED, backend trả new và mastered",
        "Chọn diff đúng: đổi frontend sang đọc new và mastered, hoặc thống nhất bằng @JsonProperty rõ ràng ở backend"
      ],
      "solution": "// Sửa frontend đọc đúng case backend trả:\nconst total = stats.new + stats.mastered;\n// Hoặc thống nhất ở backend bằng @JsonProperty rõ ràng nếu muốn đổi tên key.\n// Quy tắc: JSON key phân biệt hoa thường, diff phải so đúng case.",
      "why": "Jackson serialize field new thành JSON new thường, frontend đọc NEW theo thói quen enum Java thì nhận undefined trong im lặng. Số liệu 0 không có lỗi là dấu hiệu nghi case của JSON key trước khi nghi logic tính toán.",
      "hints": [
        "Gợi ý 1: Backend trả key dạng nào, frontend đọc dạng nào?",
        "Gợi ý 2: new khác NEW trong JSON — đổi frontend sang đọc new và mastered."
      ]
    },
    {
      "id": "6-2",
      "concept": "DTO khác entity",
      "type": "predict",
      "title": "Đoán điều gì lộ ra khi expose entity trực tiếp",
      "prompt": "Một API trả thẳng entity Order ra ngoài cho nhanh, khỏi viết DTO. Bạn được cho entity dưới với các field nội bộ và quan hệ lazy. Trước khi xem đáp án, hãy đoán: client sẽ thấy gì thêm, và lỗi nào có thể nổ khi Jackson serialize entity này?",
      "code": "@Entity\npublic class Order {\n    private Long id;\n    private BigDecimal total;\n    private String internalNote; // ghi chú nội bộ, không cho client\n    @OneToMany(fetch = FetchType.LAZY)\n    private List<OrderItem> items;\n    private Instant deletedAt; // field nội bộ\n}",
      "language": "java",
      "failingEvidence": "Đáp án đối chiếu: client thấy internalNote và deletedAt; serialize quan hệ lazy ngoài transaction có thể gây lỗi hoặc kéo cả đồ thị, và đổi DB sau này sẽ vỡ API.",
      "checks": [
        "Đoán đúng: lộ field nội bộ internalNote và deletedAt",
        "Đoán đúng: lazy loading có thể gây lỗi serialization hoặc N+1 khi Jackson chạm vào items ngoài transaction"
      ],
      "solution": "Client thấy internalNote và deletedAt dù không bao giờ được thấy. Jackson serialize items lazy ngoài transaction có thể gây LazyInitializationException, hoặc vô tình tải cả đồ thị quan hệ và gây N+1. Sửa: viết OrderResponse DTO chỉ gồm id, items, total, status; entity là model persistence, DTO là contract với bên ngoài, không bao giờ expose entity trực tiếp.",
      "why": "DTO là biên hệ thống: nó quyết định client thấy gì và contract thay đổi ra sao. Expose entity là giao cả cấu trúc DB cho client, mọi thay đổi DB sau này đều thành vỡ API.",
      "hints": [
        "Gợi ý 1: Entity có field nào mà client không bao giờ được thấy?",
        "Gợi ý 2: internalNote, deletedAt lộ ra ngoài, và items lazy có thể nổ khi serialize."
      ]
    },
    {
      "id": "6-3",
      "concept": "Validation 3 lớp",
      "type": "skeleton",
      "title": "Điền validation cho DTO đăng ký",
      "prompt": "Form đăng ký hiện chỉ validate ở frontend, gọi API trực tiếp là qua mặt được hết. Bạn nhận khung DTO dưới với 4 chỗ // TODO. Hãy điền annotation cho từng field sao cho đủ 3 lớp: controller kiểm tra định dạng, service kiểm tra nghiệp vụ, database kiểm tra ràng buộc.",
      "code": "public class RegisterRequest {\n    // TODO: email đúng định dạng, bắt buộc\n    private String email;\n    // TODO: password tối thiểu 8 ký tự, bắt buộc\n    private String password;\n    // TODO: phone đúng định dạng VN\n    private String phone;\n    // TODO: ngày sinh không phải tương lai\n    private LocalDate dateOfBirth;\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai (thiếu annotation hoặc chỉ validate ở frontend): gọi API trực tiếp với email sai định dạng, password 3 ký tự hoặc ngày sinh tương lai vẫn qua được và ghi dữ liệu rác vào DB.",
      "checks": [
        "Chọn đúng annotation cho từng field: @NotBlank + @Email, @NotBlank + @Size(min = 8), @Pattern cho phone, @Past cho ngày sinh",
        "Nêu đúng 3 lớp: controller định dạng, service nghiệp vụ, DB ràng buộc — DTO này chỉ là lớp đầu tiên"
      ],
      "solution": "public class RegisterRequest {\n    @NotBlank @Email\n    private String email;\n    @NotBlank @Size(min = 8)\n    private String password;\n    @Pattern(regexp = \"^(0[35789][0-9]{8})$\")\n    private String phone;\n    @Past\n    private LocalDate dateOfBirth;\n}\n// Kèm @Valid ở controller. Lớp 2 (service): kiểm tra email đã tồn tại chưa.\n// Lớp 3 (DB): unique constraint cho email, NOT NULL cho field bắt buộc.",
      "why": "Thiếu một lớp là có đường lọt: chỉ validate ở frontend thì gọi API trực tiếp là qua; chỉ validate ở controller thì service gọi nội bộ vẫn ghi sai. Ba lớp là ba cửa chặn độc lập, không thay thế nhau.",
      "hints": [
        "Gợi ý 1: Mỗi field cần kiểm tra gì: định dạng, độ dài, mẫu, hay mốc thời gian?",
        "Gợi ý 2: Email dùng @Email, password @Size(min = 8), phone @Pattern, ngày sinh @Past."
      ]
    },
    {
      "id": "6-4",
      "concept": "Tiền, thời gian, enum",
      "type": "decision",
      "title": "Chọn kiểu tiền và thời gian cho DTO thanh toán",
      "prompt": "Team đang viết DTO thanh toán và có người đề xuất dùng double cho tiền vì nhanh, String tự do cho thời gian vì tiện. Hai phương án dưới đều biên dịch được. Hãy chọn phương án đúng cho tiền và thời gian, và nêu hậu quả cụ thể của phương án còn lại.",
      "code": "// Phương án A: double amount; String createdAt; // \"29/10/2026 10:00\"\n// Hậu quả: 0.1 + 0.2 không bằng 0.3 ở binary, giờ không timezone thì server\n// và client hiểu khác giờ.\n\n// Phương án B: BigDecimal amount; OffsetDateTime createdAt;\n// ISO-8601 kèm timezone, ví dụ \"2026-10-29T10:00:00+07:00\".",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (A): tổng tiền lệch vài đồng không giải thích được, giờ hiển thị lệch múi giờ giữa server và client, và đối soát với đối tác thanh toán lệch nhau.",
      "checks": [
        "Chọn đúng phương án B (BigDecimal và OffsetDateTime kèm timezone)",
        "Chọn đúng lý do: double sai tiền lẻ ở binary, thời gian không timezone gây hiểu khác giờ"
      ],
      "solution": "Chọn phương án B: tiền dùng BigDecimal, không dùng double; thời gian dùng ISO-8601 kèm timezone (OffsetDateTime). BigDecimal chậm hơn một chút nhưng đúng tiền; thời gian có timezone thì server và client hiểu cùng một mốc. Với enum thêm giá trị mới, cần fallback UNKNOWN khi deserialize để client cũ không crash.",
      "why": "Tiền và thời gian là hai thứ sai một chút cũng thành sai nghiêm trọng: lệch vài đồng là lệch đối soát, lệch múi giờ là lệch cả lịch sử giao dịch. Kiểu dữ liệu đúng là rẻ nhất để tránh hai loại sai này.",
      "hints": [
        "Gợi ý 1: 0.1 + 0.2 bằng bao nhiêu trong số thực nhị phân?",
        "Gợi ý 2: BigDecimal cho tiền, ISO-8601 kèm timezone cho thời gian."
      ]
    },
    {
      "id": "6-5",
      "concept": "Jackson phân biệt hoa thường",
      "type": "predict",
      "title": "Đoán response khi frontend gửi thừa và thiếu field",
      "prompt": "Frontend gửi request tạo đơn với key user và totalPrice, trong khi DTO backend yêu cầu userId và total. Không ai chạy thử, chỉ có code dưới. Trước khi xem đáp án, hãy đoán: request có qua được DTO không, và Jackson mặc định sẽ làm gì với field thừa?",
      "code": "// Frontend gửi: axios.post(\"/orders\", { user: \"u1\", totalPrice: 100, items: [...] })\n// Backend DTO:\npublic class CreateOrderRequest {\n    @NotBlank private String userId;\n    @NotNull private BigDecimal total;\n    private List<Item> items;\n}",
      "language": "java",
      "failingEvidence": "Đáp án đối chiếu: request không qua. Thừa field user và totalPrice, thiếu field bắt buộc userId và total; Jackson mặc định FAIL_ON_UNKNOWN_PROPERTIES nên thừa field cũng có thể gây 400.",
      "checks": [
        "Đoán đúng: request không qua vì thiếu userId và total bắt buộc",
        "Đoán đúng: thừa field cũng có thể 400 do FAIL_ON_UNKNOWN_PROPERTIES mặc định"
      ],
      "solution": "Request không qua: user khác userId (thừa user, thiếu userId bắt buộc), totalPrice khác total (thừa totalPrice, thiếu total bắt buộc) nên validation 400. Jackson mặc định FAIL_ON_UNKNOWN_PROPERTIES=true nên gửi thừa field cũng có thể 400, không phải cứ gửi thừa là an toàn. Sửa: thống nhất tên field ở cả hai phía và diff bằng axios call thật với DTO thật, không diff bằng trí nhớ.",
      "why": "Frontend gửi theo thói quen, DTO viết theo trí nhớ, cả hai sai giống nhau nên review lướt không phát hiện. Chỉ có diff thật từng key mới bắt được mismatch thừa, thiếu, sai case và sai kiểu.",
      "hints": [
        "Gợi ý 1: So từng key frontend gửi với từng field DTO, key nào không khớp?",
        "Gợi ý 2: user khác userId, totalPrice khác total — vừa thừa vừa thiếu, và thừa cũng có thể 400."
      ]
    }
  ],
  "7":   [
    {
      "id": "7-1",
      "concept": "Audit theo checklist, có bằng chứng",
      "type": "terminal",
      "title": "Chạy audit 1 API bằng curl và ghi bằng chứng",
      "prompt": "Checkpoint tuần 1 bắt đầu: bạn được giao audit 1 API thật, không được audit bằng cách đọc code rồi kết luận. Kịch bản dưới là output curl bạn thu được. Hãy đối chiếu checklist 7 mục của ngày 7 và liệt kê ít nhất 3 lỗi, mỗi lỗi kèm bằng chứng cụ thể từ output.",
      "code": "# Lệnh đã chạy:\n# curl -X OPTIONS https://api.example.com/admin/orders -H \"Origin: https://fe.example.com\" -i\n# curl https://api.example.com/orders/123 -H \"Authorization: Bearer <token_user_A>\" -i\n# curl https://api.example.com/orders/999 -H \"Authorization: Bearer <token_user_A>\" -i",
      "language": "bash",
      "failingEvidence": "OPTIONS trả 403 không header CORS; GET /orders/123 của user B bằng token user A vẫn trả 200; GET /orders/999 không tồn tại trả 200 kèm body rỗng thay vì 404. Ba lỗi có bằng chứng, không phải cảm tính.",
      "checks": [
        "Liệt kê đúng ít nhất 3 lỗi có bằng chứng: preflight bị Security chặn, IDOR (user A đọc đơn user B), status sai cho đơn không tồn tại",
        "Mỗi lỗi gắn đúng bằng chứng: status và header từ output curl, không ghi cảm tính"
      ],
      "solution": "Lỗi 1 — Preflight bị Security chặn: OPTIONS 403, không header CORS, cần permit OPTIONS trước rule authenticated. Lỗi 2 — IDOR: token user A đọc được đơn 123 của user B với 200, cần check sở hữu ở service hoặc repository, không chỉ ở controller. Lỗi 3 — Status sai: đơn không tồn tại trả 200 body rỗng thay vì 404, frontend không phân biệt được không có dữ liệu và lỗi. Mỗi lỗi đều có request và response thật làm bằng chứng, đúng chuẩn audit ngày 7.",
      "why": "Audit không có bằng chứng là cảm tính, và chỉ kiểm tra happy path là chưa audit. Ba lỗi trên chỉ lộ khi chạy thử: đọc code có thể bỏ qua cả ba vì controller trông vẫn đúng.",
      "hints": [
        "Gợi ý 1: Checklist ngày 7 có 7 mục — output curl chạm tới mấy mục?",
        "Gợi ý 2: OPTIONS 403, đọc đơn người khác vẫn 200, đơn không tồn tại vẫn 200 — đó là 3 lỗi."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "curl -X OPTIONS https://api.example.com/admin/orders -H \"Origin: https://fe.example.com\" -i",
            "output": "HTTP/1.1 403 Forbidden\n# Không có header Access-Control-Allow-Origin"
          },
          {
            "cmd": "curl https://api.example.com/orders/123 -H \"Authorization: Bearer <token_user_A>\" -i",
            "output": "HTTP/1.1 200 OK\n{\"id\":123,\"userId\":\"user_B\",\"total\":500000} # Đơn của user B nhưng token user A vẫn đọc được"
          },
          {
            "cmd": "curl https://api.example.com/orders/999 -H \"Authorization: Bearer <token_user_A>\" -i",
            "output": "HTTP/1.1 200 OK\n{} # Đơn không tồn tại nhưng vẫn trả 200"
          }
        ]
      }
    },
    {
      "id": "7-2",
      "concept": "Phân loại lỗi",
      "type": "fix-bug",
      "title": "Sửa IDOR ở tầng dữ liệu, không chỉ ẩn nút",
      "prompt": "Báo cáo audit vừa tìm ra: user A đổi ID trên URL là đọc được đơn của user B. Frontend đã ẩn nút xem đơn người khác, nhưng API vẫn trả dữ liệu. Đoạn controller dưới là nghi phạm. Hãy tìm chỗ thiếu check sở hữu và sửa ở đúng tầng.",
      "code": "@GetMapping(\"/orders/{id}\")\npublic Order getOrder(@PathVariable Long id, Principal principal) {\n    return orderRepo.findById(id).orElseThrow();\n    // Không kiểm tra đơn này có phải của principal hay không.\n}",
      "language": "java",
      "failingEvidence": "Request của user A tới /orders/123 (đơn của user B) trả 200 kèm đầy đủ dữ liệu đơn. Ẩn nút ở frontend không ngăn được gọi API trực tiếp.",
      "checks": [
        "Chọn đúng lỗi: thiếu check sở hữu ở service hoặc repository",
        "Chọn diff đúng: truy vấn theo cả id và owner, trả 403 hoặc 404 khi không phải chủ đơn, không chỉ ẩn nút frontend"
      ],
      "solution": "@GetMapping(\"/orders/{id}\")\npublic Order getOrder(@PathVariable Long id, Principal principal) {\n    return orderRepo.findByIdAndUserId(id, principal.getName())\n        .orElseThrow(() -> new AccessDeniedException(\"Không phải đơn của bạn\"));\n}\n// Check ở tầng dữ liệu (service/repository), không chỉ ở controller hay frontend.\n// Test phân quyền phải dùng tài khoản người khác, không test bằng tài khoản admin.",
      "why": "Ẩn nút ở frontend không phải là bảo mật, và chỉ check role mà không check sở hữu vẫn để lọt IDOR. Check ở tầng dữ liệu đảm bảo mọi đường gọi tới dữ liệu đều bị chặn, không chỉ đường qua controller này.",
      "hints": [
        "Gợi ý 1: Frontend ẩn nút có ngăn được người gọi API trực tiếp không?",
        "Gợi ý 2: Truy vấn phải lọc cả id và chủ sở hữu, thiếu một trong hai là lọt."
      ]
    },
    {
      "id": "7-3",
      "concept": "Thứ tự sửa",
      "type": "decision",
      "title": "Xếp thứ tự sửa cho 3 lỗi audit",
      "prompt": "Báo cáo audit có 3 lỗi và chỉ còn một buổi để sửa trước khi demo. Không được xếp theo dễ sửa trước. Ba lỗi dưới đang chờ bạn xếp thứ tự, mỗi lỗi kèm hậu quả thật. Hãy xếp và nêu lý do theo đúng thứ tự của ngày 7.",
      "code": "// Lỗi A: dữ liệu đơn ghi vào DB \"test\" thay vì DB thật.\n// Lỗi B: user A đọc được đơn của user B bằng cách đổi ID.\n// Lỗi C: message lỗi khi tạo đơn chỉ là \"Có lỗi xảy ra\".",
      "language": "java",
      "failingEvidence": "Nếu xếp sai (sửa C trước A và B): demo đẹp hơn một chút nhưng dữ liệu vẫn ghi sai DB và user vẫn đọc được đơn người khác — hai lỗi nặng nhất còn nguyên.",
      "checks": [
        "Xếp đúng: A và B trước C",
        "Nêu đúng lý do: A là mất dữ liệu, B là bảo mật, C chỉ là trải nghiệm"
      ],
      "solution": "Thứ tự: A và B trước C. A là mất dữ liệu (hoặc nhìn nhầm DB), B là lỗi bảo mật IDOR — cả hai đều chặn luồng chính và gây hậu quả thật. C chỉ là trải nghiệm: message chung chung khó dùng nhưng không mất dữ liệu, không lộ dữ liệu. Lỗi nhỏ nhưng dễ sửa không được chen lên trước lỗi mất dữ liệu và bảo mật.",
      "why": "Thứ tự sửa là quyết định về rủi ro, không phải về độ dễ. Sửa message cho đẹp trong khi dữ liệu vẫn ghi sai DB là ưu tiên sai, dù công việc đó trông có vẻ hoàn thành nhanh.",
      "hints": [
        "Gợi ý 1: Lỗi nào gây hậu quả không sửa lại được: mất dữ liệu, lộ dữ liệu, hay message xấu?",
        "Gợi ý 2: Mất dữ liệu và bảo mật trước, trải nghiệm sau."
      ]
    },
    {
      "id": "7-4",
      "concept": "Audit theo checklist, có bằng chứng",
      "type": "predict",
      "title": "Đoán lỗi nào lộ ra khi guest gọi API cần JWT",
      "prompt": "Một trang public đặt component gọi API cần JWT mà không gate bằng trạng thái đăng nhập. Bạn được cho hành vi của component và interceptor toàn cục dưới. Trước khi xem đáp án, hãy đoán: guest vừa mở trang thì chuyện gì xảy ra, và nguyên nhân là gì?",
      "code": "// Trang public mount component Quota (gọi GET /api/ai/quota, cần JWT).\n// Interceptor toàn cục: nhận 401 thì redirect về /dang-nhap.\n// Guest mở trang public, chưa hề bấm gì.",
      "language": "java",
      "failingEvidence": "Đáp án đối chiếu: guest bị đá về trang đăng nhập dù không bấm gì, vì component gọi API cần JWT ngay khi mount, API trả 401, interceptor redirect toàn cục.",
      "checks": [
        "Đoán đúng hành vi: guest bị redirect oan về trang đăng nhập",
        "Đoán đúng nguyên nhân: component fetch API cần JWT mà không gate bằng isLoggedIn, kết hợp interceptor 401-redirect toàn cục"
      ],
      "solution": "Guest bị đá về /dang-nhap dù không bấm gì. Chuỗi sự kiện: mount trang public, component Quota gọi API cần JWT, server trả 401 vì guest không có token, interceptor toàn cục thấy 401 thì redirect. Sửa: mọi component fetch API cần JWT mà guest có thể thấy phải gate bằng isLoggedIn trước khi gọi, không chỉ gate ở cấp trang mà từng component con có fetch riêng.",
      "why": "Lỗi này chỉ lộ khi chạy với vai trò guest, không lộ khi test bằng tài khoản đã login. Audit chỉ kiểm tra happy path với tài khoản đầy đủ quyền sẽ bỏ qua toàn bộ lớp lỗi redirect oan này.",
      "hints": [
        "Gợi ý 1: Component gọi API lúc nào: khi user bấm, hay ngay khi mount?",
        "Gợi ý 2: Mount là gọi ngay, 401 gặp interceptor redirect là guest bị đá dù không làm gì."
      ]
    },
    {
      "id": "7-5",
      "concept": "Phân loại lỗi",
      "type": "skeleton",
      "title": "Điền báo cáo audit có bằng chứng và spec sửa",
      "prompt": "Sếp yêu cầu báo cáo audit không được viết kiểu cảm tính. Bạn nhận khung báo cáo dưới với 3 chỗ // TODO. Hãy điền sao cho mỗi lỗi đều có bằng chứng, phân loại đúng, và spec sửa kèm cách kiểm chứng sau khi sửa.",
      "code": "// Báo cáo audit API: ________\n// TODO 1: API nào, request và response thật là gì?\n// TODO 2: mỗi lỗi thuộc loại nào (contract, auth, config, validation)?\n// TODO 3: spec sửa cho lỗi nặng nhất + kiểm chứng sau khi sửa ra sao?",
      "language": "java",
      "failingEvidence": "Nếu điền sai (liệt kê lỗi không có bằng chứng, hoặc không phân loại): báo cáo trông đủ lỗi nhưng team sửa lung tung mọi chỗ, sửa được lỗi này lại sinh lỗi khác vì chưa biết lỗi thuộc tầng nào.",
      "checks": [
        "Điền đúng cấu trúc: API cụ thể, request và response thật cho từng lỗi",
        "Điền đúng phân loại và thứ tự sửa: mất dữ liệu, bảo mật, trải nghiệm, kèm cách kiểm chứng sau sửa"
      ],
      "solution": "Báo cáo audit API: GET /orders/{id}\nBằng chứng: curl request và response thật (status, header, body) cho từng trường hợp.\nLỗi 1 — IDOR: loại auth, bằng chứng token user A đọc đơn user B trả 200. Spec sửa: check sở hữu ở repository, kiểm chứng bằng token user khác sau sửa phải trả 403 hoặc 404.\nLỗi 2 — Preflight 403: loại config, bằng chứng OPTIONS 403 không header CORS. Spec sửa: permit OPTIONS trước rule authenticated, kiểm chứng bằng curl OPTIONS trả 200 kèm header.\nLỗi 3 — Status sai: loại contract, bằng chứng đơn không tồn tại trả 200. Spec sửa: trả 404, kiểm chứng bằng curl đơn không tồn tại.\nThứ tự sửa: IDOR và preflight trước, status sau nếu cần chọn.",
      "why": "Phân loại quyết định sửa ở đâu: contract sửa DTO và OpenAPI, auth sửa Security và interceptor, config sửa env và profile. Không phân loại, mọi lỗi đều bị sửa lung tung và dễ sinh lỗi mới.",
      "hints": [
        "Gợi ý 1: Một báo cáo audit đạt cần gì ngoài tên lỗi?",
        "Gợi ý 2: Cần API cụ thể, bằng chứng request và response, phân loại, và cách kiểm chứng sau sửa."
      ]
    }
  ],
  "8":   [
    {
      "id": "8-1",
      "concept": "Index B-tree và composite index",
      "type": "fix-bug",
      "title": "Composite index sai thứ tự vẫn full scan",
      "prompt": "Query tìm đơn theo user và khoảng thời gian chạy chậm dù đã có index, và EXPLAIN vẫn báo full scan. Index hiện tại dưới là nghi phạm. Hãy tìm lỗi thứ tự cột và sửa sao cho query dùng được index cho cả lọc và sắp xếp.",
      "code": "// Query:\nSELECT * FROM orders\nWHERE user_id = 42 AND created_at BETWEEN '2026-10-01' AND '2026-10-29'\nORDER BY created_at DESC;\n// Index hiện tại:\nCREATE INDEX idx_orders ON orders (created_at, user_id);",
      "language": "sql",
      "failingEvidence": "EXPLAIN: type=ALL, key=NULL, rows=1000000 — full scan dù đã có index. Query chậm tăng theo kích thước bảng, không theo số đơn của user.",
      "checks": [
        "Chọn đúng lỗi: thứ tự cột index đảo ngược so với cách query lọc",
        "Chọn diff đúng: index (user_id, created_at) để lọc theo user trước rồi theo thời gian, khớp cả ORDER BY created_at DESC"
      ],
      "solution": "DROP INDEX idx_orders ON orders;\nCREATE INDEX idx_orders_user_created ON orders (user_id, created_at);\n-- Composite (A, B) dùng được cho WHERE A, hoặc WHERE A AND B.\n-- Query lọc user_id trước rồi created_at, và sort theo created_at cùng chiều,\n-- nên (user_id, created_at) là thứ tự đúng.",
      "why": "Query chỉ dùng được phần đầu của composite index theo thứ tự cột. Đảo thứ tự làm index không phục vụ được cách lọc chính của query, nên database quay về full scan dù index đã tồn tại.",
      "hints": [
        "Gợi ý 1: Query lọc cột nào trước, cột nào có tính phân biệt mạnh hơn?",
        "Gợi ý 2: Lọc user_id trước rồi created_at nên index phải là (user_id, created_at)."
      ]
    },
    {
      "id": "8-2",
      "concept": "EXPLAIN",
      "type": "predict",
      "title": "Đoán EXPLAIN nói gì trước và sau khi thêm index",
      "prompt": "Bạn chưa được chạy EXPLAIN, chỉ được cho query và trạng thái index. Trước khi xem đáp án, hãy đoán: EXPLAIN hiện tại báo type gì và quét khoảng bao nhiêu dòng, và sau khi thêm index đúng thì type và số dòng sẽ đổi ra sao?",
      "code": "-- Bảng orders: 1.000.000 dòng, user 42 có 120 đơn.\n-- Chưa có index nào trên user_id.\nSELECT * FROM orders WHERE user_id = 42;",
      "language": "sql",
      "failingEvidence": "Đáp án đối chiếu: trước khi có index, type=ALL, rows khoảng 1.000.000 (full scan); sau khi thêm index trên user_id, type=ref, key là index đó, rows khoảng 120.",
      "checks": [
        "Đoán đúng trước khi có index: type=ALL, quét khoảng 1.000.000 dòng",
        "Đoán đúng sau khi có index: type=ref, key là index trên user_id, rows khoảng 120"
      ],
      "solution": "Trước: type=ALL, key=NULL, rows=1000000 — full scan toàn bảng dù chỉ cần 120 dòng. Sau khi thêm index trên user_id: type=ref, key=idx_orders_user_id, rows=120 — dùng index và chỉ quét đúng số dòng cần. Đọc EXPLAIN là đọc type, key, rows và Extra (Using filesort nghĩa là cần xem lại index cho ORDER BY).",
      "why": "Chỉ nhìn thời gian chạy thì không biết query chậm vì thiếu index, vì dữ liệu lớn, hay vì sort. EXPLAIN cho biết database thật sự làm gì, nên tối ưu đúng chỗ thay vì thêm instance một cách mù mờ.",
      "hints": [
        "Gợi ý 1: Không có index thì database tìm 120 dòng trong 1 triệu dòng bằng cách nào?",
        "Gợi ý 2: Full scan là type=ALL với rows cỡ toàn bảng; có index là type=ref với rows cỡ số đơn của user."
      ]
    },
    {
      "id": "8-3",
      "concept": "Normalization và denormalization",
      "type": "skeleton",
      "title": "Điền schema đơn hàng giữ nguyên giá lịch sử",
      "prompt": "Yêu cầu nghiệp vụ: giá lúc đặt phải giữ nguyên dù sản phẩm đổi giá sau này, và một đơn có nhiều item, mỗi item thuộc một sản phẩm. Bạn nhận khung schema dưới với 3 chỗ // TODO. Hãy điền khóa, quan hệ và field snapshot sao cho đơn cũ không tự đổi giá.",
      "code": "CREATE TABLE orders (id BIGINT PRIMARY KEY, user_id BIGINT NOT NULL);\nCREATE TABLE order_items (\n    -- TODO 1: khóa chính và khóa ngoại tới orders và products\n    -- TODO 2: field nào lưu giá lúc đặt, khác gì giá hiện tại của products?\n    -- TODO 3: index nào cho query lấy item theo đơn?\n);",
      "language": "sql",
      "failingEvidence": "Nếu điền sai (không lưu snapshot mà đọc giá hiện tại từ products, hoặc thiếu khóa ngoại): đơn cũ tự đổi giá khi sản phẩm tăng giá; hoặc lưu được item mà không có đơn cha, dữ liệu mồ côi.",
      "checks": [
        "Điền đúng: order_items có order_id và product_id làm khóa ngoại, price_snapshot và product_name_snapshot lưu giá và tên lúc đặt",
        "Điền đúng index: index trên order_id cho query lấy item theo đơn, và index (user_id, created_at) cho orders"
      ],
      "solution": "CREATE TABLE order_items (\n    id BIGINT PRIMARY KEY,\n    order_id BIGINT NOT NULL REFERENCES orders(id),\n    product_id BIGINT NOT NULL REFERENCES products(id),\n    qty INT NOT NULL CHECK (qty > 0),\n    price_snapshot DECIMAL(12,2) NOT NULL,\n    product_name_snapshot VARCHAR(255) NOT NULL,\n    UNIQUE (order_id, product_id)\n);\nCREATE INDEX idx_items_order ON order_items (order_id);\nCREATE INDEX idx_orders_user_created ON orders (user_id, created_at);\n-- price_snapshot là giá lúc đặt, không phải giá hiện tại; lịch sử đơn không đổi khi products đổi giá.",
      "why": "Đây là phi chuẩn hóa có chủ đích: chấp nhận trùng lặp snapshot để lịch sử đơn không đổi theo giá hiện tại. Ngược lại, chuẩn hóa quá mức mà đọc giá hiện tại cho đơn cũ là sai nghiệp vụ, không phải tiết kiệm.",
      "hints": [
        "Gợi ý 1: Giá nào mới là sự thật của đơn cũ: giá lúc đặt hay giá hiện tại?",
        "Gợi ý 2: Lưu price_snapshot và product_name_snapshot vào order_items, kèm khóa ngoại và index trên order_id."
      ]
    },
    {
      "id": "8-4",
      "concept": "Khi nào không nên index",
      "type": "decision",
      "title": "Có nên index riêng cột status chỉ có 3 giá trị?",
      "prompt": "Có người đề xuất index mọi cột hay lọc, bắt đầu bằng cột status của đơn. Query dưới lọc theo status đơn thuần, và status chỉ có 3 giá trị DRAFT, PAID, CANCELLED. Hai phương án dưới đều chạy được. Hãy chọn phương án đúng và nêu vì sao index bừa không làm mọi query nhanh hơn.",
      "code": "-- Query: SELECT * FROM orders WHERE status = 'PAID';\n-- Phương án A: CREATE INDEX idx_status ON orders (status);\n--   Index ít phân biệt: mỗi giá trị chiếm khoảng 1/3 bảng, quét index gần như quét bảng.\n-- Phương án B: không index riêng status; nếu hay lọc kèm thời gian thì dùng (status, created_at).\n--   Hoặc index cột phân biệt cao hay lọc và sort như user_id, created_at.",
      "language": "sql",
      "failingEvidence": "Nếu chọn sai (A): optimizer có thể bỏ qua index vì quét index còn đắt hơn quét bảng, trong khi index vẫn tốn dung lượng và làm chậm mọi lần ghi.",
      "checks": [
        "Chọn đúng phương án B (không index riêng status)",
        "Chọn đúng lý do: cột ít giá trị phân biệt thì index ít tác dụng, và index làm chậm ghi, tốn dung lượng"
      ],
      "solution": "Chọn phương án B: không index riêng status. Cột chỉ có 3 giá trị thì mỗi giá trị chiếm một phần lớn bảng, quét index không rẻ hơn quét bảng bao nhiêu, trong khi index vẫn tốn dung lượng và làm chậm ghi. Chỉ index status khi kết hợp với cột khác có ý nghĩa, ví dụ (status, created_at) cho query lọc theo status và khoảng thời gian.",
      "why": "Thêm index bừa không làm mọi query nhanh hơn: index tốt cần phân biệt cao và hay dùng để lọc hoặc sort. Index tệ vừa không được dùng vừa làm chậm ghi — trả giá hai lần mà không nhận lợi ích.",
      "hints": [
        "Gợi ý 1: Một giá trị status chiếm bao nhiêu phần bảng?",
        "Gợi ý 2: 1/3 bảng thì quét index không rẻ hơn quét bảng, nên đừng index riêng status."
      ]
    },
    {
      "id": "8-5",
      "concept": "EXPLAIN",
      "type": "terminal",
      "title": "Dùng psql EXPLAIN để bắt query dùng hàm lên cột index",
      "prompt": "Query tìm đơn theo ngày chạy chậm dù đã có index trên created_at. Bạn nghi query đang dùng hàm lên cột index khiến index vô dụng. Kịch bản psql dưới là output bạn thu được. Hãy chỉ ra lỗi, viết lại query đúng và nêu cách xác nhận bằng EXPLAIN.",
      "code": "-- Query chậm:\nSELECT * FROM orders WHERE DATE(created_at) = '2026-10-29';\n-- Index đã có: CREATE INDEX idx_created ON orders (created_at);",
      "language": "sql",
      "failingEvidence": "EXPLAIN: type=ALL, key=NULL, rows=1000000, dù index trên created_at đã tồn tại. Nguyên nhân là DATE(created_at) khiến database không dùng được index trên cột gốc.",
      "checks": [
        "Chọn đúng lỗi: dùng hàm DATE lên cột có index nên index vô dụng",
        "Chọn đúng cách sửa: viết lại thành khoảng thời gian (created_at >= ngày và < ngày hôm sau) và xác nhận bằng EXPLAIN thấy type=range và key là index"
      ],
      "solution": "SELECT * FROM orders\nWHERE created_at >= '2026-10-29' AND created_at < '2026-10-30';\n-- Viết lại thành khoảng thời gian để database dùng được index trên cột gốc.\n-- Xác nhận: EXPLAIN phải báo type=range, key=idx_created, rows giảm mạnh thay vì type=ALL.",
      "why": "Query dùng hàm lên cột index làm index vô dụng là lỗi hay gặp mà thêm index không sửa được. Viết lại query thành khoảng thời gian giữ nguyên ý nghĩa nhưng cho phép dùng index — sửa query, không phải sửa index.",
      "hints": [
        "Gợi ý 1: DATE(created_at) biến cột index thành cái gì trong mắt optimizer?",
        "Gợi ý 2: Viết lại thành khoảng từ đầu ngày tới đầu ngày hôm sau để dùng được index."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "psql -c \"EXPLAIN SELECT * FROM orders WHERE DATE(created_at) = '2026-10-29';\"",
            "output": "Seq Scan on orders (cost=0.00..18342.00 rows=1000000 width=64)\n  Filter: (date(created_at) = '2026-10-29'::date)"
          },
          {
            "cmd": "psql -c \"EXPLAIN SELECT * FROM orders WHERE created_at >= '2026-10-29' AND created_at < '2026-10-30';\"",
            "output": "Index Scan using idx_created on orders (cost=0.43..124.00 rows=850 width=64)\n  Index Cond: ((created_at >= '2026-10-29'::timestamp) AND (created_at < '2026-10-30'::timestamp))"
          }
        ]
      }
    }
  ],
  "9":   [
    {
      "id": "9-1",
      "concept": "N+1 query",
      "type": "fix-bug",
      "title": "Sửa N+1 trong API danh sách đơn hàng",
      "prompt": "Sáng thứ Hai, senior gửi cho bạn một đoạn service và kèm theo log query: trang danh sách 100 đơn chạy chậm bất thường, log toàn những SELECT giống nhau chỉ khác id. Hãy tìm dòng code gây N+1 và viết lại sao cho số query không còn tăng theo số đơn.",
      "code": "List<Order> orders = orderRepo.findAll();\nList<OrderDto> result = new ArrayList<>();\nfor (Order o : orders) {\n    OrderDto dto = new OrderDto();\n    dto.setId(o.getId());\n    dto.setItems(o.getItems().stream()\n        .map(i -> i.getProductName())\n        .toList());\n    result.add(dto);\n}\nreturn result;",
      "language": "java",
      "failingEvidence": "Log Hibernate với 100 đơn: 1 SELECT lấy orders, sau đó 100 SELECT lấy items từng đơn, tổng 101 query. Với 1000 đơn, tổng là 1001 query, tăng tuyến tính theo N, không phải cấp số nhân nhưng vẫn đủ làm API chậm dần theo độ dài danh sách.",
      "checks": [
        "Chọn đúng dòng code gây N+1 (dòng truy cập o.getItems() trong vòng lặp khi quan hệ đang lazy)",
        "Chọn diff đúng: query lấy orders đã JOIN FETCH items, hoặc dùng EntityGraph, thay vì giữ nguyên vòng lặp gọi lazy"
      ],
      "solution": "@Query(\"SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.id IN :ids\")\nList<Order> findAllWithItems();\n// Hoặc: @EntityGraph(attributePaths = \"items\") trên phương thức findAll của repository.\n// Sau sửa: 1 query lấy orders kèm items, không còn N query trong vòng lặp.",
      "why": "Vì quan hệ items đang lazy nên mỗi lần truy cập trong vòng lặp là một query mới. JOIN FETCH tải items cùng một query, số query không còn phụ thuộc vào số đơn. Không sửa thì danh sách càng dài API càng chậm, và tăng instance cũng không cứu được vì nghẽn ở số query.",
      "hints": [
        "Đếm query trước: 1 query lấy danh sách cộng với bao nhiêu query trong vòng lặp?",
        "Muốn tải items cùng lúc với orders thì dùng JOIN FETCH hoặc EntityGraph trên chính query lấy danh sách."
      ]
    },
    {
      "id": "9-2",
      "concept": "Lazy vs eager",
      "type": "predict",
      "title": "Đoán lỗi khi chạm vào lazy ngoài transaction",
      "prompt": "Trong buổi review, một đồng nghiệp khoe rằng API đã chạy tốt ở local, nhưng ở môi trường khác nó thỉnh thoảng nổ lỗi khi trả về danh sách items. Bạn được cho đoạn code dưới đây, trong đó transaction đã đóng trước khi controller chạm vào items. Hãy đoán xem điều gì xảy ra và vì sao chỉ thỉnh thoảng mới lỗi.",
      "code": "@Service\npublic class OrderService {\n    public Order getOrder(Long id) {\n        return orderRepo.findById(id).orElseThrow();\n    }\n}\n@RestController\npublic class OrderController {\n    @GetMapping(\"/orders/{id}\")\n    public List<String> items(@PathVariable Long id) {\n        Order order = orderService.getOrder(id);\n        return order.getItems().stream()\n            .map(Item::getProductName)\n            .toList();\n    }\n}",
      "language": "java",
      "failingEvidence": "Output thật khi items chưa được tải trong transaction: org.hibernate.LazyInitializationException: could not initialize proxy - no Session. Khi items tình cờ đã được tải sẵn (ví dụ qua một query khác trong cùng request) thì API lại chạy bình thường, nên lỗi xuất hiện thất thường.",
      "checks": [
        "Đoán đúng exception: LazyInitializationException vì truy cập lazy ngoài session/transaction",
        "Đoán đúng nguyên nhân của tính thất thường: lỗi chỉ xảy ra khi items chưa được tải trước khi session đóng"
      ],
      "solution": "Đoán đúng: LazyInitializationException. Cách sửa đúng là tải items trong transaction, ví dụ đặt @Transactional ở service và map sang DTO ngay trong đó, hoặc dùng JOIN FETCH / EntityGraph. Không được sửa bằng cách đổi toàn bộ quan hệ sang EAGER, vì khi đó mọi query đơn đều kéo cả đồ thị không cần thiết.",
      "why": "Vì lazy chỉ tải dữ liệu khi truy cập mà vẫn còn session mở. Đóng transaction rồi mới chạm vào items thì không còn session để tải, Hibernate nổ lỗi. Sửa bằng EAGER bừa thì đổi một lỗi thành một lỗi hiệu năng khác.",
      "hints": [
        "Hỏi xem session/transaction còn mở không tại thời điểm getItems() chạy.",
        "Lỗi thất thường thường nghĩa là dữ liệu đôi khi đã được tải sẵn từ trước, chứ không phải code đôi khi đúng."
      ]
    },
    {
      "id": "9-3",
      "concept": "N+1 query",
      "type": "skeleton",
      "title": "Điền JOIN FETCH cho API chi tiết đơn hàng",
      "prompt": "Ticket từ QA ghi rõ: trang chi tiết 1 đơn chạy 12 query dù chỉ cần đơn và items của nó. Repository đã có khung query nhưng thiếu phần tải items. Hãy điền phần còn thiếu sao cho chỉ còn 1 query.",
      "code": "public interface OrderRepository extends JpaRepository<Order, Long> {\n    @Query(\"SELECT o FROM Order o // TODO: tải kèm items trong cùng 1 query\")\n    Order findWithItems(Long id);\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai (để nguyên query không JOIN FETCH, hoặc chỉ thêm JOIN mà không FETCH): log vẫn hiện 1 SELECT lấy order rồi thêm 1 SELECT lấy items khi truy cập, tổng 2 query cho 1 đơn, và lỗi N+1 quay lại ngay khi chuyển sang danh sách nhiều đơn.",
      "checks": [
        "Điền đúng mệnh đề JOIN FETCH items vào query",
        "Chọn đáp án đúng về số query sau sửa: 1 query cho 1 đơn kèm items"
      ],
      "solution": "@Query(\"SELECT o FROM Order o LEFT JOIN FETCH o.items WHERE o.id = :id\")\nOrder findWithItems(@Param(\"id\") Long id);\n// LEFT JOIN FETCH để đơn không có item vẫn trả về, và items được tải cùng 1 query.",
      "why": "Vì JOIN FETCH báo cho Hibernate tải items ngay trong cùng query lấy order. JOIN thường không đủ, vì nó chỉ lọc chứ không tải collection vào bộ nhớ. Không điền đúng thì lazy lại gây thêm query ở lần truy cập đầu tiên.",
      "hints": [
        "JOIN thường chỉ dùng để lọc, muốn tải kèm collection phải có thêm từ khóa nào?",
        "Đơn không có item vẫn phải trả về, nên không dùng INNER JOIN ở đây."
      ]
    },
    {
      "id": "9-4",
      "concept": "Transaction boundary",
      "type": "fix-bug",
      "title": "Sửa transaction nuốt exception khiến đơn lưu nửa vời",
      "prompt": "Incident lúc nửa đêm: nhiều đơn có order nhưng mất items, kho thì đã trừ một phần. Senior nghi ngờ đoạn service tạo đơn dưới đây. Hãy tìm vì sao transaction không rollback dù bước lưu items đã lỗi.",
      "code": "@Transactional\npublic void createOrder(OrderRequest req) {\n    Order order = orderRepo.save(new Order(req.userId()));\n    try {\n        itemRepo.saveAll(toItems(order, req));\n        stockService.decrease(req);\n    } catch (Exception e) {\n        log.warn(\"Lỗi khi lưu items/kho: {}\", e.getMessage());\n    }\n}",
      "language": "java",
      "failingEvidence": "Log: bước lưu items ném DataIntegrityViolationException, log chỉ ghi WARN rồi method kết thúc bình thường. Kết quả trong DB: order đã commit, items không có, kho trừ dở dang. Không có dòng rollback nào trong log transaction.",
      "checks": [
        "Chọn đúng dòng gây lỗi: khối catch nuốt exception mà không ném lại, khiến transaction tưởng thành công và commit",
        "Chọn diff đúng: ném lại exception (hoặc đánh dấu rollback) thay vì chỉ log WARN"
      ],
      "solution": "@Transactional\npublic void createOrder(OrderRequest req) {\n    Order order = orderRepo.save(new Order(req.userId()));\n    itemRepo.saveAll(toItems(order, req));\n    stockService.decrease(req);\n}\n// Nếu bắt buộc phải catch để ghi log, thì catch xong phải throw lại:\n// catch (Exception e) { log.error(\"...\", e); throw e; }\n// Lưu ý: @Transactional mặc định chỉ rollback với unchecked exception.",
      "why": "Vì Spring chỉ rollback khi exception thoát ra khỏi method có @Transactional. Nuốt exception trong catch thì method kết thúc bình thường nên transaction commit, dữ liệu lưu nửa vời. Không sửa thì mỗi lần bước sau lỗi, hệ thống lại sinh một đơn rác không ai phát hiện ngay.",
      "hints": [
        "Transaction rollback khi nào: khi exception thoát ra khỏi method, hay khi exception chỉ được log?",
        "Nếu vẫn muốn giữ log thì sau khi log phải làm gì với exception đó?"
      ]
    },
    {
      "id": "9-5",
      "concept": "Lưu cha trước, con sau",
      "type": "terminal",
      "title": "Đếm query từ log Hibernate và sửa thứ tự lưu",
      "prompt": "Bạn nhận được một phiên terminal của đồng nghiệp đang bật show_sql để điều tra đơn hàng lưu sai khóa ngoại. Hãy đọc log, đếm số query, rồi chỉ ra thứ tự lưu đúng: cha trước hay con trước, và backend phải tự tính lại giá trị nào.",
      "code": "$ ./gradlew bootRun -Dspring.jpa.show-sql=true\n# (xem output ở failingEvidence: log query thật của phiên này)",
      "language": "bash",
      "failingEvidence": "Hibernate: insert into order_items (order_id, product_id, qty) values (?, ?, ?)\nERROR: insert or update on table \"order_items\" violates foreign key constraint \"fk_item_order\"\nHibernate: select nextval('order_seq')\nLog cho thấy code lưu items trước khi order có id, nên order_id là null hoặc id chưa tồn tại, vi phạm khóa ngoại.",
      "checks": [
        "Chọn đúng thứ tự: lưu order trước để lấy id, rồi mới lưu items gắn order_id đó",
        "Chọn đúng giá trị backend phải tự tính lại: tổng tiền đơn, không tin tổng tiền frontend gửi"
      ],
      "solution": "@Transactional\npublic Order createOrder(OrderRequest req) {\n    Order order = orderRepo.save(new Order(req.userId()));\n    List<Item> items = toItems(order, req);\n    itemRepo.saveAll(items);\n    order.setTotal(items.stream()\n        .map(i -> i.getPrice().multiply(BigDecimal.valueOf(i.getQty())))\n        .reduce(BigDecimal.ZERO, BigDecimal::add));\n    return orderRepo.save(order);\n}\n// Thứ tự: cha (order) trước lấy id, con (items) sau gắn FK, tổng tiền do backend tính lại.",
      "why": "Vì items mang khóa ngoại tới order nên order phải tồn tại và có id trước. Lưu ngược thứ tự thì vi phạm FK ngay. Backend tự tính tổng tiền vì frontend gửi tổng tiền là tin được sửa bằng DevTools, còn giá và số lượng trong DB mới là căn cứ tính.",
      "hints": [
        "Dòng log nào chạy trước: insert items hay lấy id của order?",
        "Giá trị nào user có thể sửa bằng DevTools trước khi gửi request?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "./gradlew bootRun -Dspring.jpa.show-sql=true",
            "output": "Hibernate: insert into order_items (order_id, product_id, qty) values (?, ?, ?)\nERROR: insert or update on table \"order_items\" violates foreign key constraint \"fk_item_order\"\nHibernate: select nextval('order_seq')"
          },
          {
            "cmd": "grep -c \"Hibernate: select\" app.log",
            "output": "101"
          }
        ]
      }
    }
  ],
  "10":   [
    {
      "id": "10-1",
      "concept": "Embedding vs referencing",
      "type": "decision",
      "title": "Nhúng hay tách lịch sử chat: chọn model không vỡ ở 16MB",
      "prompt": "Product yêu cầu lưu lịch sử chat của user trong MongoDB, mỗi user có thể chat hàng nghìn tin nhắn và lịch sử tăng mãi không dừng. Hai phương án dưới đây đang được tranh luận. Hãy chọn một và biện minh bằng giới hạn document và nhu cầu đọc.",
      "code": "// Phương án A: nhúng toàn bộ vào user\n{ \"_id\": \"u1\", \"name\": \"An\", \"messages\": [ { \"text\": \"...\", \"at\": \"...\" } ] }\n// Phương án B: tách collection messages, mỗi message mang userId\n// users: { \"_id\": \"u1\", \"name\": \"An\" }\n// messages: { \"_id\": \"...\", \"userId\": \"u1\", \"text\": \"...\", \"at\": \"...\" }",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai (nhúng mảng tăng vô hạn): document user phình dần tới giới hạn 16MB của MongoDB, lúc đó ghi message mới thất bại, và mỗi lần đọc hồ sơ user đều phải tải cả nghìn tin nhắn dù chỉ cần tên. Sửa sau thì phải migrate toàn bộ lịch sử sang collection riêng.",
      "checks": [
        "Chọn đúng phương án B (tách collection) cho dữ liệu tăng không giới hạn",
        "Chọn đúng lý do: mảng tăng vô hạn chạm giới hạn 16MB và đọc hồ sơ bị kéo theo toàn bộ lịch sử"
      ],
      "solution": "Chọn phương án B: tách messages thành collection riêng, đánh index { userId: 1, at: -1 } để đọc theo trang mới nhất trước. Nhúng chỉ hợp khi dữ liệu con luôn đi kèm cha, số lượng nhỏ và không tăng vô hạn, ví dụ items của một đơn hàng đã chốt.",
      "why": "Vì document MongoDB có giới hạn 16MB và là đơn vị đọc/ghi nguyên khối. Nhúng mảng vô hạn thì sớm muộn cũng chạm trần và làm mọi lần đọc cha đều nặng. Tách ra thì đọc hồ sơ nhẹ, đọc lịch sử phân trang được, và thống kê message không cần unwind mảng.",
      "hints": [
        "Dữ liệu con này có dừng tăng ở một con số nhỏ không, hay tăng mãi theo thời gian?",
        "Đọc hồ sơ user có cần toàn bộ lịch sử chat không?"
      ]
    },
    {
      "id": "10-2",
      "concept": "Kỷ luật schema trong document",
      "type": "fix-bug",
      "title": "Sửa seed script fallback lặng lẽ sang DB sai",
      "prompt": "Bạn mở seed script của team và thấy dữ liệu seed xong mà app vẫn báo trống. Log seed ghi \"0 added, 0 updated\" ở lần chạy đầu tiên. Hãy tìm dòng gây lỗi và sửa sao cho script chết rõ ràng thay vì ghi nhầm DB.",
      "code": "import os\nfrom pymongo import MongoClient\nDB_NAME = os.environ.get(\"MONGODB_DATABASE\", \"master_jp\")\nclient = MongoClient(os.environ[\"MONGODB_URI\"])\ndb = client[DB_NAME]\nprint(f\"Seeding into database: {DB_NAME}\")",
      "language": "bash",
      "failingEvidence": "Log: Seeding into database: master_jp — nhưng backend đọc database masterjp. Kết quả: seed báo thành công, app đọc DB khác nên hiện 0 dữ liệu. Dấu hiệu \"0 added, 0 updated\" ở lần chạy đầu là bằng chứng dữ liệu đã đi nhầm chỗ, không phải dữ liệu thật đã đủ.",
      "checks": [
        "Chọn đúng dòng gây lỗi: giá trị mặc định lặng lẽ \"master_jp\" khi biến môi trường thiếu",
        "Chọn diff đúng: fail-fast khi thiếu MONGODB_DATABASE, và tên DB lấy từ một nguồn sự thật chung với backend"
      ],
      "solution": "import os, sys\nfrom pymongo import MongoClient\nDB_NAME = os.environ.get(\"MONGODB_DATABASE\")\nif not DB_NAME:\n    sys.exit(\"MONGODB_DATABASE chưa được đặt, dừng seed để tránh ghi nhầm DB\")\nclient = MongoClient(os.environ[\"MONGODB_URI\"])\ndb = client[DB_NAME]\nprint(f\"Seeding into database: {DB_NAME}\")",
      "why": "Vì fallback lặng lẽ biến lỗi cấu hình thành dữ liệu sai DB mà không ai báo động. Fail-fast bắt lỗi ngay lúc chạy, và một nguồn sự thật cho tên DB ngăn backend và script lệch nhau. Không sửa thì mỗi lần mở terminal mới mất biến môi trường là seed lại đi nhầm DB.",
      "hints": [
        "Biến môi trường thiếu thì script đang làm gì: dừng lại hay tự chọn một giá trị?",
        "Backend đọc tên DB nào, và script có chắc đang dùng đúng tên đó không?"
      ]
    },
    {
      "id": "10-3",
      "concept": "Index và aggregation",
      "type": "predict",
      "title": "Đoán explain(): query này quét collection hay dùng index",
      "prompt": "Một đồng nghiệp khoe đã tạo index cho orders nhưng query theo user vẫn chậm. Bạn được cho lệnh tạo index và query thật dưới đây. Hãy đoán explain() sẽ báo gì và vì sao index đó không cứu được query này.",
      "code": "db.orders.createIndex({ createdAt: -1 })\ndb.orders.find({ userId: \"u1\" }).sort({ createdAt: -1 }).explain(\"executionStats\")",
      "language": "bash",
      "failingEvidence": "Output thật của explain(): winningPlan.stage = \"SORT\", inputStage.stage = \"COLLSCAN\", totalDocsExamined = 1000000, totalKeysExamined = 0, nReturned = 120. Index createdAt không được dùng để lọc userId, và sort vẫn phải sort toàn bộ 1 triệu document đã quét.",
      "checks": [
        "Đoán đúng: COLLSCAN, không dùng index, vì query lọc theo userId mà index chỉ có createdAt",
        "Đoán đúng index sửa: { userId: 1, createdAt: -1 } để vừa lọc vừa sort cùng chiều"
      ],
      "solution": "Đoán đúng: COLLSCAN, totalDocsExamined 1.000.000, nReturned chỉ 120. Sửa: db.orders.createIndex({ userId: 1, createdAt: -1 }). Index này lọc đúng userId trước rồi trả kết quả đã sort theo createdAt, không cần bước SORT riêng.",
      "why": "Vì index chỉ giúp khi query dùng được cột đầu của nó. Query lọc userId nhưng index mở đầu bằng createdAt nên không lọc được gì, optimizer bỏ qua index và quét cả collection. Thứ tự cột trong composite index quyết định query nào được hưởng lợi.",
      "hints": [
        "Query lọc theo cột nào đầu tiên, và cột đầu tiên của index là cột nào?",
        "Nếu index đúng thì totalDocsExamined sẽ gần với nReturned, không phải 1 triệu."
      ]
    },
    {
      "id": "10-4",
      "concept": "Index và aggregation",
      "type": "skeleton",
      "title": "Điền aggregation thống kê doanh thu theo tháng",
      "prompt": "Báo cáo yêu cầu thống kê doanh thu theo tháng, nhưng code hiện tại kéo toàn bộ orders về ứng dụng rồi cộng bằng tay, vừa chậm vừa tốn bộ nhớ. Pipeline aggregation đã có khung, hãy điền 2 stage còn thiếu.",
      "code": "db.orders.aggregate([\n  { $match: { status: \"PAID\" } },\n  // TODO: gom theo tháng từ createdAt, tính tổng total\n  // TODO: sắp xếp theo tháng tăng dần\n])",
      "language": "bash",
      "failingEvidence": "Nếu điền sai (kéo hết về code rồi tính, hoặc group sai key tháng): báo cáo vẫn chạy nhưng tốn bộ nhớ theo số đơn, và khi đơn tăng gấp đôi thì báo cáo chậm gấp đôi. Nếu group theo ngày thay vì tháng thì báo cáo ra hàng nghìn dòng thay vì 12 dòng mỗi năm.",
      "checks": [
        "Điền đúng stage $group với key tháng từ createdAt và tổng doanh thu bằng $sum",
        "Điền đúng stage $sort theo tháng tăng dần"
      ],
      "solution": "db.orders.aggregate([\n  { $match: { status: \"PAID\" } },\n  { $group: { _id: { year: { $year: \"$createdAt\" }, month: { $month: \"$createdAt\" } },\n              revenue: { $sum: \"$total\" }, count: { $sum: 1 } } },\n  { $sort: { \"_id.year\": 1, \"_id.month\": 1 } }\n])",
      "why": "Vì aggregation tính ngay trong database, chỉ trả về một dòng mỗi tháng thay vì kéo hàng triệu document về ứng dụng. Gom đúng key tháng và sort đúng chiều thì báo cáo ra đúng 12 dòng mỗi năm, không tốn bộ nhớ ứng dụng.",
      "hints": [
        "Stage nào gom nhiều document thành một dòng theo key?",
        "Muốn báo cáo theo tháng thì key gom phải lấy phần tháng từ createdAt, không phải toàn bộ thời gian."
      ]
    },
    {
      "id": "10-5",
      "concept": "Giới hạn của MongoDB",
      "type": "terminal",
      "title": "Dùng mongosh kiểm chứng: tách model thay vì join khắp nơi",
      "prompt": "Bạn đang review một thiết kế MongoDB kiểu SQL: tách nhỏ rồi $lookup khắp nơi. Phiên terminal dưới đây cho thấy hậu quả. Hãy đọc output, kết luận vì sao không nên thiết kế MongoDB như SQL, và chọn lại model cho đơn hàng.",
      "code": "$ mongosh shop --eval 'db.orders.aggregate([{ $lookup: { from: \"order_items\", localField: \"_id\", foreignField: \"orderId\", as: \"items\" } }]).toArray().length'\n# (xem output ở failingEvidence)",
      "language": "bash",
      "failingEvidence": "Output: truy vấn $lookup trên 100.000 đơn chạy hơn 8 giây và trả về document phình to vì mỗi đơn kèm mảng items, trong khi đọc 1 đơn theo kiểu nhúng items chỉ cần 1 lần đọc document và trả về trong vài mili-giây. Transaction đa document cũng yêu cầu replica set và không rẻ như transaction SQL.",
      "checks": [
        "Chọn đúng kết luận: document là đơn vị nhất quán chính của MongoDB, nên items của đơn đã chốt thì nhúng, không tách rồi lookup",
        "Chọn đúng trường hợp vẫn nên tách: dữ liệu con dùng độc lập hoặc tăng vô hạn"
      ],
      "solution": "Model lại: orders nhúng items (mỗi item có productId, qty, price snapshot) vì items luôn đi kèm đơn và số lượng hữu hạn. Chỉ tách khi item được dùng độc lập (thống kê sản phẩm bán chạy thì query collection riêng) hoặc tăng vô hạn. Không thiết kế kiểu tách nhỏ rồi trông chờ $lookup và transaction đa document cứu.",
      "why": "Vì $lookup đắt và hạn chế hơn join SQL, transaction đa document không phải mặc định rẻ. Thiết kế sai thì phải bù bằng code phức tạp ở mọi nơi đọc. Nhúng đúng chỗ thì đọc 1 đơn là 1 lần đọc document, nhanh và đơn giản.",
      "hints": [
        "Items của đơn đã chốt có bao giờ được đọc mà không cần đơn không?",
        "So sánh số lần đọc: nhúng là mấy lần, tách rồi lookup là mấy lần?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "mongosh shop --eval 'db.orders.countDocuments()'",
            "output": "100000"
          },
          {
            "cmd": "mongosh shop --eval 'db.orders.createIndex({ userId: 1, createdAt: -1 })'",
            "output": "userId_1_createdAt_-1"
          },
          {
            "cmd": "mongosh shop --eval 'db.orders.find({ userId: \"u1\" }).sort({ createdAt: -1 }).explain(\"executionStats\").executionStats.totalDocsExamined'",
            "output": "120"
          }
        ]
      }
    }
  ],
  "11":   [
    {
      "id": "11-1",
      "concept": "Flyway/Liquibase",
      "type": "fix-bug",
      "title": "Sửa migration đã chạy bị sửa tay gây lỗi checksum",
      "prompt": "Deploy sáng nay chết ở bước migration, log báo checksum mismatch ở V1. Một đồng nghiệp thú nhận đã sửa file V1 sau khi nó chạy ở staging để thêm cột. Hãy tìm vì sao không được sửa file đã chạy và viết cách sửa đúng.",
      "code": "-- V1__create_orders.sql (bản gốc đã chạy ở staging)\nCREATE TABLE orders (id BIGINT PRIMARY KEY, total NUMERIC NOT NULL);\n-- Bản bị sửa tay sau đó, thêm 1 dòng:\n-- ALTER TABLE orders ADD COLUMN discount_code VARCHAR(20);",
      "language": "sql",
      "failingEvidence": "Log Flyway: ERROR: Migration checksum mismatch for migration version 1. Applied to database: checksum A, resolved locally: checksum B. Deploy dừng, không chạy migration mới nào, và dev/staging/prod bắt đầu lệch schema vì mỗi môi trường chạy một bản V1 khác nhau.",
      "checks": [
        "Chọn đúng nguyên tắc: migration đã chạy thì không sửa, lỗi phải sửa bằng migration mới",
        "Chọn đúng file sửa: V2__add_discount_code.sql thay vì sửa V1"
      ],
      "solution": "-- Giữ nguyên V1__create_orders.sql, không đụng vào nữa.\n-- V2__add_discount_code.sql (migration mới):\nALTER TABLE orders ADD COLUMN discount_code VARCHAR(20);",
      "why": "Vì Flyway ghi checksum của file đã chạy, sửa file là đổi checksum nên mọi môi trường đã chạy file cũ đều báo mismatch và deploy tắc. Sửa bằng migration mới thì thứ tự V1 rồi V2 chạy giống nhau ở mọi môi trường, schema không còn lệch.",
      "hints": [
        "Checksum mismatch nghĩa là file trên máy khác với file đã chạy trong DB, vậy nên sửa file hay thêm file?",
        "Migration mới mang version nào để chạy sau V1?"
      ]
    },
    {
      "id": "11-2",
      "concept": "Migration backward compatible",
      "type": "skeleton",
      "title": "Điền migration thêm cột bắt buộc theo 3 bước",
      "prompt": "Bảng orders đang có 1 triệu dòng, product yêu cầu thêm cột discount_code bắt buộc, mặc định \"NONE\". Một đồng nghiệp viết sẵn khung 3 bước nhưng bỏ trống nội dung từng bước. Hãy điền sao cho deploy không sập và rollback code vẫn được.",
      "code": "-- Bước 1: // TODO: thêm cột ở dạng nào để code cũ vẫn chạy?\n-- Bước 2: // TODO: đưa dữ liệu cũ về giá trị mặc định ra sao để không khóa bảng?\n-- Bước 3: // TODO: khi nào mới được siết NOT NULL?",
      "language": "sql",
      "failingEvidence": "Nếu điền sai (bước 1 thêm thẳng NOT NULL không có default): migration chết ngay vì 1 triệu dòng cũ không có giá trị, deploy sập giữa chừng. Nếu backfill 1 lần cả triệu dòng: bảng bị khóa lâu, request đang chạy timeout hàng loạt.",
      "checks": [
        "Điền đúng bước 1: thêm cột nullable (hoặc có default) để code cũ vẫn đọc được",
        "Điền đúng bước 2: backfill theo lô, bước 3: siết NOT NULL sau khi backfill xong và code mới đã deploy"
      ],
      "solution": "-- Bước 1: ALTER TABLE orders ADD COLUMN discount_code VARCHAR(20);\n-- Bước 2: backfill theo lô, ví dụ mỗi lô 10.000 dòng:\n-- UPDATE orders SET discount_code = 'NONE' WHERE discount_code IS NULL AND id BETWEEN ... ;\n-- Bước 3 (sau khi code mới deploy và backfill xong):\n-- ALTER TABLE orders ALTER COLUMN discount_code SET NOT NULL;",
      "why": "Vì deploy an toàn đòi hỏi schema mới phải đọc được bởi code cũ trong lúc chuyển đổi. Thêm nullable trước, backfill sau, siết NOT NULL cuối cùng thì không bước nào làm code đang chạy sập. Rollback code cũng khả thi vì code mới vẫn đọc được schema cũ nullable.",
      "hints": [
        "Cột bắt buộc mà thêm thẳng vào bảng đã có dữ liệu thì dữ liệu cũ lấy giá trị ở đâu?",
        "Backfill cả triệu dòng một lần có khóa bảng không, chia nhỏ thì sao?"
      ]
    },
    {
      "id": "11-3",
      "concept": "Persistence contract",
      "type": "decision",
      "title": "Giỏ hàng lưu ở đâu: local-only hay server ngay khi thao tác",
      "prompt": "Trong buổi thiết kế, team tranh luận về giỏ hàng: một bên muốn lưu localStorage cho nhanh, một bên muốn gọi API server ngay mỗi lần thêm/xóa. Bạn được cho 2 phương án dưới đây. Hãy chọn một và biện minh bằng hành vi khi đổi thiết bị và khi mất mạng.",
      "code": "// Phương án A: local-only\nlocalStorage.setItem(\"cart\", JSON.stringify(items));\n// Phương án B: server-persisted\n// POST /cart/items ngay khi thêm, GET /cart khi mở app,\n// đổi thiết bị vẫn thấy giỏ vì dữ liệu ở server.",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai (local-only không lý do): user thêm giỏ trên điện thoại, mở laptop thì giỏ trống, tưởng app lỗi và bỏ đơn. Xóa cache trình duyệt cũng mất giỏ. Backend đã có đủ API cart nhưng không ai gọi, lỗi chỉ lộ khi đổi thiết bị, không lộ khi test trên một máy.",
      "checks": [
        "Chọn đúng phương án B (server-persisted, sync ngay khi thao tác) cho giỏ hàng",
        "Chọn đúng lý do: đổi thiết bị vẫn thấy giỏ, và local-only phải có lý do ghi rõ mới được phép"
      ],
      "solution": "Chọn phương án B: mỗi thao tác thêm/xóa/sửa số lượng gọi API server ngay, mở app thì GET /cart. Local-only chỉ chấp nhận khi ghi rõ lý do, ví dụ giỏ ẩn danh chưa login, và phải merge vào server ngay khi login. Contract phải ghi đủ: entity Cart/CartItem, API đọc GET /cart, API ghi POST /cart/items, thời điểm sync, hành vi khi mất mạng (báo rõ chưa lưu, không im lặng mất dữ liệu).",
      "why": "Vì giỏ hàng là dữ liệu người dùng, mất là mất đơn. Server-persisted thì đổi thiết bị vẫn thấy, còn local-only thì dữ liệu sống chết theo một trình duyệt. Không ghi persistence contract trong spec thì frontend sẽ tự chọn localStorage cho tiện, đúng như bài học giỏ hàng của dự án.",
      "hints": [
        "User đổi thiết bị thì giỏ ở phương án nào còn, phương án nào mất?",
        "Trường hợp nào local-only mới chấp nhận được, và phải làm gì khi user login?"
      ]
    },
    {
      "id": "11-4",
      "concept": "Bài học giỏ hàng",
      "type": "predict",
      "title": "Đoán hành vi giỏ hàng chỉ merge một lần lúc login",
      "prompt": "Bạn đọc code frontend của một shop: lúc login nó merge giỏ local lên server một lần, sau đó mọi thao tác thêm/xóa chỉ ghi localStorage. Một tester báo lỗi lạ: giỏ trên máy tính và điện thoại khác nhau. Hãy đoán chuỗi sự kiện nào gây ra lỗi này và vì sao test trên một máy không thấy.",
      "code": "// Lúc login: merge 1 lần\nawait api.post(\"/cart/merge\", { items: localCart });\nlocalStorage.setItem(\"cart\", JSON.stringify(localCart));\n// Sau login: mọi thao tác chỉ ghi local\nfunction addToCart(item) {\n  const cart = JSON.parse(localStorage.getItem(\"cart\"));\n  cart.push(item);\n  localStorage.setItem(\"cart\", JSON.stringify(cart));\n}",
      "language": "java",
      "failingEvidence": "Output thật theo kịch bản: user login trên laptop, thêm 2 món, mở điện thoại thì giỏ điện thoại vẫn là giỏ lúc login, thiếu 2 món mới. Đổi lại trên điện thoại thêm 1 món, laptop cũng không thấy. Hai thiết bị lệch nhau từ sau lần merge đầu tiên và không bao giờ đồng bộ lại.",
      "checks": [
        "Đoán đúng: sau lần merge đầu, hai thiết bị lệch nhau vì thao tác mới chỉ ghi local, không lên server",
        "Đoán đúng vì sao test một máy không thấy: một máy thì local luôn đúng, lỗi chỉ lộ khi đổi thiết bị"
      ],
      "solution": "Đoán đúng: giỏ lệch nhau vĩnh viễn sau lần merge đầu tiên. Sửa: sau login, mọi thao tác phải gọi API server ngay (POST /cart/items), không chỉ merge một lần. Mở app thì GET /cart từ server làm nguồn sự thật, local chỉ là bộ nhớ đệm hiển thị tạm khi mất mạng và phải báo rõ trạng thái chưa đồng bộ.",
      "why": "Vì merge một lần chỉ đồng bộ đúng thời điểm login, mọi thay đổi sau đó không còn đường lên server. Nguồn sự thật phải là server và mọi thao tác phải ghi lên đó ngay, nếu không mỗi thiết bị thành một giỏ riêng.",
      "hints": [
        "Sau lúc login, thao tác thêm món có lên server không?",
        "Test trên một máy thì local và server có bao giờ lệch nhau không?"
      ]
    },
    {
      "id": "11-5",
      "concept": "Flyway/Liquibase",
      "type": "terminal",
      "title": "Đọc log flyway validate và quyết định deploy tiếp hay dừng",
      "prompt": "Trước giờ deploy, bạn chạy validate và migrate ở staging. Phiên terminal dưới đây là toàn bộ bằng chứng bạn có. Hãy đọc log và quyết định: deploy tiếp được không, hay phải dừng để sửa gì trước.",
      "code": "$ flyway validate\n$ flyway migrate\n# (xem output ở failingEvidence)",
      "language": "bash",
      "failingEvidence": "flyway validate: ERROR: Migration checksum mismatch for migration version 1. Applied checksum: 1234567, resolved checksum: 7654321. flyway migrate: không chạy thêm migration nào, dừng ngay. Bảng flyway_schema_history ghi V1 đã applied, còn file V1 trên máy đã khác với lúc chạy.",
      "checks": [
        "Chọn đúng quyết định: dừng deploy, không sửa tay DB production để ép qua",
        "Chọn đúng cách sửa: khôi phục V1 gốc hoặc tạo migration mới V2, rồi validate lại trước khi migrate"
      ],
      "solution": "Dừng deploy. Cách sửa: khôi phục file V1 về đúng nội dung đã chạy ở staging (checksum khớp lại), hoặc nếu thay đổi là thật sự cần thì để nguyên V1 và thêm V2 mới cho thay đổi đó. Chạy lại flyway validate cho tới khi sạch, rồi mới flyway migrate. Không bao giờ sửa tay bảng flyway_schema_history hay schema production để ép deploy chạy tiếp.",
      "why": "Vì checksum mismatch là tín hiệu schema các môi trường đã lệch nhau. Ép qua bằng sửa tay thì production mang schema không ai tái hiện được, deploy sau càng lệch. Khôi phục file gốc hoặc thêm migration mới giữ mọi môi trường chạy cùng một lịch sử migration.",
      "hints": [
        "Validate báo lỗi ở migration nào, và file đó đã chạy ở đâu rồi?",
        "Sửa tay DB để ép qua thì lần deploy sau còn biết schema thật là gì không?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "flyway validate",
            "output": "ERROR: Migration checksum mismatch for migration version 1. Applied checksum: 1234567, resolved checksum: 7654321."
          },
          {
            "cmd": "flyway info",
            "output": "+-----------+---------+---------------------+----------+| Version | State   | Description         | Applied  |\n| 1         | Success | create orders       | 2026-10-01 |\n| 2         | Pending | add discount code   |          |"
          }
        ]
      }
    }
  ],
  "12":   [
    {
      "id": "12-1",
      "concept": "TTL và eviction",
      "type": "fix-bug",
      "title": "Sửa cache key thiếu tham số khiến user A thấy dữ liệu user B",
      "prompt": "Ticket bảo mật báo: user A mở trang đơn hàng của mình thì thấy đơn của user B. Senior khoanh vùng vào đoạn cache dưới đây. Hãy tìm lỗi trong key và sửa sao cho mỗi user chỉ thấy dữ liệu của mình.",
      "code": "@Cacheable(\"orders\")\npublic List<Order> getOrders(Long userId, String status) {\n    return orderRepo.findByUserIdAndStatus(userId, status);\n}",
      "language": "java",
      "failingEvidence": "Log: user B gọi getOrders(2, \"PAID\") sau khi user A đã gọi getOrders(1, \"PAID\"), kết quả trả về là danh sách của user A vì key cache mặc định không phân biệt userId và status. Test: 2 user khác nhau, cùng status, nhận cùng một danh sách.",
      "checks": [
        "Chọn đúng dòng gây lỗi: key cache không chứa userId (và status) nên mọi user dùng chung một entry",
        "Chọn diff đúng: key gồm userId và status, ví dụ key = userId + \":\" + status"
      ],
      "solution": "@Cacheable(value = \"orders\", key = \"#userId + ':' + #status\")\npublic List<Order> getOrders(Long userId, String status) {\n    return orderRepo.findByUserIdAndStatus(userId, status);\n}\n// Hoặc tự quản lý key: \"orders:\" + userId + \":\" + status.",
      "why": "Vì key cache là danh tính của entry, thiếu tham số nào thì các request khác nhau ở tham số đó sẽ dùng chung entry. Đây là lỗi rò rỉ dữ liệu giữa các user, không chỉ là dữ liệu cũ. Không sửa thì user nào vào trước sẽ định đoạt dữ liệu user vào sau thấy.",
      "hints": [
        "Key cache hiện tại phân biệt được 2 user khác nhau không?",
        "Những tham số nào làm kết quả khác nhau thì phải có mặt trong key."
      ]
    },
    {
      "id": "12-2",
      "concept": "Cache stampede",
      "type": "predict",
      "title": "Đoán chuyện gì xảy ra khi cache sản phẩm hot hết hạn cùng lúc",
      "prompt": "Trang chủ có một sản phẩm hot được cache với TTL đúng 10 phút cho mọi key, không jitter, không lock. Lúc 10:00 cache hết hạn, đúng lúc có 1000 request đang chờ sản phẩm đó. Hãy đoán DB sẽ nhận bao nhiêu request và vì sao traffic không tăng mà DB vẫn quá tải.",
      "code": "// Cache-aside, TTL cố định 600 giây cho mọi key, không jitter, không lock\nString key = \"product:hot\";\nString value = redis.get(key);\nif (value == null) {\n    value = db.findProduct(\"hot\");\n    redis.setex(key, 600, value);\n}",
      "language": "java",
      "failingEvidence": "Output thật từ metric: đúng thời điểm hết hạn, DB nhận 1000 query giống nhau trong cùng một giây, connection chờ tăng vọt, p99 tăng từ 200ms lên 5 giây. Sau khi 1 request ghi lại cache thì các request còn lại mới hết xuyên qua, nhưng DB đã quá tải xong.",
      "checks": [
        "Đoán đúng: cả 1000 request cùng miss và cùng đổ về DB, gây stampede",
        "Đoán đúng biện pháp giảm: jitter TTL, lock chỉ 1 request làm mới, hoặc làm mới sớm trước khi hết hạn"
      ],
      "solution": "Đoán đúng: 1000 query dồn về DB cùng lúc. Sửa bằng một trong ba cách: jitter TTL (mỗi key hết hạn lệch nhau vài chục giây), lock để chỉ 1 request làm mới cache còn lại chờ, hoặc làm mới sớm trước khi hết hạn. Kết hợp jitter và lock là chắc nhất cho key hot.",
      "why": "Vì TTL giống nhau làm mọi key hết hạn cùng một thời điểm, và cache-aside không có cơ chế chặn các request cùng miss. DB không chết vì traffic tăng mà chết vì 1000 request giống nhau dồn vào một giây. Không sửa thì cứ mỗi chu kỳ TTL là DB lại bị đánh một lần.",
      "hints": [
        "1000 request cùng miss thì mỗi request làm gì tiếp theo?",
        "Làm sao để chỉ 1 request làm mới cache, còn lại chờ cache mới?"
      ]
    },
    {
      "id": "12-3",
      "concept": "Cache-aside, write-through, write-behind",
      "type": "skeleton",
      "title": "Điền cache-aside có invalidate khi giá đổi",
      "prompt": "Giá sản phẩm đổi vài lần mỗi ngày nhưng trang vẫn hiện giá cũ cả ngày vì cache không bao giờ bị xóa. Khung code dưới đây đã có đọc cache, còn thiếu phần ghi và invalidate. Hãy điền sao cho giá đổi là trang đổi theo.",
      "code": "public Product getProduct(Long id) {\n    String key = \"product:\" + id;\n    Product cached = redis.get(key);\n    if (cached != null) return cached;\n    Product p = db.findById(id);\n    redis.setex(key, 600, p);\n    return p;\n}\npublic void updatePrice(Long id, BigDecimal price) {\n    db.updatePrice(id, price);\n    // TODO: làm gì với cache của sản phẩm này?\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai (không làm gì với cache, hoặc chỉ ghi cache mà không xóa): sau khi đổi giá, getProduct vẫn hit cache cũ tới 10 phút, test kiểm tra giá mới thất bại dù DB đã đúng. Nếu chỉ chờ TTL thì giá sai tồn tại tối đa đúng bằng TTL, vẫn là dữ liệu sai với user mua trong khoảng đó.",
      "checks": [
        "Điền đúng: xóa key cache của sản phẩm đó ngay khi đổi giá (redis.del(key))",
        "Chọn đúng lý do: invalidate lúc ghi thì lần đọc sau miss và tải giá mới từ DB"
      ],
      "solution": "public void updatePrice(Long id, BigDecimal price) {\n    db.updatePrice(id, price);\n    redis.del(\"product:\" + id);\n}\n// Lần đọc sau sẽ miss cache, đọc DB và ghi lại cache với giá mới.",
      "why": "Vì cache-aside thì ứng dụng chịu trách nhiệm giữ cache khớp với DB. Đổi DB mà không xóa cache là để lại dữ liệu cũ cho tới khi TTL hết, mà TTL càng dài thì giá sai càng lâu. Xóa ngay lúc ghi thì lần đọc sau luôn thấy giá mới.",
      "hints": [
        "Sau khi DB đổi, cache cũ còn đúng không, và ai phải chịu trách nhiệm dọn nó?",
        "Lần đọc sau khi xóa cache sẽ đi đâu để lấy giá mới?"
      ]
    },
    {
      "id": "12-4",
      "concept": "Cache penetration",
      "type": "decision",
      "title": "Chặn quét id không tồn tại: cache rỗng hay bloom filter",
      "prompt": "Hệ thống đang bị quét bằng hàng loạt productId bịa, mỗi request xuyên qua cache xuống DB vì key không tồn tại thì không có gì để cache. Hai phương án dưới đây đang được cân nhắc. Hãy chọn một cho đợt tấn công này và biện minh bằng chi phí và TTL.",
      "code": "// Phương án A: cache cả kết quả rỗng, TTL ngắn 60 giây\n// miss -> DB không thấy -> redis.setex(key, 60, \"EMPTY\")\n// Phương án B: bloom filter chặn trước DB\n// bloom.mightContain(id) == false -> trả 404 ngay, không xuống DB",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai (không làm gì): DB nhận hàng nghìn query cho id không tồn tại mỗi phút, cache hoàn toàn vô dụng vì không có entry nào để hit. Nếu cache rỗng với TTL quá dài thì sản phẩm vừa tạo xong lại bị báo không tồn tại tới hết TTL.",
      "checks": [
        "Chọn đúng phương án A trước (cache rỗng TTL ngắn) và nêu rõ khi nào mới cần nâng lên phương án B (lượng quét cực lớn, id bịa không lặp lại)",
        "Chọn đúng cảnh báo: cache rỗng phải TTL ngắn, nếu không sản phẩm mới tạo sẽ bị báo 404 oan"
      ],
      "solution": "Chọn phương án A trước: cache cả kết quả rỗng với TTL ngắn 60 giây, lần quét lại cùng id sẽ hit cache rỗng và không xuống DB. Khi lượng quét lớn tới mức bloom filter rẻ hơn chi phí cache rỗng, hoặc id bịa là vô hạn không lặp lại, thì nâng cấp lên phương án B: bloom filter chặn key chắc chắn không tồn tại trước khi xuống DB.",
      "why": "Vì penetration xảy ra chính vì key không tồn tại nên không có gì để hit. Cache rỗng biến miss lặp lại thành hit, còn bloom filter chặn được cả id chưa từng thấy. TTL ngắn là bắt buộc vì sản phẩm có thể được tạo sau khi đã cache rỗng, lúc đó cache rỗng dài sẽ nói dối.",
      "hints": [
        "Vì sao cache bình thường không chặn được key không tồn tại?",
        "Nếu cache rỗng TTL dài thì sản phẩm mới tạo xong sẽ ra sao?"
      ]
    },
    {
      "id": "12-5",
      "concept": "Cache-aside, write-through, write-behind",
      "type": "terminal",
      "title": "Dùng redis-cli chứng minh Redis sập thì hệ thống vẫn phải chạy",
      "prompt": "Bạn đang kiểm tra fallback khi Redis sập. Phiên terminal dưới đây ghi lại đúng những gì đã chạy. Hãy đọc output và kết luận: hệ thống có được phép trả lỗi cho user chỉ vì cache sập không, và fallback đúng là gì.",
      "code": "$ redis-cli ping\n$ curl -s http://localhost:8080/products/42\n# (xem output ở failingEvidence)",
      "language": "bash",
      "failingEvidence": "redis-cli ping: Could not connect to Redis at 127.0.0.1:6379: Connection refused. curl trả về 200 với dữ liệu sản phẩm đầy đủ, kèm header X-Cache: BYPASS. Log ứng dụng: WARN Redis unavailable, falling back to DB. Hệ thống chậm hơn nhưng vẫn đúng, không trả lỗi cho user.",
      "checks": [
        "Chọn đúng kết luận: Redis sập thì fallback đọc DB trực tiếp, user vẫn thấy dữ liệu đúng chỉ chậm hơn",
        "Chọn đúng điều cấm: không trả dữ liệu giả, không trả lỗi chỉ vì cache sập"
      ],
      "solution": "Fallback đúng: catch lỗi Redis, đọc thẳng DB, trả dữ liệu thật, ghi log WARN và metric redis_down để cảnh báo. Không được trả lỗi 500 cho user chỉ vì cache sập, và không được trả dữ liệu cũ kèm vẻ ngoài như dữ liệu mới. Cache là tầng tăng tốc, không phải nguồn sự thật.",
      "why": "Vì Redis chỉ là cache, DB mới là nguồn sự thật. Thiết kế đúng thì mất cache chỉ mất tốc độ, không mất tính năng. Trả lỗi khi cache sập là biến tầng tăng tốc thành điểm chết duy nhất của hệ thống.",
      "hints": [
        "Cache sập thì dữ liệu thật còn ở đâu?",
        "User phân biệt được dữ liệu chậm hơn với dữ liệu sai không?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "redis-cli ping",
            "output": "Could not connect to Redis at 127.0.0.1:6379: Connection refused"
          },
          {
            "cmd": "redis-cli --scan --pattern \"product:*\" | head",
            "output": "(empty - Redis chưa chạy, không có key nào)"
          },
          {
            "cmd": "curl -s -D - http://localhost:8080/products/42 -o /dev/null",
            "output": "HTTP/1.1 200 OK\nX-Cache: BYPASS"
          }
        ]
      }
    }
  ],
  "13":   [
    {
      "id": "13-1",
      "concept": "Lost update",
      "type": "fix-bug",
      "title": "Sửa lost update khi hai request cùng trừ số dư",
      "prompt": "Ticket từ kế toán báo: số dư 100, hai request cùng trừ 30, kết quả cuối là 70 thay vì 40. Bạn được cho đoạn code trừ tiền dưới đây. Hãy tìm cơ chế gây mất một lần trừ và viết lại bằng một câu UPDATE có điều kiện.",
      "code": "public void withdraw(Long walletId, BigDecimal amount) {\n    Wallet w = walletRepo.findById(walletId);\n    BigDecimal next = w.getBalance().subtract(amount);\n    walletRepo.save(new Wallet(walletId, next));\n}",
      "language": "java",
      "failingEvidence": "Lịch sử: T1 đọc 100, T2 đọc 100, T1 ghi 70, T2 ghi 70. Một lần trừ 30 biến mất, số dư cuối 70 thay vì 40. Test chạy tuần tự luôn pass, lỗi chỉ lộ khi hai request chạy đồng thời.",
      "checks": [
        "Chọn đúng cơ chế: đọc-sửa-ghi không nguyên tử, hai transaction cùng đọc giá trị cũ rồi ghi đè nhau",
        "Chọn diff đúng: UPDATE wallets SET balance = balance - ? WHERE id = ? AND balance >= ?, kiểm tra số dòng bị ảnh hưởng"
      ],
      "solution": "@Modifying\n@Query(\"UPDATE Wallet w SET w.balance = w.balance - :amount WHERE w.id = :id AND w.balance >= :amount\")\nint withdraw(@Param(\"id\") Long id, @Param(\"amount\") BigDecimal amount);\n// Gọi xong kiểm tra: nếu trả về 0 dòng thì báo hết số dư hoặc thử lại, không tự ghi đè.\n",
      "why": "Vì đọc rồi sửa rồi ghi là ba bước rời nhau, hai transaction xen kẽ sẽ ghi đè nhau. UPDATE có điều kiện thực hiện trừ ngay trong một câu lệnh nguyên tử ở DB, và điều kiện balance >= amount còn chặn số dư âm. Không sửa thì cứ đông user là tiền lệch đúng bằng một lần trừ.",
      "hints": [
        "Hai request cùng đọc 100 rồi cùng ghi 70 thì lần trừ nào bị mất?",
        "Câu lệnh nào trừ ngay trong DB mà không cần đọc ra trước?"
      ]
    },
    {
      "id": "13-2",
      "concept": "Optimistic lock bằng version",
      "type": "predict",
      "title": "Đoán kết quả khi hai người cùng sửa một hồ sơ",
      "prompt": "Hai nhân viên cùng mở hồ sơ khách hàng ở version 3, cùng sửa và cùng bấm lưu, cách nhau vài giây. Entity đã có @Version. Hãy đoán request thứ hai nhận được gì và hệ thống phải báo cho user ra sao.",
      "code": "@Entity\npublic class Profile {\n    @Id Long id;\n    @Version Long version;\n    String phone;\n}\n// T1 và T2 cùng đọc version = 3. T1 lưu trước, version thành 4. T2 lưu sau với version = 3.",
      "language": "java",
      "failingEvidence": "Output thật: request thứ hai ném OptimisticLockException (Hibernate: OptimisticLockException, Row was updated or deleted by another transaction). Không có dữ liệu nào bị ghi đè lặng lẽ, nhưng nếu code không bắt exception này thì user chỉ thấy lỗi 500 chung chung.",
      "checks": [
        "Đoán đúng: request thứ hai thất bại với OptimisticLockException vì version đã đổi từ 3 thành 4",
        "Đoán đúng hành vi cho user: báo xung đột và yêu cầu tải lại dữ liệu mới rồi sửa lại, không tự ghi đè"
      ],
      "solution": "Đoán đúng: T2 thất bại, không ghi đè. Xử lý đúng: bắt OptimisticLockException, trả 409 Conflict kèm thông báo \"Dữ liệu đã được người khác sửa, vui lòng tải lại rồi thử lại\". Optimistic lock hợp khi xung đột hiếm, ví dụ sửa hồ sơ; không hợp cho hotspot như vé hot vì xung đột liên tục.",
      "why": "Vì câu UPDATE của optimistic lock kèm điều kiện version chưa đổi, version đã thành 4 nên không dòng nào khớp và Hibernate báo lỗi. Cơ chế này không khóa dòng trong lúc chờ user sửa nên nhẹ, nhưng khi xung đột xảy ra thì phải báo rõ để user thử lại, không được nuốt thành lỗi chung chung.",
      "hints": [
        "Câu UPDATE của T2 kèm điều kiện version bằng mấy, trong khi DB đang là mấy?",
        "Khi xung đột hiếm thì báo cho user thử lại có chấp nhận được không?"
      ]
    },
    {
      "id": "13-3",
      "concept": "Pessimistic lock và deadlock",
      "type": "skeleton",
      "title": "Điền SELECT FOR UPDATE cho trừ tồn kho hotspot",
      "prompt": "Tồn kho sản phẩm hot bị bán quá số lượng vì nhiều request cùng đọc cùng trừ. Khung repository dưới đây đã có câu query nhưng thiếu phần khóa dòng. Hãy điền sao cho request sau phải chờ request trước trừ xong mới được đọc.",
      "code": "public interface StockRepository extends JpaRepository<Stock, Long> {\n    @Lock(LockModeType.PESSIMISTIC_WRITE)\n    @Query(\"SELECT s FROM Stock s WHERE s.productId = :id\")\n    // TODO: method này đã đủ chưa, và transaction phải bao quanh tới đâu?\n    Stock findForUpdate(@Param(\"id\") Long id);\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai (bỏ @Lock, hoặc gọi findForUpdate ngoài transaction): hai request vẫn cùng đọc 10, cùng trừ 8, cùng cho qua, bán quá tồn kho. Nếu giữ lock quá lâu (khóa rồi gọi API bên ngoài trong cùng transaction): hàng đợi khóa dài, request sau timeout hàng loạt.",
      "checks": [
        "Điền đúng: giữ @Lock PESSIMISTIC_WRITE và gọi trong một transaction bao trọn đọc-trừ-ghi",
        "Chọn đúng cảnh báo: giữ lock ngắn, không gọi API bên ngoài khi đang giữ lock"
      ],
      "solution": "@Transactional\npublic void decrease(Long productId, int qty) {\n    Stock s = stockRepo.findForUpdate(productId);\n    if (s.getQty() < qty) throw new OutOfStockException();\n    s.setQty(s.getQty() - qty);\n    stockRepo.save(s);\n}\n// findForUpdate đã có @Lock(PESSIMISTIC_WRITE) tương đương SELECT ... FOR UPDATE.\n// Lock chỉ giữ trong transaction này, không gọi API bên ngoài khi đang giữ lock.",
      "why": "Vì FOR UPDATE khóa dòng ngay từ lúc đọc, transaction khác muốn đọc để trừ phải chờ tới khi transaction đầu commit. Như vậy đọc-sửa-ghi thành chuỗi tuần tự cho đúng dòng đó, không còn bán quá. Giữ lock ngắn là bắt buộc vì mọi request khác đều xếp hàng chờ dòng này.",
      "hints": [
        "Muốn request sau chờ request trước thì phải khóa từ lúc nào: lúc đọc hay lúc ghi?",
        "Trong lúc giữ lock mà gọi API chậm bên ngoài thì các request chờ sẽ ra sao?"
      ]
    },
    {
      "id": "13-4",
      "concept": "Transaction isolation",
      "type": "decision",
      "title": "Chọn lock cho ví, ghế và lượt xem: không phải chỗ nào cũng khóa mạnh",
      "prompt": "Team đang tranh luận: có nên dùng pessimistic lock cho mọi chỗ ghi hay không. Bạn được cho ba tình huống và hai phương án lock dưới đây. Hãy chọn lock cho từng tình huống và biện minh bằng mức độ nghiêm trọng khi sai số.",
      "code": "// Phương án A: SELECT ... FOR UPDATE (khóa mạnh, chờ nhau)\n// Phương án B: không lock chính xác, tăng bằng UPDATE cộng dồn hoặc gom batch\n// Tình huống: (1) trừ tiền ví, (2) đặt ghế xem phim, (3) cập nhật lượt xem bài viết.",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai: dùng lock mạnh cho lượt xem thì mỗi lần xem bài đều xếp hàng chờ nhau, hệ thống chậm vô ích. Ngược lại, không lock cho trừ tiền ví thì hai request cùng trừ gây lost update, tiền lệch thật. Dùng optimistic cho ghế hot thì user thử lại hoài không đặt được vì xung đột liên tục.",
      "checks": [
        "Chọn đúng ví: lock mạnh hoặc UPDATE có điều kiện, vì sai là mất tiền",
        "Chọn đúng ghế: lock theo ghế trong thời gian giữ chỗ, hết thời gian thì nhả",
        "Chọn đúng lượt xem: không cần lock chính xác, sai vài lượt không sao"
      ],
      "solution": "Trừ tiền ví: lock mạnh (pessimistic hoặc UPDATE có điều kiện balance >= amount) vì sai là mất tiền. Đặt ghế: lock theo ghế trong thời gian giữ chỗ, hết thời gian thì nhả ghế cho người khác. Lượt xem: không lock chính xác, dùng UPDATE view_count = view_count + 1 hoặc gom batch, sai vài lượt không ảnh hưởng nghiệp vụ.",
      "why": "Vì chi phí của lock là chờ nhau và giảm throughput, chỉ đáng trả khi sai số gây thiệt hại thật. Tiền và ghế sai là mất tiền và mất chỗ, còn lượt xem sai vài đơn vị không ai thiệt. Chọn lock theo hậu quả của sai số, không chọn một loại cho mọi thứ.",
      "hints": [
        "Sai số ở chỗ nào thì có người mất tiền, chỗ nào thì chỉ lệch vài đơn vị?",
        "Ghế đặt rồi mà user không thanh toán thì ghế phải ra sao sau một lúc?"
      ]
    },
    {
      "id": "13-5",
      "concept": "Pessimistic lock và deadlock",
      "type": "terminal",
      "title": "Đọc hai phiên psql và nhận ra deadlock do khóa ngược thứ tự",
      "prompt": "Lúc 2 giờ sáng, on-call gửi cho bạn log của hai phiên psql đang trừ kho hai sản phẩm. Một transaction đã bị giết. Hãy đọc output, chỉ ra thứ tự khóa nào gây deadlock và viết lại quy tắc khóa để không lặp lại.",
      "code": "$ psql shop -c \"BEGIN; SELECT * FROM stocks WHERE id = 1 FOR UPDATE;\"\n$ psql shop -c \"BEGIN; SELECT * FROM stocks WHERE id = 2 FOR UPDATE;\"\n# (xem output ở failingEvidence)",
      "language": "bash",
      "failingEvidence": "Phiên A khóa dòng 1, chờ dòng 2. Phiên B khóa dòng 2, chờ dòng 1. Log: ERROR: deadlock detected, DETAIL: Process 123 waits for ShareLock on transaction 456; blocked by process 789. Process 789 waits for ShareLock on transaction 456; blocked by process 123. HINT: See server log for query details. Database tự giết một transaction để phá vòng chờ.",
      "checks": [
        "Chọn đúng nguyên nhân: hai transaction khóa ngược thứ tự (A: 1 rồi 2, B: 2 rồi 1) tạo vòng chờ",
        "Chọn đúng cách sửa: luôn khóa theo cùng một thứ tự, ví dụ id tăng dần, và retry có giới hạn kèm idempotency khi bị giết"
      ],
      "solution": "Quy tắc sửa: mọi transaction khóa nhiều dòng phải sort id tăng dần rồi mới khóa, ví dụ luôn khóa 1 trước rồi mới khóa 2. Code phải bắt lỗi deadlock, retry có giới hạn (ví dụ tối đa 3 lần, backoff ngắn) và retry phải idempotent để không nhân đôi giao dịch. Không được retry vô hạn.",
      "why": "Vì deadlock là vòng chờ tròn do thứ tự khóa không nhất quán, database chỉ có thể phá vòng bằng cách giết một bên. Thứ tự khóa thống nhất thì không còn vòng tròn. Retry là cần thiết vì bên bị giết là bên làm đúng nhưng xui, nhưng retry không idempotent sẽ biến một lần trừ thành hai lần.",
      "hints": [
        "Vẽ vòng chờ: A chờ ai, B chờ ai, có khép thành vòng tròn không?",
        "Nếu mọi transaction đều khóa theo id tăng dần thì vòng tròn còn tạo được không?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "psql shop -c \"BEGIN; SELECT * FROM stocks WHERE id = 1 FOR UPDATE; SELECT * FROM stocks WHERE id = 2 FOR UPDATE;\"",
            "output": "ERROR: deadlock detected\nDETAIL: Process 123 waits for ShareLock on transaction 456; blocked by process 789."
          },
          {
            "cmd": "psql shop -c \"SELECT pid, wait_event FROM pg_stat_activity WHERE wait_event IS NOT NULL;\"",
            "output": "pid | wait_event\n----+------------\n123 | Lock"
          }
        ]
      }
    }
  ],
  "14":   [
    {
      "id": "14-1",
      "concept": "Chọn SQL, MongoDB hay kết hợp",
      "type": "decision",
      "title": "Chọn DB cho từng phần của hệ thống đặt hàng",
      "prompt": "Checkpoint tuần 2 yêu cầu thiết kế dữ liệu cho hệ thống đặt hàng gồm đơn hàng/thanh toán, giỏ hàng/catalog và session/rate limit. Một đồng nghiệp đề xuất dùng một loại DB cho tất cả cho đơn giản. Hãy bác bỏ hoặc chấp nhận từng phần và chọn DB cho từng phần.",
      "code": "// Phương án A: tất cả vào MongoDB, kể cả đơn hàng và thanh toán.\n// Phương án B: đơn hàng/thanh toán vào SQL, giỏ hàng/catalog vào MongoDB,\n// session và rate limit vào Redis, mỗi phần một loại phù hợp.",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai (một loại cho tất cả): đơn hàng vào MongoDB thì transaction đa document và join báo cáo trở nên phức tạp, còn session vào SQL thì mỗi request đều ghi DB chính cho dữ liệu tạm thời, vừa chậm vừa tốn tài nguyên. Thiết kế chỉ đẹp khi mọi phần đều dễ, còn khi một phần khó thì cả hệ thống phải trả giá.",
      "checks": [
        "Chọn đúng phương án B (kết hợp, mỗi phần một loại phù hợp)",
        "Chọn đúng lý do cho từng phần: SQL cho ACID và báo cáo join, MongoDB cho document linh hoạt, Redis cho dữ liệu tạm thời mất được"
      ],
      "solution": "Chọn phương án B. Đơn hàng và thanh toán vào SQL vì cần transaction, ràng buộc và báo cáo join. Giỏ hàng và catalog vào MongoDB vì document linh hoạt theo sản phẩm và đọc theo aggregate. Session, rate limit và cache vào Redis vì tạm thời, nhanh và mất được. Không có loại DB nào tốt cho mọi việc.",
      "why": "Vì mỗi loại DB mạnh ở một chiều khác nhau: SQL mạnh ở nhất quán và quan hệ, MongoDB mạnh ở document linh hoạt, Redis mạnh ở tốc độ cho dữ liệu tạm. Ép một loại cho tất cả là bắt nó làm việc nó yếu nhất, và chỗ yếu đó sẽ thành điểm nghẽn của hệ thống.",
      "hints": [
        "Phần nào sai một đồng là mất tiền, phần nào mất đi vẫn tạo lại được?",
        "Báo cáo doanh thu cần join nhiều bảng thì DB nào làm tốt nhất?"
      ]
    },
    {
      "id": "14-2",
      "concept": "Transaction và cơ chế bù",
      "type": "fix-bug",
      "title": "Sửa luồng thanh toán xong nhưng trừ kho thất bại thì kẹt đơn PAID",
      "prompt": "Incident tuần trước: đơn đã PAID nhưng kho không trừ, không ai biết phải hoàn tiền cho ai vì code không có bước bù. Đoạn service dưới đây là hiện trường. Hãy tìm chỗ kẹt và viết bước bù.",
      "code": "@Transactional\npublic void checkout(Long orderId) {\n    paymentService.charge(orderId);\n    stockService.decrease(orderId);\n    orderRepo.markPaid(orderId);\n}",
      "language": "java",
      "failingEvidence": "Log: charge thành công, decrease ném OutOfStockException, transaction rollback phần DB nhưng tiền đã trừ ở cổng thanh toán không tự quay lại. Kết quả: user mất tiền, đơn không PAID cũng không CANCELLED rõ ràng, kho không trừ, và không có bản ghi nào nói ai phải hoàn tiền.",
      "checks": [
        "Chọn đúng chỗ kẹt: thanh toán ở hệ ngoài không rollback cùng transaction DB, nên lỗi ở bước sau không tự hoàn tiền",
        "Chọn đúng bước bù: hoàn tiền, đưa đơn về CANCELLED, thông báo rõ cho user"
      ],
      "solution": "// Tách transaction DB và bước thanh toán, dùng saga có bù:\npublic void checkout(Long orderId) {\n    try {\n        paymentService.charge(orderId);\n        stockService.decrease(orderId);\n        orderRepo.markPaid(orderId);\n    } catch (Exception e) {\n        paymentService.refund(orderId);\n        orderRepo.markCancelled(orderId, \"OUT_OF_STOCK_REFUNDED\");\n        notifyUser(orderId, \"Hết hàng, tiền đã được hoàn lại.\");\n        throw e;\n    }\n}\n// Nếu thanh toán và kho ở service khác nhau thì dùng saga với bước bù hoàn tiền và cộng lại kho, kèm trạng thái trung gian để đối soát.",
      "why": "Vì transaction DB không bao được hệ thống bên ngoài như cổng thanh toán. Khi bước sau thất bại, bước đã thành công ở bên ngoài phải được bù bằng một hành động ngược có chủ đích, không phải bằng hy vọng rollback. Không có bù và trạng thái trung gian thì đơn kẹt và không ai biết phải sửa cho ai.",
      "hints": [
        "Tiền đã trừ ở cổng thanh toán có tự quay lại khi transaction DB rollback không?",
        "Khi bù xong thì đơn phải ở trạng thái nào và user phải thấy thông báo gì?"
      ]
    },
    {
      "id": "14-3",
      "concept": "Transaction và cơ chế bù",
      "type": "skeleton",
      "title": "Điền saga đặt hàng: bước thuận và bước bù tương ứng",
      "prompt": "Thiết kế checkpoint yêu cầu vẽ saga đặt hàng gồm tạo đơn, thanh toán, trừ kho. Khung dưới đây đã có bước thuận nhưng bỏ trống bước bù và trạng thái khi lỗi. Hãy điền sao cho không bước nào lỗi mà không có đường quay lại.",
      "code": "// Saga đặt hàng:\n// Bước 1: tạo đơn -> bù: // TODO\n// Bước 2: thanh toán -> bù: // TODO\n// Bước 3: trừ kho -> bù: // TODO\n// Khi thanh toán thất bại: đơn ở trạng thái nào, user thấy gì? // TODO",
      "language": "java",
      "failingEvidence": "Nếu điền sai (để trống bước bù, hoặc ghi \"hiếm khi xảy ra\"): khi trừ kho thất bại sau khi thanh toán thành công, đơn kẹt ở PAID mà kho không trừ, không có bước nào hoàn tiền. Checkpoint này sẽ bị đánh trượt vì thiếu tình huống mâu thuẫn có cách xử lý, dù schema có đẹp.",
      "checks": [
        "Điền đủ bước bù cho cả 3 bước: hủy đơn, hoàn tiền, cộng lại kho",
        "Điền đúng trạng thái và thông báo khi thanh toán thất bại: đơn CANCELLED hoặc PAYMENT_FAILED rõ ràng, user biết tiền chưa bị trừ hoặc đã được hoàn"
      ],
      "solution": "// Bước 1: tạo đơn -> bù: hủy đơn.\n// Bước 2: thanh toán -> bù: hoàn tiền.\n// Bước 3: trừ kho -> bù: cộng lại kho.\n// Khi thanh toán thất bại: đơn về CANCELLED (hoặc PAYMENT_FAILED chờ thử lại, phải ghi rõ một lựa chọn), user thấy \"Thanh toán thất bại, đơn chưa được xác nhận, tiền chưa bị trừ\".\n// Bước không bù được (ví dụ đã giao hàng vật lý) phải có trạng thái chờ xử lý tay, không được im lặng.",
      "why": "Vì saga nhiều bước mà chỉ có bước thuận thì lỗi giữa chừng là kẹt trạng thái không ai sửa được. Mỗi bước thuận phải có bước bù ngược tương ứng, và trạng thái trung gian phải đủ rõ để đối soát. Checkpoint đạt hay không nằm ở chỗ này, không nằm ở schema đẹp.",
      "hints": [
        "Bước thuận nào làm thay đổi tiền hoặc kho thì bước bù của nó phải làm ngược lại điều gì?",
        "User cần biết điều gì ngay khi thanh toán thất bại để không tưởng là đã đặt xong?"
      ]
    },
    {
      "id": "14-4",
      "concept": "So sánh với thiết kế tuần trước",
      "type": "predict",
      "title": "Đoán user thấy gì ngay sau khi đặt hàng trong hệ eventual",
      "prompt": "Hệ thống lịch sử đơn đọc từ bản sao đồng bộ sau vài giây để tải nhanh hơn, trong khi đơn vừa được ghi vào DB chính và thanh toán thành công. User vừa đặt xong bấm ngay vào trang lịch sử đơn. Hãy đoán user thấy gì và code phải xử lý ra sao.",
      "code": "// Ghi: POST /orders -> DB chính, thanh toán thành công, trả mã đơn ORD-123.\n// Đọc: GET /orders/history -> bản sao (replica) đồng bộ sau vài giây.\n// User bấm vào lịch sử đơn ngay trong 2 giây đầu sau khi đặt.",
      "language": "java",
      "failingEvidence": "Output thật: trang lịch sử đơn trả về danh sách chưa có ORD-123 trong vài giây đầu, sau đó đơn mới hiện ra. User tưởng đơn bị mất và đặt lại một đơn nữa, tạo thành đơn trùng. Đây không phải bug mất dữ liệu mà là cửa sổ không nhất quán của eventual consistency.",
      "checks": [
        "Đoán đúng: lịch sử đơn chưa thấy đơn mới trong vài giây đầu vì bản sao chưa kịp đồng bộ",
        "Đoán đúng cách xử lý: nói rõ đơn không mất, chỉ chậm hiện, và cho user kiểm tra theo mã đơn thay vì đặt lại"
      ],
      "solution": "Đoán đúng: đơn chưa hiện trong vài giây đầu, rồi tự hiện sau. Xử lý đúng: trang xác nhận hiển thị mã đơn ORD-123 và dòng \"Đơn sẽ hiện trong lịch sử sau vài giây\", nút kiểm tra theo mã đơn đọc từ DB chính. Không được để user tưởng đơn mất mà đặt lại. Đây là read-your-writes cho chính user đó, còn dữ liệu của người khác thì eventual là chấp nhận được.",
      "why": "Vì ghi và đọc đang đi hai nguồn khác nhau với độ trễ đồng bộ. Đòi strong consistency cho lịch sử đơn sẽ làm hệ thống chậm và khó scale vô ích, nhưng không nói rõ cửa sổ này thì user sẽ đặt trùng đơn. Thiết kế tốt là chấp nhận eventual nhưng che cửa sổ đó bằng mã đơn và thông báo rõ.",
      "hints": [
        "Đơn ghi vào DB chính rồi, nhưng trang lịch sử đọc từ đâu?",
        "User cần thông tin gì để không bấm đặt lại?"
      ]
    },
    {
      "id": "14-5",
      "concept": "Chọn SQL, MongoDB hay kết hợp",
      "type": "terminal",
      "title": "Dùng curl kiểm chứng đơn tạo xong nhưng lịch sử chưa thấy ngay",
      "prompt": "Bạn đang kiểm tra cửa sổ không nhất quán của hệ thống đặt hàng bằng curl. Phiên terminal dưới đây là bằng chứng duy nhất. Hãy đọc output và kết luận: đây là mất dữ liệu hay chỉ chậm hiện, và bạn sẽ báo cho user ra sao.",
      "code": "$ curl -s -X POST http://localhost:8080/orders -d '{\"items\": [...]}'\n$ curl -s http://localhost:8080/orders/history\n# (xem output ở failingEvidence)",
      "language": "bash",
      "failingEvidence": "POST /orders trả 201 và mã đơn ORD-123. GET /orders/history ngay sau đó trả 200 với danh sách chưa có ORD-123. GET lại sau 5 giây thì danh sách đã có ORD-123. Đơn không mất, chỉ chậm hiện vì lịch sử đọc từ bản sao đồng bộ sau.",
      "checks": [
        "Chọn đúng kết luận: không phải mất dữ liệu, mà là eventual consistency với cửa sổ vài giây",
        "Chọn đúng thông báo cho user: đơn đã tạo thành công theo mã ORD-123, lịch sử sẽ hiện sau vài giây, không đặt lại"
      ],
      "solution": "Kết luận: eventual consistency, cửa sổ khoảng vài giây, đơn không mất. Thông báo cho user: \"Đơn ORD-123 đã tạo thành công. Lịch sử đơn sẽ hiện sau vài giây, bạn có thể kiểm tra bằng mã đơn, không cần đặt lại.\" Nếu sau 1 phút vẫn không thấy thì mới kiểm tra theo mã đơn ở DB chính, không phải đặt lại ngay.",
      "why": "Vì đọc lại sau 5 giây đã thấy đơn, chứng tỏ ghi đã thành công và chỉ có độ trễ đồng bộ. Kết luận mất dữ liệu sẽ dẫn tới đặt lại và sinh đơn trùng, còn kết luận đúng thì chỉ cần một dòng thông báo rõ là đủ.",
      "hints": [
        "Đọc lại sau 5 giây thì đơn có hiện không?",
        "Nếu là mất dữ liệu thật thì đọc lại sau có thấy không?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "curl -s -X POST http://localhost:8080/orders -d '{\"items\":[{\"productId\":\"p1\",\"qty\":1}]}'",
            "output": "{\"id\":\"ORD-123\",\"status\":\"PAID\"}"
          },
          {
            "cmd": "curl -s http://localhost:8080/orders/history",
            "output": "{\"orders\":[]}"
          },
          {
            "cmd": "sleep 5; curl -s http://localhost:8080/orders/history",
            "output": "{\"orders\":[{\"id\":\"ORD-123\",\"status\":\"PAID\"}]}"
          }
        ]
      }
    }
  ],
  "15":   [
    {
      "id": "15-1",
      "concept": "Thread-safe collection",
      "type": "fix-bug",
      "title": "Sửa HashMap dùng chung gây mất entry lúc đông user",
      "prompt": "App chạy tốt ở test một luồng nhưng lúc đông user thì cache session thỉnh thoảng mất entry, thỉnh thoảng treo. Senior nghi ngờ đoạn cache dưới đây. Hãy tìm lỗi và viết lại bằng collection thiết kế cho đồng thời.",
      "code": "public class SessionCache {\n    private final Map<String, Session> cache = new HashMap<>();\n    public Session get(String id) { return cache.get(id); }\n    public void put(String id, Session s) { cache.put(id, s); }\n}",
      "language": "java",
      "failingEvidence": "Log lúc đông user: có request nhận null dù session vừa được put, và một lần thread dump ghi nhận vòng lặp vô hạn trong HashMap khi resize. Test một luồng luôn pass, lỗi chỉ lộ khi nhiều thread cùng put và get.",
      "checks": [
        "Chọn đúng lỗi: HashMap không thread-safe, nhiều thread cùng sửa sẽ hỏng cấu trúc nội bộ và mất entry",
        "Chọn diff đúng: ConcurrentHashMap thay cho HashMap, không phải chỉ thêm synchronized tay quanh mọi chỗ"
      ],
      "solution": "public class SessionCache {\n    private final Map<String, Session> cache = new ConcurrentHashMap<>();\n    public Session get(String id) { return cache.get(id); }\n    public void put(String id, Session s) { cache.put(id, s); }\n    public Session getOrCreate(String id) {\n        return cache.computeIfAbsent(id, Session::new);\n    }\n}",
      "why": "Vì HashMap không chịu được nhiều thread cùng ghi, kể cả khi mỗi thread ghi key khác nhau, vì resize và bucket chia sẻ cấu trúc nội bộ. ConcurrentHashMap được thiết kế cho đồng thời và computeIfAbsent còn nguyên tử cho tạo mới. Không sửa thì lỗi chỉ lộ lúc đông user, đúng lúc khó debug nhất.",
      "hints": [
        "Test một luồng pass thì có chứng minh được code an toàn khi nhiều luồng không?",
        "Collection nào được thiết kế để nhiều thread cùng put và get?"
      ]
    },
    {
      "id": "15-2",
      "concept": "Race condition và deadlock",
      "type": "predict",
      "title": "Đoán kết quả đếm khi 100 thread cùng tăng biến",
      "prompt": "Một đồng nghiệp viết bộ đếm bằng biến int thường và khẳng định test chạy đúng. Bạn được cho code và yêu cầu chạy 100 thread, mỗi thread tăng 1000 lần. Hãy đoán kết quả thật và giải thích vì sao test một lần pass không chứng minh được gì.",
      "code": "class Counter { int n = 0; void inc() { n++; } }\n// 100 thread, mỗi thread gọi inc() 1000 lần, rồi in ra counter.n.",
      "language": "java",
      "failingEvidence": "Output thật: kỳ vọng 100.000, kết quả các lần chạy lần lượt là 97.412, 98.903, 96.750, mỗi lần một số khác nhau, luôn thấp hơn 100.000. Không lần nào ra đúng 100.000 và không lần nào ra cùng một số.",
      "checks": [
        "Đoán đúng: kết quả thật thấp hơn 100.000 và thay đổi theo từng lần chạy",
        "Đoán đúng nguyên nhân: n++ là đọc-sửa-ghi ba bước không nguyên tử, hai thread cùng đọc một giá trị rồi ghi đè nhau"
      ],
      "solution": "Đoán đúng: khoảng 97.000-99.000, thay đổi mỗi lần chạy, không bao giờ ổn định ở 100.000. Sửa: dùng AtomicInteger với incrementAndGet(), hoặc synchronized quanh inc(). Test chứng minh phải chạy đa thread nhiều lần, không test một lần.",
      "why": "Vì n++ gồm đọc, cộng 1, ghi, ba bước rời nhau. Hai thread cùng đọc 5, cùng cộng thành 6, cùng ghi 6 thì mất một lần tăng. Lỗi này là xác suất, test một lần pass chỉ nghĩa là lần đó không va chạm, không nghĩa là code đúng.",
      "hints": [
        "n++ là một bước hay ba bước ở mức máy?",
        "Hai thread cùng đọc một giá trị rồi cùng ghi thì lần tăng nào bị mất?"
      ]
    },
    {
      "id": "15-3",
      "concept": "Thread-safe collection",
      "type": "skeleton",
      "title": "Điền AtomicInteger và computeIfAbsent cho bộ đếm dùng chung",
      "prompt": "Service thống kê đang dùng biến đếm thường và HashMap, QA yêu cầu viết lại cho đa luồng nhưng khung code còn bỏ trống hai chỗ. Hãy điền sao cho tăng đếm là nguyên tử và tạo mới trong map cũng nguyên tử.",
      "code": "public class Stats {\n    // TODO: loại biến đếm nào tăng nguyên tử mà không cần synchronized?\n    private int total = 0;\n    // TODO: loại map nào cho nhiều thread, và tạo mới nguyên tử bằng method nào?\n    private final Map<String, Integer> perUser = new HashMap<>();\n    public void record(String userId) {\n        // TODO: tăng total và tăng đếm của userId\n    }\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai (giữ int và HashMap, hoặc dùng get rồi put riêng rẽ): test đa luồng vẫn ra số thấp hơn kỳ vọng và thỉnh thoảng mất entry, giống hệt lỗi cũ. Nếu dùng synchronized quanh toàn bộ record thì đúng nhưng mọi request xếp hàng chờ nhau, throughput giảm mạnh.",
      "checks": [
        "Điền đúng: AtomicInteger với incrementAndGet() cho total",
        "Điền đúng: ConcurrentHashMap với compute hoặc merge để tăng đếm theo user nguyên tử"
      ],
      "solution": "public class Stats {\n    private final AtomicInteger total = new AtomicInteger();\n    private final ConcurrentHashMap<String, AtomicInteger> perUser = new ConcurrentHashMap<>();\n    public void record(String userId) {\n        total.incrementAndGet();\n        perUser.computeIfAbsent(userId, k -> new AtomicInteger()).incrementAndGet();\n    }\n}",
      "why": "Vì incrementAndGet và computeIfAbsent đều nguyên tử, không cần khóa toàn bộ method. Dùng synchronized quanh mọi thứ thì đúng nhưng biến bộ đếm thành điểm nghẽn, còn Atomic và ConcurrentHashMap cho nhiều thread tiến hành song song mà vẫn đúng.",
      "hints": [
        "Muốn tăng một biến mà không khóa thì dùng lớp nào trong java.util.concurrent.atomic?",
        "Muốn tạo mới trong map mà hai thread không tạo trùng thì dùng method nào của ConcurrentHashMap?"
      ]
    },
    {
      "id": "15-4",
      "concept": "Thread pool",
      "type": "decision",
      "title": "Chọn chính sách khi thread pool đầy: từ chối rõ ràng hay xếp hàng vô hạn",
      "prompt": "Service gọi API bên ngoài chậm 2 giây mỗi response, traffic kỳ vọng 100 request mỗi giây. Hai phương án pool dưới đây đang được tranh luận. Hãy chọn một và tính số thread cần thiết để biện minh.",
      "code": "// Phương án A: pool không giới hạn, queue không giới hạn\n// Executors.newCachedThreadPool() hoặc queue vô hạn.\n// Phương án B: pool 200 thread, queue 1000, đầy thì trả 503 + Retry-After\n// ThreadPoolExecutor(200, 200, 0, TimeUnit.SECONDS,\n//   new ArrayBlockingQueue<>(1000), new ThreadPoolExecutor.AbortPolicy());",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai (pool và queue vô hạn): traffic tăng đột biến tạo thread không giới hạn, app OOM trước khi hết CPU, chết toàn bộ thay vì chỉ chậm một phần. Log OOM: java.lang.OutOfMemoryError: unable to create native thread.",
      "checks": [
        "Chọn đúng phương án B (pool và queue có giới hạn, đầy thì từ chối rõ ràng)",
        "Chọn đúng ước tính: khoảng 200 thread cho 100 request mỗi giây nhân 2 giây chờ IO"
      ],
      "solution": "Chọn phương án B. Ước tính: thread cần cho IO = traffic nhân thời gian chờ = 100 nhân 2 = 200 thread. Queue giới hạn 1000, đầy thì trả 503 kèm Retry-After để client thử lại sau, thay vì xếp hàng vô hạn tới OOM. Timeout của pool phải nhỏ hơn timeout của client gọi mình, và pool IO tách riêng pool CPU.",
      "why": "Vì thread không giới hạn thì app chết vì hết bộ nhớ trước khi chết vì hết CPU, và chết toàn bộ chứ không chỉ chậm. Giới hạn và từ chối rõ ràng giữ hệ thống sống để phục hồi khi tải giảm, còn 503 kèm Retry-After là tín hiệu client hiểu được, không phải treo không hồi đáp.",
      "hints": [
        "Traffic nhân thời gian chờ mỗi request thì ra số thread cần cho IO là bao nhiêu?",
        "Khi pool đầy thì user nên nhận 503 rõ ràng hay chờ mãi không hồi đáp?"
      ]
    },
    {
      "id": "15-5",
      "concept": "Race condition và deadlock",
      "type": "terminal",
      "title": "Đọc jstack và phân biệt deadlock với chậm thông thường",
      "prompt": "App kẹt không tiến triển nhưng CPU lại thấp, khác hẳn với app chậm do quá tải. Bạn được cho output jstack rút gọn. Hãy đọc và kết luận: đây là deadlock hay chỉ chậm, và bằng chứng nào phân biệt hai trường hợp.",
      "code": "$ jps -l\n$ jstack <pid> | grep -A 5 BLOCKED\n# (xem output ở failingEvidence)",
      "language": "bash",
      "failingEvidence": "jstack: Found one Java-level deadlock. Thread-1: BLOCKED waiting for lock A, holding lock B. Thread-2: BLOCKED waiting for lock B, holding lock A. CPU toàn hệ thống chỉ 5%, không thread nào RUNNABLE tiến triển, và trạng thái này không tự hết sau 10 phút chờ.",
      "checks": [
        "Chọn đúng kết luận: deadlock, vì jstack báo vòng chờ và CPU thấp trong khi không thread nào tiến triển",
        "Chọn đúng cách sửa: thống nhất thứ tự khóa, giữ lock ngắn, không khóa lồng nhau ngược thứ tự"
      ],
      "solution": "Kết luận: deadlock. Bằng chứng: jstack báo Found one Java-level deadlock, hai thread chờ chéo nhau, CPU thấp chứng tỏ không phải quá tải mà là kẹt chờ nhau. Sửa: mọi nơi khóa nhiều lock phải lấy theo cùng một thứ tự, giữ lock ngắn, và không giữ lock trong lúc gọi chậm. Deadlock không tự hết, phải sửa thứ tự khóa hoặc khởi động lại rồi sửa.",
      "why": "Vì CPU thấp mà không tiến triển là dấu hiệu chờ nhau, không phải thiếu tài nguyên tính toán. jstack chỉ thẳng vòng chờ nên không cần đoán. Chậm thông thường thì CPU cao hoặc thread RUNNABLE, còn deadlock thì thread BLOCKED mãi và chỉ có can thiệp mới hết.",
      "hints": [
        "CPU thấp mà app không tiến triển thì nghi thiếu CPU hay kẹt chờ nhau?",
        "jstack báo gì mà chậm thông thường không báo?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "jps -l",
            "output": "12345 com.example.App"
          },
          {
            "cmd": "jstack 12345 | grep -A 3 \"Found one\"",
            "output": "Found one Java-level deadlock:\n\"Thread-1\": waiting to lock monitor A, holding monitor B\n\"Thread-2\": waiting to lock monitor B, holding monitor A"
          }
        ]
      }
    }
  ],
  "16":   [
    {
      "id": "16-1",
      "concept": "At-least-once và idempotent consumer",
      "type": "fix-bug",
      "title": "Sửa consumer trừ điểm hai lần khi message giao lại",
      "prompt": "User báo điểm bị trừ hai lần sau một lần mua hàng, đúng lúc consumer restart. Bạn được cho consumer dưới đây. Hãy tìm vì sao message giao lại lại trừ lần nữa và viết lại sao cho giao lại bao nhiêu lần cũng chỉ trừ một lần.",
      "code": "@KafkaListener(topics = \"points-deduct\")\npublic void onMessage(PointEvent e) {\n    walletService.deduct(e.userId(), e.points());\n    consumer.acknowledge();\n}",
      "language": "java",
      "failingEvidence": "Log: consumer trừ điểm thành công, crash trước khi commit offset, broker giao lại cùng event, consumer trừ lần nữa. Kết quả: một lần mua, hai lần trừ, số dư lệch đúng bằng số điểm của event đó. Lỗi chỉ lộ khi crash đúng khoảng giữa trừ và commit.",
      "checks": [
        "Chọn đúng nguyên nhân: at-least-once giao lại message, consumer không có dedup nên xử lý lại như event mới",
        "Chọn diff đúng: lưu eventId đã xử lý cùng transaction với trừ điểm, gặp lại thì bỏ qua"
      ],
      "solution": "@KafkaListener(topics = \"points-deduct\")\npublic void onMessage(PointEvent e) {\n    if (processedRepo.existsById(e.eventId())) return;\n    deductAndMarkProcessed(e);\n}\n@Transactional\npublic void deductAndMarkProcessed(PointEvent e) {\n    walletService.deduct(e.userId(), e.points());\n    processedRepo.save(new ProcessedEvent(e.eventId()));\n}\n// Dedup và trừ điểm phải cùng một transaction, nếu không crash ở giữa vẫn trừ hai lần.",
      "why": "Vì Kafka cam kết at-least-once, giao lại là bình thường chứ không phải lỗi hiếm, nên consumer bắt buộc phải idempotent. Lưu eventId cùng transaction với trừ điểm thì lần giao lại sẽ thấy event đã xử lý và bỏ qua. Tách dedup ra khỏi transaction trừ điểm thì crash ở giữa vẫn tạo ra lần trừ thứ hai.",
      "hints": [
        "Consumer crash sau khi trừ nhưng trước khi commit offset thì broker làm gì với message đó?",
        "Muốn lần giao lại bị bỏ qua thì cần lưu cái gì cùng với lần trừ đầu?"
      ]
    },
    {
      "id": "16-2",
      "concept": "Kafka",
      "type": "predict",
      "title": "Đoán thứ tự đơn hàng khi partition key sai",
      "prompt": "Hệ thống yêu cầu các event của cùng một đơn phải xử lý theo đúng thứ tự. Producer hiện tại không đặt key, Kafka chia message round-robin qua 3 partition. Hãy đoán thứ tự xử lý của ba event cùng một đơn và vì sao thêm consumer không sửa được.",
      "code": "// Producer không đặt key, topic orders có 3 partition.\nproducer.send(new ProducerRecord<>(\"orders\", null, \"OrderCreated: ORD-1\"));\nproducer.send(new ProducerRecord<>(\"orders\", null, \"OrderPaid: ORD-1\"));\nproducer.send(new ProducerRecord<>(\"orders\", null, \"OrderShipped: ORD-1\"));",
      "language": "java",
      "failingEvidence": "Output thật: ba event rơi vào ba partition khác nhau, ba consumer xử lý song song, thứ tự xử lý ghi nhận là Shipped rồi mới Paid rồi mới Created. Đơn bị giao trước khi thanh toán trong log xử lý, dù producer gửi đúng thứ tự.",
      "checks": [
        "Đoán đúng: thứ tự không được đảm bảo vì các event cùng đơn rơi vào partition khác nhau",
        "Đoán đúng cách sửa: đặt key là orderId để mọi event cùng đơn vào cùng một partition"
      ],
      "solution": "Đoán đúng: thứ tự lộn xộn, có thể Shipped xử lý trước Paid. Sửa: producer.send(new ProducerRecord<>(\"orders\", \"ORD-1\", event)) với key là orderId, mọi event cùng đơn vào cùng partition và thứ tự trong một partition được giữ. Lưu ý: thứ tự chỉ đảm bảo trong một partition, không đảm bảo toàn topic.",
      "why": "Vì Kafka chỉ đảm bảo thứ tự trong một partition, không đảm bảo toàn topic. Không đặt key thì message chia round-robin, các event cùng đơn đi đường khác nhau và xử lý song song. Đặt key theo orderId thì cùng đơn luôn cùng partition, thứ tự được giữ mà vẫn song song được giữa các đơn khác nhau.",
      "hints": [
        "Kafka đảm bảo thứ tự ở phạm vi nào: toàn topic hay một partition?",
        "Muốn các event cùng đơn đi cùng một đường thì phải gắn chúng bằng gì?"
      ]
    },
    {
      "id": "16-3",
      "concept": "At-least-once và idempotent consumer",
      "type": "skeleton",
      "title": "Điền consumer idempotent trừ điểm theo eventId",
      "prompt": "Team đã thống nhất consumer trừ điểm phải idempotent nhưng code mới viết còn bỏ trống phần kiểm tra trùng. Hãy điền sao cho event giao lại không trừ lần nữa, và dedup phải cùng transaction với trừ điểm.",
      "code": "@Transactional\npublic void handle(PointEvent e) {\n    // TODO: kiểm tra event này đã xử lý chưa, nếu rồi thì làm gì?\n    walletService.deduct(e.userId(), e.points());\n    // TODO: ghi dấu gì để lần giao lại nhận ra?\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai (không kiểm tra, hoặc lưu dấu đã xử lý ở transaction riêng sau khi trừ): crash giữa trừ và lưu dấu vẫn trừ hai lần khi giao lại. Nếu lưu dấu trước khi trừ mà trừ thất bại thì event bị bỏ qua vĩnh viễn dù chưa trừ điểm.",
      "checks": [
        "Điền đúng: kiểm tra eventId trong bảng processed_events trước, đã có thì return ngay",
        "Điền đúng: lưu eventId cùng transaction với trừ điểm, không tách riêng"
      ],
      "solution": "@Transactional\npublic void handle(PointEvent e) {\n    if (processedRepo.existsById(e.eventId())) return;\n    walletService.deduct(e.userId(), e.points());\n    processedRepo.save(new ProcessedEvent(e.eventId()));\n}\n// Giữ bản ghi dedup đủ lâu, ít nhất dài hơn thời gian retry tối đa của message.",
      "why": "Vì kiểm tra trước và lưu dấu cùng transaction biến lần xử lý thứ hai thành bỏ qua, còn lần đầu thất bại thì transaction rollback cả trừ và dấu nên message có thể giao lại và xử lý đúng. Tách hai việc ra hai transaction thì luôn có khe hở crash ở giữa.",
      "hints": [
        "Lần giao lại cần nhận ra event cũ bằng cái gì?",
        "Vì sao dấu đã xử lý phải cùng transaction với trừ điểm, không được lưu riêng sau?"
      ]
    },
    {
      "id": "16-4",
      "concept": "Khi nào gọi sync là đủ",
      "type": "decision",
      "title": "Chọn Kafka, RabbitMQ hay sync cho email, kế toán và log",
      "prompt": "Ba việc sau khi đặt hàng đang được đưa lên bàn: gửi email xác nhận, đồng bộ đơn sang kế toán, xử lý log truy cập. Một đồng nghiệp muốn đưa tất cả vào một queue duy nhất cho đơn giản. Hãy chọn công cụ cho từng việc và biện minh bằng nhu cầu cần ngay, cần replay và lượng message.",
      "code": "// Phương án A: tất cả vào một queue RabbitMQ duy nhất.\n// Phương án B: email vào queue (RabbitMQ), kế toán và log vào Kafka,\n// việc cần kết quả ngay thì gọi sync, không đưa vào queue.",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai: đưa việc cần kết quả ngay vào queue thì user không biết thanh toán thành công hay không. Dồn kế toán và log chung một queue thì log lượng lớn làm tắc việc kế toán cần thứ tự, và khi cần replay log thì queue đã xóa message sau khi xử lý xong.",
      "checks": [
        "Chọn đúng email: queue, vì không cần ngay, retry được, lỗi thì vào dead-letter",
        "Chọn đúng kế toán và log: Kafka, vì cần replay và cần thứ tự theo đơn, log lượng lớn",
        "Chọn đúng nguyên tắc: việc cần kết quả ngay thì gọi sync, không đưa vào queue"
      ],
      "solution": "Chọn phương án B. Email sau đặt hàng vào queue vì không cần ngay, retry được, lỗi hoài thì vào dead-letter để xem sau. Đồng bộ kế toán vào Kafka vì là luồng sự kiện cần thứ tự theo đơn và replay khi kế toán lỗi. Log truy cập vào Kafka vì lượng lớn và cần phân tích lại. Việc nào user cần biết kết quả ngay, ví dụ thanh toán, thì gọi sync và báo lỗi ngay.",
      "why": "Vì mỗi công cụ mạnh ở một chiều: RabbitMQ mạnh ở task queue và routing linh hoạt từng message, Kafka mạnh ở luồng sự kiện lớn và replay, sync mạnh ở phản hồi ngay. Chọn theo cần ngay hay không, cần replay hay không và lượng bao nhiêu, không chọn một công cụ cho mọi việc.",
      "hints": [
        "Việc nào user đang chờ kết quả ngay trước màn hình?",
        "Việc nào sau này cần chạy lại toàn bộ lịch sử thì cần công cụ giữ lại message?"
      ]
    },
    {
      "id": "16-5",
      "concept": "RabbitMQ",
      "type": "terminal",
      "title": "Dùng CLI kiểm chứng message lỗi phải vào dead-letter, không chặn queue chính",
      "prompt": "Một message lỗi đang bị retry vô hạn và làm tắc queue chính, các message sau nó đều không xử lý được. Bạn được cho output kiểm tra queue. Hãy đọc và kết luận: phải cấu hình gì để message lỗi không còn chặn queue, và giới hạn retry ra sao.",
      "code": "$ rabbitmqctl list_queues name messages consumers\n$ rabbitmqctl list_queues name messages --vhost / | grep dead\n# (xem output ở failingEvidence)",
      "language": "bash",
      "failingEvidence": "rabbitmqctl list_queues: orders 1523 1, trong đó 1 message lỗi đã retry 47 lần, consumer cứ nhận lại message đó rồi lỗi tiếp. Queue dead-letter orders.dlq đang trống vì chưa cấu hình dead-letter exchange, nên message lỗi không có nơi nào để đi ngoài queue chính.",
      "checks": [
        "Chọn đúng kết luận: thiếu dead-letter queue và giới hạn retry nên message lỗi chặn queue chính",
        "Chọn đúng cấu hình: retry tối đa vài lần rồi chuyển sang dead-letter để xem tay, không retry vô hạn"
      ],
      "solution": "Cấu hình: queue orders gắn dead-letter exchange tới orders.dlq, consumer retry tối đa 3 lần với backoff, quá giới hạn thì reject không requeue để message rơi vào dead-letter. Đội vận hành xem dlq định kỳ, sửa nguyên nhân rồi mới xử lý lại tay. Không bao giờ để retry vô hạn trên queue chính.",
      "why": "Vì một message lỗi mà retry vô hạn thì nó chiếm consumer và chặn mọi message sau, biến một lỗi cá biệt thành tắc toàn bộ queue. Dead-letter tách message lỗi ra khỏi luồng chính để hệ thống tiếp tục chạy, còn message lỗi vẫn còn đó để xem và xử lý tay, không bị mất cũng không chặn ai.",
      "hints": [
        "Message lỗi retry 47 lần thì các message sau nó có được xử lý không?",
        "Message quá số lần retry thì nên đi đâu thay vì ở lại queue chính?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "rabbitmqctl list_queues name messages consumers",
            "output": "orders 1523 1\norders.dlq 0 0"
          },
          {
            "cmd": "rabbitmqctl list_bindings --vhost / | grep orders",
            "output": "(chưa có binding nào tới dead-letter exchange cho queue orders)"
          },
          {
            "cmd": "kubectl logs deploy/order-consumer --tail 20 | grep -c \"ERROR processing message\"",
            "output": "47"
          }
        ]
      }
    }
  ],
  "17":   [
    {
      "id": "17-1",
      "concept": "Outbox Pattern",
      "type": "fix-bug",
      "title": "Đơn đã lưu, kho không biết: event mất giữa đường",
      "prompt": "Sáng thứ Hai, đội kho báo có 12 đơn đã PAID nhưng kho không trừ hàng. Bạn mở code tạo đơn và thấy nó lưu đơn xong mới gửi message sang kho bằng một câu lệnh riêng, không chung transaction nào. Hãy tìm dòng gây mất event và sửa sao cho event không bao giờ mất dù message broker chết ngay sau khi lưu đơn.",
      "code": "@Transactional\npublic Order createOrder(CreateOrderRequest req) {\n    Order order = orderRepo.save(new Order(req));\n    // Gửi event sang kho ngay sau khi lưu đơn\n    kafka.send(\"order-created\", order.getId().toString());\n    return order;\n}",
      "language": "java",
      "failingEvidence": "Log: Order 1042 saved, status PAID. Kafka broker timeout 2 giây sau đó. Không có log retry, không có bảng nào lưu event. Kho tra cứu: không có message nào cho order 1042. Đơn kẹt ở PAID, kho không trừ, không ai tự phát hiện.",
      "checks": [
        "Chọn đúng dòng code gây mất event (gửi message ngoài transaction)",
        "Chọn diff đúng: ghi event vào bảng outbox trong cùng transaction thay vì gửi trực tiếp"
      ],
      "solution": "@Transactional\npublic Order createOrder(CreateOrderRequest req) {\n    Order order = orderRepo.save(new Order(req));\n    outboxRepo.save(new OutboxEvent(order.getId(), \"OrderCreated\", toJson(order)));\n    return order;\n}\n// Worker riêng, chạy độc lập: đọc outbox theo created_at, gửi Kafka,\n// gửi thành công mới đánh dấu sent_at, lỗi thì tăng retry_count và backoff.",
      "why": "DB và broker là hai hệ khác nhau nên không có transaction chung: lưu xong mà gửi lỗi là event mất vĩnh viễn. Ghi event vào outbox trong cùng transaction với đơn thì đơn và event cùng thành công hoặc cùng rollback, worker gửi lại được khi broker hồi phục.",
      "hints": [
        "Hỏi: nếu broker chết đúng 1 giây sau khi lưu đơn, thứ gì còn sót lại để gửi lại sau?",
        "Ghi event vào cùng một transaction với đơn, rồi để một worker riêng chịu trách nhiệm gửi và đánh dấu đã gửi."
      ]
    },
    {
      "id": "17-2",
      "concept": "Hành động bù",
      "type": "skeleton",
      "title": "Điền bước bù cho saga trừ kho thất bại",
      "prompt": "Trong buổi review saga đặt hàng, senior chỉ vào file và nói: bước thuận đã đủ, bước bù còn trống. Luồng là tạo đơn, thanh toán rồi trừ kho; nếu trừ kho thất bại mà tiền đã trừ thì user mất tiền oan. Hãy điền phần còn thiếu sao cho hệ thống tự quay về trạng thái nhất quán mà không cần ai sửa tay.",
      "code": "public void handleStockFailed(Order order) {\n    // TODO 1: hoàn tiền cho order này bằng phương thức nào, gọi service nào?\n    // TODO 2: đơn chuyển sang trạng thái gì để user hiểu và không tưởng đơn thành công?\n    // TODO 3: nếu hoàn tiền cũng lỗi thì ghi trạng thái chờ xử lý ra sao, ai xử lý tiếp?\n}",
      "language": "java",
      "failingEvidence": "Test saga: thanh toán thành công, trừ kho lỗi OutOfStock. Kết quả hiện tại: đơn ở PAID, tiền đã trừ, kho không trừ, không có bước nào chạy tiếp. User thấy đơn thành công nhưng hàng không bao giờ giao.",
      "checks": [
        "Điền đúng bước bù: hoàn tiền trước khi hủy đơn",
        "Điền đúng trạng thái cuối và trạng thái chờ xử lý tay khi bù cũng lỗi"
      ],
      "solution": "public void handleStockFailed(Order order) {\n    paymentService.refund(order.getPaymentId(), order.getTotal());\n    order.cancel(\"STOCK_FAILED\");\n    // Nếu refund lỗi: order.setStatus(\"NEEDS_MANUAL_REFUND\");\n    // ghi vào bảng manual_tasks để nhân viên xử lý, kèm paymentId và số tiền.\n}",
      "why": "Saga không có rollback của transaction nên mỗi bước thuận phải có một bước bù ngược tương ứng. Không bù thì lỗi ở bước cuối để lại trạng thái nửa vời: tiền mất, hàng không giao, và không có bản ghi nào cho người xử lý tay.",
      "hints": [
        "Bù đi ngược thứ tự bước thuận: bước nào làm sau thì bù trước.",
        "Hoàn tiền, hủy đơn, và luôn có một trạng thái chờ xử lý tay cho trường hợp chính bước bù cũng thất bại."
      ]
    },
    {
      "id": "17-3",
      "concept": "Saga choreography vs orchestration",
      "type": "decision",
      "title": "Chọn choreography hay orchestration cho saga 5 bước?",
      "prompt": "Product yêu cầu saga đặt hàng sẽ tăng từ 3 bước lên 5 bước trong quý tới, và khi lỗi ở bước 4 thì đội trực phải trả lời trong 5 phút: saga đang ở đâu, bù tới đâu rồi. Bạn có hai phương án thiết kế dưới đây. Hãy chọn phương án phù hợp và biện minh bằng tiêu chí theo dõi và mở rộng, không chỉ bằng độ dễ viết lúc đầu.",
      "code": "// Phương án A: Choreography — mỗi service nghe event rồi tự làm bước tiếp theo\n// OrderCreated -> Payment nghe -> PaymentSucceeded -> Kho nghe -> StockReserved -> Giao hàng nghe\n// Không có nơi nào lưu trạng thái tổng của saga.\n\n// Phương án B: Orchestration — một OrderSagaOrchestrator giữ trạng thái và gọi từng bước\n// orchestrator.start(order) -> pay() -> reserveStock() -> ship()\n// Lỗi ở bước nào thì orchestrator gọi bù ngược lại và ghi trạng thái saga.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai: saga choreography 5 bước lỗi ở bước 4, đội trực phải lần log của 4 service mới biết saga kẹt ở đâu; có lần bù chạy 2 lần vì hai service cùng nghe một event lỗi. Thời gian xác định trạng thái saga: 45 phút thay vì 5 phút.",
      "checks": [
        "Chọn đúng phương án B (orchestration) cho saga 5 bước cần theo dõi",
        "Chọn đúng lý do: có một nơi giữ trạng thái saga và điều phối bù"
      ],
      "solution": "Chọn phương án B — orchestration. Orchestrator lưu trạng thái từng bước, khi lỗi thì gọi bù theo đúng thứ tự ngược và ghi rõ saga đang ở bước nào, nên đội trực tra một chỗ là thấy. Choreography chỉ hợp khi saga ngắn (2-3 bước), ít thay đổi và không cần theo dõi trạng thái tổng.",
      "why": "Choreography đơn giản lúc đầu nhưng trạng thái saga phân tán ở nhiều service, càng nhiều bước càng khó lần và khó bù đúng. Orchestration trả giá bằng một điểm tập trung, đổi lại trạng thái và luồng bù nằm ở một chỗ duy nhất.",
      "hints": [
        "Hỏi: lúc 2 giờ sáng, người trực cần tra bao nhiêu chỗ để biết saga đang ở đâu?",
        "Saga dài và hay thay đổi thì cần một nơi giữ trạng thái tổng; saga ngắn và ổn định thì choreography mới đủ."
      ]
    },
    {
      "id": "17-4",
      "concept": "Vấn đề 2-phase",
      "type": "predict",
      "title": "Đoán trạng thái đơn khi broker chết giữa chừng",
      "prompt": "Bạn đọc đoạn code tạo đơn dưới đây trong một buổi review và senior hỏi một câu duy nhất: nếu broker chết đúng sau khi commit DB nhưng trước khi gửi message, hệ thống sẽ ở trạng thái nào? Hãy đoán chính xác trạng thái của đơn, của kho và của event, rồi đối chiếu với đáp án.",
      "code": "public Order createOrder(CreateOrderRequest req) {\n    Order order = orderRepo.save(new Order(req)); // commit tại đây\n    kafka.send(\"order-created\", order.getId().toString()); // broker chết ngay trước dòng này\n    return order;\n}",
      "language": "java",
      "failingEvidence": "Trạng thái thật sau sự cố: đơn tồn tại với status PAID trong DB; kho không nhận được message nào nên tồn kho không đổi; không có bản ghi event nào để gửi lại. Hệ thống không tự hồi phục khi broker sống lại.",
      "checks": [
        "Đoán đúng cả ba: đơn đã lưu, kho chưa trừ, event đã mất",
        "Chọn đúng kết luận: không có cơ chế nào tự gửi lại event"
      ],
      "solution": "Đơn đã lưu (PAID), kho chưa trừ (không nhận message), event đã mất (không lưu ở đâu để gửi lại). Đây chính là vấn đề 2-phase: DB và broker không có transaction chung nên không thể đảm bảo cả hai cùng thành công. Cách sửa là outbox: ghi event cùng transaction với đơn, worker gửi lại sau.",
      "why": "Thứ tự ghi trước gửi sau luôn có một khe hở: commit xong mà gửi lỗi là mất; gửi trước ghi sau thì ngược lại, kho trừ mà không có đơn. Chỉ khi event được ghi cùng transaction với dữ liệu nghiệp vụ thì khe hở này mới đóng lại.",
      "hints": [
        "Vẽ hai hệ độc lập: DB và broker. Dòng nào commit trước, dòng nào có thể lỗi sau?",
        "Nếu không còn dòng nào để gửi lại, event đó coi như đã mất vĩnh viễn."
      ]
    },
    {
      "id": "17-5",
      "concept": "Outbox Pattern",
      "type": "terminal",
      "title": "Worker outbox: vì sao event gửi trùng vẫn an toàn?",
      "prompt": "Bạn mở terminal của staging để kiểm tra worker outbox sau một lần deploy. Worker đã gửi một event hai lần vì nó crash đúng lúc vừa gửi xong nhưng chưa kịp đánh dấu đã gửi. Hãy đọc kịch bản terminal dưới đây và xác định: vì sao gửi trùng không gây trừ kho hai lần, và worker phải sửa chỗ nào để lần sau không đánh dấu sai.",
      "code": "-- Bảng outbox_events trước khi worker chạy\n-- id | aggregate_id | event_type   | sent_at | retry_count\n--  7 | order-1042    | OrderCreated | NULL    | 0",
      "language": "sql",
      "failingEvidence": "Kho nhận OrderCreated cho order-1042 hai lần. Nhờ consumer kiểm tra event id đã xử lý nên lần thứ hai bị bỏ qua, tồn kho chỉ trừ một lần. Nếu consumer không dedup, tồn kho sẽ trừ hai lần cho một đơn.",
      "checks": [
        "Chọn đúng cơ chế cứu hệ thống: consumer dedup bằng event id",
        "Chọn đúng thứ tự đúng của worker: gửi thành công rồi mới đánh dấu sent_at"
      ],
      "solution": "Gửi trùng là bình thường với outbox vì worker có thể crash giữa gửi và đánh dấu. An toàn nhờ hai lớp: worker chỉ đánh dấu sent_at sau khi broker xác nhận đã nhận, và consumer dedup bằng event id (đã xử lý thì bỏ qua lần sau). Worker không bao giờ được đánh dấu đã gửi trước khi gửi thật.",
      "why": "At-least-once là cam kết thực tế của outbox: event có thể gửi trùng nhưng không được mất. Vì vậy consumer bắt buộc phải idempotent, còn worker bắt buộc phải đánh dấu sau khi gửi, nếu không sẽ có cả hai lỗi: mất event và trừ trùng.",
      "hints": [
        "Worker crash giữa hai thao tác nào thì gây ra gửi trùng?",
        "Lớp bảo vệ nằm ở phía nhận (dedup), không nằm ở việc cầu mong worker không bao giờ crash."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "psql -c \"SELECT id, aggregate_id, sent_at FROM outbox_events WHERE sent_at IS NULL ORDER BY created_at LIMIT 5;\"",
            "output": " id | aggregate_id | sent_at | retry_count\n----+--------------+---------+-------------\n  7 | order-1042   | NULL    | 0"
          },
          {
            "cmd": "docker logs outbox-worker --tail 20",
            "output": "INFO sending event 7 for order-1042\nINFO broker ack received for event 7\nWARN worker crashed before marking sent_at, will retry event 7\nINFO sending event 7 for order-1042 (retry)\nINFO consumer dedup: event 7 already processed, skipping"
          },
          {
            "cmd": "psql -c \"SELECT stock FROM products WHERE id = 42;\"",
            "output": " stock\n-------\n    97\n-- chỉ trừ 1 lần từ 98 xuống 97, dù event gửi 2 lần"
          }
        ]
      }
    }
  ],
  "18":   [
    {
      "id": "18-1",
      "concept": "Timeout",
      "type": "fix-bug",
      "title": "Payment chậm 60 giây kéo sập cả hệ thống",
      "prompt": "Tối qua payment chậm, và chỉ 10 phút sau toàn bộ API đặt hàng cũng timeout theo dù traffic không tăng. Bạn mở client gọi payment và thấy nó không có bất kỳ giới hạn chờ nào. Hãy tìm cấu hình còn thiếu và sửa sao cho một dependency chậm không giữ thread của mình tới khi cạn pool.",
      "code": "@Bean\npublic RestClient paymentClient() {\n    return RestClient.builder()\n        .baseUrl(\"https://payment.example.com\")\n        .build(); // không đặt timeout nào\n}\n\npublic PaymentResult charge(Order order) {\n    return paymentClient.post().uri(\"/charge\").body(order).retrieve().body(PaymentResult.class);\n}",
      "language": "java",
      "failingEvidence": "Log: 200 thread worker đều ở trạng thái WAITING chờ payment, mỗi thread chờ 60-90 giây. Pool đầy, request mới xếp hàng rồi timeout. CPU chỉ 35%, DB rảnh — hệ thống nghẽn vì thread, không phải vì CPU hay DB.",
      "checks": [
        "Chọn đúng lỗi: client không có connect/read timeout",
        "Chọn đúng giá trị sửa: timeout nhỏ hơn timeout của client gọi mình (ví dụ 5 giây)"
      ],
      "solution": "@Bean\npublic RestClient paymentClient() {\n    return RestClient.builder()\n        .baseUrl(\"https://payment.example.com\")\n        .requestFactory(new SimpleClientHttpRequestFactory() {{\n            setConnectTimeout(Duration.ofSeconds(2));\n            setReadTimeout(Duration.ofSeconds(5));\n        }})\n        .build();\n}\n// Quá 5 giây thì ngắt, giải phóng thread, trả lỗi rõ ràng cho user thay vì treo.",
      "why": "Không có timeout thì thời gian chờ của mình bằng thời gian chờ của đối tác, và đối tác chậm bao lâu thì thread của mình kẹt bấy lâu. Timeout phải nhỏ hơn timeout của client gọi mình, nếu không client sẽ timeout trước mà server vẫn giữ thread vô ích.",
      "hints": [
        "Thread kẹt ở đâu khi payment chậm: chờ đọc response, và chờ đó kéo dài bao lâu?",
        "Đặt timeout cho cả kết nối và đọc, và nhớ timeout của mình phải ngắn hơn timeout của người gọi mình."
      ]
    },
    {
      "id": "18-2",
      "concept": "Retry + backoff + jitter",
      "type": "predict",
      "title": "Đoán cơn bão retry khi 1000 request cùng lỗi",
      "prompt": "Bạn xem chính sách retry dưới đây trước buổi review và senior hỏi: nếu payment trả 503 cho 1000 request cùng lúc, service đang yếu sẽ nhận thêm bao nhiêu request, và chúng tới cùng lúc hay rải ra? Hãy tính con số và đoán hình dạng của cơn bão trước khi đối chiếu đáp án.",
      "code": "// Chính sách hiện tại: retry 3 lần, ngay lập tức, không backoff, không jitter\nfor (int attempt = 0; attempt <= 3; attempt++) {\n    try { return paymentClient.charge(order); }\n    catch (ServiceUnavailableException e) { /* thử lại ngay */ }\n}",
      "language": "java",
      "failingEvidence": "Con số thật: 1000 request gốc lỗi, mỗi request retry 3 lần ngay lập tức nên payment nhận thêm 3000 request dồn trong cùng một khoảnh khắc, đúng lúc nó đang yếu nhất. Tỉ lệ lỗi tăng từ 40% lên 95% sau đợt retry.",
      "checks": [
        "Tính đúng số request thêm: 3000",
        "Chọn đúng hình dạng: dồn cùng lúc vì không có backoff và jitter"
      ],
      "solution": "Thêm 3000 request (1000 x 3), dồn cùng lúc vì retry ngay lập tức và không có jitter. Chính sách đúng: retry tối đa 2 lần, chỉ retry lỗi tạm thời (timeout, 503 — không retry 400), backoff tăng dần 1 giây rồi 2 giây cộng jitter ngẫu nhiên, và để circuit breaker ngắt mạch khi lỗi nhiều.",
      "why": "Retry không có backoff và jitter biến một lần lỗi thành một đợt tấn công vào service đang yếu, đúng lúc nó cần được giảm tải nhất. Jitter rải thời điểm retry ra, backoff tăng khoảng cách, còn giới hạn số lần retry chặn tổng tải phát sinh.",
      "hints": [
        "Nhân số request gốc với số lần retry, rồi hỏi: chúng tới cách nhau bao lâu?",
        "Retry chỉ có ích cho lỗi tạm thời; lỗi 400 do sai dữ liệu thì retry bao nhiêu lần cũng sai."
      ]
    },
    {
      "id": "18-3",
      "concept": "Circuit breaker (Resilience4j)",
      "type": "skeleton",
      "title": "Điền cấu hình circuit breaker cho API payment",
      "prompt": "Đội vận hành yêu cầu bạn viết cấu hình Resilience4j cho API payment: payment thỉnh thoảng trả 503, và khi nó đã chết thì hệ thống phải ngừng gọi nó một lúc thay vì tiếp tục dội request. File cấu hình dưới đây còn trống các ngưỡng quan trọng. Hãy điền số cụ thể kèm fallback, sao cho user không thấy lỗi chung chung.",
      "code": "resilience4j.circuitbreaker:\n  instances:\n    payment:\n      # TODO 1: tỉ lệ lỗi bao nhiêu thì mở mạch? (điền % và số request tối thiểu)\n      # TODO 2: mở mạch trong bao lâu trước khi thử lại một phần (half-open)?\n      # TODO 3: fallback trả về gì cho user khi mạch đang mở?",
      "language": "yaml",
      "failingEvidence": "Chưa có cấu hình: payment chết 10 phút, hệ thống vẫn gọi nó mỗi request, mỗi lần chờ đủ timeout rồi mới lỗi. User thấy lỗi chung chung, thread pool cạn dần. Có cấu hình nhưng không có fallback thì user vẫn chỉ thấy lỗi chung chung khi mạch mở.",
      "checks": [
        "Điền đúng ngưỡng mở mạch (ví dụ lỗi trên 50% trong 10 request)",
        "Điền đúng thời gian nguội và fallback nói đúng sự thật"
      ],
      "solution": "resilience4j.circuitbreaker:\n  instances:\n    payment:\n      failure-rate-threshold: 50\n      minimum-number-of-calls: 10\n      wait-duration-in-open-state: 30s\n      permitted-number-of-calls-in-half-open-state: 3\n# Fallback: trả thông báo \"Thanh toán đang xử lý, vui lòng kiểm tra lại sau\"\n# kèm ghi log để đối soát — không báo \"thất bại\" khi chưa chắc chắn.",
      "why": "Circuit breaker chuyển từ gọi và chờ lỗi sang trả fallback ngay, giải phóng thread và cho service chết thời gian hồi phục. Half-open cho một vài request thử lại để biết service đã sống lại chưa, thay vì mở mạch mãi hoặc đóng mạch vội.",
      "hints": [
        "Ngưỡng mở mạch cần hai con số: tỉ lệ lỗi và số request tối thiểu để tỉ lệ đó có ý nghĩa.",
        "Fallback phải nói đúng sự thật: chưa chắc thất bại thì đừng báo thất bại."
      ]
    },
    {
      "id": "18-4",
      "concept": "Bulkhead và rate limiter",
      "type": "decision",
      "title": "Chia pool hay dùng chung pool cho payment và email?",
      "prompt": "Một buổi postmortem cho thấy payment chậm đã làm email cũng chậm theo, dù email không liên quan gì tới payment. Bạn có hai phương án cấu hình thread pool dưới đây. Hãy chọn phương án ngăn một dependency chậm lan sang dependency khác, và nói rõ cái giá phải trả của phương án đó.",
      "code": "// Phương án A: một pool chung 40 thread cho mọi dependency\n// payment chậm -> chiếm hết 40 thread -> email cũng xếp hàng chờ thread.\n\n// Phương án B: bulkhead — pool riêng cho từng dependency\n// payment: 20 thread riêng, email: 20 thread riêng\n// payment chậm -> chỉ hết pool của payment, email vẫn chạy trên pool của nó.",
      "language": "yaml",
      "failingEvidence": "Nếu chọn sai (pool chung): payment chậm 60 giây chiếm hết thread chung, email xác nhận đơn cũng timeout theo dù service email hoàn toàn khỏe. User đặt hàng xong không nhận được email, đội trực tưởng email cũng chết.",
      "checks": [
        "Chọn đúng phương án B (bulkhead, pool riêng)",
        "Chọn đúng cái giá: mỗi pool phải định cỡ riêng và có thể thiếu thread khi pool của nó đầy dù pool khác còn trống"
      ],
      "solution": "Chọn phương án B — bulkhead với pool riêng cho từng dependency, cộng rate limiter cho client quét API (ví dụ tối đa 100 request/phút, quá thì trả 429 kèm Retry-After). Cái giá: phải định cỡ từng pool theo tải thật của từng dependency, và một pool đầy sẽ từ chối dù pool khác còn trống — đó chính là mục đích của vách ngăn.",
      "why": "Pool chung biến một dependency chậm thành nghẽn toàn hệ thống vì tài nguyên dùng chung. Bulkhead giới hạn thiệt hại trong đúng dependency gây ra nó, giống vách ngăn khoang tàu: một khoang thủng không chìm cả tàu.",
      "hints": [
        "Hỏi: khi payment chiếm hết thread, email lấy thread ở đâu ra?",
        "Vách ngăn nào cũng có giá: tài nguyên không còn chia sẻ linh hoạt cho nhau nữa."
      ]
    },
    {
      "id": "18-5",
      "concept": "Timeout",
      "type": "terminal",
      "title": "Đọc curl timing để chứng minh thiếu timeout",
      "prompt": "Bạn nghi client gọi payment không có timeout nhưng chưa có bằng chứng. Bạn chạy curl với đồng hồ đo thời gian ngay trên terminal staging và nhận được kết quả dưới đây. Hãy đọc kịch bản và kết luận: request treo ở giai đoạn nào, và bằng chứng nào chứng tỏ timeout đang không có tác dụng.",
      "code": "# Lệnh bạn chạy để đo thời gian từng giai đoạn của request tới payment\ncurl -w \"connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\" https://payment.example.com/charge",
      "language": "bash",
      "failingEvidence": "Kết quả đo: kết nối chỉ mất 0.02 giây nhưng chờ phản hồi đầu tiên tới 61 giây, tổng 61 giây. Trong khi đó timeout cấu hình ở client gọi mình chỉ là 30 giây — nghĩa là client của mình đã timeout và bỏ đi từ lâu, nhưng thread server vẫn chờ payment tới 61 giây.",
      "checks": [
        "Đọc đúng giai đoạn treo: chờ phản hồi (ttfb), không phải kết nối",
        "Chọn đúng kết luận: read timeout không được đặt hoặc lớn hơn timeout của client gọi mình"
      ],
      "solution": "Treo ở giai đoạn chờ phản hồi đầu tiên (ttfb 61 giây), không phải giai đoạn kết nối (0.02 giây). Bằng chứng thiếu timeout: tổng thời gian vượt xa timeout 30 giây của client gọi mình. Sửa: đặt read timeout 5 giây cho client gọi payment, nhỏ hơn 30 giây của tầng trên.",
      "why": "Phân biệt connect và ttfb mới biết lỗi nằm ở đâu: kết nối nhanh mà ttfb lâu nghĩa là đối tác nhận request rồi nhưng xử lý chậm hoặc treo. Timeout phải đặt ở đúng giai đoạn treo đó và phải ngắn hơn timeout của tầng trên thì mới giải phóng thread kịp.",
      "hints": [
        "So sánh ba con số: connect, ttfb và total — giai đoạn nào chiếm gần hết thời gian?",
        "Nếu tổng thời gian vượt timeout của tầng trên, timeout của tầng mình đang vô dụng."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "curl -w \"connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\" https://payment.example.com/charge",
            "output": "connect=0.021 ttfb=61.340 total=61.341\nHTTP 504 sau 61 giây"
          },
          {
            "cmd": "grep -r \"timeout\" src/main/java/payment/ || echo \"no timeout config found\"",
            "output": "no timeout config found"
          },
          {
            "cmd": "curl -s http://localhost:8080/actuator/metrics/http.server.requests | head -5",
            "output": "thread pool active: 200/200, queued requests rising, CPU only 35 percent"
          }
        ]
      }
    }
  ],
  "19":   [
    {
      "id": "19-1",
      "concept": "Strong consistency",
      "type": "decision",
      "title": "Ví tiền chọn strong, feed chọn eventual: vì sao không chọn một mức cho tất cả?",
      "prompt": "Bạn được giao chọn mức nhất quán cho hai tính năng trong cùng một hệ thống: số dư ví và feed bài viết. Product muốn mọi thứ đều nhất quán mạnh cho chắc chắn. Hãy nhìn hai phương án đọc dữ liệu dưới đây, chọn mức phù hợp cho từng tính năng và giải thích cái giá của việc đòi strong cho cả hai.",
      "code": "// Phương án A: mọi lần đọc đều đọc từ primary, chờ đồng bộ xong mới trả\n// -> luôn thấy mới nhất, nhưng chậm hơn và khó scale khi đọc nhiều.\n\n// Phương án B: đọc từ replica, đồng bộ sau vài giây\n// -> đọc nhanh, scale tốt, nhưng ngay sau khi ghi có thể đọc thấy dữ liệu cũ.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (eventual cho ví): user vừa trừ 100 nghìn, đọc lại vẫn thấy số dư cũ, tưởng còn tiền nên trừ tiếp lần nữa rồi ví âm. Nếu chọn sai (strong cho feed): feed chậm và khó scale vô ích vì chậm vài giây không làm ai mất tiền.",
      "checks": [
        "Chọn đúng: ví dùng phương án A (strong), feed dùng phương án B (eventual)",
        "Chọn đúng lý do: sai số ở ví là mất tiền, chậm ở feed là không sao"
      ],
      "solution": "Ví chọn strong (đọc từ primary, mọi lần đọc sau ghi phải thấy mới ngay) vì sai số là mất tiền. Feed chọn eventual (đọc từ replica) vì chậm vài giây không gây thiệt hại, đổi lại đọc nhanh và scale tốt. Đòi strong cho mọi thứ làm hệ thống chậm và khó scale ở những chỗ không cần, còn đòi eventual cho mọi thứ làm mất tiền ở chỗ cần chính xác.",
      "why": "Mức nhất quán phải chọn theo hậu quả khi đọc dữ liệu cũ, không chọn theo cảm giác chắc chắn. Tiền sai là thiệt hại thật và khó sửa, feed chậm là trải nghiệm chấp nhận được và tự hết sau vài giây.",
      "hints": [
        "Hỏi cho từng tính năng: đọc cũ thì ai mất gì, mất bao nhiêu?",
        "Cái giá của strong là chậm và khó scale; chỉ trả giá đó ở nơi sai số gây thiệt hại thật."
      ]
    },
    {
      "id": "19-2",
      "concept": "Eventual consistency",
      "type": "predict",
      "title": "Đoán xem lịch sử đơn hiện gì 3 giây sau khi đặt hàng",
      "prompt": "User vừa đặt hàng thành công, màn hình xác nhận hiện mã đơn, nhưng họ bấm ngay sang trang lịch sử đơn và chưa thấy đơn đâu. Bạn đọc kiến trúc dưới đây và được hỏi: đây có phải bug không, và sau bao lâu thì đơn sẽ hiện? Hãy đoán trước khi đối chiếu đáp án, và đừng vội kết luận hệ thống lỗi.",
      "code": "// Đơn ghi vào primary DB, trả về cho user ngay.\n// Trang lịch sử đơn đọc từ replica, replica đồng bộ từ primary sau vài giây.\n// Không có cơ chế nào cho user vừa ghi được đọc lại chính dữ liệu mình vừa ghi.",
      "language": "java",
      "failingEvidence": "Hành vi thật: 3 giây sau khi đặt, lịch sử đơn trống; 8 giây sau, đơn xuất hiện mà không cần thao tác gì thêm. Không có đơn nào mất, không có lỗi nào trong log — chỉ là replica chưa kịp đồng bộ lúc user bấm sang trang.",
      "checks": [
        "Đoán đúng: không phải bug, đơn sẽ hiện sau vài giây khi replica đồng bộ xong",
        "Chọn đúng cách xử lý: nói rõ cho user và cho code (đọc từ nguồn ghi hoặc chờ xác nhận)"
      ],
      "solution": "Không phải bug: đây là cửa sổ không nhất quán của eventual consistency. Đơn đã ghi thành công ở primary, lịch sử đọc từ replica nên 3 giây đầu chưa thấy, vài giây sau replica đồng bộ xong thì đơn hiện. Cách xử lý đúng: với chính user vừa ghi, áp dụng read-your-writes (đọc từ nguồn ghi hoặc hiển thị trạng thái chờ), và nói rõ cho user là đơn sẽ hiện trong giây lát.",
      "why": "Eventual consistency hứa dữ liệu sẽ khớp sau một lúc, không hứa khớp ngay. Code và giao diện phụ thuộc vào giả định đọc sau ghi luôn thấy mới sẽ hiểu nhầm cửa sổ này là mất dữ liệu, rồi sinh thêm logic sửa sai.",
      "hints": [
        "Lịch sử đơn đọc từ đâu: primary hay replica?",
        "Đơn không mất mà chỉ chậm hiện — phân biệt hai điều này bằng cách chờ vài giây rồi tải lại."
      ]
    },
    {
      "id": "19-3",
      "concept": "Causal consistency",
      "type": "fix-bug",
      "title": "Bình luận hiện trước cả bài viết nó trả lời",
      "prompt": "User phàn nàn rằng họ thấy bình luận trả lời trước khi thấy bài viết gốc, đọc không hiểu gì. Bạn mở code lấy feed và thấy nó sắp xếp mọi bài và bình luận chỉ theo thời gian tạo, trong khi các bản ghi tới từ nhiều replica có đồng hồ lệch nhau. Hãy tìm lỗi sắp xếp và sửa sao cho quan hệ nguyên nhân không bao giờ bị đảo.",
      "code": "public List<Post> getFeed() {\n    List<Post> posts = feedRepo.findAll();\n    posts.sort(Comparator.comparing(Post::getCreatedAt)); // sắp theo giờ tạo\n    return posts;\n}\n// Bình luận tạo lúc 10:00:05 ở replica A, bài gốc tạo lúc 10:00:03 ở replica B\n// nhưng đồng hồ replica B chạy chậm 5 giây nên bài gốc ghi createdAt là 09:59:58.",
      "language": "java",
      "failingEvidence": "Feed thật: bình luận trả lời hiện ở trên, bài gốc hiện ở dưới, dù bình luận được viết sau bài gốc 2 giây. User đọc bình luận trước, không biết nó đang trả lời cái gì. Lỗi chỉ xuất hiện khi bài và bình luận đi qua hai replica khác nhau.",
      "checks": [
        "Chọn đúng nguyên nhân: sắp xếp theo đồng hồ lệch nhau của nhiều replica",
        "Chọn đúng cách sửa: sắp xếp theo số thứ tự nhân quả (sequence) thay vì giờ tạo"
      ],
      "solution": "public List<Post> getFeed() {\n    List<Post> posts = feedRepo.findAll();\n    // Sắp xếp theo số thứ tự nhân quả gán lúc ghi (cùng một nguồn thứ tự),\n    // và luôn giữ bài gốc trước các bình luận trả lời nó.\n    posts.sort(Comparator.comparing(Post::getCausalSequence));\n    return posts;\n}",
      "why": "Đồng hồ của nhiều máy không bao giờ khớp tuyệt đối nên giờ tạo không phải là thứ tự nhân quả. Causal consistency yêu cầu sự kiện có quan hệ nguyên nhân phải hiện đúng thứ tự đó, và thứ tự đó phải tới từ một nguồn thứ tự duy nhất, không phải từ đồng hồ từng máy.",
      "hints": [
        "Thứ tự nhân quả và thứ tự đồng hồ có phải lúc nào cũng trùng nhau không?",
        "Muốn giữ thứ tự nguyên nhân thì cần một con số thứ tự chung, không phải giờ của từng máy."
      ]
    },
    {
      "id": "19-4",
      "concept": "CAP và PACELC",
      "type": "skeleton",
      "title": "Điền lựa chọn CAP khi mạng chia cắt",
      "prompt": "Kiến trúc sư yêu cầu bạn điền quyết định cho hệ thống đặt hàng khi mạng chia cắt thành hai phía không liên lạc được. Khung quyết định dưới đây còn trống hai lựa chọn quan trọng nhất. Hãy điền sao cho không hứa điều CAP nói là không thể, và ghi rõ phía bị từ chối sẽ thấy gì.",
      "code": "// Khi mạng chia cắt, hệ thống đặt hàng chọn:\n// TODO 1: chọn nhất quán (dừng nhận ghi) hay khả dụng (vẫn nhận ghi, chấp nhận lệch tạm)?\n// TODO 2: phía không được chọn sẽ thấy gì, và dữ liệu lệch sẽ khớp lại bằng cách nào?\n// Khi mạng bình thường, hệ thống chọn: độ trễ thấp hay nhất quán cao? (PACELC)",
      "language": "yaml",
      "failingEvidence": "Thiết kế cũ ghi: hệ thống luôn nhất quán và luôn khả dụng kể cả khi mạng chia cắt. Khi chia cắt thật, hai phía cùng nhận đơn trên cùng một tồn kho, khớp lại thì tồn kho âm và phải hủy đơn tay. Lời hứa ban đầu là điều CAP nói không thể.",
      "checks": [
        "Điền đúng lựa chọn cho đặt hàng: khả dụng có kiểm soát hoặc nhất quán — nhưng phải chọn một, không chọn cả hai",
        "Điền đúng hành vi của phía bị từ chối và cách khớp lại dữ liệu"
      ],
      "solution": "// Đặt hàng chọn khả dụng có kiểm soát: vẫn nhận đơn khi chia cắt,\n// nhưng đơn vào trạng thái chờ xác nhận tồn kho, không xác nhận giao ngay.\n// Khi mạng liền lại, saga đối soát tồn kho: đơn nào vượt tồn kho thì hủy và hoàn tiền.\n// Khi mạng bình thường, chọn độ trễ thấp cho đọc feed, nhất quán cao cho đọc số dư ví (PACELC).",
      "why": "CAP bắt chọn một trong hai khi chia cắt: giữ nhất quán thì phải dừng nhận ghi, giữ khả dụng thì phải chấp nhận lệch tạm và có cách khớp lại. Không chọn rõ từ đầu thì lúc chia cắt thật, mỗi phía tự quyết và dữ liệu lệch không có cách khớp.",
      "hints": [
        "CAP chỉ bắt chọn khi mạng chia cắt; khi mạng bình thường thì PACELC mới là câu hỏi.",
        "Chọn khả dụng thì phải viết luôn cách khớp lại dữ liệu sau khi mạng liền."
      ]
    },
    {
      "id": "19-5",
      "concept": "Eventual consistency",
      "type": "terminal",
      "title": "Dùng curl chứng minh đơn không mất, chỉ chậm hiện",
      "prompt": "Đội hỗ trợ nhận ticket: user báo đặt hàng xong nhưng lịch sử đơn trống, nghi là mất đơn. Bạn không vội kết luận bug mà chạy hai lệnh curl cách nhau vài giây trên terminal để kiểm tra. Hãy đọc kịch bản và kết luận: đơn có mất không, và bằng chứng nào phân biệt mất đơn với chậm đồng bộ.",
      "code": "# Lệnh bạn chạy: lấy lịch sử đơn ngay sau khi đặt, rồi chạy lại sau 10 giây\ncurl -s https://api.example.com/orders/history -H \"Authorization: Bearer TOKEN\" | grep order-1042",
      "language": "bash",
      "failingEvidence": "Lần chạy đầu (3 giây sau khi đặt): không thấy order-1042. Lần chạy sau (13 giây sau khi đặt): thấy order-1042 với đúng tổng tiền và trạng thái PAID. Không có lỗi nào trong log, đơn không hề mất.",
      "checks": [
        "Chọn đúng kết luận: đơn không mất, chỉ chậm đồng bộ replica",
        "Chọn đúng bằng chứng: cùng một lệnh, lần sau thấy đơn mà không cần sửa gì"
      ],
      "solution": "Đơn không mất, chỉ chậm hiện vì lịch sử đọc từ replica. Bằng chứng: cùng một lệnh curl, lần đầu chưa thấy, lần sau thấy đủ dữ liệu mà không ai sửa gì — đó là dấu hiệu của đồng bộ chậm, không phải mất dữ liệu. Nếu là mất đơn thì lần sau vẫn không thấy. Cách xử lý lâu dài: read-your-writes cho chính user vừa ghi và thông báo rõ thời gian chờ.",
      "why": "Phân biệt mất dữ liệu với chậm đồng bộ bằng cách đo lại sau một khoảng: chậm thì dữ liệu tự xuất hiện, mất thì không bao giờ xuất hiện. Kết luận vội là mất đơn sẽ dẫn tới sửa sai chỗ, ví dụ ghi đè hoặc tạo đơn trùng.",
      "hints": [
        "Một lần không thấy chưa đủ kết luận: cần đo lại sau bao lâu?",
        "Dữ liệu tự xuất hiện mà không ai sửa gì thì đó là chậm, không phải mất."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "curl -s https://api.example.com/orders/history -H \"Authorization: Bearer TOKEN\" | grep order-1042",
            "output": "(không có kết quả — 3 giây sau khi đặt)"
          },
          {
            "cmd": "sleep 10; curl -s https://api.example.com/orders/history -H \"Authorization: Bearer TOKEN\" | grep order-1042",
            "output": "order-1042 PAID total=250000 created_at=10:02:11"
          },
          {
            "cmd": "curl -s https://api.example.com/orders/order-1042 -H \"Authorization: Bearer TOKEN\"",
            "output": "order-1042 PAID total=250000 — đơn tồn tại ở primary từ đầu"
          }
        ]
      }
    }
  ],
  "20":   [
    {
      "id": "20-1",
      "concept": "Xóa giả định nguy hiểm",
      "type": "fix-bug",
      "title": "Message trùng trừ điểm hai lần: giả định nào đã sai?",
      "prompt": "Một user báo điểm tích lũy bị trừ hai lần cho một đơn duy nhất. Bạn mở consumer trừ điểm và thấy nó tin rằng message không bao giờ trùng. Hãy tìm giả định nguy hiểm đó, gạch bỏ nó và sửa consumer sao cho message trùng tới bao nhiêu lần cũng chỉ trừ một lần.",
      "code": "public void onPaymentSucceeded(PaymentSucceeded event) {\n    // Giả định: message không bao giờ trùng, nên cứ nhận là trừ\n    pointsService.deduct(event.getUserId(), event.getPoints());\n}",
      "language": "java",
      "failingEvidence": "Log: cùng một event id pay-881 tới hai lần (lần đầu do retry của broker, lần sau do worker gửi lại). Điểm trừ hai lần, user mất 200 điểm thay vì 100. Không có bảng nào ghi event nào đã xử lý.",
      "checks": [
        "Chọn đúng giả định sai: message không trùng",
        "Chọn đúng cách sửa: dedup bằng event id lưu bền trước khi trừ điểm"
      ],
      "solution": "public void onPaymentSucceeded(PaymentSucceeded event) {\n    if (!processedEventRepo.saveIfAbsent(event.getEventId())) return; // đã xử lý thì bỏ qua\n    pointsService.deduct(event.getUserId(), event.getPoints());\n}\n// saveIfAbsent dùng khóa duy nhất trên event id, lưu trong cùng transaction với trừ điểm.",
      "why": "Message trùng là bình thường trong hệ phân tán vì retry và gửi lại, không phải lỗi hiếm. Consumer không idempotent thì mỗi lần trùng là một lần trừ thật. Dedup bằng event id lưu bền là cách duy nhất biến at-least-once thành hiệu ứng đúng một lần.",
      "hints": [
        "Message trùng tới từ đâu: retry của broker hay worker gửi lại?",
        "Muốn trừ đúng một lần thì phải ghi lại event nào đã xử lý, ở chỗ bền, trước khi trừ."
      ]
    },
    {
      "id": "20-2",
      "concept": "Failure mode",
      "type": "skeleton",
      "title": "Điền bảng failure mode cho ca Redis sập",
      "prompt": "Bạn được giao viết bảng failure mode cho ca Redis sập, và trưởng nhóm trả lại bản nháp vì nó chỉ ghi một dòng: hiếm khi xảy ra. Khung bảng dưới đây còn trống đúng những cột mà người trực lúc 2 giờ sáng cần nhất. Hãy điền đủ để bảng dùng được thật khi sự cố xảy ra.",
      "code": "# Ca: Redis sập\n# TODO 1: user thấy gì? (chậm hơn, lỗi, hay không thấy gì?)\n# TODO 2: dữ liệu ở trạng thái gì? (cache mất, DB có mất không?)\n# TODO 3: ai sửa, sửa bằng gì? (tự hồi phục hay cần người?)\n# TODO 4: phát hiện từ log/metric nào?",
      "language": "yaml",
      "failingEvidence": "Bảng cũ: \"Redis sập — hiếm khi xảy ra\". Khi Redis sập thật, đội trực mất 40 phút mới biết cache mất chứ DB vẫn nguyên, và không biết hệ thống có tự fallback đọc DB hay không vì bảng không ghi.",
      "checks": [
        "Điền đủ cả 4 cột: user thấy gì, dữ liệu ra sao, ai sửa bằng gì, phát hiện từ đâu",
        "Điền đúng hành vi: fallback đọc DB trực tiếp, chậm hơn nhưng không lỗi"
      ],
      "solution": "# Ca: Redis sập\n# User thấy: trang chậm hơn nhưng vẫn xem được dữ liệu, không thấy lỗi.\n# Dữ liệu: cache mất, DB vẫn nguyên; dữ liệu đọc từ DB là đúng, chỉ chậm.\n# Ai sửa: hệ thống tự fallback đọc DB; người trực khởi động lại Redis, cache tự ấm dần.\n# Phát hiện: metric cache_hit_rate rơi về 0, alert Redis down, log fallback-to-db tăng.",
      "why": "Một ca failure mode chỉ dùng được khi trả lời đủ: user thấy gì, dữ liệu ra sao, ai sửa bằng gì, phát hiện từ đâu. Thiếu một cột là lúc sự cố thật, người trực phải đoán đúng cột đó trong lúc đang áp lực.",
      "hints": [
        "Đặt mình vào vị trí người trực lúc 2 giờ sáng: họ cần biết gì đầu tiên?",
        "Cache mất không có nghĩa là dữ liệu mất — phân biệt hai điều này trong bảng."
      ]
    },
    {
      "id": "20-3",
      "concept": "Drill",
      "type": "decision",
      "title": "Chọn 2 ca drill nặng nhất trong 6 ca",
      "prompt": "Tuần này team chỉ có thời gian drill 2 ca trong bảng 6 ca failure mode. Bạn có hai phương án chọn dưới đây. Hãy chọn cặp ca drill xứng đáng nhất theo tiêu chí: thiệt hại cho user và khả năng thiết kế hiện tại chưa chứng minh được, không chọn theo ca dễ giả lập nhất.",
      "code": "// Phương án A: drill \"Redis sập\" và \"API bên ngoài trả lỗi\"\n// -> dễ giả lập, hệ thống đã có fallback đọc DB và thông báo lỗi rõ ràng.\n\n// Phương án B: drill \"service kho chết giữa saga\" và \"message trùng\"\n// -> khó giả lập hơn, nhưng hai ca này từng gây kẹt đơn và trừ điểm hai lần,\n// và bước bù + dedup của chúng chưa bao giờ được chạy thật.",
      "language": "yaml",
      "failingEvidence": "Nếu chọn sai (phương án A): drill xong cả hai ca đều đạt, team tưởng hệ thống chịu lỗi tốt, nhưng ca kho chết giữa saga vẫn chưa từng chạy bù thật — lần sự cố thật sau đó, bù không chạy và đơn kẹt 3 ngày.",
      "checks": [
        "Chọn đúng phương án B",
        "Chọn đúng lý do: drill ca chưa được chứng minh và thiệt hại lớn, không phải ca dễ nhất"
      ],
      "solution": "Chọn phương án B — drill service kho chết giữa saga và message trùng. Hai ca này có thiệt hại thật (kẹt đơn, trừ điểm trùng) và cơ chế cứu chúng (bù saga, dedup) chưa bao giờ chạy thật nên chưa ai biết chúng có chạy không. Drill ca đã có fallback chứng minh chỉ xác nhận điều đã biết.",
      "why": "Giá trị của drill nằm ở chỗ nó có thể phát hiện thiết kế sai, không nằm ở số ca drill xong. Drill ca dễ và đã chắc chắn chỉ tạo cảm giác an toàn giả, trong khi ca nặng chưa chứng minh vẫn nằm đó chờ sự cố thật.",
      "hints": [
        "Hỏi: ca nào nếu sai thì user mất tiền hoặc kẹt đơn, và ca đó đã từng chạy thật chưa?",
        "Drill để tìm lỗi, không phải để lấy số ca đạt."
      ]
    },
    {
      "id": "20-4",
      "concept": "Failure mode",
      "type": "predict",
      "title": "Đoán trạng thái đơn khi service kho chết giữa saga",
      "prompt": "Bạn đang review saga đặt hàng và được hỏi một tình huống: đơn đã thanh toán xong, đúng lúc đó service kho chết trước khi trừ kho. Không ai can thiệp trong 1 giờ. Hãy đoán trạng thái của đơn, của tiền và của kho sau 1 giờ đó, rồi đối chiếu xem saga có tự cứu được không.",
      "code": "// Saga: tạo đơn -> thanh toán (thành công) -> trừ kho (service kho chết ngay trước bước này)\n// Bước bù đã viết: nếu trừ kho thất bại thì hoàn tiền và hủy đơn.\n// Nhưng bước bù chỉ chạy khi service kho trả lỗi; service chết hẳn thì không ai trả lỗi về.",
      "language": "java",
      "failingEvidence": "Trạng thái thật sau 1 giờ: đơn ở PAID, tiền đã trừ, kho chưa trừ, không có bước bù nào chạy vì không có tín hiệu lỗi nào quay về. User thấy đơn thành công nhưng hàng không giao. Phải có người phát hiện tay từ alert đơn PAID không có trừ kho.",
      "checks": [
        "Đoán đúng cả ba: đơn PAID, tiền đã trừ, kho chưa trừ",
        "Chọn đúng kết luận: saga không tự cứu vì bù chỉ chạy khi có tín hiệu lỗi"
      ],
      "solution": "Sau 1 giờ: đơn vẫn PAID, tiền vẫn bị trừ, kho vẫn chưa trừ, và không có bù nào chạy. Saga chỉ tự cứu khi nó nhận được tín hiệu lỗi hoặc hết timeout; service chết hẳn mà không có timeout và không có job quét đơn kẹt thì saga đứng yên. Cách sửa: đặt timeout cho bước trừ kho và chạy job định kỳ quét đơn PAID quá lâu không có trừ kho để kích hoạt bù.",
      "why": "Bước bù chỉ chạy khi lỗi được phát hiện, còn service chết im lặng thì không ai báo lỗi về. Thiết kế chịu lỗi phải có cả hai: phát hiện lỗi (timeout, job quét) và bù lỗi, thiếu phát hiện thì bù có viết cũng không chạy.",
      "hints": [
        "Bước bù chạy khi nào: khi có lỗi trả về, hay khi có ai đó phát hiện ra lỗi?",
        "Service chết im lặng khác service trả lỗi ở điểm nào?"
      ]
    },
    {
      "id": "20-5",
      "concept": "Drill",
      "type": "terminal",
      "title": "Drill tắt service kho: ghi kết quả thật, đừng ghi cho qua",
      "prompt": "Bạn chạy drill tắt service kho 5 phút trên staging và đặt 10 đơn trong thời gian đó. Trưởng nhóm dặn: ghi kết quả thật, nếu bù không chạy thì ghi là không chạy, không được sửa kỳ vọng cho khớp kết quả. Hãy đọc kịch bản terminal dưới đây và kết luận drill đạt hay không đạt.",
      "code": "# Kịch bản drill: tắt service kho 5 phút, đặt 10 đơn, rồi bật lại và quan sát\n# Kỳ vọng: 10 đơn vào trạng thái chờ bù, sau khi bật lại thì bù chạy và đơn được xử lý đúng.",
      "language": "bash",
      "failingEvidence": "Kết quả thật: 10 đơn kẹt ở PAID trong suốt 5 phút và thêm 30 phút sau khi bật lại, không có bù nào chạy. Log không có dòng nào về bù. User trong drill thấy đơn thành công nhưng hàng không giao.",
      "checks": [
        "Chọn đúng kết luận: drill KHÔNG đạt vì bù không chạy",
        "Chọn đúng hành động tiếp theo: sửa thiết kế (thêm timeout và job quét) thay vì sửa kỳ vọng"
      ],
      "solution": "Drill không đạt: bù không chạy, 10 đơn kẹt ở PAID dù service đã sống lại. Hành động tiếp theo là sửa thiết kế — thêm timeout cho bước trừ kho và job quét đơn kẹt để kích hoạt bù — rồi drill lại. Ghi đạt cho qua trong trường hợp này còn nguy hiểm hơn không drill, vì nó che mất lỗi thật.",
      "why": "Drill chỉ có giá trị khi kết quả thật được ghi và so với kỳ vọng, rồi sửa thiết kế nếu lệch. Sửa kỳ vọng cho khớp kết quả là gian lận với chính mình: lỗi vẫn ở đó, chỉ là báo cáo không còn thấy nó nữa.",
      "hints": [
        "So sánh kết quả thật với kỳ vọng, đừng so kết quả thật với những gì dễ chấp nhận.",
        "Nếu bù không chạy thì lỗi nằm ở thiết kế phát hiện lỗi, không phải ở drill."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "docker stop inventory-service && for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -X POST http://staging.example.com/orders | grep order_id; done",
            "output": "10 đơn tạo thành công, trạng thái PAID"
          },
          {
            "cmd": "docker start inventory-service; sleep 60; psql -c \"SELECT status, count(*) FROM orders WHERE created_at > now() - interval '1 hour' GROUP BY status;\"",
            "output": " PAID | 10\n-- không đơn nào chuyển trạng thái sau khi service sống lại"
          },
          {
            "cmd": "docker logs order-service --since 1h | grep -i compensat || echo \"no compensation log found\"",
            "output": "no compensation log found"
          }
        ]
      }
    }
  ],
  "21":   [
    {
      "id": "21-1",
      "concept": "Modular Monolith",
      "type": "decision",
      "title": "Team 5 người, 1 sản phẩm: tách microservices hay giữ modular monolith?",
      "prompt": "Bạn tư vấn kiến trúc cho một team 5 người làm hệ thống đặt hàng, hiện tại có 1 deploy và chưa có nhu cầu scale lệch nhau giữa các module. Có người đề xuất tách ngay thành 8 microservices cho hiện đại. Hãy nhìn hai phương án dưới đây và chọn phương án đúng cho team này, kèm điều kiện cụ thể nào thì mới được tách.",
      "code": "// Phương án A: 8 microservices ngay từ đầu\n// -> 8 deploy, 8 DB, saga xuyên service, tracing xuyên service, team 5 người vận hành 8 service.\n\n// Phương án B: modular monolith — 1 deploy, module có biên rõ\n// -> đơn hàng, thanh toán, kho là module riêng, gọi nhau qua API nội bộ,\n// -> không đọc thẳng DB của module khác; sau này đủ điều kiện mới tách thành service.",
      "language": "yaml",
      "failingEvidence": "Nếu chọn sai (tách ngay): team 5 người dành phần lớn thời gian vận hành, debug một request phải lần 8 service, deploy một tính năng phải phối hợp 8 service. Tốc độ giao tính năng chậm lại dù kiến trúc trông hiện đại hơn.",
      "checks": [
        "Chọn đúng phương án B (modular monolith) cho team nhỏ chưa có nhu cầu scale lệch",
        "Nêu đúng điều kiện tách: scale lệch có số đo, team riêng, hoặc deploy gây gián đoạn lẫn nhau"
      ],
      "solution": "Chọn phương án B — modular monolith. Biên module rõ hôm nay thì ngày mai tách thành service vẫn được mà chưa phải trả giá của hệ phân tán. Chỉ tách khi có ít nhất hai điều kiện đo được: một module cần scale gấp nhiều lần module khác, có team riêng chịu trách nhiệm, hoặc deploy một module làm gián đoạn module khác quá ngưỡng.",
      "why": "Microservices trả giá bằng network, consistency, deploy phức tạp và debug xuyên service. Trả giá đó khi chưa cần là tự sát về tốc độ: team nhỏ sẽ vận hành nhiều hơn làm tính năng. Modular monolith giữ lại phần lớn lợi ích tách biệt mà không trả giá phân tán.",
      "hints": [
        "Hỏi: nhu cầu scale lệch nhau giữa các module đã đo được bằng số chưa, hay chỉ là cảm giác?",
        "Tách được dễ dàng sau này chính là lý do không cần tách ngay bây giờ."
      ]
    },
    {
      "id": "21-2",
      "concept": "Hexagonal / Clean Architecture",
      "type": "fix-bug",
      "title": "Controller import thẳng entity JPA: phá biên ở đâu?",
      "prompt": "Trong buổi review, bạn thấy controller đặt hàng import thẳng entity JPA và gọi repository, còn logic tính tổng tiền nằm lẫn trong controller. Kiến trúc sư nói biên hexagonal đã bị phá. Hãy chỉ ra đúng chỗ phá biên và sửa sao cho domain không còn biết gì về framework hay database.",
      "code": "@RestController\npublic class OrderController {\n    @Autowired OrderRepository orderRepo; // JPA repository trong controller\n    @PostMapping(\"/orders\")\n    public Order create(@RequestBody OrderEntity entity) { // entity JPA làm DTO luôn\n        entity.setTotal(entity.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQty()).sum());\n        return orderRepo.save(entity);\n    }\n}",
      "language": "java",
      "failingEvidence": "Hậu quả: đổi database từ Postgres sang MongoDB thì phải sửa cả controller; viết test cho logic tính tổng tiền phải khởi động cả JPA và DB; một lần đổi entity để phục vụ DB làm vỡ luôn contract API vì entity cũng là DTO.",
      "checks": [
        "Chọn đúng chỗ phá biên: controller phụ thuộc JPA entity và repository",
        "Chọn đúng cách sửa: controller gọi port/service của domain, DTO riêng, adapter riêng"
      ],
      "solution": "@RestController\npublic class OrderController {\n    private final CreateOrderUseCase useCase; // port vào domain, không biết JPA\n    @PostMapping(\"/orders\")\n    public OrderResponse create(@RequestBody CreateOrderRequest dto) {\n        return useCase.execute(dto); // logic tổng tiền ở domain, lưu trữ ở adapter\n    }\n}\n// OrderEntity JPA chỉ nằm ở adapter lưu trữ, không bao giờ lọt ra controller hay API.",
      "why": "Hexagonal yêu cầu dependency hướng vào trong: domain không được biết tầng ngoài là HTTP hay SQL. Controller ôm cả JPA lẫn logic nghiệp vụ thì đổi framework hay đổi DB đều phải viết lại nghiệp vụ, và test nghiệp vụ phải kéo theo cả hạ tầng.",
      "hints": [
        "Hỏi: muốn test logic tính tổng tiền thì có cần khởi động database không? Nếu có thì biên đã sai.",
        "Entity JPA và DTO API là hai thứ khác nhau, đừng dùng một class cho cả hai."
      ]
    },
    {
      "id": "21-3",
      "concept": "Modular Monolith",
      "type": "skeleton",
      "title": "Điền biên module: kho không được đọc thẳng DB đơn hàng",
      "prompt": "Bạn chia monolith thành module và phát hiện module kho đang đọc thẳng bảng orders để biết đơn nào cần giao. Trưởng nhóm yêu cầu sửa thành biên module đúng. Khung code dưới đây còn trống chỗ cần thay. Hãy điền cách giao tiếp đúng giữa hai module.",
      "code": "// Module kho hiện tại: đọc thẳng DB của module đơn hàng\n// OrderEntity order = orderTable.findById(orderId); // TODO: thay bằng gì?\n// Module đơn hàng sở hữu bảng orders, module khác không được chạm trực tiếp.",
      "language": "java",
      "failingEvidence": "Hậu quả hiện tại: đổi schema bảng orders là module kho vỡ theo dù nghiệp vụ kho không đổi; tách module kho thành service riêng sau này là không thể vì nó đang bám thẳng vào DB của module khác.",
      "checks": [
        "Điền đúng cách giao tiếp: gọi API nội bộ hoặc nghe event của module đơn hàng",
        "Điền đúng nguyên tắc: mỗi module chỉ sở hữu DB của mình"
      ],
      "solution": "// Module kho gọi qua API nội bộ của module đơn hàng, hoặc nghe event OrderPaid:\n// OrderView order = orderModuleApi.getOrderForFulfillment(orderId);\n// Hoặc: @EventListener(OrderPaid.class) -> kho nhận event và tự lưu bản sao cần thiết.\n// Module kho không bao giờ query thẳng bảng orders.",
      "why": "Biên module chỉ thật khi dữ liệu cũng có biên: module nào sở hữu dữ liệu thì module khác chỉ tiếp cận qua API hoặc event của nó. Đọc thẳng DB là phá biên ở tầng dữ liệu, và mọi lợi ích tách module sau này đều mất theo.",
      "hints": [
        "Chủ sở hữu dữ liệu là ai: module nào sở hữu bảng thì module đó quyết định cách đọc.",
        "Hai cách qua biên hợp lệ là API nội bộ và event, không có cách thứ ba là đọc thẳng bảng."
      ]
    },
    {
      "id": "21-4",
      "concept": "Monolith",
      "type": "predict",
      "title": "Đoán phạm vi deploy khi sửa một dòng ở module thông báo",
      "prompt": "Hệ thống đang là monolith một deploy unit, và bạn sửa một dòng ở module thông báo: đổi mẫu câu chữ trong email xác nhận đơn. Trước khi bấm deploy, hãy đoán: phạm vi deploy ảnh hưởng tới những module nào, và rủi ro lớn nhất của lần deploy này là gì?",
      "code": "// Monolith: đơn hàng + thanh toán + kho + thông báo chung 1 deploy unit, 1 tiến trình.\n// Thay đổi: chỉ sửa text email trong module thông báo, không đụng logic đơn hàng hay thanh toán.",
      "language": "yaml",
      "failingEvidence": "Thực tế: deploy lần này triển khai lại toàn bộ hệ thống, kể cả đơn hàng và thanh toán dù không sửa gì ở đó. Một lỗi nhỏ ở module thông báo làm cả hệ thống phải rollback, dù đơn hàng và thanh toán hoàn toàn khỏe.",
      "checks": [
        "Đoán đúng phạm vi: deploy lại toàn bộ hệ thống dù chỉ sửa một module",
        "Chọn đúng rủi ro: lỗi ở module nhỏ kéo theo rollback cả hệ thống"
      ],
      "solution": "Phạm vi deploy là toàn bộ hệ thống vì monolith chỉ có một deploy unit. Rủi ro lớn nhất: một lỗi nhỏ ở module thông báo cũng làm cả hệ thống phải rollback, và đổi một module là deploy lại mọi module. Đây là cái giá của monolith, và là lý do modular monolith vẫn cần biên rõ để sau này tách khi cần.",
      "why": "Đơn vị deploy quyết định phạm vi rủi ro: một deploy unit thì một lỗi ở đâu cũng là lỗi của toàn bộ lần deploy đó. Hiểu điều này mới cân nhắc đúng khi nào giữ monolith và khi nào tách.",
      "hints": [
        "Đơn vị deploy là gì ở đây: một khối hay nhiều khối?",
        "Sửa nhỏ không có nghĩa là rủi ro nhỏ khi đơn vị deploy là toàn bộ hệ thống."
      ]
    },
    {
      "id": "21-5",
      "concept": "Hexagonal / Clean Architecture",
      "type": "decision",
      "title": "Đổi database mà không đổi domain: chọn thiết kế nào?",
      "prompt": "Công ty đang cân nhắc đổi database lưu trữ từ Postgres sang MongoDB trong năm tới, nhưng không muốn viết lại logic nghiệp vụ. Bạn có hai cách tổ chức code dưới đây. Hãy chọn cách mà việc đổi database chỉ chạm tới một chỗ, và chỉ ra chỗ đó là chỗ nào.",
      "code": "// Phương án A: logic nghiệp vụ nằm trong repository Postgres\n// -> đổi DB là viết lại cả logic, vì logic đang sống cùng code SQL.\n\n// Phương án B: domain ở giữa, chỉ biết port (cổng lưu trữ)\n// -> Postgres adapter và MongoDB adapter cùng thực thi một port.\n// -> đổi DB là thay adapter, domain không đổi một dòng.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (phương án A): lần đổi DB trước đây phải viết lại logic tính giá và kiểm tra tồn kho vì chúng nằm trong repository Postgres, và sinh thêm 6 bug nghiệp vụ trong lúc chuyển đổi dù nghiệp vụ không hề đổi.",
      "checks": [
        "Chọn đúng phương án B (domain qua port, DB ở adapter)",
        "Chọn đúng chỗ duy nhất cần thay khi đổi DB: adapter lưu trữ"
      ],
      "solution": "Chọn phương án B. Domain chỉ phụ thuộc vào port trừu tượng, mọi chi tiết Postgres hay MongoDB nằm ở adapter bên ngoài. Đổi DB là viết adapter mới cho cùng một port, domain và test nghiệp vụ giữ nguyên.",
      "why": "Dependency hướng vào trong là toàn bộ ý nghĩa của hexagonal: tầng trong không biết tầng ngoài là gì, nên thay tầng ngoài không kéo theo tầng trong. Logic sống cùng code SQL thì không còn là domain nữa mà là code hạ tầng mang vỏ nghiệp vụ.",
      "hints": [
        "Hỏi: khi đổi DB, có bao nhiêu file nghiệp vụ phải mở ra sửa?",
        "Thứ duy nhất domain được phép biết là port, không phải là SQL hay driver."
      ]
    }
  ],
  "22":   [
    {
      "id": "22-1",
      "concept": "Aggregate",
      "type": "fix-bug",
      "title": "Sửa trực tiếp OrderItem làm tổng tiền lệch khỏi trạng thái",
      "prompt": "Kế toán báo tổng tiền đơn không khớp với tổng các item trong nhiều đơn. Bạn mở code và thấy có một đường sửa item không đi qua Order mà đi thẳng vào repository của item. Hãy tìm đường đó và sửa sao cho mọi sửa đổi item đều phải qua aggregate root để kiểm tra invariant.",
      "code": "@Service\npublic class ItemService {\n    public void changeQuantity(Long itemId, int qty) {\n        OrderItem item = itemRepo.findById(itemId).orElseThrow();\n        item.setQuantity(qty); // sửa trực tiếp, không qua Order\n        itemRepo.save(item);   // tổng tiền của Order không được tính lại\n    }\n}",
      "language": "java",
      "failingEvidence": "Đơn 205: tổng tiền Order ghi 500 nghìn nhưng cộng các item lại là 650 nghìn. Đơn đã SHIPPED vẫn bị sửa số lượng vì không có kiểm tra trạng thái nào chặn lại. Kế toán đối soát lệch 150 nghìn trên đơn này.",
      "checks": [
        "Chọn đúng lỗi: sửa entity con qua repository riêng, bypass aggregate root",
        "Chọn đúng cách sửa: mọi sửa đổi qua phương thức của Order, Order tính lại tổng và kiểm tra trạng thái"
      ],
      "solution": "@Service\npublic class OrderService {\n    public void changeQuantity(Long orderId, Long itemId, int qty) {\n        Order order = orderRepo.findById(orderId).orElseThrow();\n        order.changeItemQuantity(itemId, qty); // Order kiểm tra trạng thái, tính lại tổng\n        orderRepo.save(order);\n    }\n}\n// Trong Order.changeItemQuantity: nếu status là SHIPPED hoặc CANCELLED thì từ chối;\n// sau khi đổi thì total = tổng các item, và chỉ lưu qua repository của Order.",
      "why": "Aggregate là ranh giới của transaction và invariant: tổng tiền và trạng thái chỉ đúng khi mọi sửa đổi đều qua root để root kiểm tra. Sửa con trực tiếp thì invariant không còn ai bảo vệ, dữ liệu lệch mà không có lỗi nào báo.",
      "hints": [
        "Ai là người duy nhất được phép biết tổng tiền phải bằng tổng item?",
        "Repository chỉ nên có cho aggregate root, không có cho entity con."
      ]
    },
    {
      "id": "22-2",
      "concept": "Aggregate",
      "type": "skeleton",
      "title": "Điền phương thức addItem của Order giữ invariant",
      "prompt": "Bạn viết aggregate Order và senior để lại khung phương thức addItem còn trống hai chỗ quan trọng. Hãy điền sao cho thêm item không bao giờ phá vỡ tổng tiền, và đơn ở trạng thái không được sửa thì từ chối ngay thay vì lưu rồi mới phát hiện.",
      "code": "public class Order {\n    private List<OrderItem> items;\n    private Money total;\n    private OrderStatus status;\n\n    public void addItem(OrderItem item) {\n        // TODO 1: trạng thái nào thì không được thêm item nữa? Từ chối bằng gì?\n        // TODO 2: sau khi thêm thì tổng tiền phải được làm gì trước khi lưu?\n    }\n}",
      "language": "java",
      "failingEvidence": "Test sẽ fail nếu điền sai: thêm item vào đơn đã CANCELLED vẫn thành công; hoặc thêm item xong mà total không đổi, đơn ghi 500 nghìn trong khi item cộng lại là 800 nghìn. Cả hai đều là invariant bị phá mà không có lỗi nào báo.",
      "checks": [
        "Điền đúng kiểm tra trạng thái: từ chối khi đơn đã CANCELLED hoặc SHIPPED",
        "Điền đúng tính lại tổng tiền từ danh sách item sau mỗi lần thêm"
      ],
      "solution": "public void addItem(OrderItem item) {\n    if (status == OrderStatus.CANCELLED || status == OrderStatus.SHIPPED) {\n        throw new IllegalStateException(\"Không thể thêm item vào đơn đã hủy hoặc đã giao\");\n    }\n    items.add(item);\n    this.total = Money.sum(items); // tính lại từ item, không tin total gửi lên\n}",
      "why": "Invariant chỉ có ý nghĩa khi nó được kiểm tra ở đúng nơi mọi thay đổi đi qua. Tính lại tổng từ item thay vì tin số gửi lên cũng chặn luôn đường sửa tổng tiền bằng DevTools.",
      "hints": [
        "Trạng thái nào mà thêm item vào là vô nghĩa: đơn đã hủy, đơn đã giao?",
        "Tổng tiền nên được tính từ đâu: từ item thật, hay từ con số người gọi gửi lên?"
      ]
    },
    {
      "id": "22-3",
      "concept": "Bounded Context",
      "type": "decision",
      "title": "Một model Order cho mọi team hay mỗi context một model?",
      "prompt": "Hai team Sales và Fulfillment cùng dùng từ Order nhưng quan tâm tới những thứ khác nhau, và model Order chung hiện tại đã phình tới 40 field, phần lớn là optional. Bạn có hai phương án dưới đây. Hãy chọn phương án dừng việc sửa team này làm vỡ team kia, và nói rõ hai context giao tiếp bằng gì.",
      "code": "// Phương án A: một model Order chung cho mọi team\n// -> 40 field, Sales sửa field giá thì Fulfillment cũng phải đọc lại,\n// -> field nào cũng optional vì team này cần, team kia không.\n\n// Phương án B: hai model riêng, nối bằng event\n// -> Sales Order: customerId, items, total, paymentStatus.\n// -> Fulfillment Order: orderId tham chiếu, warehouseId, address, deliveryStatus.\n// -> Sales phát event OrderPaid, Fulfillment nghe và tạo đơn giao của riêng nó.",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (một model chung): team Sales đổi ý nghĩa field status từ trạng thái thanh toán sang trạng thái giao hàng, team Fulfillment đọc sai và giao nhầm 30 đơn. Một từ, hai nghĩa, một model — hiểu nhầm là tất yếu.",
      "checks": [
        "Chọn đúng phương án B (mỗi context một model)",
        "Chọn đúng cách giao tiếp: event OrderPaid, không dùng chung bảng"
      ],
      "solution": "Chọn phương án B. Cùng một từ Order nhưng ở Sales nó là đơn khách đặt (giá, thanh toán), ở Fulfillment nó là đơn cần giao (kho, địa chỉ giao) — hai nghĩa, hai model, nối bằng event OrderPaid và OrderShipped. Không dùng chung một bảng Order cho cả hai.",
      "why": "Bounded context thừa nhận một từ có nghĩa khác nhau ở từng ngữ cảnh, và ép chúng thành một model chỉ tạo ra model khổng lồ mà không team nào hiểu hết. Tách model theo ngữ cảnh thì mỗi team sở hữu đúng phần mình hiểu, giao tiếp qua event rõ ràng.",
      "hints": [
        "Hỏi mỗi team: field nào của Order là thứ team bạn thật sự quan tâm?",
        "Nếu hai team trả lời khác nhau về cùng một từ, đó là hai context, không phải một model."
      ]
    },
    {
      "id": "22-4",
      "concept": "Entity vs Value Object",
      "type": "predict",
      "title": "Đoán hậu quả khi hai đơn dùng chung một đối tượng địa chỉ",
      "prompt": "Bạn đọc đoạn code dưới đây và được hỏi: khi khách của đơn A sửa địa chỉ giao hàng, đơn B sẽ ra sao? Hãy đoán trước khi đối chiếu, và chú ý xem địa chỉ ở đây được đối xử như entity có id hay như value object chỉ quan trọng bởi giá trị.",
      "code": "Address sharedAddress = new Address(\"12 Nguyễn Huệ\", \"Quận 1\");\nOrder orderA = new Order(sharedAddress);\nOrder orderB = new Order(sharedAddress);\n// Khách của đơn A sửa địa chỉ:\nsharedAddress.setStreet(\"45 Lê Lợi\"); // sửa trực tiếp đối tượng dùng chung",
      "language": "java",
      "failingEvidence": "Hậu quả thật: cả đơn A và đơn B đều đổi sang 45 Lê Lợi, dù khách của đơn B không sửa gì. Đơn B giao nhầm địa chỉ mới, và không có bản ghi nào cho thấy đơn B từng có địa chỉ cũ.",
      "checks": [
        "Đoán đúng: đơn B cũng bị đổi địa chỉ theo",
        "Chọn đúng nguyên nhân: địa chỉ bị đối xử như đối tượng dùng chung có thể sửa, thay vì value object bất biến"
      ],
      "solution": "Đơn B cũng bị đổi sang 45 Lê Lợi vì hai đơn đang giữ chung một đối tượng địa chỉ có thể sửa được. Địa chỉ là value object: không có id, chỉ quan trọng bởi giá trị, và phải bất biến — sửa địa chỉ là tạo một Address mới cho đơn đó, không sửa đối tượng cũ. Đơn B giữ Address cũ nguyên vẹn.",
      "why": "Entity có id và vòng đời nên sửa nó là sửa chính nó; value object chỉ có giá trị nên hai nơi dùng cùng giá trị không được liên lụy nhau khi một nơi đổi. Cho value object id rồi sửa trực tiếp là biến giá trị thành thực thể dùng chung, và lỗi lan sang đơn không liên quan.",
      "hints": [
        "Địa chỉ có cần id riêng và vòng đời riêng không, hay chỉ cần giá trị của nó?",
        "Muốn đổi giá trị mà không ảnh hưởng nơi khác thì phải tạo mới hay sửa cũ?"
      ]
    },
    {
      "id": "22-5",
      "concept": "Domain Event và Ubiquitous Language",
      "type": "terminal",
      "title": "Đọc event OrderPaid trên Kafka: tên event nói lên điều gì?",
      "prompt": "Bạn kiểm tra luồng giữa Sales và Fulfillment trên terminal staging và thấy các event chạy qua Kafka. Một event có tên lạ khiến bạn nghi ngờ ngôn ngữ chung của team đang lệch. Hãy đọc kịch bản và xác định: event nào đặt tên đúng chuẩn domain event, và event nào đang dùng ngôn ngữ kỹ thuật thay vì ngôn ngữ nghiệp vụ.",
      "code": "// Hai event chạy qua cùng một topic trong tuần qua:\n// Event 1: OrderPaid { orderId, amount, paidAt }\n// Event 2: UpdateOrderStatusToPaid { orderId, newStatus }",
      "language": "bash",
      "failingEvidence": "Hậu quả của tên sai: team mới đọc event UpdateOrderStatusToPaid tưởng đó là lệnh yêu cầu đổi trạng thái, viết consumer tự đổi trạng thái dù thanh toán chưa chắc thành công. Event đã xảy ra và mệnh lệnh yêu cầu làm gì đó là hai thứ khác nhau, nhầm lẫn này từng gây giao hàng cho đơn chưa thanh toán.",
      "checks": [
        "Chọn đúng event đặt tên đúng: OrderPaid (thì quá khứ, sự kiện đã xảy ra)",
        "Chọn đúng event sai: UpdateOrderStatusToPaid (dạng mệnh lệnh, không phải sự kiện)"
      ],
      "solution": "OrderPaid là domain event đúng: tên ở thì quá khứ, mô tả sự kiện đã xảy ra, các context khác nghe và tự quyết định phản ứng. UpdateOrderStatusToPaid là mệnh lệnh, không phải sự kiện — nó ra lệnh cho người nghe phải làm gì, làm người nghe phụ thuộc vào người phát. Ngôn ngữ chung cũng yêu cầu code, tài liệu và cuộc họp dùng cùng một từ cho cùng một khái niệm.",
      "why": "Domain event là cách các module giao tiếp mà không ràng buộc nhau: người phát chỉ thông báo điều đã xảy ra, người nghe tự quyết. Đặt tên event như mệnh lệnh biến thông báo thành điều khiển, và team khác đọc tên đó sẽ hiểu sai bản chất của luồng.",
      "hints": [
        "Sự kiện đã xảy ra thì tên của nó ở thì nào: quá khứ hay mệnh lệnh?",
        "Người phát event có nên ra lệnh cho người nghe phải làm gì không?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "kafka-console-consumer --topic order-events --from-beginning --max-messages 2",
            "output": "{\"type\":\"OrderPaid\",\"orderId\":205,\"amount\":500000,\"paidAt\":\"2026-10-29T10:02:11+07:00\"}\n{\"type\":\"UpdateOrderStatusToPaid\",\"orderId\":206,\"newStatus\":\"PAID\"}"
          },
          {
            "cmd": "grep -r \"UpdateOrderStatusToPaid\" src/main/java/ | wc -l",
            "output": "14 files use the command-style name"
          }
        ]
      }
    }
  ],
  "23":   [
    {
      "id": "23-1",
      "concept": "IDOR",
      "type": "fix-bug",
      "title": "Đổi ID trên URL là đọc được đơn của người khác",
      "prompt": "Một tester báo chỉ cần đổi số trong URL là xem được đơn của user khác, không cần biết mật khẩu ai. Bạn mở controller lấy đơn theo ID và thấy nó không kiểm tra gì ngoài việc đơn có tồn tại hay không. Hãy tìm lỗ hổng và sửa ở tầng dữ liệu, không chỉ ẩn nút ở frontend.",
      "code": "@GetMapping(\"/orders/{id}\")\npublic Order getOrder(@PathVariable Long id) {\n    return orderRepo.findById(id).orElseThrow(); // không kiểm tra chủ sở hữu\n}",
      "language": "java",
      "failingEvidence": "Bằng chứng: user A đăng nhập, gọi GET /orders/124 (đơn của user B) và nhận 200 kèm đầy đủ thông tin đơn, địa chỉ và số tiền của B. Frontend của A vốn không hiện nút tới đơn 124, nhưng gọi API trực tiếp thì qua mặt hoàn toàn.",
      "checks": [
        "Chọn đúng lỗi: thiếu kiểm tra chủ sở hữu sau khi load đơn",
        "Chọn đúng cách sửa: so sánh order.userId với user đang gọi, không phải thì 403"
      ],
      "solution": "@GetMapping(\"/orders/{id}\")\npublic Order getOrder(@PathVariable Long id, Principal principal) {\n    Order order = orderRepo.findById(id).orElseThrow();\n    if (!order.getUserId().equals(principal.getName())) {\n        throw new ResponseStatusException(HttpStatus.FORBIDDEN);\n    }\n    return order;\n}\n// Kiểm tra ở service/repository, không chỉ ở controller hay frontend.",
      "why": "Ẩn nút ở frontend không phải là bảo mật vì API vẫn mở cho bất kỳ ai gọi trực tiếp. IDOR chỉ đóng lại khi server kiểm tra quyền sở hữu trên chính dữ liệu trả về, và kiểm tra đó phải nằm ở tầng service hoặc repository để mọi đường vào đều qua nó.",
      "hints": [
        "Frontend không hiện nút có ngăn được người gọi API trực tiếp không?",
        "Sau khi load đơn, còn thiếu một phép so sánh nào trước khi trả về?"
      ]
    },
    {
      "id": "23-2",
      "concept": "Mass assignment",
      "type": "fix-bug",
      "title": "Thêm một field vào request là tự nâng quyền ADMIN",
      "prompt": "Đội bảo mật báo một user thường vừa trở thành ADMIN mà không ai cấp quyền cho họ. Bạn mở API cập nhật hồ sơ và thấy nó bind thẳng request vào entity rồi lưu. Hãy tìm đường nâng quyền và sửa sao cho field nhạy cảm không bao giờ tới được entity từ request của user.",
      "code": "@PutMapping(\"/profile\")\npublic User updateProfile(@RequestBody UserEntity entity) {\n    return userRepo.save(entity); // bind thẳng request vào entity, lưu luôn\n}\n// Request user gửi: { \"name\": \"An\", \"role\": \"ADMIN\" }",
      "language": "java",
      "failingEvidence": "Log: user thường gửi PUT /profile kèm field role=ADMIN, response trả 200, và lần đăng nhập sau token của user này mang role ADMIN. Không có API admin nào được gọi, không có ai cấp quyền.",
      "checks": [
        "Chọn đúng lỗi: bind thẳng request vào entity nên field role lọt vào DB",
        "Chọn đúng cách sửa: DTO chỉ nhận field cho phép, role chỉ set qua API admin riêng"
      ],
      "solution": "public record UpdateProfileRequest(String name, String phone) {} // không có role\n\n@PutMapping(\"/profile\")\npublic User updateProfile(@RequestBody UpdateProfileRequest dto, Principal principal) {\n    User user = userRepo.findById(principal.getName()).orElseThrow();\n    user.setName(dto.name());\n    user.setPhone(dto.phone());\n    // role, isAdmin, createdAt không bao giờ đọc từ request này\n    return userRepo.save(user);\n}",
      "why": "Bind thẳng request vào entity nghĩa là bất kỳ field nào attacker thêm vào cũng thành dữ liệu thật. DTO là danh sách trắng: chỉ field nào có trong DTO mới được nhận, còn role, giá, trạng thái phải do server tự sinh hoặc chỉ admin set qua đường riêng.",
      "hints": [
        "Request của user có thể chứa thêm field nào ngoài những field form hiển thị?",
        "Danh sách trắng (DTO chỉ nhận field cho phép) khác danh sách đen (chặn từng field) ở chỗ nào?"
      ]
    },
    {
      "id": "23-3",
      "concept": "OAuth2 Authorization Code + PKCE",
      "type": "skeleton",
      "title": "Điền bước đổi code lấy token kèm PKCE",
      "prompt": "Bạn triển khai đăng nhập cho app mobile bằng Authorization Code + PKCE và senior để lại khung đổi code còn trống hai chỗ. Hãy điền sao cho code bị đánh cắp cũng không đổi được token, và token không bao giờ đi qua URL hay lịch sử trình duyệt.",
      "code": "// Bước 1: app tạo code_verifier ngẫu nhiên, gửi code_challenge khi mở trình duyệt.\n// Bước 2: provider trả authorization code về app.\n// Bước 3: app đổi code lấy token ở backend:\n// TODO 1: gửi kèm thứ gì để chứng minh app này chính là app đã xin code?\n// TODO 2: code này dùng được mấy lần, và token trả về qua kênh nào?",
      "language": "java",
      "failingEvidence": "Test sẽ fail nếu điền sai: dùng code đánh cắp được để đổi token thành công khi không gửi code_verifier; hoặc token xuất hiện trong URL redirect và lọt vào log trình duyệt. Cả hai đều là luồng Implicit cũ đã bị khuyến cáo không dùng.",
      "checks": [
        "Điền đúng: gửi kèm code_verifier mà chỉ app gốc biết",
        "Điền đúng: code chỉ dùng một lần, token đổi ở backend không qua URL"
      ],
      "solution": "// Backend đổi code: POST tới provider kèm code + code_verifier + client_id.\n// Provider kiểm tra code_challenge khớp với code_verifier thì mới cấp token.\n// Code chỉ dùng một lần, dùng rồi là vô hiệu; token trả về qua response của backend,\n// không bao giờ gắn vào URL redirect (không dùng Implicit flow).",
      "why": "PKCE sinh ra để bảo vệ app public không giữ được secret: code_verifier chỉ app gốc biết nên kẻ đánh cắp code cũng không đổi được token. Đổi code ở backend thay vì qua URL cũng giữ token khỏi lịch sử trình duyệt và log.",
      "hints": [
        "Thứ gì chỉ app gốc biết mà kẻ đánh cắp code không biết?",
        "Token đi qua URL thì sẽ lọt vào những nơi nào: lịch sử, log, referer?"
      ]
    },
    {
      "id": "23-4",
      "concept": "RBAC và ABAC",
      "type": "decision",
      "title": "Chỉ check role có đủ chặn xem đơn của người khác?",
      "prompt": "Bạn review API xem đơn và thấy nó chỉ kiểm tra role CUSTOMER là cho qua, không kiểm tra gì thêm. Một reviewer bảo role là đủ, một reviewer bảo phải thêm kiểm tra thuộc tính. Hãy nhìn hai phương án dưới đây và chọn phương án đúng cho yêu cầu: khách chỉ xem được đơn của chính mình, và chỉ khi đơn chưa giao.",
      "code": "// Phương án A: RBAC thuần — chỉ check role\n// if (user.hasRole(\"CUSTOMER\")) return order; // ai có role cũng xem được mọi đơn.\n\n// Phương án B: RBAC + ABAC — check role, rồi check thuộc tính\n// if (!user.hasRole(\"CUSTOMER\")) deny;\n// if (!order.getUserId().equals(user.getId())) deny; // phải là chủ đơn\n// if (order.getStatus() == SHIPPED) deny; // chỉ xem khi chưa giao",
      "language": "java",
      "failingEvidence": "Nếu chọn sai (chỉ RBAC): user A có role CUSTOMER xem được đơn của user B vì cả hai cùng role, và vẫn xem được đơn đã giao dù nghiệp vụ cấm. Role giống nhau không có nghĩa là quyền trên dữ liệu giống nhau.",
      "checks": [
        "Chọn đúng phương án B (RBAC + ABAC)",
        "Chọn đúng lý do: quyền phụ thuộc thuộc tính của dữ liệu (chủ đơn, trạng thái), không chỉ role"
      ],
      "solution": "Chọn phương án B. RBAC trả lời ai là ai, ABAC trả lời trên dữ liệu cụ thể này thì được phép gì: phải là chủ đơn và đơn chưa giao. Role đủ cho phần lớn hệ thống, nhưng khi quyền phụ thuộc vào chủ sở hữu, trạng thái hay thời gian thì phải thêm kiểm tra thuộc tính.",
      "why": "Role là thuộc tính của người gọi, còn chủ sở hữu và trạng thái là thuộc tính của dữ liệu. Chỉ check role là bỏ qua một nửa điều kiện, và nửa bị bỏ qua đó chính là lỗ hổng IDOR.",
      "hints": [
        "Hai user cùng role CUSTOMER thì quyền trên cùng một đơn có giống nhau không?",
        "Điều kiện còn thiếu nằm ở người gọi hay ở chính đơn hàng đó?"
      ]
    },
    {
      "id": "23-5",
      "concept": "OAuth2 Authorization Code + PKCE",
      "type": "predict",
      "title": "Đoán chuyện gì xảy ra khi authorization code bị đánh cắp",
      "prompt": "Bạn được hỏi trong buổi review bảo mật: giả sử kẻ tấn công lấy được authorization code của user từ log, nhưng không có code_verifier của app gốc. Hắn mang code đó tới provider để đổi token. Hãy đoán kết quả và đoán xem điều gì sẽ xảy ra nếu app không dùng PKCE.",
      "code": "// App gốc: tạo code_verifier V, gửi code_challenge = hash(V) khi xin code.\n// Provider trả code C cho app gốc. Kẻ tấn công lấy được C nhưng không biết V.\n// Kẻ tấn công gửi C tới provider để đổi token, không kèm V.",
      "language": "java",
      "failingEvidence": "Kết quả thật với PKCE: provider từ chối vì không có code_verifier khớp với code_challenge đã đăng ký, không cấp token. Kết quả thật nếu không dùng PKCE: provider cấp token cho kẻ tấn công vì code là đủ, tài khoản user bị chiếm.",
      "checks": [
        "Đoán đúng với PKCE: provider từ chối, không cấp token",
        "Đoán đúng nếu không có PKCE: code bị đánh cắp là đổi được token"
      ],
      "solution": "Với PKCE, provider từ chối vì kẻ tấn công không chứng minh được mình là app đã xin code: code_verifier không khớp code_challenge. Không có PKCE, code là thứ duy nhất cần để đổi token nên đánh cắp code là chiếm được tài khoản. Đó là lý do app public bắt buộc dùng PKCE thay vì dựa vào secret mà app public không giữ được.",
      "why": "Authorization code đi qua trình duyệt nên có thể lộ qua log hoặc lịch sử; PKCE thêm một bí mật chỉ app gốc biết để code lộ một mình không đủ. Bảo mật không dựa vào việc code không bao giờ lộ, mà dựa vào việc lộ code vẫn chưa đủ để chiếm tài khoản.",
      "hints": [
        "Kẻ tấn công có gì và thiếu gì: có code, thiếu thứ gì?",
        "Nếu code là thứ duy nhất cần để đổi token thì lộ code nghĩa là gì?"
      ]
    }
  ],
  "24":   [
    {
      "id": "24-1",
      "concept": "Load test và p95/p99",
      "type": "predict",
      "title": "Đoán trải nghiệm của 1% user chậm nhất từ báo cáo load test",
      "prompt": "Bạn nhận báo cáo load test và sếp hỏi: hệ thống có tốt không, khi báo cáo ghi trung bình 300ms? Bạn nhìn thêm hai con số nữa trong báo cáo và được hỏi về 1% user chậm nhất. Hãy đoán trải nghiệm của nhóm đó trước khi đối chiếu đáp án.",
      "code": "// Báo cáo load test: 1000 user đồng thời\n// latency trung bình: 300ms\n// p95: 800ms\n// p99: 3000ms\n// lỗi 5xx: 0.5%",
      "language": "yaml",
      "failingEvidence": "Trải nghiệm thật của 1% chậm nhất: chờ 3 giây cho một request, gấp 10 lần trung bình. Nhóm này thường rơi vào GC, lock hoặc một dependency chậm — và họ là nhóm hay bỏ đi và khiếu nại nhất, dù báo cáo trung bình trông rất tốt.",
      "checks": [
        "Đoán đúng: 1% user chờ tới 3 giây (p99), không phải 300ms",
        "Chọn đúng kết luận: trung bình che giấu outlier, phải nhìn p95/p99"
      ],
      "solution": "1% user chậm nhất chờ 3 giây (p99), không phải 300ms. Trung bình gộp cả request nhanh và request rất chậm nên che mất nhóm chậm nhất; p95 cho biết 5% chậm nhất chờ từ 800ms trở lên, p99 cho biết 1% chậm nhất chờ từ 3 giây trở lên. Kết luận đúng: hệ thống chưa tốt cho nhóm chậm nhất, cần điều tra GC, lock hoặc dependency chậm gây ra p99 cao.",
      "why": "Người dùng không trải nghiệm trung bình mà trải nghiệm đúng một request của chính mình. Một hệ thống trung bình nhanh nhưng p99 cao nghĩa là cứ 100 user thì 1 người chịu chậm nặng — và người đó không quan tâm 99 người còn lại nhanh ra sao.",
      "hints": [
        "p99 nghĩa là gì theo đúng định nghĩa: bao nhiêu phần trăm nhanh hơn nó?",
        "Trung bình gộp chung thì nhóm chậm nhất biến đi đâu?"
      ]
    },
    {
      "id": "24-2",
      "concept": "Scale stateless và chi phí cloud",
      "type": "fix-bug",
      "title": "Thêm instance mà user vẫn bị đăng xuất lung tung",
      "prompt": "Bạn scale app từ 1 lên 4 instance để chịu tải, và ngay sau đó user báo bị đăng xuất ngẫu nhiên: tải lại trang thì lúc còn đăng nhập, lúc bị văng ra. Bạn mở code session và thấy session đang nằm trong bộ nhớ của từng instance. Hãy tìm nguyên nhân và sửa sao cho bất kỳ instance nào cũng phục vụ được bất kỳ user nào.",
      "code": "// Session lưu trong bộ nhớ của từng instance (in-memory map)\nprivate final Map<String, Session> sessions = new ConcurrentHashMap<>();\n// Load balancer chuyển request round-robin qua 4 instance.\n// Request 1 tới instance A (có session), request 2 tới instance B (không có session).",
      "language": "java",
      "failingEvidence": "Hành vi thật: user đăng nhập ở instance A, request sau tới instance B thì B không tìm thấy session nên coi như chưa đăng nhập, đẩy về trang login. Cứ tải lại là lúc vào được, lúc bị văng, tùy request rơi vào instance nào.",
      "checks": [
        "Chọn đúng nguyên nhân: session stateful trong bộ nhớ từng instance",
        "Chọn đúng cách sửa: đưa session ra Redis hoặc DB dùng chung, app thành stateless"
      ],
      "solution": "// Đưa session ra Redis dùng chung cho mọi instance:\n// Session session = redis.get(\"session:\" + sessionId);\n// Mọi instance đều đọc cùng một session từ Redis, không còn khái niệm\n// user dính vào instance nào. File upload cũng phải đưa ra S3/R2 tương tự.",
      "why": "Stateless là điều kiện để scale ngang: bất kỳ instance nào cũng phải phục vụ được bất kỳ user nào. Session trong bộ nhớ làm instance thành stateful, user dính vào đúng instance đã đăng nhập, và thêm instance không những không giúp mà còn làm lỗi đăng xuất xuất hiện.",
      "hints": [
        "Request sau của cùng một user có chắc tới đúng instance đã đăng nhập không?",
        "Thứ gì phải nằm ngoài instance thì mọi instance mới thấy giống nhau?"
      ]
    },
    {
      "id": "24-3",
      "concept": "Caching nhiều tầng",
      "type": "skeleton",
      "title": "Điền TTL và invalidation cho từng tầng cache",
      "prompt": "Bạn thiết kế cache cho trang sản phẩm và senior trả lại bản nháp vì nó chỉ ghi một TTL chung cho mọi tầng. Khung cấu hình dưới đây còn trống TTL và cách invalidate của từng tầng. Hãy điền sao cho tầng càng gần user càng nhanh nhưng càng xa càng đúng, và giá đổi thì không tầng nào giữ giá cũ cả ngày.",
      "code": "# TODO 1: browser cache cho ảnh tĩnh — TTL bao lâu, đổi ảnh thì sao?\n# TODO 2: CDN cho ảnh và trang tĩnh — TTL bao lâu, purge khi nào?\n# TODO 3: Redis cho dữ liệu sản phẩm hay đọc — TTL bao lâu, khi đổi giá thì invalidate ra sao?\n# TODO 4: tầng nào cũng có TTL riêng, không dùng chung một TTL cho mọi tầng.",
      "language": "yaml",
      "failingEvidence": "Thiết kế cũ: một TTL 24 giờ cho mọi tầng. Giá đổi lúc sáng, trang vẫn hiện giá cũ tới hôm sau ở cả browser, CDN và Redis vì không tầng nào bị invalidate. User đặt hàng với giá cũ rồi bị hủy đơn vì giá thật đã khác.",
      "checks": [
        "Điền đúng TTL khác nhau theo tầng và theo tốc độ đổi của dữ liệu",
        "Điền đúng invalidate: đổi giá thì xóa key Redis liên quan và purge CDN, không chờ TTL"
      ],
      "solution": "# Browser: ảnh tĩnh TTL dài (ví dụ 30 ngày) kèm tên file theo hash nội dung — đổi ảnh là đổi tên file.\n// CDN: ảnh và trang tĩnh TTL dài, purge ngay khi deploy nội dung mới.\n// Redis: dữ liệu sản phẩm TTL ngắn (ví dụ 60 giây cho tồn kho, 10 phút cho tên/giá),\n// và khi đổi giá thì xóa key liên quan ngay, không chờ TTL hết.",
      "why": "Mỗi tầng cache có bài toán invalidate riêng vì dữ liệu ở mỗi tầng đổi với tốc độ khác nhau và hậu quả khi cũ cũng khác nhau. Một TTL chung hoặc là giữ dữ liệu cũ quá lâu ở tầng quan trọng, hoặc là bắt tầng tĩnh tải lại vô ích.",
      "hints": [
        "Dữ liệu nào đổi nhanh, dữ liệu nào gần như không đổi — chúng có nên chung TTL không?",
        "Chờ TTL hết và chủ động xóa key khác nhau ở điểm nào?"
      ]
    },
    {
      "id": "24-4",
      "concept": "Đo bottleneck",
      "type": "decision",
      "title": "CPU còn rảnh mà vẫn chậm: tăng instance hay tăng pool DB?",
      "prompt": "Bạn nhận báo cáo: 1000 user đồng thời, CPU app chỉ 40%, nhưng DB connection chờ tăng và p99 lên 3 giây. Có người đề xuất tăng app lên gấp đôi ngay. Hãy nhìn hai phương án dưới đây và chọn phương án chạm đúng bottleneck, kèm bước kiểm tra tiếp theo nếu phương án đó không đủ.",
      "code": "// Phương án A: tăng app từ 4 lên 8 instance\n// -> CPU vốn chỉ 40%, tăng app không chạm vào chỗ đang nghẽn.\n\n// Phương án B: xử lý DB connection — tăng pool DB có giới hạn,\n// giảm thời gian giữ connection, cache để giảm query DB.\n// -> chạm đúng chỗ đang chờ: DB connection.",
      "language": "yaml",
      "failingEvidence": "Nếu chọn sai (tăng app): tốn gấp đôi tiền instance mà p99 vẫn 3 giây, vì app mới cũng xếp hàng chờ đúng DB connection đó. Bottleneck không nằm ở app nên thêm app chỉ thêm người xếp hàng.",
      "checks": [
        "Chọn đúng phương án B (xử lý DB connection, không tăng app)",
        "Chọn đúng bước kiểm tra tiếp theo: xem query nào giữ connection lâu và p99 do GC, lock hay dependency nào"
      ],
      "solution": "Chọn phương án B. CPU 40% nghĩa là app không phải bottleneck; DB connection chờ tăng mới là chỗ bão hòa đầu tiên. Tăng pool DB có giới hạn, giảm thời gian giữ connection (đừng giữ connection qua đoạn xử lý chậm), và cache để giảm query. Nếu vẫn chậm thì kiểm tra tiếp: query nào giữ connection lâu nhất và p99 cao do GC, lock hay dependency chậm.",
      "why": "Đo bottleneck là tìm tài nguyên bão hòa trước tiên, không phải tài nguyên nghe quen nhất. Scale đúng chỗ nghẽn mới nhanh hơn; scale chỗ còn rảnh chỉ tốn tiền và thêm hàng chờ vào đúng chỗ nghẽn.",
      "hints": [
        "Tài nguyên nào đang bão hòa: CPU 40% hay hàng chờ DB connection?",
        "Thêm app mới thì request mới chờ ở đâu: ở app hay ở DB?"
      ]
    },
    {
      "id": "24-5",
      "concept": "Load test và p95/p99",
      "type": "terminal",
      "title": "Đọc output k6 để tìm điểm gãy của hệ thống",
      "prompt": "Bạn chạy load test bằng k6 và nhận output dưới đây. Sếp hỏi: hệ thống gãy ở đâu, và con số nào chứng tỏ điểm gãy đó? Hãy đọc kịch bản terminal và kết luận trước khi đối chiếu đáp án, đừng chỉ nhìn tỉ lệ lỗi chung chung.",
      "code": "# Lệnh load test bạn chạy\nk6 run load-test.js --vus 1000 --duration 5m",
      "language": "bash",
      "failingEvidence": "Output k6: http_req_duration p95 800ms, p99 3000ms, http_req_failed 0.5%, và phần lớn thời gian chờ nằm ở waiting (chờ server) chứ không phải sending hay receiving. Điểm gãy không phải ở mạng hay client mà ở phía server, đúng lúc DB connection chờ tăng.",
      "checks": [
        "Chọn đúng điểm gãy: phía server (waiting cao) khi DB connection bão hòa",
        "Chọn đúng bằng chứng: p99 3 giây kèm waiting chiếm gần hết thời gian"
      ],
      "solution": "Điểm gãy ở phía server: thời gian chờ server (waiting) chiếm gần hết tổng thời gian, p99 lên 3 giây trong khi p95 chỉ 800ms — nghĩa là một nhóm nhỏ request bị kẹt rất lâu. Kết hợp với DB connection chờ tăng thì kết luận là bottleneck ở DB connection, không phải ở mạng hay ở client. Hành động tiếp theo: tăng pool DB có giới hạn, giảm thời gian giữ connection, kiểm tra query chậm.",
      "why": "Chia thời gian request thành sending, waiting và receiving mới biết lỗi nằm ở đâu: waiting cao là server chậm, sending hay receiving cao mới là mạng hoặc client. Chỉ nhìn tỉ lệ lỗi 0.5% thì tưởng hệ thống gần như tốt, trong khi p99 đã tố cáo nhóm user chậm nặng.",
      "hints": [
        "Thời gian request chia làm mấy đoạn, và đoạn nào chiếm gần hết?",
        "p99 cao hơn p95 nhiều thì nhóm chậm nhất đang kẹt ở đâu?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "k6 run load-test.js --vus 1000 --duration 5m",
            "output": "http_req_duration: avg=300ms p95=800ms p99=3000ms\nhttp_req_failed: 0.5%\nhttp_req_waiting: avg=280ms p99=2900ms (waiting chiếm gần hết thời gian)"
          },
          {
            "cmd": "curl -s http://localhost:8080/actuator/metrics/hikaricp.connections.pending",
            "output": "pending threads rising: 0 -> 120 during load test, CPU app steady at 40 percent"
          }
        ]
      }
    }
  ],
  "25":   [
    {
      "id": "25-1",
      "concept": "Correlation ID",
      "type": "fix-bug",
      "title": "Correlation ID mất dấu ở service downstream",
      "prompt": "Lúc 2 giờ sáng, bạn nhận alert đơn hàng lỗi và lần theo correlation ID req-2026-1029-8841 từ gateway sang payment, nhưng log của payment không hề có ID này. Filter ở gateway đã sinh ID và ghi vào MDC, còn đoạn code dưới đây là cách order-service gọi payment. Hãy tìm vì sao chuỗi dấu vết bị đứt và sửa cho ID đi xuyên suốt.",
      "code": "public void chargeOrder(String orderId, BigDecimal amount) {\n    MDC.put(\"correlationId\", \"req-2026-1029-8841\");\n    log.info(\"Charging order {}\", orderId);\n    PaymentResult result = restClient.post()\n        .uri(\"https://payment.internal/api/charges\")\n        .body(new ChargeRequest(orderId, amount))\n        .retrieve()\n        .body(PaymentResult.class);\n    log.info(\"Charge result {} for order {}\", result.status(), orderId);\n}",
      "language": "java",
      "failingEvidence": "Grep req-2026-1029-8841 chỉ trả về log của gateway và order-service. Log payment-service cùng thời điểm không có correlationId, nên không chứng minh được request lỗi có tới payment hay không.",
      "checks": [
        "Chọn đúng dòng code gây lỗi: lời gọi payment không kèm header X-Correlation-Id",
        "Chọn diff đúng: truyền header từ MDC và đưa correlationId vào log pattern của mọi service"
      ],
      "solution": "restClient.post()\n    .uri(\"https://payment.internal/api/charges\")\n    .header(\"X-Correlation-Id\", MDC.get(\"correlationId\"))\n    .body(new ChargeRequest(orderId, amount))\n    .retrieve()\n    .body(PaymentResult.class);\n// Log pattern mọi service phải có %X{correlationId}, và filter ở mỗi service phải đọc header này vào MDC thay vì sinh ID mới.",
      "why": "MDC chỉ sống trong một JVM, không tự bay sang service khác. Không truyền header thì mỗi service log một ID riêng, sự cố đa service không lần được. Sinh ID mới ở downstream còn tệ hơn: nó tạo dấu vết giả, tưởng là chuỗi khác.",
      "hints": [
        "MDC là bộ nhớ cục bộ của một service, muốn sang service khác phải đi qua thứ gì đó truyền được trên mạng.",
        "Tìm xem header nào gateway đã sinh ra nhưng lời gọi payment không hề gửi kèm."
      ]
    },
    {
      "id": "25-2",
      "concept": "3 trụ: Logs, Metrics, Traces",
      "type": "predict",
      "title": "Đoán xem grep log tìm được gì khi thiếu ID",
      "prompt": "Đồng nghiệp gửi bạn hai dòng log dưới đây và hỏi vì sao user báo đơn 123 lỗi lúc 10:02 mà team mất cả buổi vẫn chưa biết lỗi ở service nào. Trước khi xem đáp án, hãy đoán: chạy grep theo đơn 123 hoặc theo thời gian 10:02 thì tìm được gì, và thiếu trụ nào khiến việc lần dấu vết bế tắc?",
      "code": "log.info(\"Order failed\");\nlog.info(\"Payment failed\");\nlog.info(\"Order created\");\n// Không dòng nào kèm orderId, userId hay correlationId.\n// Metrics chỉ có: http_requests_total, không có tỉ lệ lỗi theo endpoint.\n// Không có trace nào nối gateway, order và payment.",
      "language": "java",
      "failingEvidence": "Output thật khi đối chiếu: grep theo 123 không trúng dòng nào vì log không ghi orderId; grep theo 10:02 trả về hàng trăm dòng của hàng trăm request khác nhau, không cách nào biết dòng nào thuộc đơn 123. Metric tổng không cho biết endpoint nào lỗi.",
      "checks": [
        "Đoán đúng output: không lần được request nào, vì log thiếu orderId và correlationId",
        "Chọn trụ còn thiếu đúng: trace nối các service và metric lỗi theo endpoint, không chỉ log rời rạc"
      ],
      "solution": "Đáp án đúng: không lần được. Log phải ghi log.info(\"Order failed orderId={} correlationId={}\", orderId, correlationId). Metric phải tách theo endpoint và status để thấy tỉ lệ 5xx của POST /orders tăng lúc 10:02. Trace phải cho thấy request đi qua gateway rồi dừng ở payment.",
      "why": "Logs cho biết chuyện gì xảy ra, metrics cho biết mức độ và thời điểm, traces cho biết hành trình của một request. Thiếu ID nối các trụ lại thì mỗi trụ chỉ là mảnh rời, debug đa service gần như mù.",
      "hints": [
        "Hỏi ngược lại: với chỉ hai chữ Order failed, bạn phân biệt request này với 500 request khác cùng phút bằng cách nào?",
        "Nghĩ xem ba trụ bổ sung nhau ra sao, thay vì chỉ tăng số lượng log."
      ]
    },
    {
      "id": "25-3",
      "concept": "Alerting",
      "type": "skeleton",
      "title": "Viết alert 5xx có ngưỡng, thời gian và người nhận",
      "prompt": "Team vận hành nhờ bạn viết alert cho API đặt hàng, nhưng bản nháp dưới đây mới chỉ có tên alert và câu truy vấn, chưa có ngưỡng, thời gian duy trì, mức độ và hành động đầu tiên. Hãy điền các chỗ TODO sao cho alert kêu khi user thật sự cảm nhận được lỗi, và không kêu ầm ĩ vì một lỗi thoáng qua.",
      "code": "groups:\n  - name: order-alerts\n    rules:\n      - alert: OrderApiHighErrorRate\n        expr: rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])\n        # TODO: ngưỡng tỉ lệ lỗi là bao nhiêu?\n        # TODO: duy trì bao lâu thì mới kêu?\n        # TODO: severity và người nhận là ai?\n        # TODO: hành động đầu tiên khi alert kêu là gì?",
      "language": "yaml",
      "failingEvidence": "Nếu điền sai: ngưỡng quá thấp hoặc không có thời gian duy trì, alert kêu hàng chục lần mỗi ngày vì lỗi thoáng qua, team dần tắt hết alert và bỏ qua cả alert thật. Nếu không ghi người nhận và hành động, alert kêu mà không ai biết phải làm gì đầu tiên.",
      "checks": [
        "Chọn đúng ngưỡng và thời gian duy trì: 5xx trên 1% trong 5 phút",
        "Chọn đúng người nhận và hành động đầu tiên: người trực backend xem log theo correlationId, kiểm tra deploy mới nhất trước khi rollback"
      ],
      "solution": "groups:\n  - name: order-alerts\n    rules:\n      - alert: OrderApiHighErrorRate\n        expr: rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) > 0.01\n        for: 5m\n        labels:\n          severity: page\n          owner: backend-oncall\n        annotations:\n          summary: \"Ti le 5xx cua API dat hang vuot 1% trong 5 phut\"\n          action: \"Xem log theo correlationId, kiem tra deploy moi nhat, rollback neu deploy moi gay loi\"",
      "why": "Alert phải gắn với thứ user cảm nhận được là tỉ lệ lỗi, có ngưỡng và thời gian duy trì để lọc nhiễu, có người chịu trách nhiệm và hành động đầu tiên. Alert không có hành động chỉ là thông báo gây mệt mỏi, và mệt mỏi vì alert là cách alert thật bị bỏ qua.",
      "hints": [
        "Nhớ lại định nghĩa alert tốt ở ngày 25: ngưỡng cộng hành động cộng người chịu trách nhiệm.",
        "Tỉ lệ 5xx bao nhiêu phần trăm trong bao lâu thì đủ nghiêm trọng để đánh thức người trực, mà không phải một lỗi đơn lẻ?"
      ]
    },
    {
      "id": "25-4",
      "concept": "Log cái gì và không log cái gì",
      "type": "decision",
      "title": "Chọn cách log đủ debug mà không rò rỉ token",
      "prompt": "Trong buổi review pull request, bạn thấy hai phương án log cho cùng một request thanh toán thất bại. Phương án A log rất chi tiết, phương án B log ít hơn nhưng có ID. Hãy chọn phương án được merge và biện minh: phương án kia gây hại gì, và phương án bạn chọn có đủ để debug lúc 2 giờ sáng không?",
      "code": "// PHUONG AN A: log toan bo request\nlog.info(\"Payment failed request={} token={} card={}\", requestBody, authToken, cardNumber);\n// PHUONG AN B: log ID va ket qua\nlog.info(\"Payment failed orderId={} userId={} correlationId={} reason={}\", orderId, userId, correlationId, reason);",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai (phương án A): token và số thẻ nằm trong log, bất kỳ ai đọc được log cũng giả mạo được user hoặc dùng được thẻ. Log đã rò rỉ thì thu hồi token cũng không xóa được bản sao log đã phát tán.",
      "checks": [
        "Chọn phương án đúng: phương án B",
        "Chọn đúng lý do: token và dữ liệu nhạy cảm không bao giờ vào log, còn orderId cộng correlationId cộng lý do là đủ lần dấu vết"
      ],
      "solution": "Chọn phương án B. Khi cần chi tiết hơn, log thêm mã lỗi nghiệp vụ và service downstream trả về, ví dụ providerErrorCode, nhưng không bao giờ log token, mật khẩu, số thẻ hay secret. Muốn xem lại body request thì tra cứu theo orderId ở kho dữ liệu có kiểm soát truy cập, không tra trong log.",
      "why": "Log là nơi nhiều người và nhiều hệ thống đọc được, nên log secret là rò rỉ dữ liệu. Ngược lại, log chỉ có ID và kết quả vẫn debug được vì ID nối sang trace, metric và bản ghi nghiệp vụ. Chi tiết không đồng nghĩa với hữu ích.",
      "hints": [
        "Đặt câu hỏi: ai ngoài team backend có thể đọc được log này, và họ làm gì được với từng field đã log?",
        "Phương án ít field hơn có thật sự thiếu thứ cần để tìm lại request đó không, hay chỉ thiếu thứ nhạy cảm?"
      ]
    },
    {
      "id": "25-5",
      "concept": "Correlation ID",
      "type": "terminal",
      "title": "Lần dấu vết đơn lỗi qua 3 service bằng terminal",
      "prompt": "Bạn trực sự cố và chỉ có terminal, không có dashboard trace đẹp. User báo đơn 123 lỗi lúc 10:02, bạn đã có correlation ID req-2026-1029-8841 từ log gateway. Hãy đi đúng thứ tự: xác nhận ID ở gateway, lần sang order và payment, rồi chỉ ra service lỗi đầu tiên thay vì service báo lỗi cuối cùng.",
      "code": "# Kich ban terminal gia lap: khong chay code that, chi doc output va ket luan\n# Buoc 1: lay log gateway theo correlation ID\n# Buoc 2: lan sang order-service va payment-service cung ID\n# Buoc 3: xem metric 5xx cua tung endpoint cung khung gio",
      "language": "bash",
      "failingEvidence": "Nếu lần sai thứ tự, ví dụ chỉ xem log payment cuối cùng, bạn sẽ kết luận payment lỗi trong khi thật ra order-service đã gửi amount sai sang payment. Service báo lỗi cuối cùng thường chỉ là nạn nhân của dữ liệu sai từ bước trước.",
      "checks": [
        "Chọn đúng thứ tự lần dấu vết: gateway rồi order rồi payment, theo cùng một correlation ID",
        "Chọn đúng kết luận: service lỗi đầu tiên là order-service gửi amount sai, payment chỉ trả lỗi theo dữ liệu nhận được"
      ],
      "solution": "Thứ tự đúng: gateway xác nhận request vào lúc 10:02 với orderId 123; order-service log cùng ID cho thấy amount gửi đi là 0; payment-service log cùng ID cho thấy nó từ chối vì amount không hợp lệ. Sửa ở order-service, không sửa payment. Ghi lại runbook: lần theo ID, tìm lỗi đầu tiên, rồi mới sửa.",
      "why": "Correlation ID biến log rời rạc của nhiều service thành một hành trình duy nhất. Không có ID chung thì mỗi service là một câu chuyện riêng, và người debug dễ đổ lỗi cho service la to nhất thay vì service sai đầu tiên.",
      "hints": [
        "Bắt đầu từ ID đã có, đừng bắt đầu từ service bạn nghi ngờ nhất.",
        "Khi hai service cùng báo lỗi, service nào sai trước về mặt thời gian và dữ liệu?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "kubectl logs deploy/gateway --since=30m | grep req-2026-1029-8841",
            "output": "10:02:11 gateway correlationId=req-2026-1029-8841 method=POST path=/orders orderId=123 status=accepted"
          },
          {
            "cmd": "kubectl logs deploy/order-service --since=30m | grep req-2026-1029-8841",
            "output": "10:02:12 order-service correlationId=req-2026-1029-8841 orderId=123 amount=0 action=charge-requested"
          },
          {
            "cmd": "kubectl logs deploy/payment-service --since=30m | grep req-2026-1029-8841",
            "output": "10:02:12 payment-service correlationId=req-2026-1029-8841 orderId=123 error=INVALID_AMOUNT reason=amount-must-be-positive"
          },
          {
            "cmd": "curl http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=\"500\"}[5m])",
            "output": "order-service POST /orders 5xx rate: 0.001 | payment-service POST /charges 5xx rate: 0.012 (tang cung luc 10:02, do nhan amount sai)"
          }
        ]
      }
    }
  ],
  "26":   [
    {
      "id": "26-1",
      "concept": "Kubernetes ở mức review",
      "type": "fix-bug",
      "title": "Deployment đưa traffic vào pod chưa sẵn sàng",
      "prompt": "Sau một lần deploy, user thỉnh thoảng nhận 502 ngay cả khi pod đã chạy, và đồng nghiệp phát hiện mật khẩu database nằm lộ liễu trong file deploy. Bản Deployment dưới đây có ít nhất ba lỗi ở mức review: probe, secret và tài nguyên. Hãy chỉ ra từng lỗi và viết lại bản đúng.",
      "code": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: order-api\nspec:\n  replicas: 1\n  template:\n    spec:\n      containers:\n        - name: order-api\n          image: order-api:latest\n          env:\n            - name: DB_PASSWORD\n              value: \"MatKhauThat123\"\n          # Khong co readinessProbe, khong co resources",
      "language": "yaml",
      "failingEvidence": "Triệu chứng: Service chuyển traffic tới pod ngay khi container vừa khởi động, trong khi app còn đang warm-up, nên một phần request đầu tiên nhận 502. Lệnh kubectl describe deployment cho thấy DB_PASSWORD ở dạng plaintext, ai đọc được manifest là có mật khẩu.",
      "checks": [
        "Chọn đúng các dòng gây lỗi: thiếu readinessProbe, mật khẩu ghi thẳng vào env, image dùng tag latest",
        "Chọn diff đúng: thêm readinessProbe, chuyển mật khẩu sang secretRef, ghim tag image và đặt resources"
      ],
      "solution": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: order-api\nspec:\n  replicas: 2\n  template:\n    spec:\n      containers:\n        - name: order-api\n          image: order-api:1.4.2\n          envFrom:\n            - secretRef:\n                name: order-db-secret\n          readinessProbe:\n            httpGet:\n              path: /health/ready\n              port: 8080\n            initialDelaySeconds: 10\n            periodSeconds: 5\n          resources:\n            requests:\n              memory: 256Mi\n              cpu: 250m\n            limits:\n              memory: 512Mi\n              cpu: 500m",
      "why": "ReadinessProbe là cách Kubernetes biết pod thật sự phục vụ được trước khi nhận traffic, khác với việc container vừa chạy. Secret phải tách khỏi manifest và image phải ghim tag, nếu không deploy không lặp lại được và mật khẩu lộ theo cả lịch sử git.",
      "hints": [
        "Ở mức review Kubernetes, ba thứ luôn phải kiểm tra đầu tiên là probe, config tách khỏi image và tài nguyên.",
        "Pod chạy không có nghĩa là pod sẵn sàng: thứ gì báo cho Service biết pod đã sẵn sàng?"
      ]
    },
    {
      "id": "26-2",
      "concept": "Kubernetes ở mức review",
      "type": "predict",
      "title": "Đoán vòng đời pod khi health check sai đường dẫn",
      "prompt": "Một đồng nghiệp cấu hình livenessProbe trỏ vào đường dẫn mà app không hề có, rồi thắc mắc vì sao pod cứ restart dù code không crash. Trước khi xem kết quả thật, hãy đoán: Kubernetes sẽ làm gì với pod này, user thấy gì, và vì sao log app không hề có lỗi crash?",
      "code": "livenessProbe:\n  httpGet:\n    path: /actuator/health\n    port: 8080\n  initialDelaySeconds: 5\n  periodSeconds: 5\n  failureThreshold: 3\n# App la Spring Boot nhung khong co dependency actuator,\n# nen /actuator/health tra 404. Container khong crash, khong OutOfMemory.",
      "language": "yaml",
      "failingEvidence": "Output thật khi đối chiếu: kubectl get pods cho thấy RESTARTS tăng đều mỗi vài chục giây, pod chuyển qua lại giữa Running và CrashLoopBackOff, user thỉnh thoảng mất kết nối. Log app không có exception, chỉ có access log ghi 404 cho đường dẫn probe.",
      "checks": [
        "Đoán đúng hành vi: probe thất bại đủ ngưỡng thì kubelet giết và khởi động lại container, dù app không crash",
        "Chọn cách sửa đúng: trỏ probe vào endpoint health thật của app hoặc thêm actuator, không tắt probe để che lỗi"
      ],
      "solution": "Đáp án đúng: pod restart liên tục vì livenessProbe 404 ba lần liên tiếp thì kubelet coi container là không còn sống và restart nó. App không crash nhưng vẫn bị giết, vì livenessProbe là phán quyết từ bên ngoài. Sửa: đổi path thành /health/ready hoặc /health mà app thật sự có, và phân biệt readinessProbe với livenessProbe thay vì dùng chung một đường dẫn cho cả hai.",
      "why": "LivenessProbe không hỏi app có crash không, nó hỏi endpoint health có trả thành công không. Probe sai đường dẫn biến hệ thống khỏe thành hệ thống tự giết mình, và triệu chứng restart đều đặn là dấu hiệu nhận biết probe sai chứ không phải code sai.",
      "hints": [
        "Kubernetes giết container dựa trên kết quả probe, không dựa trên việc code có throw exception hay không.",
        "Nếu log app sạch mà pod vẫn restart đều, thứ gì bên ngoài đang ra quyết định giết pod?"
      ]
    },
    {
      "id": "26-3",
      "concept": "CI/CD",
      "type": "skeleton",
      "title": "Điền pipeline deploy có migration và rollback",
      "prompt": "Bạn nhận một pipeline chỉ có build rồi deploy thẳng production, đúng kiểu bẫy mà ngày 26 đã cảnh báo. Hãy điền các chỗ TODO để pipeline thành build rồi test rồi staging rồi migration tương thích ngược rồi mới deploy production, kèm health check và đường rollback.",
      "code": "stages:\n  - build\n  # TODO: chay loai test nao truoc khi build image?\n  # TODO: deploy thu o dau truoc production?\n  # TODO: migration chay buoc nao, tuong thich nguoc ra sao?\n  # TODO: sau khi deploy production thi kiem tra suc khoe bang gi?\n  # TODO: neu health check do thi rollback bang cach nao?\ndeploy-production:\n  script:\n    - kubectl apply -f k8s/",
      "language": "yaml",
      "failingEvidence": "Nếu điền sai, ví dụ deploy production trước migration hoặc migration không tương thích ngược: code mới đọc cột chưa tồn tại thì sập ngay, còn rollback code cũ thì code cũ lại không đọc được schema mới, kẹt cả hai chiều. Không có health check thì lỗi chỉ lộ khi user báo.",
      "checks": [
        "Chọn đúng thứ tự: test rồi staging rồi migration bước 1 tương thích ngược rồi deploy code rồi backfill rồi siết schema",
        "Chọn đúng rollback: code mới phải đọc được schema cũ, health check đỏ thì quay về bản deploy trước"
      ],
      "solution": "stages:\n  - build\n  - test\n  - deploy-staging\n  - migrate-step-1\n  - deploy-production\n  - backfill\n  - migrate-step-2\ntest:\n  script:\n    - ./mvnw test\nmigrate-step-1:\n  script:\n    - flyway migrate -target=1  # them cot discount_code dang nullable, tuong thich nguoc\nhealth-check:\n  script:\n    - curl -f https://api.example.com/health/ready\nrollback:\n  script:\n    - kubectl rollout undo deployment/order-api  # chi kha thi vi code moi doc duoc schema cu",
      "why": "Pipeline là nơi bắt lỗi trước khi user gặp lỗi: test bắt logic, staging bắt môi trường, migration tương thích ngược giữ đường rollback sống, health check là bằng chứng deploy khỏe thay vì cảm giác. Bỏ một mắt xích là dồn rủi ro sang production.",
      "hints": [
        "Nhớ bài học ngày 11: migration và code mới phải deploy theo cặp tương thích ngược, không deploy bừa cùng lúc.",
        "Rollback chỉ khả thi khi code mới và schema mới không khóa chặt nhau, điều kiện đó phải tạo ra từ bước migration đầu tiên."
      ]
    },
    {
      "id": "26-4",
      "concept": "Blue-green, canary, feature flag",
      "type": "decision",
      "title": "Chọn chiến lược deploy cho bản đổi schema",
      "prompt": "Release sắp tới đổi schema đơn hàng và sửa logic tính tiền, team tranh cãi giữa hai phương án dưới đây. Phương án A nhanh và gọn, phương án B chậm hơn nhưng chia nhỏ rủi ro. Hãy chọn phương án cho release này và biện minh bằng hậu quả nếu chọn sai, kèm điều kiện nào thì phương án nhanh mới chấp nhận được.",
      "code": "# PHUONG AN A: deploy 100% mot lan, migration doi thang cot thanh NOT NULL\nstrategy: deploy-all-at-once\nmigration: ALTER TABLE orders ALTER COLUMN discount_code SET NOT NULL\n# PHUONG AN B: migration buoc 1 tuong thich nguoc, canary 5% roi tang dan\nstrategy: canary\nsteps:\n  - migration-step-1: them cot discount_code nullable\n  - rollout: 5% traffic, theo doi ti le 5xx va p99\n  - rollout: 25% roi 100% neu khong co loi\n  - migration-step-2: backfill roi siet NOT NULL",
      "language": "yaml",
      "failingEvidence": "Hậu quả nếu chọn sai (phương án A): dữ liệu cũ chưa có giá trị cho cột bắt buộc khiến migration sập giữa chừng, hoặc code mới lỗi tính tiền thì 100% user chịu lỗi cùng lúc và không có đường quay lại nhanh vì schema đã siết.",
      "checks": [
        "Chọn phương án đúng: phương án B cho release đổi schema và đổi logic tiền",
        "Chọn đúng lý do: canary cộng migration tương thích ngược giữ được rollback và giới hạn blast radius, còn deploy 100% thì lỗi nhỏ thành sự cố toàn hệ thống"
      ],
      "solution": "Chọn phương án B. Theo dõi ở mỗi nấc canary: tỉ lệ 5xx, p99 và tỉ lệ đơn lỗi tính tiền, dừng và rollback ngay nếu vượt ngưỡng, chỉ tăng traffic khi nấc trước khỏe. Phương án A chỉ chấp nhận được cho thay đổi không chạm schema, không chạm tiền và rollback được bằng một lần deploy ngược.",
      "why": "Blue-green đổi toàn bộ một lần vẫn còn rủi ro toàn hệ thống, canary đổi từng phần nhỏ để lỗi chỉ chạm một nhóm user trước khi lan ra. Với thay đổi schema và tiền, thứ cần nhất không phải tốc độ deploy mà là khả năng dừng lại và quay về.",
      "hints": [
        "Hỏi: nếu bản mới sai logic tính tiền, bao nhiêu phần trăm user sẽ chịu lỗi trước khi team phát hiện ra?",
        "Migration ở phương án nào giữ cho code cũ vẫn chạy được nếu phải rollback?"
      ]
    },
    {
      "id": "26-5",
      "concept": "Docker multi-stage build",
      "type": "terminal",
      "title": "Kiểm tra image và rollback bằng kubectl",
      "prompt": "Bạn nghi ngờ image production đang chạy chứa cả source và tool build, đồng thời deploy mới nhất đang lỗi. Chỉ dùng terminal, hãy đi đúng thứ tự: xem image đang chạy lớn cỡ nào, xem trạng thái rollout, kiểm tra pod nào không sẵn sàng, rồi quyết định rollback hay sửa tiếp.",
      "code": "# Kich ban terminal gia lap: doc output, dung doan mo\n# Buoc 1: xem image va kich thuoc\n# Buoc 2: xem rollout va lich su deploy\n# Buoc 3: xem pod va health check",
      "language": "bash",
      "failingEvidence": "Nếu bỏ qua bước xem image và rollout mà sửa code ngay, bạn có thể sửa nhầm bản: code local đã sửa nhưng image production vẫn là image cũ nặng và chứa source, hoặc rollback xong mới biết bản trước đó cũng lỗi vì cùng một image.",
      "checks": [
        "Chọn đúng thứ tự: image rồi rollout rồi pod, không sửa code trước khi biết bản nào đang chạy",
        "Chọn đúng quyết định: rollback về revision trước vì revision mới fail readinessProbe, đồng thời ghi nợ sửa Dockerfile sang multi-stage"
      ],
      "solution": "Kết luận đúng: image order-api:1.4.2 nặng 1.2GB vì chứa JDK, Maven và source, chứng tỏ không phải multi-stage. Revision mới fail readinessProbe nên pod không nhận traffic ổn định, rollback về revision trước là đúng, sau đó mới sửa Dockerfile sang hai stage: stage build dùng JDK và Maven, stage runtime chỉ chứa JRE và file jar, chạy bằng user không phải root.",
      "why": "Multi-stage tách build khỏi runtime nên image cuối nhỏ, ít lỗ hổng và không lộ source. Terminal cho bằng chứng về bản đang chạy thật, còn sửa code trong bóng tối chỉ đổi bản chưa deploy.",
      "hints": [
        "Image production chứa tool build thì nặng và lộ source, dấu hiệu đó đọc được từ đâu trong terminal?",
        "Trước khi quyết định rollback, bạn cần biết revision nào đang chạy và revision nào khỏe trước đó."
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "docker images order-api",
            "output": "order-api 1.4.2 1.2GB | order-api 1.4.1 210MB (ban 1.4.1 nho hon nhieu, ban 1.4.2 chua multi-stage)"
          },
          {
            "cmd": "kubectl rollout status deployment/order-api",
            "output": "Waiting for deployment order-api rollout to finish: 1 of 2 updated replicas are available"
          },
          {
            "cmd": "kubectl get pods -l app=order-api",
            "output": "order-api-1.4.2-abc Running 0/1 READY (readinessProbe fail) | order-api-1.4.1-xyz Running 1/1 READY"
          },
          {
            "cmd": "kubectl rollout undo deployment/order-api",
            "output": "deployment.apps/order-api rolled back to revision 3 (1.4.1), 2/2 replicas READY"
          }
        ]
      }
    }
  ],
  "27":   [
    {
      "id": "27-1",
      "concept": "Cái gì bắt buộc test",
      "type": "fix-bug",
      "title": "Consumer trừ tiền hai lần vì thiếu idempotency",
      "prompt": "Hệ thống báo một số user bị trừ điểm hai lần sau đợt message bị redeliver. Đoạn consumer dưới đây chạy ngon với message bình thường, nhưng không có thứ gì chặn message trùng. Hãy tìm chỗ thiếu và sửa sao cho cùng một message chạy lại cũng chỉ trừ tiền một lần.",
      "code": "@KafkaListener(topics = \"points-deducted\")\npublic void onDeduct(PointDeducted event) {\n    Wallet wallet = walletRepository.findByUserId(event.userId());\n    wallet.deduct(event.amount());\n    walletRepository.save(wallet);\n    log.info(\"Deducted {} points\", event.amount());\n}",
      "language": "java",
      "failingEvidence": "Log thật: cùng eventId evt-991 xuất hiện hai lần, mỗi lần wallet giảm 100 điểm, tổng giảm 200 trong khi user chỉ thực hiện một giao dịch. Test happy path vẫn xanh vì nó chỉ gửi message một lần.",
      "checks": [
        "Chọn đúng dòng thiếu: không có kiểm tra dedup theo eventId trước khi trừ tiền",
        "Chọn diff đúng: lưu eventId đã xử lý trong cùng transaction với trừ tiền, message trùng thì bỏ qua"
      ],
      "solution": "@Transactional\n@KafkaListener(topics = \"points-deducted\")\npublic void onDeduct(PointDeducted event) {\n    if (processedEventRepository.existsByEventId(event.eventId())) {\n        return;\n    }\n    Wallet wallet = walletRepository.findByUserId(event.userId());\n    wallet.deduct(event.amount());\n    walletRepository.save(wallet);\n    processedEventRepository.save(new ProcessedEvent(event.eventId()));\n}",
      "why": "At-least-once nghĩa là message trùng là bình thường, không phải lỗi hiếm. Dedup phải lưu cùng transaction với thay đổi nghiệp vụ, nếu không consumer crash giữa chừng vẫn tạo ra cửa sổ trừ hai lần. Test bắt buộc ở đây là gửi trùng message và assert số dư chỉ giảm một lần.",
      "hints": [
        "Ngày 16 đã dạy: consumer phải idempotent, vậy thứ gì làm cho lần chạy thứ hai nhận ra nó đã chạy rồi?",
        "Lưu dấu đã xử lý ở đâu thì crash giữa chừng cũng không tạo ra lần trừ thứ hai?"
      ]
    },
    {
      "id": "27-2",
      "concept": "Cái gì bắt buộc test",
      "type": "predict",
      "title": "Đoán test tiền lẻ với double sẽ ra sao",
      "prompt": "Một bạn mới viết test tính tổng tiền bằng double và tin rằng test sẽ xanh vì toán học nói 0.1 cộng 0.2 bằng 0.3. Trước khi xem output thật, hãy đoán: assertEquals trong đoạn code dưới đây pass hay fail, và giá trị thật mà máy tính ra là bao nhiêu?",
      "code": "double total = 0.1 + 0.2;\nassertEquals(0.3, total, 0.0);\n// delta = 0.0 nghia la so sanh tuyet doi, khong co sai so cho phep\nBigDecimal correct = new BigDecimal(\"0.1\").add(new BigDecimal(\"0.2\"));",
      "language": "java",
      "failingEvidence": "Output thật khi đối chiếu: expected 0.3 but was 0.30000000000000004. Test fail dù công thức nhìn đúng, còn biến correct bằng BigDecimal cho đúng 0.3.",
      "checks": [
        "Đoán đúng kết quả: test fail vì 0.1 cộng 0.2 ở hệ nhị phân không ra đúng 0.3",
        "Chọn cách sửa đúng: tiền dùng BigDecimal với chuỗi khởi tạo, không dùng double và không dùng new BigDecimal(0.1)"
      ],
      "solution": "Đáp án đúng: test fail, giá trị thật là 0.30000000000000004. Sửa: BigDecimal total = new BigDecimal(\"19.99\").add(new BigDecimal(\"0.01\")), và mọi phép tính tiền đều dùng BigDecimal với scale và rounding mode rõ ràng. Test tiền phải có case tiền lẻ, số âm và làm tròn, không chỉ test số tròn.",
      "why": "Double lưu số thập phân ở hệ nhị phân nên nhiều số lẻ không biểu diễn chính xác được, sai số tích lũy thành lệch vài đồng trên tổng lớn. Tiền là invariant bắt buộc test, và lỗi tiền lẻ là lỗi contract chứ không phải lỗi làm tròn hiển thị.",
      "hints": [
        "Máy tính lưu 0.1 ở hệ nhị phân chính xác hay gần đúng?",
        "Nếu delta bằng 0 mà test vẫn fail, sai số nằm ở phép tính hay ở kỳ vọng của bạn?"
      ]
    },
    {
      "id": "27-3",
      "concept": "Test pyramid",
      "type": "skeleton",
      "title": "Điền test cho thanh toán theo đúng tầng pyramid",
      "prompt": "Agent vừa nộp bộ test thanh toán chỉ có một test end-to-end chạy toàn bộ luồng và tự hào vì coverage cao. Bạn được giao viết lại bộ test theo pyramid: unit nhiều và nhanh ở dưới, integration ít hơn ở giữa, end-to-end ít nhất ở trên. Hãy điền các chỗ TODO sao cho mỗi tầng kiểm tra đúng thứ nó giỏi nhất.",
      "code": "class PaymentTest {\n    // TODO (unit, nhanh): test tinh tong tien va tinh hoan tien, khong can database\n    // TODO (integration, database that): test tru kho dong thoi va rollback khi thanh toan loi\n    // TODO (integration): test message thanh toan trung chi tru tien mot lan\n    // TODO (contract): test API tra dung OpenAPI, khong lech field\n    // TODO (e2e, it nhat): test mot luong day du tu dat hang toi tru kho\n}",
      "language": "java",
      "failingEvidence": "Nếu điền sai, ví dụ dồn mọi thứ lên end-to-end: suite chạy hàng giờ, lỗi ở end-to-end không biết nằm ở service nào, và test chậm khiến team bỏ chạy test trước khi merge. Nếu chỉ có unit với mock database: test xanh nhưng SQL thật, migration thật và index thật chưa bao giờ được chạy.",
      "checks": [
        "Chọn đúng phân tầng: unit cho tính toán, integration với database thật cho kho và rollback, contract cho OpenAPI, e2e chỉ một luồng đầy đủ",
        "Chọn đúng test bắt buộc còn thiếu: rollback khi lỗi và message trùng, không chỉ happy path"
      ],
      "solution": "// Unit: assertEquals(new BigDecimal(\"199.98\"), calculator.total(items))\n// Integration (Testcontainers Postgres): hai thread tru kho cung luc, assert so luong khong am\n// Integration: thanh toan loi co chu dich, assert order va kho rollback ve trang thai cu\n// Integration: gui message trung hai lan, assert so du chi giam mot lan\n// Contract: response phai khop OpenAPI, field total dung kieu, khong thua field bat ngo\n// E2E: mot luong duy nhat dat hang, thanh toan, tru kho, nhan email xac nhan",
      "why": "Pyramid phân bổ bằng chứng đúng chỗ: unit rẻ nên viết nhiều, integration đắt hơn nhưng kiểm tra được thứ mock không thấy, end-to-end đắt và giòn nên chỉ giữ lại luồng quan trọng nhất. Đảo pyramid là đổi tốc độ phản hồi lấy ảo giác bao phủ.",
      "hints": [
        "Hỏi từng test: thứ này cần database thật để phát hiện lỗi gì mà mock không phát hiện được?",
        "Test nào chậm nhất mà lại ít cho biết lỗi nằm ở đâu nhất thì nên thu hẹp lại."
      ]
    },
    {
      "id": "27-4",
      "concept": "Integration với database thật",
      "type": "decision",
      "title": "Chọn mock hay database thật cho test trừ kho",
      "prompt": "Team tranh cãi về test trừ kho đồng thời: phương án A mock repository nên chạy nhanh và luôn xanh, phương án B chạy Postgres thật trong Testcontainers nên chậm hơn nhưng thật hơn. Hãy chọn phương án cho test này và biện minh: phương án kia bỏ sót loại lỗi nào, và khi nào mock mới là lựa chọn đúng?",
      "code": "// PHUONG AN A: mock repository, khong co database that\nWalletRepository repo = mock(WalletRepository.class);\nwhen(repo.findByUserId(\"u1\")).thenReturn(wallet);\nservice.deduct(\"u1\", 100);\nverify(repo).save(any());\n// PHUONG AN B: Testcontainers Postgres that\n@Container\nstatic PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(\"postgres:16\");\n// Test chay hai thread tru kho cung luc tren database that, assert so du khong am",
      "language": "java",
      "failingEvidence": "Hậu quả nếu chọn sai (chỉ dùng phương án A): SQL thật sai, constraint thiếu, transaction không rollback và race condition ở database đều không lộ, test xanh mà production vẫn trừ kho âm. Mock chỉ kiểm tra code gọi đúng hàm đã mock, không kiểm tra persistence đúng.",
      "checks": [
        "Chọn phương án đúng: phương án B cho test trừ kho, rollback và race condition",
        "Chọn đúng lý do: chỉ database thật mới phát hiện lỗi SQL, migration, constraint và lock, còn mock chỉ hợp cho logic thuần không chạm database"
      ],
      "solution": "Chọn phương án B cho test trừ kho đồng thời, rollback và idempotency. Giữ phương án A cho logic thuần như tính tổng tiền và tính hoàn tiền, nơi database không liên quan. Quy tắc: test nào hỏi persistence có đúng không thì phải có database thật, test nào hỏi tính toán có đúng không thì mock là đủ.",
      "why": "Mock database là giả định rằng persistence đúng, đúng thứ test cần chứng minh. Testcontainers đắt hơn một chút nhưng là bằng chứng duy nhất cho SQL, migration, index và transaction, và đó là lý do ngày 27 bắt buộc integration với database thật cho luồng tiền và kho.",
      "hints": [
        "Mock repository trả về đúng thứ bạn dặn nó trả về, vậy nó chứng minh được gì về database thật?",
        "Lỗi nào trong trừ kho đồng thời chỉ xuất hiện khi hai thread cùng chạm vào một dòng thật?"
      ]
    },
    {
      "id": "27-5",
      "concept": "Contract test",
      "type": "terminal",
      "title": "Đọc output test để bắt contract lệch",
      "prompt": "Pipeline vừa đỏ sau khi backend đổi tên field trong response đơn hàng, nhưng unit test của backend vẫn xanh. Chỉ dùng terminal, hãy đọc output theo thứ tự: test nào đỏ, lỗi contract nằm ở field nào, và vì sao unit test xanh không cứu được lần này.",
      "code": "# Kich ban terminal gia lap: doc output test, khong sua code ngay\n# Buoc 1: chay unit test cua backend\n# Buoc 2: chay contract test theo OpenAPI\n# Buoc 3: chay test phia frontend goi API theo contract cu",
      "language": "bash",
      "failingEvidence": "Nếu chỉ nhìn unit test xanh mà merge, frontend cũ đọc field total thì nhận undefined, tổng tiền hiển thị 0, và lỗi chỉ lộ khi tích hợp thật hoặc khi user báo. Unit test xanh vì nó khớp với code sai mới, không khớp với contract đã cam kết.",
      "checks": [
        "Chọn đúng test đỏ: contract test theo OpenAPI, ở field total bị đổi thành totalAmount",
        "Chọn đúng kết luận: unit test khớp code mới nên không bắt được lệch contract, chỉ contract test mới bắt được"
      ],
      "solution": "Kết luận đúng: backend đổi total thành totalAmount mà không đổi OpenAPI và không báo frontend, contract test đỏ vì response không khớp schema đã cam kết. Sửa: hoặc giữ field total, hoặc ra version mới kèm lộ trình migration và cập nhật OpenAPI cùng frontend. Bài học: test phải khớp với spec, không khớp với code vừa viết.",
      "why": "Contract là cam kết giữa hai phía, unit test chỉ là cam kết trong một phía. Khi một phía đổi contract mà phía kia không biết, cả hai đều nói code của mình đúng, và chỉ contract test mới có tiếng nói thứ ba để phân xử.",
      "hints": [
        "Unit test của backend kiểm tra code mới, vậy ai kiểm tra cam kết cũ với frontend?",
        "Field nào đổi tên sẽ khiến frontend cũ đọc ra undefined mà không báo lỗi?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "./mvnw test -Dtest=OrderServiceTest",
            "output": "Tests run: 24, Failures: 0, Errors: 0 (unit test xanh, vi no khop code moi)"
          },
          {
            "cmd": "./mvnw test -Dtest=OrderContractTest",
            "output": "FAIL: response field total is missing, found totalAmount instead (khong khop OpenAPI v1)"
          },
          {
            "cmd": "npm test -- contract/order.contract.test.js",
            "output": "FAIL: expected response.total to be 199.98, received undefined (frontend doc theo contract cu)"
          }
        ]
      }
    }
  ],
  "28":   [
    {
      "id": "28-1",
      "concept": "Checklist review",
      "type": "fix-bug",
      "title": "Review code tạo đơn của agent: bắt 4 lỗi một lúc",
      "prompt": "Agent vừa nộp đoạn code tạo đơn dưới đây kèm lời khẳng định build đã pass. Bạn được giao review theo checklist ngày 28, không review theo cảm tính. Hãy rà từng mục checklist và chỉ ra ít nhất bốn lỗi mà build vẫn pass: transaction, bù, idempotency và test trường hợp lỗi.",
      "code": "public Order createOrder(CreateOrderRequest req) {\n    Order order = orderRepository.save(new Order(req.userId(), req.total()));\n    try {\n        paymentClient.charge(req.userId(), req.total());\n        inventoryClient.deduct(req.items());\n    } catch (Exception e) {\n        log.info(\"Payment or inventory failed, continuing\");\n    }\n    order.setStatus(\"PAID\");\n    return orderRepository.save(order);\n}",
      "language": "java",
      "failingEvidence": "Kịch bản lỗi thật: thanh toán thành công nhưng trừ kho lỗi, exception bị nuốt, đơn vẫn chuyển thành PAID dù không có hàng để giao. Retry từ client tạo thêm một lần charge nữa vì không có idempotency key, và không có test nào cho nhánh lỗi nên mọi thứ vẫn xanh.",
      "checks": [
        "Chọn đúng các lỗi theo checklist: không có transaction hoặc bù, nuốt exception rồi vẫn set PAID, không có idempotency key, không có test trường hợp lỗi",
        "Chọn diff đúng: tách bước có bù, chỉ set PAID khi cả hai bước thành công, thêm idempotency key và test nhánh lỗi"
      ],
      "solution": "@Transactional\npublic Order createOrder(CreateOrderRequest req) {\n    if (orderRepository.existsByIdempotencyKey(req.idempotencyKey())) {\n        return orderRepository.findByIdempotencyKey(req.idempotencyKey());\n    }\n    Order order = orderRepository.save(new Order(req.userId(), req.total()));\n    paymentClient.charge(req.idempotencyKey(), req.userId(), req.total());\n    inventoryClient.deduct(req.items());\n    order.setStatus(\"PAID\");\n    return orderRepository.save(order);\n}\n// Neu tru kho loi sau khi thanh toan thanh cong: transaction rollback phan ghi local,\n// va saga bu phai hoan tien. Khong bao gio nuot exception roi set PAID.",
      "why": "Build pass chỉ nói cú pháp đúng, checklist mới nói hành vi đúng. Nuốt exception là xóa bằng chứng lỗi, set PAID bừa là tạo dữ liệu sai, thiếu idempotency biến retry thành thu tiền hai lần. Bốn lỗi này cùng sống trong một hàm vì không có mục checklist nào chặn chúng.",
      "hints": [
        "Đi từng mục checklist ngày 28 thay vì đọc code từ trên xuống và đoán.",
        "Hỏi từng nhánh lỗi: khi bước thứ hai lỗi thì bước thứ nhất đã làm gì, và ai sửa nó?"
      ]
    },
    {
      "id": "28-2",
      "concept": "Build pass không phải bằng chứng",
      "type": "predict",
      "title": "Đoán trạng thái database khi transaction tự gọi chính mình",
      "prompt": "Một bạn khẳng định code dưới đây an toàn vì đã gắn @Transactional và Java compile không báo lỗi gì. Trước khi xem kết quả thật, hãy đoán: sau khi bước lưu coverage ném checked exception, policy và location còn trong database không, và vì sao annotation kia không cứu được?",
      "code": "public void createPolicy(PolicyRequest req) throws PolicyException {\n    savePolicyWithLocations(req);\n}\n@Transactional\npublic void savePolicyWithLocations(PolicyRequest req) throws PolicyException {\n    policyRepository.save(new Policy(req.name()));\n    locationRepository.save(new Location(req.address()));\n    throw new PolicyException(\"Coverage validation failed\");\n}\n// Luu y: createPolicy goi savePolicyWithLocations trong cung class,\n// va PolicyException la checked exception.",
      "language": "java",
      "failingEvidence": "Output thật khi đối chiếu: sau khi exception ném ra, policy và location vẫn nằm trong database, không rollback. Test đếm số policy trước và sau cho thấy count tăng lên 1 dù luồng báo lỗi.",
      "checks": [
        "Đoán đúng trạng thái database: policy và location vẫn còn, không rollback",
        "Chọn đúng hai nguyên nhân: tự gọi trong cùng class nên proxy transaction không áp dụng, và checked exception mặc định không gây rollback"
      ],
      "solution": "Đáp án đúng: không rollback, dữ liệu lưu nửa vời. Nguyên nhân một: @Transactional hoạt động qua proxy, gọi this.savePolicyWithLocations trong cùng class thì đi thẳng vào method, không qua proxy nên không có transaction. Nguyên nhân hai: @Transactional mặc định chỉ rollback với unchecked exception, checked exception như PolicyException thì commit. Sửa: đặt @Transactional ở method được gọi từ bên ngoài, và thêm rollbackFor = PolicyException.class, hoặc ném unchecked exception.",
      "why": "Compile pass và annotation có mặt không đồng nghĩa transaction có hiệu lực. Proxy, loại exception và ranh giới gọi là ba thứ build không kiểm tra, chỉ test rollback thật mới bắt được. Đây chính là lý do ngày 28 nói build pass không phải bằng chứng.",
      "hints": [
        "Annotation gắn ở method nào không quan trọng bằng việc lời gọi đi qua proxy hay đi thẳng.",
        "Mặc định của Spring là rollback với loại exception nào, và PolicyException thuộc loại đó không?"
      ]
    },
    {
      "id": "28-3",
      "concept": "Thứ tự chẩn đoán",
      "type": "skeleton",
      "title": "Điền runbook debug sự cố theo thứ tự có bằng chứng",
      "prompt": "User báo đặt hàng lúc 10:02 bị lỗi và màn hình trắng, một bạn trong team định restart server ngay cho nhanh. Bạn được giao viết runbook debug mà team sẽ làm theo lần sau, theo thứ tự từ triệu chứng tới nguyên nhân gốc. Hãy điền các chỗ TODO, và ghi rõ việc nào không được làm trước.",
      "code": "#!/bin/bash\n# RUNBOOK: debug don hang loi luc 10:02, don 123\n# TODO buoc 1: lay bang chung gi tu phia server truoc khi do loi cho cache?\n# TODO buoc 2: lan theo correlationId qua service nao truoc, service nao sau?\n# TODO buoc 3: kiem tra thay doi gan nhat nao (deploy, config, migration)?\n# TODO buoc 4: xac dinh service loi dau tien bang cach nao, khong phai service la to nhat?\n# KHONG DUOC LAM TRUOC: restart bua, sua code theo doan, ket luan tu build pass",
      "language": "bash",
      "failingEvidence": "Nếu điền sai thứ tự, ví dụ đổ lỗi cho browser cache trước khi xem banner version server: team xóa cache của user, sửa frontend, nhưng sự cố vẫn còn vì file trên main đã khác và server đang chạy bản cũ lỗi. Restart bừa còn xóa cả log và trạng thái giúp tìm nguyên nhân gốc.",
      "checks": [
        "Chọn đúng thứ tự: banner version server rồi file trên main rồi mới tới browser cache",
        "Chọn đúng việc cấm làm trước: restart bừa và sửa code theo đoán trước khi có bằng chứng"
      ],
      "solution": "#!/bin/bash\n# Buoc 1: curl https://api.example.com/api/version, ghi lai version server dang chay\n# Buoc 2: git log --oneline -5 va git diff main, xem file tren main co khop ban deploy khong\n# Buoc 3: kubectl logs theo correlationId cua don 123 luc 10:02, lan gateway, order, payment\n# Buoc 4: service loi dau tien theo thoi gian va du lieu, kiem tra deploy, config, migration gan nhat\n# Buoc 5: sua nguyen nhan goc, kiem chung lai bang thao tac that, ghi lai runbook\n# Chi restart sau khi da lay log va xac dinh nguyen nhan, khong restart de che loi",
      "why": "Thứ tự chẩn đoán là thứ ngăn suy luận nhảy cóc: version server nói bản nào đang chạy thật, file trên main nói bản nào đáng lẽ phải chạy, cache chỉ là nghi phạm cuối cùng khi hai thứ trước đã khớp. Sửa nguyên nhân gốc thay vì restart cho qua là cách lỗi không quay lại vài ngày sau.",
      "hints": [
        "Nhớ thứ tự chẩn đoán ngày 28: server trước, main sau, cache cuối cùng.",
        "Việc nào làm mất bằng chứng thì không được làm trước, dù nó làm triệu chứng biến mất tạm thời."
      ]
    },
    {
      "id": "28-4",
      "concept": "Checklist review",
      "type": "decision",
      "title": "Chọn cách ứng phó sự cố: restart ngay hay lần dấu vết trước",
      "prompt": "Hệ thống đang lỗi, user chờ, và hai phương án ứng phó được đặt lên bàn. Phương án A cho triệu chứng biến mất nhanh, phương án B chậm hơn nhưng tìm ra nguyên nhân. Hãy chọn phương án cho sự cố chưa rõ nguyên nhân này và biện minh: phương án kia đánh đổi cái gì, và khi nào restart ngay mới là đúng?",
      "code": "# PHUONG AN A: restart ngay, khong lay log, khong ghi lai\nkubectl rollout restart deployment/order-api\n# PHUONG AN B: giu nguyen hien truong, lay log va metric, roi moi sua\nkubectl logs deploy/order-api --since=30m > incident-1002.log\ncurl https://api.example.com/api/version > incident-1002-version.txt\n# Sau do moi quyet dinh restart, rollback hay sua code dua tren bang chung",
      "language": "bash",
      "failingEvidence": "Hậu quả nếu chọn sai (phương án A cho sự cố chưa rõ nguyên nhân): log và trạng thái lỗi bị xóa theo pod mới, lỗi quay lại vài ngày sau y hệt mà không ai biết vì sao, và team không có runbook cho lần sau vì lần này không ghi lại gì.",
      "checks": [
        "Chọn phương án đúng: phương án B khi nguyên nhân chưa rõ",
        "Chọn đúng lý do: giữ hiện trường để tìm lỗi đầu tiên và nguyên nhân gốc, restart chỉ là bước sau khi đã có bằng chứng"
      ],
      "solution": "Chọn phương án B cho sự cố chưa rõ nguyên nhân. Lấy log, version và metric trước, xác định service lỗi đầu tiên và thay đổi gần nhất, rồi mới chọn restart, rollback hay sửa code. Restart ngay chỉ đúng khi nguyên nhân đã biết rõ là trạng thái tạm thời, ví dụ pod kẹt vì hết bộ nhớ tạm và đã có runbook ghi sẵn cho trường hợp đó.",
      "why": "Restart là cách xóa triệu chứng, không phải cách sửa nguyên nhân. Khi nguyên nhân chưa rõ, giữ hiện trường là giữ bằng chứng duy nhất, còn restart sớm là tự xóa bằng chứng rồi hy vọng lỗi không quay lại.",
      "hints": [
        "Hỏi: sau khi restart mà lỗi hết, bạn biết được gì về nguyên nhân cho lần sau?",
        "Trường hợp nào thì restart là hành động đã có bằng chứng, chứ không phải hành động thay cho bằng chứng?"
      ]
    },
    {
      "id": "28-5",
      "concept": "Thứ tự chẩn đoán",
      "type": "terminal",
      "title": "Chẩn đoán web cũ sau deploy theo đúng thứ tự",
      "prompt": "User báo sau khi pull code mới, web vẫn hiện bản cũ, và một bạn đã vội kết luận là do browser cache. Bạn có terminal và được giao chẩn đoán theo thứ tự ngày 28: banner version server trước, file trên main sau, browser cache cuối cùng. Hãy đọc output từng bước và kết luận xem cache có phải thủ phạm không.",
      "code": "# Kich ban terminal gia lap: doc output tung buoc, dung nhay toi ket luan\n# Buoc 1: banner version server\n# Buoc 2: file tren main\n# Buoc 3: kiem tra cache bang cach goi khong cache",
      "language": "bash",
      "failingEvidence": "Nếu kết luận cache trước khi xem version server, team sẽ hướng dẫn user xóa cache vô ích trong khi thật ra server vẫn chạy bản cũ vì deploy chưa tới, hoặc file trên main đã khác với bản deploy. Cache chỉ có tội khi server và main đã khớp mà trình duyệt vẫn hiện cũ.",
      "checks": [
        "Chọn đúng thứ tự chẩn đoán: version server rồi file trên main rồi mới cache",
        "Chọn đúng kết luận: server đang chạy bản cũ 1.4.1 trong khi main đã là 1.4.2, nên đây là lỗi deploy chưa tới, không phải lỗi cache"
      ],
      "solution": "Kết luận đúng: không phải cache. Banner server báo 1.4.1, git log trên main cho thấy commit mới nhất là 1.4.2, và gọi không cache vẫn trả bản cũ, chứng tỏ deploy chưa đưa bản mới lên server. Sửa: kiểm tra pipeline và rollout, không hướng dẫn user xóa cache. Chỉ khi server và main đều là 1.4.2 mà trình duyệt vẫn hiện cũ thì mới kết luận cache.",
      "why": "Thứ tự này ngăn việc đổ lỗi cho thứ dễ đổ nhất. Mỗi bước loại trừ một nghi phạm bằng bằng chứng, và cache là nghi phạm cuối cùng vì nó chỉ giải thích được khi mọi thứ khác đã khớp.",
      "hints": [
        "Banner version server nói bản nào đang chạy thật, không phải bản nào đáng lẽ phải chạy.",
        "Gọi không cache vẫn ra bản cũ thì thủ phạm nằm ở server hay ở trình duyệt?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "curl https://api.example.com/api/version",
            "output": "version: 1.4.1, built: 2026-10-28T09:00:00Z (server dang chay ban cu)"
          },
          {
            "cmd": "git log --oneline -3",
            "output": "a1b2c3d 1.4.2 fix order total | e4f5g6h 1.4.1 previous release | 9a8b7c6 1.4.0"
          },
          {
            "cmd": "curl -H \"Cache-Control: no-cache\" https://api.example.com/api/version",
            "output": "version: 1.4.1 (goi khong cache van ra ban cu, loai tru browser cache)"
          },
          {
            "cmd": "kubectl rollout status deployment/order-api",
            "output": "deployment order-api rollout stuck: new replica not ready (deploy chua toi, can kiem tra pipeline)"
          }
        ]
      }
    }
  ],
  "29":   [
    {
      "id": "29-1",
      "concept": "Secret management",
      "type": "fix-bug",
      "title": "JWT secret hardcode và in ra log",
      "prompt": "Trong buổi audit secret, bạn phát hiện đoạn code dưới đây vừa hardcode JWT secret vừa in secret ra log lúc khởi động. Hãy chỉ ra vì sao cả hai đều là rò rỉ, và sửa sao cho secret chỉ sống ở môi trường deploy, không bao giờ vào code, git hay log.",
      "code": "public class JwtConfig {\n    private static final String JWT_SECRET = \"changeme-super-secret-123\";\n    public void init() {\n        System.out.println(\"Starting with JWT secret: \" + JWT_SECRET);\n        this.signer = new HmacSigner(JWT_SECRET);\n    }\n}",
      "language": "java",
      "failingEvidence": "Bằng chứng rò rỉ: secret nằm trong code nên nằm luôn trong lịch sử git, bất kỳ ai có quyền đọc repo là có secret. Log khởi động in secret ra, nên bất kỳ ai đọc được log cũng ký được token giả với role tùy ý.",
      "checks": [
        "Chọn đúng các dòng gây lỗi: hardcode secret trong code và in secret ra log",
        "Chọn diff đúng: đọc secret từ biến môi trường lúc chạy, không log giá trị secret, và rotate secret đã lộ ngay"
      ],
      "solution": "public class JwtConfig {\n    private final String jwtSecret;\n    public JwtConfig(String jwtSecret) {\n        if (jwtSecret == null || jwtSecret.isBlank()) {\n            throw new IllegalStateException(\"Missing required env JWT_SECRET\");\n        }\n        this.jwtSecret = jwtSecret;\n    }\n    public void init() {\n        log.info(\"JWT signer initialized\");\n        this.signer = new HmacSigner(jwtSecret);\n    }\n}\n// Secret lay tu env hoac Vault cua moi truong deploy. Secret cu da lot vao git thi\n// phai rotate ngay: xoa khoi git khong du vi lich su git van con.",
      "why": "Secret trong code là secret đã lộ cho mọi người có repo, và log secret là lộ cho mọi người có log. Xóa file không thu hồi được secret đã phát tán, chỉ rotate mới vô hiệu hóa được secret cũ. Đây là lý do ngày 29 bắt buộc audit cả git history, không chỉ file hiện tại.",
      "hints": [
        "Ai đọc được repo và ai đọc được log, và mỗi nhóm đó làm gì được với secret này?",
        "Xóa secret khỏi file hiện tại có xóa được nó khỏi lịch sử git không?"
      ]
    },
    {
      "id": "29-2",
      "concept": "ADR",
      "type": "decision",
      "title": "Viết ADR chọn SQL hay MongoDB cho đơn hàng",
      "prompt": "Team phải chốt database cho đơn hàng trước khi code, và hai phương án dưới đây đều có người ủng hộ. Hãy chọn một phương án, viết quyết định theo cấu trúc ADR gồm ngữ cảnh, phương án bị loại và hậu quả chấp nhận, kèm điều kiện xem lại. Phương án thắng không phải phương án thời thượng hơn, mà là phương án khớp với yêu cầu transaction và báo cáo.",
      "code": "# PHUONG AN A: Postgres cho don hang\ntransaction: manh, da bang trong mot transaction\njoin: bao cao doanh thu theo san pham bang join truc tiep\ncost: them mot database can van hanh neu catalog dung MongoDB\n# PHUONG AN B: MongoDB cho don hang, nhung items vao document don\ntransaction: da document dat va can replica set\njoin: bao cao phai dung aggregation, kho join voi bang khac\ncost: mot database neu toan he thong dung MongoDB",
      "language": "yaml",
      "failingEvidence": "Hậu quả nếu chọn sai (phương án B cho đơn hàng cần transaction và báo cáo join): transaction đa document đắt và phức tạp, báo cáo phải viết aggregation khó bảo trì, và khi cần nhất quán xuyên đơn hàng với thanh toán thì phải tự xây saga bù cho thứ SQL cho sẵn.",
      "checks": [
        "Chọn phương án đúng: phương án A cho đơn hàng",
        "Chọn đúng cấu trúc ADR: ngữ cảnh cần transaction và báo cáo, phương án B bị loại với lý do cụ thể, hậu quả là vận hành thêm một database và ngày xem lại rõ ràng"
      ],
      "solution": "Quyết định: dùng Postgres cho đơn hàng. Ngữ cảnh: đơn hàng cần transaction đa bảng, ràng buộc khóa ngoại và báo cáo join. Phương án bị loại: MongoDB cho đơn hàng, vì transaction đa document đắt, join hạn chế và báo cáo khó. Hậu quả chấp nhận: vận hành thêm một database nếu catalog dùng MongoDB, và cần saga khi cần nhất quán xuyên hai database. Xem lại khi: khối lượng đơn vượt ngưỡng đã ghi hoặc yêu cầu báo cáo đổi hẳn.",
      "why": "ADR tồn tại để sáu tháng sau người khác vẫn hiểu vì sao chọn vậy mà không cần hỏi lại, và để team không tranh cãi lại quyết định cũ mỗi quý. ADR không có phương án bị loại và hậu quả chỉ là biện minh sau khi đã code, không phải quyết định.",
      "hints": [
        "Yêu cầu nào của đơn hàng là bắt buộc: transaction, join báo cáo hay một database duy nhất?",
        "ADR tốt ghi cả thứ mình chấp nhận đánh đổi, không chỉ ghi thứ mình chọn."
      ]
    },
    {
      "id": "29-3",
      "concept": "Secret management",
      "type": "predict",
      "title": "Đoán chuyện gì xảy ra khi xoay JWT secret",
      "prompt": "Team vừa xoay JWT secret vì secret cũ đã lộ trong một log, và một bạn hỏi vì sao toàn bộ user bị đăng xuất cùng lúc. Trước khi xem kết quả thật, hãy đoán: token cấp trước khi xoay còn verify được không, refresh token cũ còn đổi được access token mới không, và team phải thông báo gì cho user?",
      "code": "String secretBefore = System.getenv(\"JWT_SECRET\");\nString tokenIssuedBefore = sign(userId, secretBefore);\n// Team xoay secret: JWT_SECRET doi tu secret-cu sang secret-moi\nString secretAfter = System.getenv(\"JWT_SECRET\");\nboolean verified = verify(tokenIssuedBefore, secretAfter);\n// Refresh token cu cung duoc ky bang secret-cu",
      "language": "java",
      "failingEvidence": "Output thật khi đối chiếu: verified bằng false, mọi request mang token cũ nhận 401, refresh bằng refresh token cũ cũng thất bại vì chữ ký không còn khớp secret mới. User không làm gì sai nhưng vẫn bị đăng xuất hàng loạt.",
      "checks": [
        "Đoán đúng kết quả: token cũ không verify được, toàn bộ phiên cũ hết hiệu lực",
        "Chọn đúng kế hoạch đi kèm xoay secret: thông báo trước, cho đăng nhập lại, và thu hồi toàn bộ phiên của tài khoản bị lộ"
      ],
      "solution": "Đáp án đúng: token cũ verify bằng false, user bị đăng xuất và phải đăng nhập lại, refresh token cũ cũng vô hiệu. Xoay secret là hành động bảo mật đúng nhưng có giá: mọi phiên sống bằng secret cũ đều chết. Vì vậy xoay secret phải đi kèm thông báo, cửa sổ đăng nhập lại và, nếu chỉ một tài khoản bị lộ, thu hồi phiên của tài khoản đó trước khi xoay toàn hệ thống nếu kiến trúc cho phép.",
      "why": "Chữ ký JWT chỉ tin được khi secret khớp, đổi secret là đổi gốc tin cậy. Hiểu hậu quả này trước khi xoay giúp team không ngạc nhiên khi user bị đăng xuất, và không trì hoãn xoay secret vì sợ ảnh hưởng user trong khi secret đã lộ.",
      "hints": [
        "Verify chữ ký là so sánh chữ ký với secret nào: secret lúc ký hay secret lúc verify?",
        "Nếu secret cũ vẫn dùng được sau khi xoay thì việc xoay còn ý nghĩa gì?"
      ]
    },
    {
      "id": "29-4",
      "concept": "Boot-required vs degraded-if-missing",
      "type": "skeleton",
      "title": "Điền cấu hình phân biệt boot-required và degraded",
      "prompt": "App vừa sập toàn bộ chỉ vì thiếu API key gửi email, một tính năng phụ. Bạn được giao viết lại cấu hình khởi động sao cho thiếu thứ bắt buộc thì app chết rõ ràng lúc boot, còn thiếu thứ phụ thì app vẫn boot nhưng tắt tính năng đó và ghi rõ trạng thái degraded. Hãy điền các chỗ TODO.",
      "code": "#!/bin/bash\n# Cau hinh khoi dong app\n# TODO: bien nao la boot-required (thieu thi dung app, bao ro ten bien)?\n# TODO: bien nao la degraded-if-missing (thieu thi app van boot)?\n# TODO: khi thieu bien degraded thi app phai lam gi: tat tinh nang, ghi log, bao cho ai?\n# TODO: kiem tra suc khoe phai phan anh trang thai degraded ra sao?",
      "language": "bash",
      "failingEvidence": "Nếu điền sai, ví dụ coi mọi biến đều boot-required: thiếu key email phụ là cả hệ thống đặt hàng sập theo. Nếu coi mọi biến đều degraded: thiếu DB URL mà app vẫn boot rồi request đầu tiên mới lỗi kết nối, khó truy vết hơn nhiều.",
      "checks": [
        "Chọn đúng phân loại: DB URL và JWT secret là boot-required, email và SMS key là degraded-if-missing",
        "Chọn đúng hành vi khi degraded: app vẫn boot, tắt tính năng thông báo, ghi log rõ và health check báo degraded"
      ],
      "solution": "#!/bin/bash\n# Boot-required: DATABASE_URL, JWT_SECRET. Thieu thi dung ngay, bao ro ten bien.\nif [ -z \"$DATABASE_URL\" ] || [ -z \"$JWT_SECRET\" ]; then\n  echo \"Missing boot-required env: DATABASE_URL or JWT_SECRET\" >&2\n  exit 1\nfi\n# Degraded-if-missing: EMAIL_API_KEY, SMS_API_KEY. Thieu thi van boot.\nif [ -z \"$EMAIL_API_KEY\" ]; then\n  echo \"WARN: EMAIL_API_KEY missing, notification feature degraded\" >&2\n  export NOTIFICATION_ENABLED=false\nfi\n# Health check phan anh: /health tra degraded khi NOTIFICATION_ENABLED=false,\n# nhung khong tra fail cho toan bo app vi dat hang van chay duoc.",
      "why": "Phân biệt boot-required và degraded là phân biệt thứ nào thiếu thì hệ thống không thể làm nhiệm vụ chính, với thứ nào thiếu chỉ làm giảm chức năng phụ. Không phân biệt thì một cấu hình phụ cũng đủ chặn toàn bộ app, hoặc một cấu hình cốt lõi thiếu mà app vẫn chạy nửa vời rồi lỗi lúc request đầu tiên.",
      "hints": [
        "Hỏi từng biến: thiếu nó thì user còn đặt hàng được không?",
        "Health check báo degraded khác gì với health check báo fail toàn bộ?"
      ]
    },
    {
      "id": "29-5",
      "concept": "Tradeoff phải ghi số",
      "type": "terminal",
      "title": "Audit secret trong git history bằng terminal",
      "prompt": "Bạn nghi ngờ một secret đã từng bị commit rồi xóa khỏi file hiện tại, nghĩa là nhìn file hiện tại thì sạch nhưng lịch sử git vẫn còn secret. Chỉ dùng terminal, hãy đi đúng thứ tự: tìm secret trong toàn bộ lịch sử, xác định commit nào chứa nó, rồi kết luận bước xử lý đúng thay vì chỉ xóa file.",
      "code": "# Kich ban terminal gia lap: doc output, khong chay lenh xoa lich su bua\n# Buoc 1: tim secret trong lich su git\n# Buoc 2: xem commit chua secret\n# Buoc 3: quyet dinh rotate hay chi xoa file",
      "language": "bash",
      "failingEvidence": "Nếu kết luận chỉ cần xóa file: secret vẫn nằm trong commit cũ, bất kỳ ai clone repo với lịch sử đầy đủ cũng lấy được secret, và secret vẫn dùng được cho tới khi bị rotate. Xóa file chỉ làm secret khuất mắt, không làm secret vô hiệu.",
      "checks": [
        "Chọn đúng bằng chứng: secret còn trong commit cũ dù file hiện tại đã sạch",
        "Chọn đúng bước xử lý: rotate secret ngay, thu hồi secret cũ, rồi mới dọn lịch sử và kiểm tra log"
      ],
      "solution": "Kết luận đúng: secret đã lộ, phải rotate ngay và thu hồi secret cũ, sau đó thông báo cho user bị ảnh hưởng đăng nhập lại nếu secret đó ký token. Dọn lịch sử git chỉ là bước phụ, không thay thế rotate. Ghi lại ADR hoặc ghi chú audit: secret nào, lộ từ commit nào, rotate lúc nào, ai chịu trách nhiệm xác nhận secret cũ đã vô hiệu.",
      "why": "Git history là bộ nhớ không quên, xóa file hiện tại không xóa quá khứ. Tradeoff ở đây cũng phải ghi số và thời gian: secret lộ từ khi nào, bao nhiêu người có quyền đọc repo trong khoảng đó, và rotate xong thì secret cũ còn dùng được trong bao lâu.",
      "hints": [
        "File hiện tại sạch có chứng minh được lịch sử sạch không?",
        "Thứ gì làm secret cũ vô hiệu: xóa file hay đổi secret ở phía server?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "git log --all -S \"JWT_SECRET\" --oneline",
            "output": "a1b2c3d Add JWT config (commit cu, chua secret trong diff)"
          },
          {
            "cmd": "git show a1b2c3d | grep JWT_SECRET",
            "output": "JWT_SECRET=changeme-super-secret-123 (secret van doc duoc tu lich su)"
          },
          {
            "cmd": "git log --oneline -- .env",
            "output": ".env da tung duoc commit o a1b2c3d, sau do moi them vao .gitignore"
          },
          {
            "cmd": "grep -r \"changeme-super-secret\" logs/ 2>/dev/null | head -5",
            "output": "logs/app-2026-10-28.log: Starting with JWT secret: changeme-super-secret-123 (secret cung in ra log)"
          }
        ]
      }
    }
  ],
  "30":   [
    {
      "id": "30-1",
      "concept": "Sơ đồ kiến trúc",
      "type": "decision",
      "title": "Capstone: chọn modular monolith hay microservices",
      "prompt": "Bạn trình bày capstone hệ thống đặt hàng cho team ba người, và hội đồng hỏi vì sao không tách thành năm microservices cho hiện đại. Hai phương án dưới đây đều vẽ được thành sơ đồ đẹp, nhưng chỉ một phương án trả đúng giá vận hành cho quy mô team này. Hãy chọn phương án, biện minh bằng chi phí và điều kiện tách service, và ghi rõ khi nào mới nên tách.",
      "code": "# PHUONG AN A: modular monolith, 1 deploy unit, module goi nhau qua API noi bo\nmodules: [order, payment, inventory, notification]\ndeploy: 1 unit, 1 pipeline, trace trong 1 tien trinh\ncost: van hanh 1 he thong, team 3 nguoi lam duoc\n# PHUONG AN B: 5 microservices, moi service 1 database, 1 pipeline, 1 alert rieng\nservices: [order, payment, inventory, notification, reporting]\ndeploy: 5 unit, 5 pipeline, trace xuyen 5 service, can saga cho moi luong xuyen service\ncost: van hanh gap nhieu lan, team 3 nguoi danh phan lon thoi gian van hanh",
      "language": "yaml",
      "failingEvidence": "Hậu quả nếu chọn sai (phương án B cho team ba người): phần lớn thời gian đi vận hành năm service, debug một request phải lần năm service, deploy một tính năng phải phối hợp năm pipeline, và mỗi luồng xuyên service đều cần saga bù. Hệ thống chưa lớn đã trả giá hệ phân tán.",
      "checks": [
        "Chọn phương án đúng: phương án A cho capstone ở quy mô team ba người",
        "Chọn đúng điều kiện tách sau này: khi một module cần scale lệch hẳn, có team riêng và deploy riêng, kèm biên module rõ để tách không phải viết lại"
      ],
      "solution": "Chọn phương án A: modular monolith với biên module rõ, mỗi module sở hữu dữ liệu của mình và gọi nhau qua API nội bộ hoặc event, không đọc thẳng database của nhau. Ghi ADR: giữ monolith cho tới khi ít nhất hai điều kiện đo được đúng, ví dụ một module cần scale gấp mười lần module khác hoặc một team riêng chịu trách nhiệm và tần suất deploy lệch hẳn. Khi đó tách đúng module đó, không tách cả hệ thống một lúc.",
      "why": "Kiến trúc tốt không phải kiến trúc nhiều service nhất, mà là kiến trúc trả giá đúng lúc. Modular monolith giữ được độ đơn giản của monolith và giữ cửa tách service sau này, còn tách sớm là mua trước toàn bộ chi phí của hệ phân tán trong khi chưa có nhu cầu đo được.",
      "hints": [
        "Hỏi hội đồng ngược lại: tách service giải quyết nhu cầu đo được nào của hệ thống này ngay bây giờ?",
        "Biên module rõ hôm nay có giá trị gì cho việc tách ngày mai, so với việc tách ngay hôm nay?"
      ]
    },
    {
      "id": "30-2",
      "concept": "Luồng lỗi và bù, vận hành",
      "type": "fix-bug",
      "title": "Capstone: thanh toán thành công nhưng trừ kho lỗi thì đơn kẹt ở đâu",
      "prompt": "Trong buổi bảo vệ capstone, hội đồng đưa ra ca lỗi kinh điển: thanh toán đã thành công, trừ kho thất bại, và đoạn code dưới đây là toàn bộ luồng xử lý. Đơn đang ở trạng thái nào, tiền của user đi đâu, và ai sửa? Hãy sửa luồng này bằng cơ chế bù và outbox, không chỉ thêm try-catch.",
      "code": "public Order checkout(CheckoutRequest req) {\n    paymentClient.charge(req.userId(), req.total());\n    inventoryClient.deduct(req.items());\n    Order order = new Order(req.userId(), req.total());\n    order.setStatus(\"PAID\");\n    return orderRepository.save(order);\n}",
      "language": "java",
      "failingEvidence": "Kịch bản lỗi thật: charge thành công, deduct ném lỗi, exception lan ra ngoài, đơn chưa bao giờ được lưu nhưng tiền đã trừ. User thấy lỗi chung chung, không có đơn, không có hoàn tiền tự động, và chỉ có đối soát tay cuối ngày mới phát hiện ra khoản tiền mồ côi này.",
      "checks": [
        "Chọn đúng trạng thái kẹt: tiền đã trừ nhưng không có đơn và không có hoàn tiền tự động",
        "Chọn diff đúng: outbox cộng saga bù, trừ kho lỗi thì hoàn tiền và chuyển đơn sang trạng thái có thể đối soát, kèm idempotency key"
      ],
      "solution": "@Transactional\npublic Order checkout(CheckoutRequest req) {\n    if (orderRepository.existsByIdempotencyKey(req.idempotencyKey())) {\n        return orderRepository.findByIdempotencyKey(req.idempotencyKey());\n    }\n    Order order = orderRepository.save(new Order(req.userId(), req.total()));\n    outboxRepository.save(new OutboxEvent(\"OrderCreated\", order.getId()));\n    try {\n        paymentClient.charge(req.idempotencyKey(), req.userId(), req.total());\n        inventoryClient.deduct(req.items());\n        order.setStatus(\"PAID\");\n    } catch (Exception e) {\n        order.setStatus(\"PAYMENT_REFUND_PENDING\");\n        outboxRepository.save(new OutboxEvent(\"RefundRequested\", order.getId()));\n    }\n    return orderRepository.save(order);\n}\n// Worker doc outbox va gui event, retry co dedup. Refund la hanh dong bu co kiem chung,\n// khong phai chi ghi log roi hy vong co nguoi doc.",
      "why": "Luồng nhiều bước xuyên service không có transaction chung, nên phải có trạng thái rõ, event outbox để không mất bước, và hành động bù để tiền không mồ côi. Capstone không có luồng lỗi và bù chỉ là thiết kế cho ngày đẹp trời, và hội đồng chấm đúng chỗ này.",
      "hints": [
        "Vẽ lại luồng theo từng bước và hỏi: bước này lỗi thì bước trước đã làm gì, và bước bù nào sửa nó?",
        "Outbox giải quyết vấn đề gì mà try-catch quanh cả hàm không giải quyết được?"
      ]
    },
    {
      "id": "30-3",
      "concept": "Luồng lỗi và bù, vận hành",
      "type": "predict",
      "title": "Capstone: đoán hậu quả của retry không idempotency cộng đọc replica",
      "prompt": "Hội đồng capstone đưa ra tình huống tổng hợp cuối cùng: payment timeout nhưng thật ra đã charge thành công, client retry ba lần không có idempotency key, và ngay sau đó user mở trang lịch sử đơn đọc từ replica chưa kịp đồng bộ. Trước khi xem kết quả thật, hãy đoán user thấy gì, tiền bị trừ mấy lần, và đâu là lỗi đầu tiên trong chuỗi?",
      "code": "for (int attempt = 0; attempt < 3; attempt++) {\n    try {\n        paymentClient.charge(userId, total);\n        break;\n    } catch (TimeoutException e) {\n        log.info(\"Payment timeout, retrying\");\n    }\n}\n// Khong co idempotency key trong charge.\n// Trang lich su don doc tu replica, khong phai primary.",
      "language": "java",
      "failingEvidence": "Output thật khi đối chiếu: tài khoản bị trừ ba lần vì mỗi lần retry là một lần charge mới, trong khi trang lịch sử đơn lúc đầu không thấy đơn nào vì replica chưa đồng bộ, rồi sau đó mới thấy một đơn. User vừa mất tiền thừa vừa tưởng đơn chưa tạo, và có thể đặt lại đơn nữa.",
      "checks": [
        "Đoán đúng hậu quả: trừ tiền ba lần, lịch sử đơn lúc đầu trống vì đọc replica chưa đồng bộ",
        "Chọn đúng lỗi đầu tiên và cách sửa: retry không an toàn vì thiếu idempotency, cộng với việc không nói rõ cho user về cửa sổ eventual consistency"
      ],
      "solution": "Đáp án đúng: trừ ba lần, lịch sử đơn trống tạm thời. Sửa: mọi lần retry phải gửi cùng một idempotency key để lần charge thứ hai trở đi được nhận ra là trùng và không trừ thêm. Với lịch sử đơn: hoặc đọc từ primary cho đơn vừa tạo, hoặc hiển thị rõ trạng thái đang xử lý và cửa sổ đồng bộ, không để user tưởng đơn chưa tạo mà đặt lại.",
      "why": "Đây là bài tổng hợp của nhiều ngày: retry chỉ an toàn khi operation idempotent, timeout không đồng nghĩa thất bại, và eventual consistency phải được nói rõ cho user và code xử lý. Một lỗi ở đây khuếch đại lỗi ở kia: tiền thừa cộng đơn ảo cộng đặt trùng.",
      "hints": [
        "Timeout nghĩa là không biết kết quả, không phải là thất bại, vậy retry cần thứ gì để lần sau không thành giao dịch mới?",
        "Replica chưa đồng bộ thì user thấy gì, và giao diện nên nói gì thay vì để trống?"
      ]
    },
    {
      "id": "30-4",
      "concept": "Contract và dữ liệu",
      "type": "skeleton",
      "title": "Capstone: điền contract, dữ liệu và vận hành còn thiếu",
      "prompt": "Bạn nộp bản capstone chỉ có sơ đồ hộp và mũi tên, hội đồng trả lại vì thiếu contract, dữ liệu, luồng lỗi và vận hành. Bản khung dưới đây liệt kê đúng các phần còn thiếu. Hãy điền các chỗ TODO sao cho một team khác đọc xong là implement được mà không cần hỏi lại về quyết định lớn.",
      "code": "capstone:\n  architecture: modular monolith, modules goi nhau qua API noi bo\n  # TODO: contract API tao don, thanh toan, huy don, xem don gom nhung gi?\n  # TODO: idempotency key dat o dau, error contract theo dinh dang nao?\n  # TODO: schema orders va order_items, index cho query theo user, persistence contract cho gio hang?\n  # TODO: transaction boundary o dau, luong bu khi thanh toan xong nhung tru kho loi?\n  # TODO: alert nao, nguong nao, migration doi schema theo may buoc, chi phi theo 3 muc tai?",
      "language": "yaml",
      "failingEvidence": "Nếu điền sai, ví dụ chỉ ghi tên endpoint mà không ghi idempotency và error contract: team khác implement mỗi người một kiểu, tích hợp mới lộ mismatch, và luồng tiền không có cách nào retry an toàn. Nếu thiếu migration và chi phí: thiết kế không deploy được và không ai biết hệ thống tốn bao nhiêu khi tải tăng.",
      "checks": [
        "Chọn đúng contract: tạo đơn dùng POST kèm idempotency key, hủy đơn có trạng thái rõ, error theo Problem Details với mã riêng",
        "Chọn đúng phần còn lại: index theo user và thời gian, persistence contract cho giỏ hàng ở server, bù hoàn tiền khi trừ kho lỗi, alert 5xx và migration tương thích ngược"
      ],
      "solution": "capstone:\n  contract:\n    create-order: POST /orders, header Idempotency-Key bat buoc, 201 kem Location\n    pay-order: POST /orders/{id}/pay, idempotent theo key, 200 hoac 409 khi trung\n    cancel-order: POST /orders/{id}/cancel, chi khi chua giao, 200 kem ly do\n    get-order: GET /orders/{id}, kiem tra chu so huu, 403 neu khong phai chu don\n    error: Problem Details, co code rieng nhu ORDER_NOT_FOUND, PAYMENT_FAILED\n  data:\n    orders: id, user_id, total BigDecimal, status, idempotency_key unique\n    order_items: order_id, product_id, qty, price_snapshot\n    indexes: orders(user_id, created_at), order_items(order_id)\n    cart-persistence: server DB, sync ngay khi them hoac xoa, khong local-only\n  failure-and-ops:\n    payment-ok-inventory-fail: hoan tien, don sang REFUND_PENDING, alert khi ti le qua 1%\n    migration: them cot nullable, backfill, siet NOT NULL\n    cost: uoc tinh theo 3 muc tai, ghi so cu the cho instance, database va cache",
      "why": "Capstone đạt là capstone đủ năm phần theo rubric: kiến trúc, contract, dữ liệu, failure mode và vận hành, mỗi phần có bằng chứng cụ thể. Sơ đồ đẹp mà thiếu contract thì team implement mỗi người hiểu một kiểu, thiếu failure mode thì hệ thống chỉ chạy được ngày đẹp trời.",
      "hints": [
        "Đọc rubric capstone và hỏi từng phần: phần này có bằng chứng cụ thể hay mới chỉ có tên gọi?",
        "Luồng tiền nào chưa có idempotency và luồng lỗi nào chưa có bù thì capstone chưa xong."
      ]
    },
    {
      "id": "30-5",
      "concept": "Sơ đồ kiến trúc",
      "type": "terminal",
      "title": "Capstone: drill incident đa hệ thống bằng terminal",
      "prompt": "Buổi drill capstone giả lập sự cố đa hệ thống: đơn hàng lỗi hàng loạt, payment timeout, kho không trừ được, và thông báo không gửi đi. Bạn chỉ có terminal và một correlation ID duy nhất. Hãy đi đúng thứ tự: xác định service lỗi đầu tiên, phân biệt nạn nhân với nguyên nhân, rồi quyết định rollback hay sửa tiếp dựa trên bằng chứng.",
      "code": "# Kich ban terminal gia lap: drill incident da he thong\n# Buoc 1: lan correlation ID qua gateway, order, payment, inventory\n# Buoc 2: xem metric 5xx va p99 cua tung service cung khung gio\n# Buoc 3: kiem tra deploy, config va migration gan nhat\n# Buoc 4: quyet dinh rollback hay sua tiep",
      "language": "bash",
      "failingEvidence": "Nếu chẩn đoán sai, ví dụ sửa notification vì nó báo lỗi cuối cùng: notification chỉ là nạn nhân không nhận được event, trong khi nguyên nhân thật là payment timeout làm cả chuỗi tắc lại. Sửa nhầm service thì sự cố vẫn còn và mất thêm thời gian drill.",
      "checks": [
        "Chọn đúng service lỗi đầu tiên: payment timeout sau deploy mới, các service sau chỉ là nạn nhân",
        "Chọn đúng quyết định: rollback deploy payment về bản trước, sau đó sửa timeout và retry có idempotency trước khi deploy lại"
      ],
      "solution": "Kết luận đúng: payment là lỗi đầu tiên, timeout tăng ngay sau deploy mới, order kẹt ở trạng thái chờ, inventory không nhận được event nên không trừ kho, notification không có gì để gửi. Quyết định: rollback payment về bản trước để dừng sự cố, rồi mới sửa timeout, thêm circuit breaker và retry có idempotency key, kèm test cho nhánh timeout. Ghi lại bảng failure mode: chuyện gì xảy ra, user thấy gì, dữ liệu ở trạng thái gì, ai sửa và phát hiện từ log hay metric nào.",
      "why": "Incident đa hệ thống chỉ giải được khi lần theo một ID xuyên suốt và tìm lỗi đầu tiên theo thời gian, không phải service la to nhất. Rollback là cách dừng chảy máu, sửa nguyên nhân gốc mới là cách ngăn lần sau, và bảng failure mode là thứ biến một lần drill thành runbook cho lần thật.",
      "hints": [
        "Service nào sai trước về mặt thời gian thì mới là nguyên nhân, service sai sau có thể chỉ là nạn nhân.",
        "Deploy mới nhất thay đổi thứ gì ở payment, và timeout mới này có nằm trong thay đổi đó không?"
      ],
      "terminal": {
        "commands": [
          {
            "cmd": "kubectl logs deploy/gateway --since=30m | grep req-capstone-777",
            "output": "10:02:05 gateway correlationId=req-capstone-777 POST /orders orderId=501 status=accepted"
          },
          {
            "cmd": "kubectl logs deploy/order-service --since=30m | grep req-capstone-777",
            "output": "10:02:06 order-service correlationId=req-capstone-777 orderId=501 status=WAITING_PAYMENT"
          },
          {
            "cmd": "kubectl logs deploy/payment-service --since=30m | grep req-capstone-777",
            "output": "10:02:36 payment-service correlationId=req-capstone-777 error=TIMEOUT after=30s deploy=2.0.1 (ban moi)"
          },
          {
            "cmd": "kubectl logs deploy/inventory-service --since=30m | grep req-capstone-777",
            "output": "khong co log (chua nhan event vi payment chua xong, nan nhan chu khong phai nguyen nhan)"
          },
          {
            "cmd": "kubectl rollout undo deployment/payment-service",
            "output": "deployment.apps/payment-service rolled back to 1.9.8, 5xx rate tro ve muc binh thuong trong 5 phut"
          }
        ]
      }
    }
  ]
};
