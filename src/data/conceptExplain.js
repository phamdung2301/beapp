// Giải thích khái niệm cho tab thứ 5, key theo day.id, mảng khớp đúng thứ tự khái niệm đã enrich (days.js + dayExtra.js).
// Mỗi mục: what (nó là gì), role (nhiệm vụ + triệu chứng khi sai), map (breadcrumb + thành phần kề bên), connects (>=3: cùng ngày, sang ngày khác có field day, lên hệ thống lớn hơn).
// Ngày 11–20 đã viết lại sang shape (2026-10-29): thêm field optional shape/difficulty/thresholds/dontUse/quiz; các ngày khác giữ nguyên khuôn cũ.
// Không sửa days.js gốc; file này chỉ bổ sung lớp giải thích.
export const CONCEPT_EXPLAIN = {
  "1": [
    {
      "what": "Heap là nơi chứa các đối tượng, còn stack chứa khung gọi hàm và biến cục bộ của từng thread. Một đối tượng chỉ còn sống khi vẫn có đường đi tới nó từ GC roots như stack của thread, biến static hay JNI.",
      "role": "Nếu tạo quá nhiều đối tượng ngắn hạn hoặc giữ tham chiếu không thả, GC phải làm việc liên tục và app chậm dần. Triệu chứng là heap tăng dần, GC chạy ngày càng dày, cuối cùng là OutOfMemoryError dù traffic không tăng.",
      "map": "JVM > Runtime Data Areas > Heap > Young Generation (Eden/Survivor) và Old Generation, kề bên Stack, Metaspace, PC Register, Native Method Stack, do GC (G1/ZGC) quản lý",
      "connects": [
        {
          "t": "Heap đầy hay tăng dần thì GC phải can thiệp, nên chẩn đoán heap luôn đi cùng chẩn đoán GC.",
          "day": 1
        },
        {
          "t": "Đối tượng entity tải thừa vì eager hay N+1 cũng làm heap và số query phình theo danh sách.",
          "day": 9
        },
        {
          "t": "Heap tăng không kiểm soát sẽ thành OOM, kéo theo GC chạy dày, thread dump thấy nhiều thread chờ, và cuối cùng request chết."
        }
      ]
    },
    {
      "what": "G1 chia heap thành nhiều region và có young GC, mixed GC, và full GC stop-the-world hiếm gặp. ZGC dùng colored pointers và load barriers để làm việc đồng thời, pause thường dưới 1ms và không có full GC stop-the-world kiểu G1, đổi lấy chi phí CPU và bộ nhớ cao hơn.",
      "role": "Chọn sai GC thì hoặc p99 latency cao bất thường vì G1 full GC làm request đứng, hoặc CPU tăng vọt vì ZGC đánh đổi tài nguyên. Triệu chứng phân biệt bằng GC log và metric, không đoán từ cảm giác chậm.",
      "map": "JVM > Garbage Collection > G1 và ZGC > Young/Mixed/Full GC (G1) và Concurrent Mark/Relocate (ZGC), kề bên Heap, GC Log, Actuator Metrics, Thread Pool",
      "connects": [
        {
          "t": "GC nào cũng dọn đối tượng trong heap, nên hiểu heap trước rồi mới chọn GC cho đúng.",
          "day": 1
        },
        {
          "t": "Chọn GC cũng là chọn đánh đổi latency và chi phí, giống bài toán đo bottleneck rồi mới scale ở hiệu năng.",
          "day": 24
        },
        {
          "t": "Pause GC dài làm request timeout, user thấy trang quay mãi, và hệ thống tưởng như backend chết dù CPU còn rảnh."
        }
      ]
    },
    {
      "what": "Record là kiểu dữ liệu bất biến, tự sinh equals, hashCode và toString, dùng để mang dữ liệu thay vì viết boilerplate. Sealed giới hạn danh sách lớp con được phép, để compiler kiểm tra switch có đủ case, và pattern matching cho phép kiểm tra kiểu và bóc tách giá trị trong cùng một biểu thức.",
      "role": "Không dùng chúng thì model mơ hồ, code dài và switch thiếu case không bị compiler bắt. Triệu chứng hay gặp là dùng record làm JPA entity, hoặc để record chứa collection có thể sửa từ bên ngoài rồi mất tính bất biến.",
      "map": "Java Language > Kiểu dữ liệu > Records, Sealed Classes, Pattern Matching, kề bên Class, Interface, Enum, Switch Expression, do Compiler kiểm tra",
      "connects": [
        {
          "t": "Record hay dùng để mang dữ liệu qua các tầng, nhưng vòng đời của dữ liệu đó vẫn nằm trong heap và chịu GC.",
          "day": 1
        },
        {
          "t": "Record khác entity ở chỗ record là dữ liệu bất biến để trao đổi, còn entity là model persistence có quan hệ và vòng đời.",
          "day": 6
        },
        {
          "t": "Thiết kế kiểu dữ liệu rõ ràng từ đầu giúp compiler bắt lỗi sớm, thay vì để lỗi kiểu lọt tới lúc chạy trên production."
        }
      ]
    },
    {
      "what": "Virtual thread là thread nhẹ của Project Loom, hàng nghìn task có thể chia sẻ ít carrier thread là platform thread thật. Nó rẻ nhất khi task chủ yếu chờ IO, ví dụ chờ database, vì lúc chờ thì carrier thread được nhường cho task khác.",
      "role": "Virtual thread không chữa được code giữ lock lâu, dùng shared state không an toàn, lạm dụng ThreadLocal hay task nặng CPU. Triệu chứng là carrier thread bị pin vì synchronized kéo dài, throughput không tăng mà còn kẹt, và bộ nhớ phình vì ThreadLocal.",
      "map": "JVM > Threads > Virtual Threads (Project Loom) > Carrier Threads và Platform Threads, kề bên Thread Pool, ExecutorService, Synchronized, ThreadLocal",
      "connects": [
        {
          "t": "Virtual thread phát huy đúng ở đoạn chờ IO trong đường đi của request qua JVM, chứ không phải ở đoạn tính toán nặng.",
          "day": 1
        },
        {
          "t": "Giữ lock lâu hay shared state không an toàn là vấn đề concurrency, cần lock đúng và giữ lock ngắn chứ không phải thêm thread.",
          "day": 15
        },
        {
          "t": "Thread pool đầy hay carrier bị pin làm request xếp hàng và timeout, user thấy hệ thống chậm dù CPU chưa hề bão hòa."
        }
      ]
    },
    {
      "what": "Một request vào Tomcat được một thread giữ suốt vòng đời, đi qua filter chain, DispatcherServlet, controller, service, repository rồi tới database. Đoạn chờ database là lúc virtual thread rẻ nhất, và nếu đổi thread giữa chừng mà không truyền context thì sẽ mất SecurityContext hay trace id.",
      "role": "Nếu pool thread đầy thì request xếp hàng hoặc timeout dù CPU còn rảnh, vì không còn thread để nhận việc mới. Triệu chứng khác là log mất trace id hay mất thông tin xác thực sau khi nhảy thread không truyền context.",
      "map": "Ứng dụng Web > Runtime > Tomcat Worker Thread > Filter Chain, DispatcherServlet, Controller, Service, Repository, kề bên Connection Pool, SecurityContext, Trace ID, Database",
      "connects": [
        {
          "t": "Request nào cũng cần thread để chạy, nên virtual thread quyết định hệ thống chịu được bao nhiêu request đang chờ IO cùng lúc.",
          "day": 1
        },
        {
          "t": "Filter và interceptor nằm trên chính đường đi này, nên sai tầng là sai vị trí kiểm tra và xử lý lỗi.",
          "day": 3
        },
        {
          "t": "Một request chậm ở tầng database hay thread pool sẽ lan thành timeout ở client, alert ở monitoring, và user tưởng toàn bộ hệ thống sập."
        }
      ]
    }
  ],
  "2": [
    {
      "what": "Auto-configuration là việc Spring Boot tự tạo bean khi thấy class cần thiết có mặt, dựa trên điều kiện như ConditionalOnClass. Starter là gói phụ thuộc kéo theo cả một bộ thư viện và cấu hình mặc định, ví dụ starter web kéo theo Tomcat và Spring MVC.",
      "role": "Khi Boot đoán sai ý bạn, app vẫn chạy nhưng sai hành vi, ví dụ bean trùng nhau hay DataSource tự tạo trỏ sai database. Triệu chứng là app lên được, API trả 200, nhưng dữ liệu hoặc hành vi không như kỳ vọng.",
      "map": "Spring Boot > Auto-configuration > @SpringBootApplication và @ConditionalOnClass, kề bên ComponentScan, Bean, DataSourceAutoConfiguration, Starter Web, Starter Data",
      "connects": [
        {
          "t": "Auto-config đoán sai mà không fail-fast thì lỗi ẩn tới lúc request đầu tiên mới lộ.",
          "day": 2
        },
        {
          "t": "Auto-config của MongoDB cũng có thể tạo kết nối trỏ sai database nếu tên database không tường minh.",
          "day": 10
        },
        {
          "t": "Cấu hình tự động sai ở lúc boot sẽ thành dữ liệu sai ở production, và chỉ phát hiện khi user báo dữ liệu trống hoặc lệch."
        }
      ]
    },
    {
      "what": "Thứ tự ưu tiên config giảm dần là command-line, rồi SPRING_APPLICATION_JSON, rồi JVM system properties, rồi biến môi trường, rồi application-{profile}, rồi application, cuối cùng là giá trị mặc định. Nghĩa là system properties thắng cả biến môi trường, nên chỉ nhớ env thắng file là chưa đủ.",
      "role": "Nếu đổi biến môi trường mà app không đổi hành vi, rất có thể có system property hoặc command-line đang thắng nó. Triệu chứng là sửa file local mãi không có tác dụng ở production, vì production đang bị một nguồn cao hơn đè lên.",
      "map": "Spring Boot > Externalized Configuration > Property Sources theo thứ tự ưu tiên, kề bên application.yml, application-{profile}.yml, Biến Môi Trường, JVM System Properties, --debug Conditions Report",
      "connects": [
        {
          "t": "Thứ tự này giải thích vì sao tên database khai báo tường minh vẫn cần đúng nguồn, vì một nguồn cao hơn có thể đè lên nó.",
          "day": 2
        },
        {
          "t": "Config đổi phải đi cùng migration và deploy, vì đổi config sai thứ tự cũng làm deploy mới chạy sai dù code đúng.",
          "day": 11
        },
        {
          "t": "Sai thứ tự config ở production làm app chạy sai môi trường, sai database, và đội vận hành phải lần theo từng nguồn thay vì chỉ nhìn một file."
        }
      ]
    },
    {
      "what": "Tên database phải khai báo tường minh vì driver MongoDB lặng lẽ dùng database test nếu URI không có tên database. Khai báo spring.data.mongodb.database là cách tường minh nhất, vì property này thắng cả tên database trong URI.",
      "role": "Nếu thiếu tên tường minh, app vẫn lên và API vẫn trả 200 nhưng dữ liệu trống hoặc sai, vì app đang ghi vào nhầm database. Triệu chứng điển hình là seed báo thành công mà trang web vẫn hiện 0 dữ liệu.",
      "map": "Spring Data MongoDB > Kết nối > spring.data.mongodb.database và URI, kề bên MongoClient, MongoDatabaseFactory, Seed Script, Log Khởi Động, Database test",
      "connects": [
        {
          "t": "Fail-fast khi boot là cách bắt lỗi thiếu tên database sớm, thay vì để app chạy nửa vời rồi mới phát hiện sai database.",
          "day": 2
        },
        {
          "t": "Kỷ luật schema trong document cũng đòi seed fail-fast khi thiếu tên database và log phải in tên database thật.",
          "day": 10
        },
        {
          "t": "Ghi nhầm database làm dữ liệu thật và dữ liệu nhìn thấy lệch nhau, backup và đối soát sau đó đều sai theo."
        }
      ]
    },
    {
      "what": "Fail-fast khi boot nghĩa là thiếu URI hay secret bắt buộc thì app phải chết rõ ràng ngay lúc khởi động, kèm thông báo field nào thiếu. Cách làm là bind bằng @ConfigurationProperties kết hợp @Validated, thay vì để giá trị trống rồi lỗi lúc request đầu tiên.",
      "role": "Không fail-fast thì app lên được nhưng request đầu tiên mới lỗi NullPointer hoặc lỗi kết nối, rất khó truy vết vì lỗi lúc chạy không chỉ đúng field config thiếu. Triệu chứng là deploy tưởng thành công, tới khi user gọi API mới sập.",
      "map": "Spring Boot > Khởi động > Bind Properties và Validate, kề bên @ConfigurationProperties, @Validated, @NotBlank, Log Boot, Health Check",
      "connects": [
        {
          "t": "Fail-fast là hàng rào cuối cho auto-configuration, vì Boot có thể tự tạo bean sai mà vẫn cho app chạy.",
          "day": 2
        },
        {
          "t": "Audit cũng bắt đầu từ việc kiểm tra config có trỏ đúng database không, vì config sai là lỗi không cần đọc code nghiệp vụ cũng thấy.",
          "day": 7
        },
        {
          "t": "App chết rõ lúc boot thì pipeline deploy có thể rollback ngay, còn app chạy nửa vời thì lỗi lan tới user trước khi ai phát hiện."
        }
      ]
    }
  ],
  "3": [
    {
      "what": "Filter chạy ở tầng servlet, trước DispatcherServlet, thấy mọi request và chứa Security filter chain cùng CorsFilter. Interceptor chạy ở tầng Spring MVC, sau khi HandlerMapping đã chọn handler, với preHandle trước controller và postHandle cùng afterCompletion sau controller.",
      "role": "Nhầm hai tầng thì sai vị trí kiểm tra và xử lý lỗi: logic cần biết controller mà đặt vào Filter thì chưa có handler, còn bảo mật mà đặt vào Interceptor thì request đã qua Filter rồi. Triệu chứng là kiểm tra không chạy đúng chỗ, hoặc lỗi không được xử lý ở tầng mong muốn.",
      "map": "Spring MVC > Vòng đời Request > FilterChainProxy và Security Filter Chain > DispatcherServlet > HandlerMapping > HandlerInterceptor > Controller, kề bên HandlerAdapter, CorsFilter, CsrfFilter, AuthorizationFilter",
      "connects": [
        {
          "t": "Preflight OPTIONS cũng đi qua filter chain này trước khi tới được CORS handler, nên thứ tự rule trong chain quyết định nó sống hay chết.",
          "day": 3
        },
        {
          "t": "Token được kiểm tra ở tầng filter và security, nên lỗi token và lỗi CORS đều có thể lộ ra trước khi request tới controller.",
          "day": 4
        },
        {
          "t": "Một request từ browser qua gateway tới controller đi qua nhiều tầng, và sai một tầng là cả luồng bị chặn dù controller hoàn toàn đúng."
        }
      ]
    },
    {
      "what": "Preflight là request OPTIONS mà browser tự gửi trước request thật khi gọi cross-origin có method hay header đặc biệt. Nó không mang token và không mang credentials, nên server phải trả header CORS trước khi kiểm tra token.",
      "role": "Nếu rule authenticated đứng trước, preflight bị chặn 403 trước khi tới CORS handler và browser hủy luôn request thật. Triệu chứng là frontend báo lỗi CORS chung chung, còn log backend không thấy request thật nào.",
      "map": "Web > CORS > Preflight OPTIONS > Access-Control-Request-Method và Access-Control-Request-Headers, kề bên Request Thật, Access-Control-Allow-Origin, Access-Control-Allow-Methods, Browser",
      "connects": [
        {
          "t": "CORS ở tầng Security là cách sửa đúng cho preflight, vì chỉ sửa ở WebMvc thì filter chain vẫn chặn nó trước.",
          "day": 3
        },
        {
          "t": "Lỗi preflight 403 dễ bị nhầm với lỗi token, dù token chưa hề được gửi trong request OPTIONS.",
          "day": 4
        },
        {
          "t": "Preflight chết thì user không gọi được API nào cần login, dù backend, database và controller đều đang sống."
        }
      ]
    },
    {
      "what": "CORS cấu hình ở WebMvc chạy sau Security filter, nên chỉ sửa ở WebMvcConfigurer là chưa đủ. Cách sửa đúng là permitAll cho OPTIONS trên mọi đường dẫn và đặt trước mọi rule, hoặc cấu hình CorsConfigurationSource ở tầng security.",
      "role": "Chỉ sửa ở WebMvc thì lỗi còn nguyên: mọi API cần login lỗi hàng loạt trong khi API public vẫn chạy, vì public được permitAll nên preflight qua được. Triệu chứng này rất dễ làm người ta kết luận sai là backend chết hay token hỏng.",
      "map": "Spring Security > Filter Chain > CorsFilter và AuthorizationFilter > WebMvcConfigurer, kề bên SecurityFilterChain, HttpMethod.OPTIONS, CorsConfigurationSource, Origin",
      "connects": [
        {
          "t": "Preflight là bằng chứng rõ nhất cho lỗi này, vì OPTIONS 403 không có header CORS thì chắc chắn là Security chặn trước.",
          "day": 3
        },
        {
          "t": "Khi CORS và token cùng gây lỗi, phải tách preflight khỏi request thật thì mới biết lỗi thuộc tầng nào.",
          "day": 4
        },
        {
          "t": "Frontend và backend khác origin là chuyện bình thường khi deploy tách biệt, nên CORS sai tầng sẽ chặn toàn bộ luồng người dùng thật."
        }
      ]
    },
    {
      "what": "Phân biệt ba loại lỗi bằng status, header và log server thay vì đoán. Preflight đúng trả 200 kèm Access-Control-Allow-Origin, preflight bị Security chặn trả 403 và không có header CORS, backend chết thì không kết nối được hoặc trả 502, còn lỗi token lộ ở request thật bằng 401 hay 403.",
      "role": "Đoán sai thì sửa sai chỗ: debug controller trong khi preflight chưa qua, hoặc sửa CORS trong khi thực ra token đã hết hạn. Triệu chứng của việc chẩn đoán sai là sửa nhiều chỗ mà lỗi vẫn y nguyên.",
      "map": "Chẩn đoán Web > Lỗi Request > CORS, Token, Backend, kề bên DevTools Network, curl OPTIONS, Server Log, Status Code, Header Access-Control-Allow-Origin",
      "connects": [
        {
          "t": "Muốn phân biệt thì phải nhìn OPTIONS trước, vì preflight chết thì request thật chưa bao giờ tồn tại.",
          "day": 3
        },
        {
          "t": "Status code là ngôn ngữ chung để phân biệt 401 chưa xác thực với 403 không có quyền, thay vì đọc message chung chung.",
          "day": 5
        },
        {
          "t": "Chẩn đoán đúng giúp đội vận hành sửa đúng một chỗ, thay vì để user chịu lỗi kéo dài trong lúc cả đội sửa lung tung."
        }
      ]
    }
  ],
  "4": [
    {
      "what": "JWT gồm ba phần nối bằng dấu chấm là header, payload và signature, mỗi phần chỉ là base64. Signature là bằng chứng kiểm chứng, được ký bằng secret hoặc khóa của server, còn payload thì ai cũng đọc được vì base64 không phải mã hóa.",
      "role": "Nhét dữ liệu nhạy cảm như mật khẩu hay số thẻ vào payload thì lộ ngay khi token lọt ra ngoài. Không verify signature thì bất kỳ ai cũng tự ký token với role tùy ý và server vẫn tin.",
      "map": "Bảo mật > Token > JWT > Header, Payload, Signature, kề bên Secret và Public Key, Authorization Header, Role, Expiry, Base64",
      "connects": [
        {
          "t": "Access và refresh cũng là JWT, nên hiểu cấu trúc này trước thì mới hiểu vì sao access phải ngắn và refresh phải xoay vòng.",
          "day": 4
        },
        {
          "t": "JWT chỉ là một dạng token trong OAuth2 và OIDC, nên cùng một token có thể đi qua nhiều hệ thống xác thực khác nhau.",
          "day": 23
        },
        {
          "t": "Một token bị lộ mà chứa dữ liệu nhạy cảm hoặc không được verify sẽ thành mất tài khoản, chứ không chỉ là một request lỗi."
        }
      ]
    },
    {
      "what": "Access token sống ngắn để nếu bị lộ thì cũng nhanh hết hạn, còn refresh token sống dài hơn và được xoay vòng: mỗi lần đổi access mới thì cấp refresh mới và thu hồi refresh cũ. Khi logout thì thu hồi refresh, còn access cũ vẫn sống tới khi hết hạn nên access bắt buộc phải ngắn.",
      "role": "Access sống dài mà không revoke được thì lộ token là mất tài khoản trong thời gian dài. Refresh không xoay vòng thì token cũ bị đánh cắp vẫn dùng được mãi, dù user đã đổi access nhiều lần.",
      "map": "Bảo mật > Phiên > Access Token và Refresh Token > Rotation và Denylist, kề bên Login, Logout, Đổi Mật Khẩu, Phiên Lưu Server, Hết Hạn",
      "connects": [
        {
          "t": "Login phải kiểm tra đủ trước khi cấp cặp token này, vì cấp token cho tài khoản chưa xác minh hay đang bị khóa là lỗi ngay từ gốc.",
          "day": 4
        },
        {
          "t": "OAuth2 và OIDC cũng dùng cặp token ngắn và dài tương tự, nên hiểu rotation ở đây thì qua hệ thống đó không bị lạ.",
          "day": 23
        },
        {
          "t": "Token bị đánh cắp mà không xoay vòng và không thu hồi được sẽ thành phiên trái phép kéo dài, user đổi mật khẩu cũng chưa chắc thoát được."
        }
      ]
    },
    {
      "what": "Nơi ghi và nơi đọc token phải là một, nghĩa là chỉ có một hàm như getToken hay setSession, với cùng một key và cùng một storage. Ghi vào sessionStorage mà interceptor chỉ đọc localStorage, hoặc ghi key này mà đọc key khác, thì interceptor sẽ không thấy token.",
      "role": "Triệu chứng rất lừa: dashboard vẫn render vì guard đọc cả hai nơi, nhưng mọi API trả 403 vì interceptor gửi request không có Authorization. Người ta dễ kết luận sai là phân quyền hỏng, trong khi thực ra token chưa bao giờ được gửi đi.",
      "map": "Frontend > Auth Module > setSession và getToken cùng Axios Interceptor, kề bên localStorage, sessionStorage, Authorization Bearer, Route Guard, Key Token",
      "connects": [
        {
          "t": "Muốn hiểu lỗi này thì phải hiểu JWT được gửi qua Authorization header, và header đó chỉ có khi interceptor đọc được token.",
          "day": 4
        },
        {
          "t": "Lỗi 403 vì thiếu token rất dễ nhầm với lỗi CORS hay backend chết, nên phải phân biệt bằng request thật trước.",
          "day": 3
        },
        {
          "t": "User tưởng mình đã login thành công vì thấy dashboard, rồi mọi thao tác đều lỗi, nên niềm tin vào hệ thống mất nhanh hơn một lỗi hiện rõ ngay từ đầu."
        }
      ]
    },
    {
      "what": "Login cần kiểm tra đủ bốn điều: tài khoản tồn tại, mật khẩu khớp bằng BCrypt, tài khoản đã xác minh, và chưa bị khóa tạm sau nhiều lần sai liên tiếp. Admin chỉ được tạo từ bootstrap bằng biến môi trường, không bao giờ tự nâng quyền từ tài khoản thường.",
      "role": "Thiếu một bước là có đường lọt hoặc khóa oan: bỏ kiểm tra xác minh thì tài khoản chưa xác minh vẫn vào được, bỏ khóa tạm thì brute force thoải mái. Thông báo phân biệt tài khoản tồn tại hay không còn lộ thông tin để attacker liệt kê tài khoản.",
      "map": "Bảo mật > Login > Kiểm Tra Tài Khoản, Mật Khẩu, Xác Minh, Khóa Tạm, kề bên BCrypt, AdminBootstrap, Role, Biến Môi Trường, Rate Limit",
      "connects": [
        {
          "t": "Chỉ sau khi kiểm tra đủ thì mới cấp access và refresh, nên login lỏng sẽ làm cả vòng đời token phía sau mất ý nghĩa.",
          "day": 4
        },
        {
          "t": "Kiểm tra sở hữu dữ liệu ở tầng service cũng giống nguyên tắc này: không tin frontend, phải kiểm tra ở server trước khi cho đọc hay sửa.",
          "day": 23
        },
        {
          "t": "Một lỗ hổng login có thể thành mất tài khoản hàng loạt, chứ không dừng ở một user nhập sai mật khẩu."
        }
      ]
    }
  ],
  "5": [
    {
      "what": "Resource là danh từ chỉ thứ cần thao tác, còn method là động từ HTTP chỉ hành động. GET không đổi trạng thái, POST tạo mới, PUT thay toàn bộ, PATCH sửa một phần, DELETE xóa, và path đúng mà method sai vẫn trả 405.",
      "role": "Dùng POST cho mọi thứ thì mất idempotency và khả năng cache của GET. Dùng PUT khi chỉ sửa một field thì vô tình xóa các field không gửi kèm, vì PUT mang nghĩa thay toàn bộ.",
      "map": "REST > Tài Nguyên > /orders và /orders/{id} > GET, POST, PUT, PATCH, DELETE, kề bên Query Param, Path Variable, Idempotency Key, OpenAPI",
      "connects": [
        {
          "t": "Method đúng mà status sai thì client vẫn không biết xử lý ra sao, nên method và status phải đi cùng nhau.",
          "day": 5
        },
        {
          "t": "DTO là hiện thân của resource này ở tầng code, nên method sai hay field sai đều là lỗi contract như nhau.",
          "day": 6
        },
        {
          "t": "Client cũ gọi API bằng method cũ sẽ nhận 405 khi contract đổi không báo trước, và app cũ có thể sập hàng loạt."
        }
      ]
    },
    {
      "what": "Status code là ngôn ngữ chung của response: nhóm 2xx là thành công, 4xx là lỗi phía client và sửa request mới hết, 5xx là lỗi phía server. Trong đó 401 là chưa xác thực, 403 là đã xác thực nhưng không có quyền, 404 là không tồn tại, 409 là xung đột, 422 là dữ liệu không hợp lệ.",
      "role": "Trả 200 cho mọi lỗi kèm message thì frontend và monitoring không phân biệt được lỗi, không tự đưa user đi login hay retry đúng cách. Trả 403 khi chưa login thì frontend không biết phải đưa user đi login, vì 403 mang nghĩa đã login rồi mà không có quyền.",
      "map": "REST > Response > Status Code và Problem Details, kề bên Error Code, Message, Header Location, Frontend Error Handling, Monitoring",
      "connects": [
        {
          "t": "Phân biệt lỗi CORS, token và backend chết cũng dựa vào status, nên đọc status trước khi đọc message.",
          "day": 3
        },
        {
          "t": "Versioning cũng cần status đúng, vì client cũ dựa vào status để biết request của nó còn được hỗ trợ hay không.",
          "day": 5
        },
        {
          "t": "Monitoring dựa vào tỉ lệ 5xx và 4xx để alert, nên status sai sẽ làm alert sai và đội vận hành phản ứng sai."
        }
      ]
    },
    {
      "what": "Pagination có hai kiểu chính là page và cursor. Page dùng offset nên dễ lệch khi có dữ liệu chèn thêm hay bị xóa giữa chừng, còn cursor lấy tiếp sau item cuối đã thấy nên ổn định khi dữ liệu chèn liên tục, hợp cho feed và danh sách dài.",
      "role": "Dùng page cho feed realtime thì user thấy trùng hoặc thiếu item khi có dữ liệu mới. Không giới hạn size tối đa thì một request có thể lấy quá nhiều dòng và làm database cùng bộ nhớ quá tải.",
      "map": "REST > Danh Sách > Pagination > Page và Offset cùng Cursor, kề bên Limit, Sort, Total Count, Filter, Item Cuối Đã Thấy",
      "connects": [
        {
          "t": "Pagination cần sort ổn định thì mới có ý nghĩa, và sort đó phải được index hỗ trợ thì query mới nhanh.",
          "day": 8
        },
        {
          "t": "Resource và method đúng nghĩa cũng áp dụng cho danh sách: GET danh sách không được đổi trạng thái, dù có phân trang hay không.",
          "day": 5
        },
        {
          "t": "Danh sách chậm vì phân trang sai sẽ thành timeout ở client, và user tưởng hệ thống treo dù database vẫn đang quét hàng loạt dòng."
        }
      ]
    },
    {
      "what": "Versioning là cách giữ contract cũ sống trong khi contract mới ra đời. Thêm field optional vào response thì tương thích ngược, còn đổi tên field, đổi kiểu, xóa field hay thêm field bắt buộc vào request thì vỡ client cũ và cần version mới cùng lộ trình giữ cả hai một thời gian.",
      "role": "Đổi contract không báo trước thì app mobile cũ crash hàng loạt dù backend chỉ sửa nhỏ. Triệu chứng là backend báo deploy thành công, còn app cũ của user thì lỗi đồng loạt ngay sau đó.",
      "map": "REST > Contract > Version /v1 và /v2 cùng OpenAPI, kề bên Client Cũ, Migration, Deprecation, Changelog, Thêm Field Optional",
      "connects": [
        {
          "t": "Status code cũng là một phần của contract, nên đổi status không báo trước cũng vỡ client cũ như đổi tên field.",
          "day": 5
        },
        {
          "t": "Migration backward compatible dùng cùng nguyên tắc: thêm thứ tương thích trước, dọn thứ cũ sau, không đổi sập trong một lần deploy.",
          "day": 11
        },
        {
          "t": "Hệ sinh thái client gồm web, mobile cũ và service khác sẽ cùng chịu hậu quả khi một contract đổi không có lộ trình, chứ không chỉ một màn hình lỗi."
        }
      ]
    }
  ],
  "6": [
    {
      "what": "DTO là contract với bên ngoài, chỉ chứa field cần trao đổi, còn entity là model persistence gắn với database, quan hệ và field nội bộ. Luồng đúng là entity qua service map thành DTO rồi mới thành JSON, không bao giờ đưa entity trực tiếp ra API.",
      "role": "Expose entity trực tiếp thì lộ field nội bộ, Jackson có thể serialize cả đồ thị quan hệ lazy gây lỗi hoặc N+1, và đổi database là vỡ API. Triệu chứng là API trả thừa field nhạy cảm hoặc chậm bất thường dù query chính rất đơn giản.",
      "map": "Backend > Biên Hệ Thống > Entity > Service Map > DTO > JSON, kề bên JPA và Mongo Entity, Lazy Loading, Internal Note, Response, Request",
      "connects": [
        {
          "t": "Validation ba lớp cũng bám vào ranh giới này: controller validate DTO, còn service và database bảo vệ entity phía sau.",
          "day": 6
        },
        {
          "t": "Lazy và eager là lý do entity không nên đi thẳng ra JSON, vì quan hệ của entity không phải là thứ client cần thấy.",
          "day": 9
        },
        {
          "t": "Đổi schema database mà API vẫn ổn định được là nhờ DTO đứng giữa, còn không có DTO thì mọi thay đổi trong database đều lan tới client."
        }
      ]
    },
    {
      "what": "Validation có ba lớp: controller kiểm tra định dạng, service kiểm tra nghiệp vụ, database kiểm tra ràng buộc như unique, NOT NULL và foreign key. Thiếu một lớp là có đường lọt, vì mỗi lớp chặn một kiểu sai khác nhau.",
      "role": "Chỉ validate ở frontend thì gọi API trực tiếp là qua mặt được. Chỉ validate ở controller thì service gọi nội bộ từ chỗ khác vẫn ghi dữ liệu sai, còn không có ràng buộc ở database thì dữ liệu rác vẫn vào được khi mọi lớp trên đều sơ hở.",
      "map": "Backend > Validation > Controller (@Valid) > Service > Database Constraint, kề bên @NotBlank, @Size, Business Rule, Unique Constraint, Foreign Key",
      "connects": [
        {
          "t": "DTO khác entity là tiền đề của validation ba lớp, vì controller validate DTO còn service validate nghiệp vụ trên entity.",
          "day": 6
        },
        {
          "t": "Audit cũng kiểm tra validation ở đủ ba lớp, chứ không chỉ nhìn form frontend có báo lỗi hay không.",
          "day": 7
        },
        {
          "t": "Dữ liệu rác lọt qua validation sẽ thành báo cáo sai, đối soát lệch, và sửa sau đó tốn hơn chặn từ đầu rất nhiều."
        }
      ]
    },
    {
      "what": "Jackson serialize tên field Java đúng case của nó, nên backend trả new và mastered dạng thường trong khi frontend đọc NEW và MASTERED dạng hoa thì sẽ nhận undefined mà không có lỗi nào báo. Cách sửa là thống nhất đúng case ở cả hai phía, hoặc khai báo @JsonProperty rõ ràng.",
      "role": "Triệu chứng rất lừa là số liệu hiện 0 mà không có lỗi nào, làm người ta nghi logic tính toán trong khi thực ra key JSON không khớp. Lỗi này càng khó thấy khi cả hai phía đều sai giống nhau theo thói quen riêng.",
      "map": "Backend > Serialization > Jackson > JSON Key Case, kề bên Java Field, Frontend Reader, @JsonProperty, FAIL_ON_UNKNOWN_PROPERTIES, JSON Response",
      "connects": [
        {
          "t": "Tiền, thời gian và enum cũng là lỗi contract kiểu này, vì sai định dạng thì giá trị vẫn đi qua mà ý nghĩa đã lệch.",
          "day": 6
        },
        {
          "t": "Đổi tên field mà không có version mới cũng gây cùng một triệu chứng: client cũ đọc key cũ và nhận undefined.",
          "day": 5
        },
        {
          "t": "Dashboard hiển thị 0 vì key sai có thể làm người ta ra quyết định sai, dù dữ liệu gốc trong database hoàn toàn đúng."
        }
      ]
    },
    {
      "what": "Tiền phải dùng BigDecimal thay vì double vì double biểu diễn nhị phân nên phép tính tiền lẻ có thể lệch. Thời gian phải dùng ISO-8601 kèm timezone để server và client không hiểu lệch giờ, còn enum thêm giá trị mới phải có fallback để client cũ không crash.",
      "role": "Triệu chứng là tổng tiền lệch vài đồng, giờ hiển thị lệch múi giờ, và client cũ crash vì gặp enum mới. Jackson mặc định FAIL_ON_UNKNOWN_PROPERTIES còn làm thừa field cũng có thể thành 400, nên gửi thừa không hề vô hại.",
      "map": "Backend > Kiểu Dữ Liệu > BigDecimal, ISO-8601, Enum, kề bên Double, Timezone, @JsonProperty, DTO Validation, Jackson",
      "connects": [
        {
          "t": "Jackson phân biệt hoa thường là cùng một họ lỗi contract: giá trị đi qua được nhưng ý nghĩa hoặc tên đã không còn khớp.",
          "day": 6
        },
        {
          "t": "Tiền và lock đi cùng nhau khi trừ số dư, vì sai kiểu tiền hay mất lock đều làm số dư sai mà khó đối soát.",
          "day": 13
        },
        {
          "t": "Sai tiền hay sai giờ trong thanh toán và đối soát sẽ thành tranh chấp với user, chứ không chỉ là một con số hiển thị lệch."
        }
      ]
    }
  ],
  "7": [
    {
      "what": "Audit theo checklist có bằng chứng nghĩa là mỗi mục đều kèm request, response hoặc log thật, không ghi cảm tính. Chỉ kiểm tra happy path là chưa audit, vì lỗi thường nằm ở nhánh lỗi, ở config môi trường và ở trường hợp biên.",
      "role": "Audit bằng cách đọc code rồi kết luận sẽ bỏ sót lỗi chỉ lộ khi chạy thật, ví dụ config môi trường sai hay OPTIONS bị chặn. Triệu chứng là báo cáo đẹp nhưng production vẫn lỗi y nguyên sau khi sửa theo báo cáo.",
      "map": "Checkpoint Tuần 1 > Audit > Checklist > Bằng Chứng Request, Response, Log, kề bên curl, DevTools, Controller, DTO, Security Rule, Database Thật",
      "connects": [
        {
          "t": "Phân loại lỗi là bước ngay sau audit, vì bằng chứng chưa phân loại thì chưa biết sửa ở đâu.",
          "day": 7
        },
        {
          "t": "Checklist audit gồm method khớp controller không, field JSON khớp DTO kể cả case không, và config có trỏ đúng database không.",
          "day": 2
        },
        {
          "t": "Báo cáo audit có bằng chứng mới đủ để viết spec sửa và kiểm chứng sau sửa, còn báo cáo cảm tính thì đội khác không thể làm tiếp."
        }
      ]
    },
    {
      "what": "Phân loại lỗi là xếp mỗi lỗi vào contract, auth, config hay validation, vì mỗi loại sửa ở một chỗ khác nhau. Lỗi contract sửa DTO và OpenAPI cùng frontend, lỗi auth sửa Security hay interceptor hay storage, lỗi config sửa env và profile chứ không sửa code nghiệp vụ.",
      "role": "Chưa phân loại mà sửa lung tung thì sửa được lỗi này lại sinh lỗi khác, và tốn thời gian ở sai chỗ. Triệu chứng là càng sửa càng nhiều chỗ đổi, mà lỗi gốc vẫn còn.",
      "map": "Checkpoint > Phân Loại > Contract, Auth, Config, Validation, kề bên DTO và OpenAPI, Security và Interceptor, Env và Profile, Service Validation",
      "connects": [
        {
          "t": "Thứ tự sửa chỉ có ý nghĩa sau khi đã phân loại, vì lỗi chưa phân loại thì không biết nó nặng hay nhẹ.",
          "day": 7
        },
        {
          "t": "Lỗi auth như token ghi và đọc lệch storage là ví dụ điển hình: nhìn như lỗi phân quyền nhưng gốc là lỗi auth ở frontend.",
          "day": 4
        },
        {
          "t": "Phân loại đúng giúp đội chia việc đúng người: người sửa contract, người sửa security, người sửa config, thay vì cả đội cùng sửa một file."
        }
      ]
    },
    {
      "what": "Thứ tự sửa là mất dữ liệu trước, bảo mật sau, trải nghiệm cuối cùng. Lỗi nhỏ nhưng dễ sửa không được chen lên trước lỗi mất dữ liệu, và lỗi chặn luồng chính phải trước lỗi chỉ làm trải nghiệm kém đi.",
      "role": "Ưu tiên sai thì đội sửa message lỗi cho đẹp trong khi dữ liệu vẫn ghi sai database, hoặc sửa loading trong khi user khác vẫn đọc được dữ liệu của nhau. Triệu chứng là release trông có tiến triển mà rủi ro lớn nhất vẫn còn nguyên.",
      "map": "Checkpoint > Ưu Tiên Sửa > P0 Mất Dữ Liệu và Bảo Mật > P1 Chặn Luồng Chính > P2 Trải Nghiệm, kề bên Spec Sửa, Kiểm Chứng Sau Sửa, Rollback, Bằng Chứng Audit",
      "connects": [
        {
          "t": "Audit theo checklist có bằng chứng là nguồn để xếp thứ tự, vì không có bằng chứng thì không biết lỗi nào thật sự mất dữ liệu.",
          "day": 7
        },
        {
          "t": "Bảng failure mode cũng xếp theo mức độ ảnh hưởng tới user và dữ liệu, nên cùng nguyên tắc ưu tiên này sẽ dùng lại ở các checkpoint sau.",
          "day": 20
        },
        {
          "t": "Thứ tự sai trong một sự cố thật có thể làm mất dữ liệu thêm trong lúc đội đang sửa, thay vì chặn thiệt hại trước."
        }
      ]
    }
  ],
  "8": [
    {
      "what": "Normalization là tách bảng để một sự thật chỉ nằm ở một chỗ, sửa một chỗ là đủ và không bị mâu thuẫn. Denormalization là chấp nhận trùng lặp có chủ đích để đọc nhanh hơn, ví dụ lưu snapshot tên và giá sản phẩm vào order item để lịch sử đơn không đổi khi sản phẩm đổi tên hay đổi giá sau này.",
      "role": "Lưu giá hiện tại vào đơn thay vì snapshot thì đơn cũ tự đổi giá khi sản phẩm tăng giá. Ngược lại, chuẩn hóa quá mức thì một trang phải join nhiều bảng mới đủ dữ liệu và query trở nên chậm và khó đọc.",
      "map": "SQL > Thiết Kế Bảng > Normalization và Denormalization, kề bên Orders, Order Items, Products, Foreign Key, Snapshot Giá và Tên, Join",
      "connects": [
        {
          "t": "Composite index cũng phục vụ bài toán đọc nhanh này, nhưng index không thay thế được quyết định tách hay gộp bảng.",
          "day": 8
        },
        {
          "t": "Embedding và referencing trong MongoDB là cùng một lựa chọn ở dạng document: nhúng để đọc nhanh, tách để dùng độc lập.",
          "day": 10
        },
        {
          "t": "Thiết kế bảng sai làm báo cáo doanh thu và lịch sử đơn sai theo, vì dữ liệu gốc đã không còn giữ đúng giá trị tại thời điểm giao dịch."
        }
      ]
    },
    {
      "what": "Index B-tree giúp tìm nhanh thay vì quét hết bảng, còn composite index là index trên nhiều cột theo một thứ tự cố định. Query chỉ dùng hiệu quả phần đầu của composite index theo đúng thứ tự đó, bỏ qua cột đầu thì hiệu quả giảm mạnh.",
      "role": "Sai thứ tự cột thì EXPLAIN vẫn full scan dù đã thêm index, và dùng hàm lên cột index cũng làm index vô dụng. Triệu chứng là thêm index rồi mà query vẫn chậm, làm người ta kết luận sai là database yếu.",
      "map": "SQL > Index > B-tree > Composite Index (Cột 1, Cột 2), kề bên WHERE, ORDER BY, Query Planner, EXPLAIN, Cột Đầu Tiên",
      "connects": [
        {
          "t": "EXPLAIN là cách duy nhất để biết composite index có thật sự được dùng hay không, thay vì đoán từ tên index.",
          "day": 8
        },
        {
          "t": "Index trong MongoDB cũng cần đúng thứ tự cho query và sort hay dùng, nên nguyên tắc này không chỉ đúng cho SQL.",
          "day": 10
        },
        {
          "t": "Query chậm vì sai index sẽ thành timeout ở API, rồi thành trải nghiệm chậm cho user dù dữ liệu không hề lớn bất thường."
        }
      ]
    },
    {
      "what": "EXPLAIN là công cụ đọc kế hoạch thực thi của query: query đang full scan hay dùng index nào, ước tính quét bao nhiêu dòng, và có phải sắp xếp thêm bằng filesort hay tạo bảng tạm không. Đọc được type, key, rows và Extra là đủ để chẩn đoán ở mức cơ bản.",
      "role": "Chỉ nhìn thời gian chạy thì dễ tối ưu sai chỗ, ví dụ thêm instance hay thêm cache trong khi thật ra chỉ thiếu index. Triệu chứng của việc không đọc EXPLAIN là sửa nhiều thứ mà query vẫn chậm.",
      "map": "SQL > Chẩn Đoán > EXPLAIN > Type, Key, Rows, Extra, kề bên Full Scan, Ref và Range, Using Filesort, Index, Query Planner",
      "connects": [
        {
          "t": "Khi nào không nên index cũng cần EXPLAIN để quyết định, vì index ít phân biệt có thể bị optimizer bỏ qua dù đã tạo.",
          "day": 8
        },
        {
          "t": "N+1 query cũng phát hiện bằng cách đọc log query và đếm số query, giống như EXPLAIN phát hiện full scan bằng kế hoạch thực thi.",
          "day": 9
        },
        {
          "t": "Slow query log và monitoring dựa vào những tín hiệu này để alert, nên không đọc EXPLAIN thì đội vận hành cũng không biết bottleneck thật nằm ở đâu."
        }
      ]
    },
    {
      "what": "Không nên index cột ít giá trị phân biệt mà query chỉ lọc riêng cột đó, hay bảng ghi nhiều đọc ít. Index khi đó tốn dung lượng, làm chậm ghi vì mỗi lần ghi phải cập nhật thêm index, và optimizer có thể bỏ qua index vì quét index còn đắt hơn quét bảng.",
      "role": "Index mọi cột thì ghi chậm, dung lượng phình và query vẫn không nhanh hơn. Triệu chứng là càng thêm index càng thấy ghi chậm đi, trong khi query lọc vẫn quét gần hết bảng.",
      "map": "SQL > Index > Quyết Định Index > Cột Phân Biệt Cao và Hay Lọc hay Sort, kề bên Ghi Nhiều và Đọc Ít, Dung Lượng Index, Write Overhead, Optimizer",
      "connects": [
        {
          "t": "Composite index đúng thứ tự cũng vô nghĩa nếu cột đầu ít phân biệt, nên quyết định có index hay không phải đi trước thứ tự cột.",
          "day": 8
        },
        {
          "t": "Hiệu năng và chi phí cũng tính tới index, vì index thừa là chi phí lưu trữ và ghi mà không mang lại tốc độ đọc.",
          "day": 24
        },
        {
          "t": "Index thừa trong hệ thống lớn sẽ thành chi phí vận hành thật: dung lượng tăng, ghi chậm, và backup cùng restore đều nặng hơn."
        }
      ]
    }
  ],
  "9": [
    {
      "what": "Lazy nghĩa là quan hệ chỉ được tải khi code thật sự truy cập tới nó, còn eager nghĩa là tải ngay cả khi chỉ cần thông tin của entity cha. Eager là mặc định tiện tay nhưng có thể kéo cả đồ thị quan hệ, còn lazy thì tiết kiệm nhưng cần còn trong transaction khi truy cập.",
      "role": "Đặt eager bừa cho mọi quan hệ thì một API đơn giản cũng chạy chậm vì tải cả cây không cần thiết. Dùng lazy mà truy cập ngoài transaction thì gặp LazyInitializationException, và cả hai đều làm API lỗi hoặc chậm theo cách khó đoán.",
      "map": "JPA và Hibernate > Fetch > Lazy và Eager > @OneToMany và @ManyToOne, kề bên Transaction, Session, Entity Graph, JOIN FETCH, Entity Cha và Con",
      "connects": [
        {
          "t": "N+1 query sinh ra đúng từ lazy cộng với vòng lặp, nên hiểu lazy trước thì mới hiểu vì sao danh sách càng dài càng chậm.",
          "day": 9
        },
        {
          "t": "DTO khác entity cũng liên quan trực tiếp, vì serialize entity có quan hệ lazy ra JSON là cách nhanh nhất để lộ cả hai vấn đề này.",
          "day": 6
        },
        {
          "t": "API chậm vì tải thừa sẽ thành timeout ở client và áp lực lên database, dù logic nghiệp vụ của API đó rất đơn giản."
        }
      ]
    },
    {
      "what": "N+1 query là một query lấy danh sách, rồi thêm N query lấy từng item con trong vòng lặp, tổng cộng là 1 cộng N query và tăng theo số dòng. Cách sửa là JOIN FETCH, EntityGraph hoặc batch fetch để gộp thành một hoặc hai query.",
      "role": "Danh sách càng dài càng chậm theo số lượng item, và log query sẽ thấy hàng loạt câu SELECT giống nhau chỉ khác id. Triệu chứng này rất đặc trưng: trang ít dữ liệu thì nhanh, trang nhiều dữ liệu thì chậm hẳn.",
      "map": "JPA > Hiệu Năng Query > N+1 > FindAll cộng Vòng Lặp getItems, kề bên JOIN FETCH, @EntityGraph, Batch Fetch, Query Log, Lazy Loading",
      "connects": [
        {
          "t": "Lazy là gốc của N+1, vì mỗi lần truy cập quan hệ lazy trong vòng lặp lại sinh thêm một query.",
          "day": 9
        },
        {
          "t": "EXPLAIN và log query là cách phát hiện N+1, vì đếm query theo N là bằng chứng chứ không phải cảm giác chậm.",
          "day": 8
        },
        {
          "t": "N+1 kéo dài làm connection pool cạn, database quá tải, và cuối cùng nhiều request khác cũng timeout theo."
        }
      ]
    },
    {
      "what": "Transaction boundary là ranh giới bắt đầu và kết thúc của một transaction, và @Transactional nên đặt ở service method bao cả luồng ghi nhiều bước. Lỗi ở bước cuối thì rollback tất cả các bước trước, còn đặt ở controller hay repository lẻ thì ranh giới sai và rollback không như ý.",
      "role": "Ranh giới sai thì dữ liệu lưu nửa vời, ví dụ order có mà items mất, hoặc exception bị nuốt rồi transaction vẫn commit nửa vời. Cần chú ý là @Transactional mặc định không rollback với checked exception, và tự gọi method trong cùng class thì proxy không áp transaction.",
      "map": "JPA > Transaction > Service Method @Transactional > Repository A, B, C, kề bên Rollback, Checked Exception, Proxy, Controller, Service",
      "connects": [
        {
          "t": "Lưu cha trước con sau chỉ an toàn khi cả hai nằm trong cùng một transaction, vì lỗi ở con phải rollback cả cha.",
          "day": 9
        },
        {
          "t": "Isolation quyết định các transaction đồng thời nhìn thấy nhau ra sao, nên boundary và isolation phải thiết kế cùng nhau.",
          "day": 13
        },
        {
          "t": "Dữ liệu nửa vời do rollback sai sẽ thành đơn hàng thiếu item hay chính sách thiếu coverage, và đối soát sau đó rất khó sửa."
        }
      ]
    },
    {
      "what": "Lưu cha trước con sau nghĩa là lưu entity cha để lấy id, rồi mới lưu entity con gắn khóa ngoại trỏ tới cha, tất cả trong cùng một transaction. Backend cũng phải tự tính lại giá và tổng tiền từ dữ liệu đã lưu, không tin số frontend gửi lên.",
      "role": "Lưu con trước khi cha có id thì lỗi khóa ngoại, còn tin tổng tiền frontend gửi thì user sửa bằng DevTools là qua mặt được. Triệu chứng là đơn hàng có tổng tiền sai, hoặc dữ liệu con mồ côi không gắn được vào cha.",
      "map": "JPA > Ghi Liên Quan > Cha (Policy và Order) > Con (Location và Item) > Foreign Key, kề bên Transaction, Tính Lại Tổng, Validation Service, Repository",
      "connects": [
        {
          "t": "Transaction boundary là điều kiện để lưu cha rồi con rồi tính lại tổng có thể rollback trọn vẹn khi bước cuối lỗi.",
          "day": 9
        },
        {
          "t": "Validation ở service cũng phải tính lại tổng thay vì tin frontend, vì controller chỉ kiểm tra định dạng chứ không bảo vệ được nghiệp vụ.",
          "day": 6
        },
        {
          "t": "Đơn hàng sai tiền do tin frontend sẽ thành tranh chấp thanh toán và đối soát, chứ không chỉ là một field hiển thị sai."
        }
      ]
    }
  ],
  "10": [
    {
      "what": "Embedding là nhúng dữ liệu con vào document cha, hợp khi con luôn đi kèm cha và không quá lớn hay tăng vô hạn. Referencing là tách con ra collection riêng, hợp khi con được dùng độc lập hoặc mảng con tăng không giới hạn như lịch sử hay log.",
      "role": "Nhúng mảng tăng vô hạn thì document phình tới giới hạn kích thước và sửa một item cũng phải sửa cả document cha. Tách quá mức thì đọc một trang phải query nhiều collection và nối bằng code, làm code phức tạp và chậm.",
      "map": "MongoDB > Model Document > Embedding > Order {items[]} và Referencing > Orders cộng Order Items, kề bên $lookup, Document Size, Đọc Một Đơn, Thống Kê Sản Phẩm",
      "connects": [
        {
          "t": "Index và aggregation phải thiết kế theo lựa chọn này, vì nhúng thì group trên mảng còn tách thì group trên collection riêng.",
          "day": 10
        },
        {
          "t": "Normalization và denormalization trong SQL là cùng một đánh đổi: tách để tránh trùng lặp, gộp để đọc nhanh.",
          "day": 8
        },
        {
          "t": "Model sai ở tầng document sẽ lan thành API chậm, báo cáo khó viết, và sửa sau đó phải migration cả tập dữ liệu cũ."
        }
      ]
    },
    {
      "what": "Index trong MongoDB phục vụ query và sort hay dùng, ví dụ index theo user và thời gian cho query lấy đơn mới nhất của một user. Aggregation pipeline như $match rồi $group để thống kê ở database, thay vì kéo hết document về code rồi tính.",
      "role": "Không index mà query theo user thì thành collection scan, còn kéo hết document về code để group thì chậm và tốn bộ nhớ. Triệu chứng là báo cáo càng nhiều dữ liệu càng chậm, dù pipeline ở database có thể làm nhanh hơn nhiều.",
      "map": "MongoDB > Query > Index (userId, createdAt) và Aggregation Pipeline, kề bên $match, $group, Sort, Collection Scan, Query Hay Dùng",
      "connects": [
        {
          "t": "Embedding hay referencing quyết định aggregation viết ra sao, vì mảng nhúng cần unwind còn collection tách thì group trực tiếp.",
          "day": 10
        },
        {
          "t": "Index B-tree và composite index trong SQL dùng cùng nguyên tắc thứ tự cột cho lọc và sort.",
          "day": 8
        },
        {
          "t": "Báo cáo chậm vì thiếu index hay kéo hết dữ liệu về app sẽ thành timeout ở dashboard và quyết định kinh doanh bị chậm theo."
        }
      ]
    },
    {
      "what": "MongoDB không có join mạnh như SQL: $lookup có nhưng đắt và hạn chế, còn transaction đa document không phải là mặc định rẻ, cần replica set và không rẻ như transaction SQL. Vì vậy document mới là đơn vị nhất quán chính, còn transaction đa document chỉ là ngoại lệ.",
      "role": "Thiết kế MongoDB như SQL, tách nhỏ rồi join khắp nơi và trông chờ transaction cứu, sẽ làm code phức tạp và chậm. Triệu chứng là đọc một trang phải nối nhiều collection, và transaction không cứu được thiết kế đã sai từ đầu.",
      "map": "MongoDB > Giới Hạn > Document Là Đơn Vị Nhất Quán Chính > $lookup và Multi-Document Transaction, kề bên SQL Join, Replica Set, Code Join, Transaction SQL",
      "connects": [
        {
          "t": "Kỷ luật schema giúp document tự chứa đủ dữ liệu để không phải join khắp nơi, nên giới hạn này và kỷ luật schema đi cùng nhau.",
          "day": 10
        },
        {
          "t": "Transaction boundary trong JPA cho thấy transaction đa bảng là chuyện thường ở SQL, nhưng sang MongoDB thì không thể bê nguyên tư duy đó.",
          "day": 9
        },
        {
          "t": "Hệ thống thiết kế sai mô hình sẽ phải bù bằng code phức tạp ở mọi API, và càng scale thì chi phí bù càng lớn."
        }
      ]
    },
    {
      "what": "Kỷ luật schema trong document nghĩa là dù MongoDB không ép schema như SQL, vẫn phải khai báo field nào bắt buộc, kiểu nào và document đang ở version nào. Version giúp code biết dữ liệu cũ hay mới để nâng cấp, còn seed phải fail-fast khi thiếu tên database và log phải in tên database thật.",
      "role": "Dữ liệu cũ thiếu field mới thì code dễ NullPointer vì đoán field, còn seed có fallback lặng lẽ thì dữ liệu vào nhầm database mà vẫn báo thành công. Triệu chứng là app chạy ngon nhưng dữ liệu trống, hoặc dữ liệu cũ và mới lẫn lộn không biết đâu mà lần.",
      "map": "MongoDB > Schema Kỷ Luật > Document Version, Field Bắt Buộc, Enum, kề bên Seed Script, Tên Database, Log Seed, Migration Dữ Liệu, Validation",
      "connects": [
        {
          "t": "Embedding hay referencing cũng cần kỷ luật này, vì document không có version thì không biết mảng con đang ở dạng cũ hay mới.",
          "day": 10
        },
        {
          "t": "Tên database phải tường minh là cùng một kỷ luật: một nguồn sự thật cho tên database, không fallback lặng lẽ ở seed hay backend.",
          "day": 2
        },
        {
          "t": "Seed sai database mà không phát hiện sẽ làm dữ liệu production và dữ liệu kiểm chứng lệch nhau, và mọi đối soát sau đó đều sai theo."
        }
      ]
    }
  ],
  "11":   [
    {
      "what": "Flyway và Liquibase là công cụ biến schema thành mã nguồn có phiên bản: mỗi thay đổi là một file migration đánh số V1, V2, V3..., công cụ ghi lại file nào đã chạy trên từng môi trường và chỉ chạy tiếp những file chưa chạy, đúng thứ tự số. Nhờ vậy dev, staging và production đi qua cùng một lịch sử thay đổi thay vì mỗi nơi được sửa tay một kiểu.",
      "role": "Sửa tay schema production thì môi trường test và môi trường thật âm thầm lệch nhau: code chạy tốt ở dev vì dev đã có cột mới, lên production thì lỗi thiếu cột hoặc sai kiểu, và không ai biết bản schema thật là gì vì không có file nào ghi lại. Migration có phiên bản làm cho lịch sử schema xem lại được và deploy lặp lại được.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Migration > Flyway/Liquibase, kề bên schema của bảng đơn hàng và sản phẩm, pipeline triển khai, script seed dữ liệu, và công cụ kiểm tra schema sau deploy",
      "connects": [
        {
          "t": "Vì migration chỉ an toàn khi mỗi bước tương thích với cả code cũ lẫn code mới, nên dùng Flyway hay Liquibase mà vẫn đổi sập trong một lần deploy thì công cụ cũng không cứu được, và đó là lý do bước đổi schema phải tách nhỏ theo nguyên tắc ở mục kế tiếp.",
          "day": 11
        },
        {
          "t": "Vì schema đổi theo thời gian nên persistence contract cũng phải ghi rõ entity nào thay đổi cùng migration nào, nếu không spec ghi một đằng mà bảng thật lại một nẻo và frontend gọi API theo contract cũ sẽ lỗi.",
          "day": 11
        },
        {
          "t": "Vì pipeline là nơi duy nhất chạy migration một cách có kiểm soát, nên việc migration chạy ở bước nào của CI/CD quyết định deploy có lặp lại và rollback được hay không, chứ không phải chạy tay trên từng máy.",
          "day": 26
        },
        {
          "t": "Vì mọi thay đổi schema đều đi qua cùng một lịch sử có phiên bản, nên toàn bộ hệ thống mới có một quy trình deploy lặp lại được: cùng một code, cùng một chuỗi migration, cho ra cùng một schema ở mọi môi trường."
        }
      ],
      "shape": "definition",
      "difficulty": 1,
      "thresholds": "Một migration đã chạy trên bất kỳ môi trường nào thì không được sửa nội dung nữa; muốn sửa thì viết migration mới. Sửa file đã chạy sẽ làm checksum lệch và môi trường đó từ chối chạy tiếp.",
      "dontUse": "Không dùng migration để sửa dữ liệu theo kiểu một lần rồi bỏ mà không ghi lại, và không dùng sửa tay trực tiếp trên production để chữa cháy rồi quên đồng bộ ngược về file migration.",
      "quiz": {
        "q": "Bảng orders ở production đã chạy V2__add_discount.sql. Bạn phát hiện V2 viết sai tên cột. Cách sửa đúng là gì?",
        "answer": "Viết migration mới V3 sửa lại tên cột, không sửa file V2.",
        "why": "V2 đã được ghi là đã chạy, nên sửa file V2 sẽ làm checksum lệch ở production và các môi trường đã chạy nó; migration mới giữ lịch sử chạy nhất quán ở mọi nơi."
      }
    },
    {
      "what": "Migration backward compatible là cách chia một thay đổi schema thành nhiều bước deploy sao cho trong suốt thời gian chuyển đổi, cả code cũ đang chạy và code mới sắp lên đều đọc ghi được trên cùng schema. Ví dụ thêm cột bắt buộc: bước 1 thêm cột dạng nullable (cho phép rỗng) và deploy code đọc được cả giá trị rỗng lẫn có giá trị, bước 2 backfill (điền giá trị cho dữ liệu cũ), bước 3 mới siết thành NOT NULL (không cho rỗng) và dọn code cũ.",
      "role": "Đổi kiểu hoặc xóa cột ngay trong một lần deploy sẽ làm request đang chạy lỗi hàng loạt, và rollback code cũng không cứu được vì migration đã chạy rồi, schema đã đổi. Chia nhỏ bước thì mỗi bước đều có thể lùi lại được: code mới vẫn chạy trên schema cũ, code cũ vẫn chạy trên schema mới ở mức tối thiểu.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Migration > Thay đổi schema từng bước, kề bên code backend đang chạy, bảng đơn hàng và sản phẩm, pipeline triển khai, và kế hoạch rollback",
      "connects": [
        {
          "t": "Vì Flyway hay Liquibase chỉ đảm bảo migration chạy đúng thứ tự, còn việc mỗi migration có làm code cũ sập hay không lại phụ thuộc vào cách chia bước, nên công cụ migration và nguyên tắc tương thích ngược phải đi cùng nhau, thiếu một trong hai là deploy vẫn sập.",
          "day": 11
        },
        {
          "t": "Vì persistence contract ghi entity và API nào thay đổi, nên khi thêm cột bắt buộc, contract phải ghi rõ bước nào code bắt đầu đọc cột mới và bước nào mới được phép siết NOT NULL, nếu không frontend và backend sẽ lệch nhau ngay giữa đợt deploy.",
          "day": 11
        },
        {
          "t": "Vì blue-green và canary đều chạy song song bản cũ và bản mới trong một khoảng thời gian, nên nếu migration không tương thích ngược thì chiến lược deploy an toàn nào cũng vô nghĩa: bản cũ sẽ lỗi ngay trên schema mới.",
          "day": 26
        },
        {
          "t": "Vì rollback chỉ khả thi khi schema mới vẫn nuôi được code cũ, nên độ tin cậy khi triển khai của toàn bộ hệ thống phụ thuộc trực tiếp vào việc mỗi migration có tương thích ngược hay không, chứ không phụ thuộc vào việc deploy nhanh hay chậm."
        }
      ],
      "shape": "decision",
      "difficulty": 2,
      "thresholds": "Backfill bảng lớn phải chia theo lô, ví dụ 1.000-10.000 dòng mỗi lô, thay vì UPDATE một lần cả triệu dòng gây khóa bảng lâu; bước siết NOT NULL chỉ làm khi đã kiểm tra không còn dòng nào rỗng.",
      "dontUse": "Không dùng khi thay đổi là xóa cột hay đổi kiểu mà code cũ vẫn đọc cột cũ: khi đó phải deploy code ngừng đọc cột cũ trước, rồi mới xóa cột ở một đợt deploy sau.",
      "quiz": {
        "q": "Bảng orders có 1 triệu dòng, cần thêm cột discount_code bắt buộc, mặc định là NONE. Deploy một bước: thêm cột NOT NULL DEFAULT NONE rồi deploy code mới cùng lúc. Rủi ro lớn nhất là gì?",
        "answer": "Code cũ đang chạy sẽ lỗi hoặc dữ liệu cũ chưa được backfill đúng ý trước khi code mới lên; và nếu deploy lỗi thì rollback code không cứu được vì migration đã chạy.",
        "why": "Một bước duy nhất bắt schema và code phải đổi đồng thời, đúng điều nguyên tắc tương thích ngược cấm: phải thêm nullable trước, backfill theo lô, rồi mới siết NOT NULL."
      }
    },
    {
      "what": "Persistence contract là một cam kết bằng văn bản cho mỗi tính năng, trả lời đủ: dữ liệu sống ở đâu, thuộc entity nào, API nào đọc, API nào ghi, đồng bộ lúc nào, và khi mất mạng hay đổi thiết bị thì chuyện gì xảy ra. Quy ước mặc định: nếu không ghi rõ local-only (chỉ lưu ở máy người dùng) kèm lý do, thì dữ liệu người dùng phải lưu ở server.",
      "role": "Thiếu contract, frontend sẽ tự chọn nơi lưu theo thói quen, thường là bộ nhớ cục bộ của trình duyệt, và tính năng vẫn chạy tốt trên một máy nên không ai phát hiện. Tới khi người dùng đổi thiết bị hoặc xóa bộ nhớ trình duyệt, giỏ hàng hay hồ sơ biến mất dù backend đã có sẵn API và hệ thống vẫn báo thành công.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đặc tả tính năng > Persistence contract, kề bên entity giỏ hàng và hồ sơ người dùng, API đọc và ghi, cơ chế đồng bộ khi mất mạng, và thiết kế dữ liệu tổng thể",
      "connects": [
        {
          "t": "Vì bài học giỏ hàng cho thấy hậu quả cụ thể của việc bỏ trống contract, nên persistence contract chính là biện pháp ngăn lỗi đó lặp lại ở wishlist hay hồ sơ: viết rõ nơi lưu trước khi viết code thì frontend không còn quyền tự chọn localStorage.",
          "day": 11
        },
        {
          "t": "Vì Flyway và Liquibase quản lý schema của entity, nên contract ghi entity nào cũng ngầm ghi migration nào đi kèm: đổi entity mà không có migration tương ứng thì contract đẹp trên giấy nhưng bảng thật không có chỗ chứa dữ liệu.",
          "day": 11
        },
        {
          "t": "Vì checkpoint tuần dữ liệu tổng hợp mọi quyết định của tuần, nên thiết kế tổng thể ở đó phải kiểm tra lại từng persistence contract đã viết, thay vì vẽ lại schema từ đầu và bỏ sót nơi lưu của một tính năng.",
          "day": 14
        },
        {
          "t": "Vì người dùng kỳ vọng dữ liệu của mình theo mình qua mọi thiết bị, nên trải nghiệm xuyên thiết bị của toàn bộ sản phẩm chỉ đáng tin khi mọi tính năng đều có contract ghi rõ dữ liệu sống ở server và đồng bộ lúc nào."
        }
      ],
      "shape": "decision",
      "difficulty": 1,
      "dontUse": "Không dùng local-only cho dữ liệu người dùng đã đăng nhập mà không ghi rõ lý do và cách merge khi đăng nhập; và không dùng contract viết chung chung kiểu lưu ở server mà không ghi entity, API và thời điểm sync cụ thể.",
      "quiz": {
        "q": "Spec của tính năng wishlist chỉ ghi: người dùng bấm tim thì sản phẩm được lưu. Một reviewer nói spec này chưa đủ. Thiếu quan trọng nhất là gì?",
        "answer": "Thiếu persistence contract: lưu ở server (entity nào, API ghi nào, sync lúc nào) hay local-only với lý do gì, và đổi thiết bị thì wishlist ra sao.",
        "why": "Không ghi nơi lưu thì frontend có thể chọn localStorage, wishlist sẽ mất khi đổi thiết bị dù tính năng chạy tốt trên một máy, đúng lỗi đã xảy ra với giỏ hàng."
      }
    },
    {
      "what": "Bài học giỏ hàng là một sự cố thật: backend đã có đủ API giỏ hàng, nhưng frontend chỉ merge (gộp) giỏ ẩn danh vào giỏ tài khoản một lần lúc đăng nhập, sau đó mọi thao tác thêm, xóa đều chỉ lưu ở máy người dùng. Nguyên nhân gốc không phải thiếu API mà là spec không bắt buộc dữ liệu sống ở đâu, nên implementation tự quyết định nơi lưu và chọn cách dễ nhất.",
      "role": "Hậu quả là dữ liệu không đồng bộ mà không có lỗi nào hiện ra: giỏ đầy trên điện thoại nhưng trống trên máy tính, hoặc mất hẳn sau khi xóa bộ nhớ trình duyệt, trong khi hệ thống vẫn báo thêm vào giỏ thành công. Lỗi này lặp lại ở bất kỳ tính năng nào có dữ liệu người dùng mà spec bỏ trống persistence contract.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Giỏ hàng > Đồng bộ giỏ hàng, kề bên API giỏ hàng ở backend, bộ nhớ cục bộ của trình duyệt, luồng đăng nhập và merge giỏ, và hồ sơ người dùng",
      "connects": [
        {
          "t": "Vì bài học này chứng minh một spec thiếu persistence contract sẽ để implementation tự chọn nơi lưu, nên cách sửa bền nhất không phải sửa code giỏ hàng một lần mà là bắt mọi spec sau này phải ghi contract trước, nếu không lỗi sẽ tái diễn ở tính năng khác.",
          "day": 11
        },
        {
          "t": "Vì migration backward compatible dạy rằng thay đổi phải chia bước để code cũ và mới cùng chạy được, nên khi sửa giỏ hàng từ local-only sang server-persisted cũng phải chia bước: deploy API đồng bộ trước, rồi mới đổi frontend sang ghi server ngay, tránh mất giỏ của người dùng đang dùng bản cũ.",
          "day": 11
        },
        {
          "t": "Vì checkpoint tuần dữ liệu yêu cầu thiết kế cho giỏ hàng phải ghi rõ schema, transaction và tình huống mâu thuẫn, nên giỏ hàng là bài kiểm tra đầu tiên của checkpoint: nếu thiết kế ngày 14 vẫn để giỏ local-only không lý do thì checkpoint chưa đạt.",
          "day": 14
        },
        {
          "t": "Vì người dùng tin rằng giỏ hàng là của mình chứ không phải của một thiết bị, nên độ tin cậy của dữ liệu người dùng trong toàn bộ sản phẩm sụp đổ nhanh nhất qua những lần mất dữ liệu im lặng kiểu này, nhanh hơn cả một lỗi hiện rõ."
        }
      ],
      "shape": "incident",
      "difficulty": 1,
      "thresholds": "Giỏ hàng phải đồng bộ lên server ngay khi người dùng thêm hoặc xóa, không chờ tới lúc logout hay đăng nhập lần sau; giỏ ẩn danh chưa đăng nhập là trường hợp duy nhất được phép local tạm, và phải merge vào giỏ tài khoản ngay khi đăng nhập.",
      "dontUse": "Không dùng merge một lần lúc đăng nhập làm cơ chế đồng bộ duy nhất, vì sau lần merge đó mọi thay đổi tiếp theo sẽ chỉ nằm ở một máy.",
      "quiz": {
        "q": "User thêm 3 món vào giỏ trên điện thoại, sau đó mở máy tính và đăng nhập cùng tài khoản thì giỏ trống. Backend có đủ API cart và không có lỗi nào trong log. Nguyên nhân khả dĩ nhất là gì?",
        "answer": "Frontend chỉ lưu giỏ ở máy người dùng sau lần merge lúc đăng nhập, không ghi lên server ngay khi thêm món.",
        "why": "API đầy đủ mà dữ liệu vẫn không qua được thiết bị khác thì nơi lưu mới là vấn đề, và triệu chứng giỏ trống trên thiết bị thứ hai đúng là dấu hiệu của local-only, không phải lỗi API hay database."
      }
    }
  ],
  "12":   [
    {
      "what": "Cache-aside, write-through và write-behind là ba cách phân công ai chịu trách nhiệm ghi cache. Cache-aside: ứng dụng tự đọc cache, trượt (miss) thì đọc database rồi ghi lại cache. Write-through: mỗi lần ghi thì ghi database và cache cùng lúc, nên đọc sau đó luôn đúng. Write-behind: ghi cache trước, trả kết quả cho người dùng ngay, database được ghi sau một cách bất đồng bộ.",
      "role": "Chọn sai chiến lược thì hoặc trả dữ liệu cũ lâu, hoặc mất dữ liệu tưởng là đã lưu. Ví dụ cụ thể: giá đổi từ 100.000 thành 120.000 trong database nhưng cache-aside không invalidate (xóa cache cũ) thì trang vẫn hiện 100.000; còn write-behind mà máy chủ sập trước khi flush (đẩy dữ liệu xuống database) thì dữ liệu người dùng vừa lưu biến mất dù màn hình đã báo thành công.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Cache > Chiến lược ghi cache, kề bên Redis, database chính, application cache, và cơ chế invalidate khi dữ liệu đổi",
      "connects": [
        {
          "t": "Vì cache-aside chỉ đúng khi có TTL và invalidate đi kèm, nên chọn chiến lược ghi mà không chọn kèm TTL và eviction thì cache vẫn phình vô hạn hoặc giữ dữ liệu cũ mãi, và chiến lược đúng một nửa vẫn thành sai.",
          "day": 12
        },
        {
          "t": "Vì cache stampede xảy ra đúng lúc một mục hot hết hạn và mọi request cùng đổ về database, nên chiến lược ghi cache quyết định stampede nặng hay nhẹ: write-through làm mới cache ngay khi ghi nên ít bị hết hạn đồng loạt hơn cache-aside chỉ làm mới khi có người đọc.",
          "day": 12
        },
        {
          "t": "Vì cache nhiều tầng từ trình duyệt tới CDN, gateway, application rồi Redis và database đều phải invalidate, nên một chiến lược ghi đúng ở tầng Redis vẫn chưa đủ nếu tầng CDN hay trình duyệt còn giữ bản cũ.",
          "day": 24
        },
        {
          "t": "Vì tốc độ đọc và độ đúng của dữ liệu luôn đánh đổi nhau, nên toàn bộ hệ thống phải chọn chiến lược theo từng loại dữ liệu: dữ liệu đổi chậm thì ưu tiên tốc độ, dữ liệu tiền và tồn kho thì ưu tiên độ đúng dù đọc chậm hơn."
        }
      ],
      "shape": "compare",
      "difficulty": 2,
      "dontUse": "Không dùng write-behind cho dữ liệu không được phép mất như đơn hàng đã thanh toán hay số dư ví, vì crash trước khi flush là mất dữ liệu thật dù người dùng đã thấy báo thành công.",
      "quiz": {
        "q": "Hệ thống dùng write-behind cho cache tồn kho. Máy chủ cache sập lúc 14:00, trước khi flush đợt ghi 13:55-14:00 xuống database. Người dùng đã thấy màn hình báo đặt hàng thành công. Điều gì xảy ra?",
        "answer": "Đợt ghi 13:55-14:00 có thể mất hẳn, database không biết những đơn đó đã trừ kho, dù người dùng đã thấy thành công.",
        "why": "Write-behind trả kết quả trước khi database ghi xong, nên khoảng giữa ghi cache và flush là cửa sổ mất dữ liệu; với dữ liệu không được phép mất thì phải dùng write-through hoặc ghi database trước."
      }
    },
    {
      "what": "TTL (time-to-live, thời gian sống) là hạn dùng của một mục cache: hết TTL thì lần đọc sau phải lấy lại từ nguồn thật. Eviction là chính sách đuổi mục ra khỏi cache khi cache đầy, phổ biến nhất là LRU (least recently used, đuổi mục ít dùng nhất gần đây). Hai cơ chế này là hai loại giới hạn khác nhau: TTL giới hạn theo thời gian, eviction giới hạn theo dung lượng.",
      "role": "Thiếu TTL thì dữ liệu cũ tồn tại mãi: sửa giá trong database nhưng trang vẫn hiện giá cũ cả ngày. Thiếu giới hạn dung lượng thì cache phình thành rò rỉ bộ nhớ: cứ thêm mục mới mà không đuổi mục cũ, cuối cùng máy chủ cache hết bộ nhớ. Hai lỗi này đều im lặng vì cache vẫn trả kết quả nhanh, chỉ là kết quả sai hoặc máy chủ càng ngày càng nặng.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Cache > Redis (in-memory), kề bên database chính (SQL/MongoDB), application cache (Caffeine), CDN, và cơ chế invalidate",
      "connects": [
        {
          "t": "Vì chiến lược ghi cache chỉ nói ai ghi, còn TTL và eviction mới nói mục cache sống bao lâu và khi nào bị đuổi, nên chọn cache-aside hay write-through mà không đặt TTL thì dữ liệu cũ vẫn tồn tại mãi bất kể chiến lược nào.",
          "day": 12
        },
        {
          "t": "Vì cache penetration là trường hợp key không tồn tại cứ xuyên qua cache, nên TTL ngắn cho kết quả rỗng chính là cách biến một key không tồn tại thành một mục cache có hạn dùng, thay vì để nó trượt mãi.",
          "day": 12
        },
        {
          "t": "Vì spec giới hạn tài nguyên ngày 1 bắt mọi cache phải có số mục tối đa, TTL và metric theo dõi, nên TTL và eviction ở đây không phải tùy chọn trang trí mà là phần bắt buộc của spec đó, thiếu là coi như chưa thiết kế xong.",
          "day": 1
        },
        {
          "t": "Vì bộ nhớ của cache tăng không giới hạn sẽ kéo cả máy chủ xuống, nên bộ nhớ và độ ổn định của toàn bộ hệ thống phụ thuộc trực tiếp vào việc TTL và eviction có được đặt và đo bằng metric hay không."
        }
      ],
      "shape": "trace",
      "difficulty": 1,
      "thresholds": "Ví dụ cụ thể từ gói vật liệu: danh sách sản phẩm TTL 10 phút, tối đa 10.000 mục, evict LRU khi đầy; tồn kho đổi liên tục thì TTL chỉ 30-60 giây, hoặc tách cache giá và tồn kho ra riêng với TTL khác nhau. TTL phải chọn theo tốc độ đổi của từng loại dữ liệu, không dùng một TTL chung cho mọi thứ.",
      "dontUse": "Không dùng TTL dài cho dữ liệu đổi liên tục như tồn kho hay trạng thái hết hàng, và không để cache không giới hạn số mục với lý do bộ nhớ còn nhiều, vì bộ nhớ còn nhiều hôm nay không ngăn được leak ngày mai.",
      "quiz": {
        "q": "Giá sản phẩm đổi 2 lần/ngày, tồn kho đổi mỗi khi có đơn. Cache đang dùng chung một key chứa cả giá và tồn kho, TTL 10 phút. Vấn đề là gì và sửa ra sao?",
        "answer": "Tồn kho sẽ sai tối đa 10 phút sau mỗi đơn, vì key chung bị khóa theo TTL của giá; sửa bằng cách tách cache giá (TTL dài) và tồn kho (TTL 30-60 giây) hoặc invalidate key ngay khi tồn kho đổi.",
        "why": "TTL phải theo tốc độ đổi của từng loại dữ liệu; gộp hai tốc độ đổi khác nhau vào một key thì loại đổi nhanh bị ép theo TTL của loại đổi chậm."
      }
    },
    {
      "what": "Cache stampede là hiện tượng một mục cache hot (được đọc rất nhiều) hết hạn, và ngay khoảnh khắc đó hàng loạt request đang chờ đều trượt cache cùng lúc rồi cùng đổ về database. Trước khi hết hạn, database gần như rảnh vì mọi request đều đọc cache; sau khi hết hạn, database nhận một đợt truy vấn dồn dập dù lượng truy cập thật không tăng.",
      "role": "Đợt dồn dập này có thể làm database chậm hoặc sập, rồi lan sang các tính năng khác dùng chung database. Dấu hiệu nhận biết rất đặc trưng: database đột nhiên quá tải đúng chu kỳ hết hạn của cache, ví dụ cứ mỗi 10 phút lại quá tải một lần, rồi tự hết khi cache được làm mới, và lặp lại đúng chu kỳ sau đó.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Cache > Làm mới cache hot, kề bên Redis, database chính, hàng đợi request đang chờ cache mới, và cơ chế làm mới sớm trước khi hết hạn",
      "connects": [
        {
          "t": "Vì stampede bắt đầu từ một TTL chung cho mọi key, nên TTL và eviction chính là nơi gây ra nó: đặt cùng một TTL cho mọi key hot thì mọi key sẽ hết hạn cùng nhau, và sửa TTL là bước đầu tiên để phá chu kỳ đó.",
          "day": 12
        },
        {
          "t": "Vì chiến lược ghi cache quyết định cache được làm mới khi nào, nên cache-aside chỉ làm mới khi có người đọc sẽ dễ stampede hơn write-through làm mới ngay khi ghi, và chọn chiến lược cũng là chọn mức độ phơi nhiễm với stampede.",
          "day": 12
        },
        {
          "t": "Vì một đợt stampede có thể làm database chậm tới mức request timeout hàng loạt, nên timeout và circuit breaker ở tầng resilience là hàng rào chặn đợt sóng đó lan thành sập dây chuyền sang các service khác.",
          "day": 18
        },
        {
          "t": "Vì stampede là một dạng tải đột biến do chính hệ thống tự tạo ra chứ không phải do người dùng tăng đột biến, nên khả năng chịu tải đột biến của toàn bộ hệ thống phải tính cả tải nội sinh này, không chỉ tính traffic từ bên ngoài."
        }
      ],
      "shape": "incident",
      "difficulty": 2,
      "thresholds": "Ví dụ: 1.000 request cùng đổ về database khi một key hot hết hạn. Cách giảm: jitter (lệch ngẫu nhiên) TTL, ví dụ TTL gốc 10 phút cộng thêm lệch ngẫu nhiên vài chục giây cho mỗi key để chúng không hết hạn cùng lúc; hoặc lock để chỉ một request làm mới cache, các request khác chờ; hoặc làm mới sớm trước khi hết hạn.",
      "dontUse": "Không dùng cách chữa là tăng connection pool của database để hứng stampede, vì đó chỉ dời điểm sập từ database sang bộ nhớ hoặc sang tầng khác, và không phá được chu kỳ hết hạn đồng loạt.",
      "quiz": {
        "q": "Database cứ mỗi đúng 10 phút lại quá tải vài giây rồi tự hết, traffic không tăng. Cache danh sách sản phẩm có TTL đúng 10 phút cho mọi key. Chẩn đoán và cách sửa là gì?",
        "answer": "Cache stampede: mọi key hết hạn cùng lúc mỗi 10 phút. Sửa bằng jitter TTL cho mỗi key lệch nhau, hoặc lock chỉ một request làm mới, hoặc làm mới sớm.",
        "why": "Chu kỳ quá tải trùng khớp chu kỳ TTL là dấu hiệu của hết hạn đồng loạt, không phải traffic thật; tăng pool database không phá được chu kỳ đó."
      }
    },
    {
      "what": "Cache penetration là hiện tượng request hỏi một key không tồn tại, ví dụ productId bịa hoặc id đã xóa, cứ xuyên qua cache xuống database lần nào cũng vậy. Vì key không có dữ liệu nên cache không có gì để giữ, lần sau lại trượt tiếp, và cache coi như vô dụng với đúng loại request đó.",
      "role": "Nguy hiểm ở chỗ kẻ xấu hoặc crawler có thể quét hàng loạt id không tồn tại để làm database quá tải mà cache không chặn được gì, trong khi tỉ lệ hit của cache vẫn thấp bất thường. Database phải trả lời câu không có dữ liệu, lần nào cũng quét, dù đáp án luôn là không.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Cache > Bảo vệ database khỏi key không tồn tại, kề bên Redis, database chính, lớp kiểm tra tính hợp lệ của id, và cơ chế cache kết quả rỗng",
      "connects": [
        {
          "t": "Vì cache-aside và write-through đều chỉ cache được dữ liệu tồn tại, nên penetration là lỗ hổng chung của mọi chiến lược ghi: chiến lược nào cũng cần thêm biện pháp riêng cho key không tồn tại, nếu không database vẫn bị quét.",
          "day": 12
        },
        {
          "t": "Vì TTL là hạn dùng của một mục cache, nên cache kết quả rỗng với TTL ngắn chính là cách dùng TTL để chặn penetration: lần sau hỏi cùng key không tồn tại sẽ hit cache rỗng thay vì xuống database.",
          "day": 12
        },
        {
          "t": "Vì rate limiter giới hạn tốc độ request theo client, nên khi penetration đến từ một nguồn quét hàng loạt, rate limiter là lớp chặn ngoài cùng trước khi database phải trả lời từng id bịa.",
          "day": 18
        },
        {
          "t": "Vì một đợt quét id không tồn tại có thể làm database quá tải giống như một đợt tấn công, nên an toàn và độ ổn định của toàn bộ hệ thống trước lưu lượng xấu phụ thuộc vào việc có chặn penetration ở tầng cache hay không."
        }
      ],
      "shape": "incident",
      "difficulty": 2,
      "thresholds": "Cache kết quả rỗng với TTL ngắn, ví dụ 30-60 giây, đủ để chặn đợt quét lặp lại cùng id mà không giữ đáp án rỗng quá lâu nếu dữ liệu thật xuất hiện sau đó. Biện pháp mạnh hơn là bloom filter, một cấu trúc xác suất nhỏ gọn cho biết một key chắc chắn không tồn tại hay có thể tồn tại, để chặn key chắc chắn không tồn tại ngay ở tầng cache.",
      "dontUse": "Không dùng cache kết quả rỗng với TTL dài cho dữ liệu có thể xuất hiện sau đó, vì người dùng tạo mới sản phẩm xong sẽ vẫn nhận đáp án không tồn tại cho tới khi TTL hết.",
      "quiz": {
        "q": "Log cho thấy 10.000 query trong một phút đều hỏi các productId ngẫu nhiên không tồn tại, cache hit rate tụt thấp, database quá tải. Biện pháp đầu tiên nên làm là gì?",
        "answer": "Cache kết quả rỗng với TTL ngắn cho các key không tồn tại, kèm kiểm tra tính hợp lệ của id trước khi xuống database.",
        "why": "Đây là penetration: key không tồn tại không có gì để cache theo cách thông thường, nên phải cache chính đáp án rỗng có hạn dùng, nếu không mỗi request lặp lại đều quét database."
      }
    }
  ],
  "13":   [
    {
      "what": "Transaction isolation là mức độ một transaction được cách ly khỏi các transaction chạy cùng lúc. Ba mức cần nhớ: Read Committed (chỉ đọc dữ liệu đã commit, nhưng đọc lại hai lần trong cùng transaction có thể thấy khác nhau), Repeatable Read (đọc lại trong cùng transaction thấy giống nhau), Serializable (chạy như thể các transaction xếp hàng tuần tự, an toàn nhất nhưng chậm nhất và dễ lỗi). Mức càng cao càng giống chạy tuần tự, đổi lấy tốc độ chậm hơn và dễ deadlock hơn.",
      "role": "Chọn mức quá thấp cho nghiệp vụ tiền bạc thì báo cáo chạy hai lần trong cùng một transaction có thể ra hai con số khác nhau, vì transaction khác commit xen giữa hai lần đọc. Chọn mức quá cao cho mọi thứ thì hệ thống chậm và deadlock vô cớ. Điểm khó là lỗi chỉ lộ khi có nhiều request cùng lúc, còn test một mình thì luôn đúng.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Transaction > Mức isolation, kề bên transaction boundary ở service, cơ chế lock, bảng số dư và tồn kho, và query báo cáo",
      "connects": [
        {
          "t": "Vì lost update là hậu quả cụ thể khi hai transaction cùng sửa một giá trị mà không được cách ly đủ, nên chọn mức isolation mà không hiểu lost update thì chỉ là chọn một cái tên, còn tiền và tồn kho vẫn lệch đúng lúc đông người dùng.",
          "day": 13
        },
        {
          "t": "Vì optimistic lock kiểm tra version ở phút cuối thay vì khóa dòng từ đầu, nên nó là biện pháp bù cho mức isolation thấp: isolation không ngăn được lost update thì version sẽ ngăn ở lúc ghi, và hai cơ chế này phải thiết kế cùng nhau.",
          "day": 13
        },
        {
          "t": "Vì transaction boundary ở service quyết định một transaction bao phủ những bước nào, nên mức isolation chỉ có ý nghĩa trong đúng ranh giới đó: boundary sai thì isolation cao cũng không bảo vệ được các bước nằm ngoài transaction.",
          "day": 9
        },
        {
          "t": "Vì tiền và tồn kho là nơi sai một đồng cũng phải đối soát, nên tính đúng đắn của tiền và tồn kho trong toàn bộ hệ thống phụ thuộc vào việc chọn isolation theo từng nghiệp vụ, chứ không phải chọn một mức chung cho mọi bảng."
        }
      ],
      "shape": "compare",
      "difficulty": 3,
      "thresholds": "Không có một mức mặc định chung cho mọi database: mức mặc định của từng hệ quản trị phải kiểm chứng theo tài liệu của hệ đó trước khi thiết kế, và báo cáo tiền thì nên dùng ít nhất Repeatable Read thay vì Read Committed.",
      "dontUse": "Không dùng Serializable cho mọi transaction với lý do cho chắc, vì nó biến hệ thống thành chạy tuần tự, dễ lỗi serialization và deadlock, và làm chậm cả những nghiệp vụ không cần độ an toàn đó.",
      "quiz": {
        "q": "Một báo cáo tổng tiền chạy hai lần SELECT SUM trong cùng một transaction, giữa hai lần đó có transaction khác commit thêm một đơn mới. Ở Read Committed, hai lần đọc cho kết quả ra sao? Ở Repeatable Read thì sao?",
        "answer": "Read Committed: hai lần có thể khác nhau, lần sau cao hơn vì thấy đơn mới đã commit. Repeatable Read: hai lần giống nhau.",
        "why": "Read Committed chỉ cấm đọc dữ liệu chưa commit, không cấm đọc lại thấy dữ liệu mới đã commit xen giữa; Repeatable Read giữ ảnh chụp nhất quán trong transaction nên đọc lại không đổi."
      }
    },
    {
      "what": "Lost update là hiện tượng hai request cùng đọc một giá trị, cùng sửa rồi cùng ghi đè lên nhau, làm mất một lần sửa. Chuỗi đọc-sửa-ghi không nguyên tử: lần ghi sau xóa dấu vết của lần ghi trước, dù mỗi request nhìn riêng đều tính đúng.",
      "role": "Ví dụ chạy được trong đầu: số dư 100, hai request cùng đọc 100, cùng trừ 30, cùng ghi 70. Kết quả đúng phải là 40, nhưng cuối cùng là 70, lệch đúng bằng một lần trừ. Với tồn kho thì hậu quả là bán quá số lượng thật, và log tính toán của từng request nhìn riêng đều đúng nên rất khó truy vết.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Transaction > Xung đột ghi đồng thời, kề bên bảng số dư ví, bảng tồn kho, cơ chế lock, và transaction isolation",
      "connects": [
        {
          "t": "Vì transaction isolation quyết định các transaction đồng thời nhìn thấy nhau ra sao, nên lost update là bài kiểm tra thực tế của mức isolation: mức nào không ngăn được chuỗi đọc-sửa-ghi chen ngang thì mức đó chưa đủ cho nghiệp vụ tiền.",
          "day": 13
        },
        {
          "t": "Vì pessimistic lock khóa dòng ngay từ lúc đọc nên nó chặn lost update bằng cách không cho request thứ hai đọc cùng lúc, và đó là lý do lock bi quan được chọn cho điểm nóng dù nó làm request phải chờ.",
          "day": 13
        },
        {
          "t": "Vì race condition ở tầng ứng dụng cũng là chuỗi đọc-sửa-ghi không nguyên tử nhưng xảy ra trong bộ nhớ thay vì trong database, nên lost update và race condition là cùng một lỗi ở hai tầng khác nhau, và sửa một tầng không tự sửa tầng còn lại.",
          "day": 15
        },
        {
          "t": "Vì tiền bị trừ thiếu hay tồn kho bị bán quá đều thành tranh chấp và đối soát sau đó, nên tính toàn vẹn của tiền và hàng hóa trong toàn bộ hệ thống đứng hay sụp ở việc có chặn được lost update hay không."
        }
      ],
      "shape": "trace",
      "difficulty": 1,
      "thresholds": "Ví dụ kiểm chứng: tồn kho 10, hai request cùng mua 8 cái, không có lock thì cả hai đều đọc 10 và đều cho qua, bán quá tồn kho. Cách chặn không cần lock dài là UPDATE có điều kiện dạng WHERE stock >= 8, chỉ trừ khi còn đủ hàng.",
      "dontUse": "Không dùng cách đọc rồi cộng trừ ở code ứng dụng rồi ghi lại cho dữ liệu tiền và tồn kho, vì đó chính là chuỗi đọc-sửa-ghi tạo ra lost update; và không dùng synchronized trong một instance để chặn nó khi hệ thống có nhiều instance.",
      "quiz": {
        "q": "Số dư 100. Hai request cùng lúc, mỗi request trừ 30 bằng cách đọc số dư, trừ ở code, rồi ghi lại. Kết quả cuối cùng trong database là bao nhiêu, và đúng ra phải là bao nhiêu?",
        "answer": "Cuối cùng là 70, đúng ra phải là 40.",
        "why": "Cả hai cùng đọc 100 trước khi bên nào ghi, nên cả hai cùng tính ra 70 và ghi đè nhau, mất một lần trừ 30. Muốn đúng phải ghi có điều kiện hoặc khóa dòng."
      }
    },
    {
      "what": "Optimistic lock bằng version là cách ghi có điều kiện: mỗi dòng có một cột version, lúc đọc kèm version hiện tại, lúc ghi thêm điều kiện WHERE version = version đã đọc, và chỉ ghi thành công khi version chưa đổi. Nếu version đã đổi nghĩa là có người khác sửa trước, lần ghi này thất bại và người dùng được báo xung đột để thử lại với dữ liệu mới.",
      "role": "Cách này không khóa dòng trong lúc chờ, nên hợp khi xung đột hiếm như sửa hồ sơ hay sửa mô tả sản phẩm, nơi hai người cùng sửa một dòng là chuyện hiếm. Dùng nó cho điểm nóng như vé hot hay tồn kho hot thì xung đột xảy ra liên tục, người dùng thử lại hoài không xong và tỉ lệ báo xung đột tăng cao đúng giờ cao điểm.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Transaction > Lock lạc quan, kề bên cột version của bảng, transaction isolation, cơ chế retry có kiểm soát, và thông báo xung đột cho người dùng",
      "connects": [
        {
          "t": "Vì lost update sinh ra từ lần ghi sau xóa dấu vết của lần ghi trước, nên optimistic lock chặn đúng điểm đó: ghi có điều kiện version khiến lần ghi sau thất bại thay vì âm thầm ghi đè, và thất bại rõ ràng thì tốt hơn thành công sai.",
          "day": 13
        },
        {
          "t": "Vì transaction isolation chỉ quyết định các transaction nhìn thấy nhau ra sao chứ không tự chặn ghi đè, nên optimistic lock là lớp bảo vệ thứ hai cho những nghiệp vụ mà isolation thấp chưa đủ, và hai cơ chế này bổ sung chứ không thay thế nhau.",
          "day": 13
        },
        {
          "t": "Vì retry chỉ an toàn khi thao tác có thể lặp lại mà không nhân đôi hậu quả, nên khi optimistic lock báo xung đột và người dùng thử lại, lần thử lại phải đọc lại version mới rồi mới ghi, chứ không gửi lại đúng câu ghi cũ vì câu cũ sẽ lại thất bại hoặc tệ hơn là ghi sai.",
          "day": 18
        },
        {
          "t": "Vì người dùng phải hiểu vì sao lần sửa của mình bị từ chối và phải làm gì tiếp theo, nên trải nghiệm khi sửa cùng một dữ liệu trong toàn bộ sản phẩm phụ thuộc vào thông báo xung đột rõ ràng, không phải một lỗi chung chung."
        }
      ],
      "shape": "decision",
      "difficulty": 2,
      "thresholds": "Dùng optimistic lock khi tỉ lệ xung đột thấp, ví dụ dưới vài phần trăm số lần ghi; khi xung đột trở nên thường xuyên ở một mặt hàng hot thì đó là tín hiệu phải chuyển sang pessimistic lock hoặc ghi có điều kiện theo số lượng.",
      "dontUse": "Không dùng optimistic lock cho điểm nóng xung đột thường xuyên như trừ tồn kho flash sale hay giữ ghế hot, và không retry vô hạn khi xung đột mà không giới hạn số lần và không báo cho người dùng.",
      "quiz": {
        "q": "Hồ sơ user có version = 3. Hai người cùng mở hồ sơ, cùng sửa, người thứ nhất lưu thành công, version thành 4. Người thứ hai bấm lưu với version 3. Điều gì xảy ra và vì sao?",
        "answer": "Lần ghi thứ hai thất bại vì điều kiện WHERE version = 3 không còn khớp, người thứ hai được báo xung đột và phải tải lại rồi sửa lại.",
        "why": "Ghi có điều kiện version chỉ thành công khi version chưa đổi; version đã thành 4 chứng tỏ dữ liệu đã bị sửa sau lúc người thứ hai đọc, nên ghi đè sẽ gây lost update."
      }
    },
    {
      "what": "Pessimistic lock là cách khóa dòng ngay từ lúc đọc, bằng câu lệnh kiểu SELECT ... FOR UPDATE, để transaction khác muốn chạm vào dòng đó phải chờ. Deadlock là trạng thái hai transaction khóa ngược thứ tự và chờ nhau thành vòng tròn: transaction 1 giữ khóa A chờ khóa B, transaction 2 giữ khóa B chờ khóa A, không bên nào tiến triển được, và database sẽ giết một transaction để phá vòng chờ, bên còn lại mới chạy tiếp.",
      "role": "Khóa bi quan hợp khi xung đột thường xuyên như trừ tiền ví hay giữ ghế, vì nó chặn chen ngang ngay từ đầu. Nhưng giữ lock quá lâu, ví dụ giữ suốt lúc gọi API bên ngoài, thì hàng đợi kéo dài; còn khóa không theo một thứ tự cố định thì deadlock lặp lại đúng lúc nhiều người cùng mua một mặt hàng.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Transaction > Lock bi quan, kề bên câu lệnh khóa dòng khi đọc, bảng tồn kho và số dư, thứ tự khóa thống nhất, và cơ chế retry có giới hạn",
      "connects": [
        {
          "t": "Vì optimistic lock chỉ kiểm tra ở phút cuối và thất bại khi xung đột, nên khi xung đột là chuyện thường xuyên thì pessimistic lock rẻ hơn: trả giá bằng thời gian chờ để đổi lấy chắc chắn không phải thử lại hoài, và chọn sai hướng này là chọn sai đánh đổi.",
          "day": 13
        },
        {
          "t": "Vì lost update là hậu quả của việc không khóa mà vẫn đọc-sửa-ghi, nên pessimistic lock chặn đúng gốc của nó bằng cách biến chuỗi đọc-sửa-ghi thành một đoạn không ai chen ngang được, thay vì để hai request cùng đọc rồi cùng ghi.",
          "day": 13
        },
        {
          "t": "Vì saga điều phối nhiều bước qua nhiều service mà không có một database chung để khóa, nên khi lock một database không còn đủ, saga với hành động bù mới là cách thay thế: khóa chỉ bảo vệ được trong một database, còn liên service thì phải bù.",
          "day": 17
        },
        {
          "t": "Vì một giao dịch sai do chen ngang hay một giao dịch kẹt do deadlock đều làm người dùng mất tiền hoặc mất chỗ, nên tính đúng đắn của giao dịch trong toàn bộ hệ thống phụ thuộc vào việc giữ lock ngắn, khóa theo một thứ tự, và retry có giới hạn khi bị giết vì deadlock."
        }
      ],
      "shape": "trace",
      "difficulty": 2,
      "thresholds": "Giữ lock càng ngắn càng tốt: chỉ khóa trong lúc đọc và ghi trong cùng transaction, tuyệt đối không giữ lock trong lúc gọi API bên ngoài hay chờ người dùng. Khi bị database giết vì deadlock, retry có giới hạn, ví dụ tối đa 2-3 lần, và mỗi lần retry phải bắt đầu lại transaction từ đầu.",
      "dontUse": "Không dùng pessimistic lock cho dữ liệu xung đột hiếm như sửa hồ sơ, vì chờ khóa là chi phí vô ích; và không khóa các dòng theo thứ tự khác nhau ở các luồng khác nhau, vì đó là cách tạo deadlock lặp lại.",
      "quiz": {
        "q": "Transaction 1 khóa dòng A rồi muốn khóa dòng B. Transaction 2 khóa dòng B rồi muốn khóa dòng A. Cả hai đều đang chờ. Đây là hiện tượng gì, database làm gì, và code nên làm gì tiếp theo?",
        "answer": "Đây là deadlock. Database sẽ giết một transaction để phá vòng chờ. Code của transaction bị giết phải retry có giới hạn từ đầu transaction, không retry vô hạn.",
        "why": "Hai transaction chờ nhau thành vòng tròn nên không bên nào tự tiến triển được; chỉ có bên ngoài phá vòng bằng cách hủy một bên, và retry phải bắt đầu lại vì transaction bị hủy đã rollback."
      }
    }
  ],
  "14":   [
    {
      "what": "Chọn SQL, MongoDB hay kết hợp là quyết định gán mỗi phần dữ liệu cho loại database phù hợp với hình dạng và nhu cầu của nó, thay vì ép một loại cho tất cả. SQL hợp với dữ liệu cần transaction mạnh, ràng buộc và báo cáo join (kết nối nhiều bảng), như đơn hàng và thanh toán. MongoDB hợp với document linh hoạt đọc theo cụm, như giỏ hàng và catalog sản phẩm. Redis chỉ hợp với dữ liệu tạm, nhanh và mất được, như session, không phải database chính cho đơn hàng.",
      "role": "Ép một loại cho tất cả thì có phần phải bù bằng code phức tạp và dễ sai: báo cáo phải kéo hết dữ liệu về code để tính vì document không join tốt, hoặc luồng nhiều bước không có transaction tử tế vì dữ liệu bị tách nhỏ quá. Dấu hiệu là code ngày càng phình chỉ để bù cho lựa chọn database ban đầu.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Thiết kế tổng thể > Lựa chọn database, kề bên bảng đơn hàng và thanh toán ở SQL, document giỏ hàng và catalog ở MongoDB, Redis cho session, và tầng cache",
      "connects": [
        {
          "t": "Vì mỗi phần dữ liệu chọn database khác nhau thì luồng ghi nhiều bước sẽ đi qua nhiều database, nên quyết định chọn database buộc phải đi cùng quyết định transaction hay bù: chọn xong mà không trả lời được bước giữa lỗi thì sao là thiết kế chưa xong.",
          "day": 14
        },
        {
          "t": "Vì kiến thức mới về lock, cache và migration có thể làm thay đổi lựa chọn ban đầu, nên việc rà lại thiết kế tuần trước chính là lúc kiểm tra xem lựa chọn SQL hay MongoDB nào cần đổi sau khi đã học thêm, chứ không phải giữ nguyên vì đã chọn rồi.",
          "day": 14
        },
        {
          "t": "Vì embedding (nhúng dữ liệu con vào document cha) và referencing (tách dữ liệu con ra collection riêng) là cùng một lựa chọn ở dạng document, nên phần nào đã chọn MongoDB thì vẫn còn phải chọn tiếp nhúng hay tách, và chọn sai ở đây cũng gây hậu quả giống chọn sai database.",
          "day": 10
        },
        {
          "t": "Vì mỗi loại database đều có điểm mạnh riêng và không loại nào tốt nhất cho mọi hình dạng dữ liệu, nên kiến trúc dữ liệu của toàn bộ hệ thống chỉ vững khi mỗi phần được gán đúng loại, thay vì một loại gánh hết mọi phần."
        }
      ],
      "shape": "decision",
      "difficulty": 2,
      "thresholds": "Quy tắc chọn nhanh: cần ACID (tính nguyên tử, nhất quán, cô lập, bền vững) và join báo cáo thì chọn SQL; document linh hoạt, đọc theo cụm và thay đổi hình dạng thường xuyên thì chọn MongoDB; dữ liệu tạm, đọc nhanh và mất được thì chọn Redis. Một document MongoDB có giới hạn 16MB, nên mảng tăng vô hạn không được nhúng vào document.",
      "dontUse": "Không dùng Redis làm nơi duy nhất lưu đơn hàng hay thanh toán, vì dữ liệu tạm mất được không thể làm nguồn sự thật cho tiền; và không dùng MongoDB cho báo cáo cần join nhiều bảng phức tạp với lý do cho đồng nhất.",
      "quiz": {
        "q": "Hệ thống có ba phần: đơn hàng cần transaction và báo cáo doanh thu theo nhiều bảng, catalog sản phẩm thay đổi hình dạng thường xuyên và đọc theo cụm, session đăng nhập cần đọc nhanh và mất được. Gán database cho từng phần và nêu lý do.",
        "answer": "Đơn hàng: SQL vì cần transaction và join báo cáo. Catalog: MongoDB vì document linh hoạt và đọc theo cụm. Session: Redis vì tạm, nhanh, mất được.",
        "why": "Mỗi phần được gán theo nhu cầu thật của nó: ép cả ba vào một loại sẽ làm một phần phải bù bằng code phức tạp, đúng lỗi mà lựa chọn kết hợp sinh ra để tránh."
      }
    },
    {
      "what": "Transaction và cơ chế bù là hai cách đảm bảo luồng ghi nhiều bước không để lại trạng thái nửa vời. Transaction dùng được khi các bước cùng một database: lỗi ở bước cuối thì rollback (hủy) tất cả các bước trước. Cơ chế bù dùng khi các bước ở nhiều service khác nhau và không có transaction chung: bước sau lỗi thì chạy hành động bù cho các bước trước, ví dụ hoàn tiền, hủy đơn, cộng lại kho.",
      "role": "Không có transaction hay bù thì đơn kẹt ở trạng thái vừa trả tiền vừa không giao được mà không ai biết phải hoàn tiền cho ai. Ví dụ chạy được trong đầu: thanh toán thành công nhưng trừ kho thất bại, nếu không có bù thì đơn ở trạng thái đã thanh toán mà kho không trừ, và khách chờ giao hàng không bao giờ tới.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Luồng nhiều bước > Transaction và bù, kề bên service thanh toán, service kho, bảng đơn hàng, và trạng thái trung gian của đơn",
      "connects": [
        {
          "t": "Vì lựa chọn database quyết định các bước có cùng một database hay không, nên chọn SQL, MongoDB hay kết hợp chính là tiền đề của việc chọn transaction hay bù: cùng database thì dùng transaction, khác service thì bắt buộc phải bù.",
          "day": 14
        },
        {
          "t": "Vì rà lại thiết kế tuần trước là lúc kiểm tra xem luồng nhiều bước nào còn thiếu đáp án cho bước giữa lỗi, nên bất kỳ luồng nào ở ngày 14 mà không ghi rõ transaction hay bù đều là chỗ thiết kế cũ chưa được sửa, không phải chỗ mới.",
          "day": 14
        },
        {
          "t": "Vì saga là tên gọi của cơ chế bù khi luồng đi qua nhiều service, nên transaction và bù ở checkpoint này chính là nền tảng để hiểu saga: saga không phải khái niệm mới tách rời mà là cách tổ chức các hành động bù thành một luồng có thứ tự.",
          "day": 17
        },
        {
          "t": "Vì đơn hàng là nơi người dùng nhìn thấy hậu quả trực tiếp nhất, nên tính nhất quán của đơn hàng trong toàn bộ hệ thống phụ thuộc vào việc mọi luồng nhiều bước đều có trạng thái trung gian rõ ràng và người chịu trách nhiệm xử lý trạng thái đó."
        }
      ],
      "shape": "decision",
      "difficulty": 2,
      "thresholds": "Mọi luồng ghi từ hai bước trở lên đều phải ghi rõ: dùng transaction nếu cùng database, dùng bù nếu khác service, và ghi rõ trạng thái trung gian của đơn trong lúc chờ bù, ví dụ PENDING_COMPENSATION, để không ai nhầm đơn đang chờ bù với đơn đã hoàn tất.",
      "dontUse": "Không dùng cách gọi API bên ngoài trong cùng transaction database rồi hy vọng cả hai cùng thành công, vì transaction database không rollback được cuộc gọi API đã gửi đi; và không thiết kế bước bù cho bước không bù được mà không ghi rõ ai xử lý tay và trong bao lâu.",
      "quiz": {
        "q": "Luồng đặt hàng: trừ tiền ví thành công, trừ kho thất bại, hai bước ở hai service khác nhau. Đơn nên ở trạng thái gì và bước tiếp theo là gì?",
        "answer": "Đơn không được ở trạng thái đã thanh toán hoàn tất; phải chuyển sang trạng thái chờ bù, chạy hành động bù là hoàn tiền, rồi chuyển đơn về đã hủy và thông báo cho người dùng.",
        "why": "Khác service thì không có transaction chung để rollback, nên chỉ có bù mới đưa hệ thống về trạng thái nhất quán; để đơn ở đã thanh toán mà kho không trừ là trạng thái nửa vời không ai sửa được."
      }
    },
    {
      "what": "So sánh với thiết kế tuần trước là bước rà lại thiết kế ngày 11 sau khi đã học thêm cache, lock và migration, rồi ghi rõ chỗ nào đã sửa và vì sao sửa. Đây không phải chép lại thiết kế cũ cho đẹp hơn mà là kiểm tra xem kiến thức mới có làm thay đổi quyết định cũ không, và quyết định cũ nào đã sai dưới ánh sáng của ràng buộc mới.",
      "role": "Bỏ qua bước này thì checkpoint chỉ là bản sao của thiết kế cũ, và các quyết định sai về lock hay cache vẫn nằm nguyên trong bản vẽ dù người thiết kế đã học cách sửa chúng. Dấu hiệu dễ nhận nhất: thiết kế ngày 14 giống hệt ngày 11 dù ở giữa đã học thêm cả tuần về cache và lock.",
      "map": "Hệ thống đặt hàng > Tầng thiết kế > Checkpoint tuần dữ liệu > Rà soát thiết kế, kề bên persistence contract ngày 11, thiết kế cache ngày 12, quyết định lock ngày 13, và thiết kế dữ liệu ngày 14",
      "connects": [
        {
          "t": "Vì lựa chọn database là quyết định đầu tiên của thiết kế, nên rà soát phải bắt đầu từ đó: sau khi học lock và cache, có phần dữ liệu nào cần đổi database hay đổi cách nhúng và tách không, và nếu không đổi thì lý do giữ nguyên là gì.",
          "day": 14
        },
        {
          "t": "Vì transaction và bù là đáp án cho bước giữa lỗi, nên rà soát phải kiểm tra từng luồng nhiều bước trong thiết kế cũ xem đã có transaction hay bù chưa, và luồng nào ở ngày 11 còn thiếu thì ngày 14 phải bổ sung.",
          "day": 14
        },
        {
          "t": "Vì persistence contract ngày 11 chỉ ghi dữ liệu sống ở đâu, nên rà soát ngày 14 phải đối chiếu từng contract đó với lock ngày 13 và cache ngày 12: contract nào chưa ghi lock cho trừ kho hay TTL cho giá thì vẫn là contract chưa hoàn chỉnh.",
          "day": 11
        },
        {
          "t": "Vì chất lượng thiết kế của toàn bộ dự án không đo bằng độ đẹp của bản vẽ mà đo bằng số quyết định sai đã được sửa sau khi học thêm, nên một checkpoint không ghi rõ chỗ nào đã sửa là một checkpoint chưa làm đúng vai trò của nó."
        }
      ],
      "shape": "decision",
      "difficulty": 1,
      "dontUse": "Không dùng bước rà soát để chép lại thiết kế cũ bằng từ ngữ mới, và không dùng nó để sửa những chỗ không liên quan trong khi bỏ qua đúng ba chỗ bắt buộc phải kiểm tra: lock cho trừ kho, cache cho giá và tồn kho, migration cho thay đổi schema.",
      "quiz": {
        "q": "Thiết kế ngày 14 của một nhóm giống hệt thiết kế ngày 11, chỉ khác cách trình bày. Nhóm đó đã bỏ qua điều gì, và cần bổ sung ít nhất ba chỗ nào?",
        "answer": "Bỏ qua bước rà soát sau khi học thêm. Cần bổ sung: lock cho trừ kho và tiền, cache với TTL và invalidate cho giá và tồn kho, và migration chia bước cho thay đổi schema.",
        "why": "Mỗi ngày 11, 12, 13 đều thêm một ràng buộc mới vào thiết kế; thiết kế không đổi sau ba ràng buộc mới chứng tỏ chưa đối chiếu thiết kế cũ với kiến thức mới, đúng dấu hiệu của checkpoint chép lại."
      }
    }
  ],
  "15":   [
    {
      "what": "Race condition là lỗi mà kết quả phụ thuộc vào thứ tự chạy của các thread, trong khi thứ tự đó không được đảm bảo. Deadlock là trạng thái các thread giữ lock và chờ lock của nhau thành vòng tròn nên không ai tiến triển được. Điểm chung nguy hiểm nhất: cả hai chỉ lộ khi có đồng thời, nên test chạy một lần thường vẫn pass và code nhìn qua vẫn đúng.",
      "role": "Ví dụ chạy được trong đầu: hai thread cùng tăng một biến đếm từ 5, mỗi thread đọc 5, cộng 1, ghi 6, kết quả cuối là 6 thay vì 7, mất một lần tăng. Còn deadlock thì ứng dụng kẹt không tiến triển dù CPU vẫn thấp, vì các thread không phải đang tính toán mà đang chờ nhau, và không có request nào báo lỗi rõ ràng.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đồng thời > Race và deadlock, kề bên biến đếm dùng chung, cache dùng chung, thứ tự khóa, và thread pool",
      "connects": [
        {
          "t": "Vì thread-safe collection đưa tính nguyên tử vào trong cấu trúc dữ liệu, nên nó là đáp án trực tiếp cho race condition ở mức biến đếm và cache dùng chung: thay vì trông chờ mọi nơi khóa đúng, cấu trúc tự bảo vệ mình.",
          "day": 15
        },
        {
          "t": "Vì thread pool giới hạn số thread và hàng đợi, nên nó liên quan tới race và deadlock ở chỗ pool cạn hay deadlock đều làm request kẹt, nhưng pool chỉ giới hạn tài nguyên chứ không sửa được thứ tự chạy sai, và nhầm hai việc này sẽ chữa sai bệnh.",
          "day": 15
        },
        {
          "t": "Vì lost update ở tầng database cũng là chuỗi đọc-sửa-ghi không nguyên tử, nên race condition ở tầng ứng dụng và lost update là cùng một lỗi ở hai tầng: sửa database bằng lock mà không sửa biến dùng chung trong bộ nhớ thì lỗi vẫn còn ở tầng ứng dụng.",
          "day": 13
        },
        {
          "t": "Vì lỗi chỉ lộ lúc đông người dùng và không tái hiện đều, nên độ tin cậy của toàn bộ hệ thống lúc đông người dùng phụ thuộc vào việc phát hiện race và deadlock bằng test nhiều thread và review, chứ không phải bằng test một lần pass."
        }
      ],
      "shape": "incident",
      "difficulty": 2,
      "thresholds": "Test chứng minh race: 100 thread, mỗi thread tăng biến đếm 1.000 lần, kết quả kỳ vọng là 100.000; nếu kết quả thấp hơn và thay đổi theo mỗi lần chạy thì đó là race, không phải lỗi tính toán. Deadlock thì dấu hiệu là ứng dụng kẹt mà CPU thấp, khác với chậm do CPU cao.",
      "dontUse": "Không dùng test chạy một lần pass để kết luận code dùng chung là an toàn, và không dùng cách tăng thread hay tăng bộ nhớ để chữa race, vì race là lỗi thứ tự, không phải lỗi thiếu tài nguyên.",
      "quiz": {
        "q": "Đoạn code: class Counter { int n = 0; void inc() { n++; } }. Chạy 100 thread, mỗi thread gọi inc() 1.000 lần. Kết quả kỳ vọng là 100.000 nhưng thực tế thường thấp hơn và mỗi lần chạy khác nhau. Đây là lỗi gì và vì sao?",
        "answer": "Race condition: n++ là ba bước đọc, cộng, ghi không nguyên tử, nên hai thread cùng đọc một giá trị rồi cùng ghi sẽ mất một lần tăng.",
        "why": "Kết quả thấp hơn và không ổn định theo mỗi lần chạy là dấu hiệu của thứ tự chạy không đảm bảo, chứ không phải tính toán sai, vì tính toán sai sẽ sai ổn định."
      }
    },
    {
      "what": "Thread-safe collection là các cấu trúc dữ liệu được thiết kế để nhiều thread dùng chung mà không hỏng trạng thái nội bộ. Ví dụ: bộ đếm dùng AtomicInteger với phép tăng nguyên tử (một phép không thể bị chen ngang), thay vì đọc rồi cộng rồi ghi; cache dùng chung dùng ConcurrentHashMap (map dành cho đồng thời) thay vì HashMap thường; còn CopyOnWriteArrayList chỉ hợp khi đọc nhiều và ghi ít.",
      "role": "Dùng HashMap thường cho nhiều thread thì cấu trúc nội bộ có thể hỏng, mất entry không rõ lý do, hoặc rơi vào vòng lặp vô hạn lúc đông người dùng, trong khi test một thread không thấy gì. Điểm mấu chốt: tính nguyên tử được đưa vào trong cấu trúc, thay vì trông chờ code bên ngoài khóa đúng ở mọi chỗ.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đồng thời > Cấu trúc dữ liệu an toàn, kề bên biến đếm dùng chung, cache dùng chung, thread pool, và cơ chế khóa ngắn",
      "connects": [
        {
          "t": "Vì race condition là lỗi thứ tự chạy không đảm bảo, nên thread-safe collection là đáp án ở mức cấu trúc: nó làm cho từng phép tăng hay từng phép ghi trở nên nguyên tử, thay vì để hai thread chen ngang vào giữa phép đọc-sửa-ghi.",
          "day": 15
        },
        {
          "t": "Vì bất đồng bộ chỉ thay đổi thứ tự chạy chứ không tự sửa shared state (trạng thái dùng chung), nên dùng CompletableFuture hay Reactor mà vẫn ghi vào HashMap thường thì race vẫn còn nguyên, và thread-safe collection vẫn là thứ phải có bất kể chạy đồng bộ hay bất đồng bộ.",
          "day": 15
        },
        {
          "t": "Vì virtual thread không sửa được code giữ lock lâu hay dùng shared state không an toàn, nên đổi sang virtual thread mà vẫn dùng HashMap dùng chung thì chỉ làm lỗi xảy ra với nhiều thread hơn, chứ không làm code an toàn hơn.",
          "day": 1
        },
        {
          "t": "Vì cache và biến đếm dùng chung nằm khắp ứng dụng, nên tính đúng đắn của trạng thái dùng chung trong toàn bộ ứng dụng phụ thuộc vào việc chọn đúng cấu trúc ở từng chỗ, chứ không phải chỉ khóa đúng ở một chỗ."
        }
      ],
      "shape": "compare",
      "difficulty": 2,
      "thresholds": "Chọn theo mẫu truy cập: đếm thì AtomicInteger hoặc LongAdder khi tranh chấp rất cao; cache ghi đọc song song thì ConcurrentHashMap với computeIfAbsent để tránh hai thread cùng tạo một entry; danh sách đọc nhiều ghi ít thì CopyOnWriteArrayList, còn ghi nhiều thì không dùng nó vì mỗi lần ghi đều sao chép cả danh sách.",
      "dontUse": "Không dùng HashMap hay ArrayList thường cho trạng thái dùng chung giữa các thread với lý do chỉ có vài thread, và không dùng CopyOnWriteArrayList cho danh sách ghi nhiều vì chi phí sao chép sẽ nuốt hết lợi ích.",
      "quiz": {
        "q": "Hai đoạn code cache: A dùng HashMap với synchronized bao quanh đoạn kiểm tra rồi tạo entry; B dùng ConcurrentHashMap.computeIfAbsent. Đoạn A vẫn có thể tạo trùng entry không, và vì sao B an toàn hơn?",
        "answer": "A vẫn có thể sai nếu có chỗ nào quên khóa hoặc khóa không cùng một lock; B an toàn hơn vì phép kiểm tra và tạo được thực hiện nguyên tử bên trong cấu trúc, không phụ thuộc vào việc mọi nơi khóa đúng.",
        "why": "Đưa tính nguyên tử vào trong cấu trúc thì chỉ cần dùng đúng một phép, còn khóa tay thì mọi đường code chạm vào map đều phải khóa đúng cùng một lock, chỉ cần sót một chỗ là race quay lại."
      }
    },
    {
      "what": "Thread pool là một tập hợp thread có giới hạn, kèm hàng đợi có giới hạn và chính sách từ chối rõ ràng khi quá tải. Thay vì tạo thread mới cho mỗi request, hệ thống tái sử dụng thread trong pool, và khi pool và hàng đợi đều đầy thì từ chối có kiểm soát, ví dụ trả 503 kèm Retry-After, thay vì xếp hàng vô hạn.",
      "role": "Tạo thread không giới hạn thì ứng dụng chết vì hết bộ nhớ trước khi chết vì hết CPU, vì mỗi thread tốn stack và tài nguyên hệ điều hành. Còn hàng đợi không giới hạn thì request xếp hàng vô hạn tới khi timeout hàng loạt, người dùng chờ mãi rồi nhận lỗi cùng lúc. Pool có giới hạn biến chết không kiểm soát thành chậm lại có kiểm soát.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đồng thời > Thread pool, kề bên hàng đợi request, timeout của client, chính sách từ chối khi đầy, và cơ chế bulkhead chia pool theo dependency",
      "connects": [
        {
          "t": "Vì race condition và deadlock đều làm request kẹt, nên thread pool liên quan ở chỗ pool cạn cũng làm request kẹt, nhưng nguyên nhân khác hẳn: pool cạn là hết tài nguyên, deadlock là chờ nhau, và chẩn đoán sai nguyên nhân sẽ chữa sai, ví dụ tăng pool trong khi thật ra là deadlock.",
          "day": 15
        },
        {
          "t": "Vì thread-safe collection bảo vệ trạng thái dùng chung, nên pool và collection phải thiết kế cùng nhau: pool càng nhiều thread thì càng nhiều thread cùng chạm vào collection, và collection không an toàn sẽ hỏng nhanh hơn đúng lúc pool được tăng lên.",
          "day": 15
        },
        {
          "t": "Vì timeout giải phóng thread khi dependency chậm, nên pool chỉ phát huy tác dụng khi đi kèm timeout: không có timeout thì thread bị dependency chậm giữ mãi, pool đầy dần dù số request không tăng, và từ chối có kiểm soát cũng không cứu được.",
          "day": 18
        },
        {
          "t": "Vì giới hạn pool và hàng đợi quyết định hệ thống chịu được bao nhiêu request cùng lúc trước khi từ chối, nên khả năng chịu tải của toàn bộ hệ thống không đo bằng số thread tối đa có thể tạo, mà đo bằng hành vi khi vượt giới hạn đó."
        }
      ],
      "shape": "decision",
      "difficulty": 2,
      "thresholds": "Ví dụ từ gói vật liệu: pool 50 thread, hàng đợi 1.000, đầy thì trả 503 kèm Retry-After. Pool cho tác vụ chờ IO cần nhiều thread hơn pool cho tác vụ tính toán nặng, vì phần lớn thời gian của IO là chờ chứ không phải tính; pool CPU-bound thì số thread nên gần số lõi CPU.",
      "dontUse": "Không dùng thread pool không giới hạn hay hàng đợi không giới hạn với lý do không muốn từ chối người dùng, vì từ chối một phần rõ ràng tốt hơn để toàn bộ hệ thống chết vì hết bộ nhớ và không phục vụ được ai.",
      "quiz": {
        "q": "Service gọi API bên ngoài chậm 5 giây, pool 50 thread, hàng đợi không giới hạn. Traffic tăng đột biến lên 5.000 request cùng lúc. Điều gì xảy ra và sửa ra sao?",
        "answer": "Request xếp hàng vô hạn, chờ tới timeout hàng loạt, và bộ nhớ phình vì hàng đợi; sửa bằng cách giới hạn hàng đợi, đặt timeout nhỏ hơn timeout của client, và trả 503 rõ ràng khi đầy.",
        "why": "Pool hữu hạn mà hàng đợi vô hạn thì tải đột biến không biến mất mà chỉ dồn thành chờ đợi và timeout; giới hạn hàng đợi biến quá tải thành từ chối có kiểm soát thay vì sập toàn bộ."
      }
    },
    {
      "what": "Bất đồng bộ không có nghĩa là an toàn là nhắc nhở rằng chạy bất đồng bộ chỉ thay đổi thứ tự và thời điểm chạy, không tự sửa shared state (trạng thái dùng chung) không an toàn. Hai tác vụ bất đồng bộ cùng sửa một biến chung vẫn race như hai thread bình thường, chỉ là thứ tự chạy càng khó đoán hơn.",
      "role": "Ảo tưởng nguy hiểm ở đây là cứ chuyển sang CompletableFuture hay Reactor (framework lập trình reactive, chạy bất đồng bộ theo luồng dữ liệu) là hết race. Thực tế code bất đồng bộ vẫn đếm lệch và mất cập nhật, mà lỗi còn khó tái hiện hơn vì thứ tự chạy càng không đảm bảo, nên test một lần đúng càng không chứng minh được gì.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đồng thời > Tác vụ bất đồng bộ, kề bên biến dùng chung, thread pool chạy tác vụ nền, cơ chế khóa và phép nguyên tử, và luồng xử lý IO",
      "connects": [
        {
          "t": "Vì thread-safe collection là cách bảo vệ trạng thái dùng chung ở mức cấu trúc, nên code bất đồng bộ vẫn phải dùng Atomic hay ConcurrentHashMap như code đồng bộ: đổi sang bất đồng bộ không thay thế được cấu trúc an toàn, và bỏ cấu trúc an toàn đi là bỏ luôn lớp bảo vệ duy nhất.",
          "day": 15
        },
        {
          "t": "Vì race condition là lỗi thứ tự chạy không đảm bảo, nên bất đồng bộ làm race khó thấy hơn chứ không làm race biến mất: thứ tự chạy càng tự do thì càng nhiều cách xen kẽ, và mỗi cách xen kẽ là một cơ hội để đọc-sửa-ghi bị chen ngang.",
          "day": 15
        },
        {
          "t": "Vì virtual thread cũng chỉ làm cho việc chờ IO rẻ hơn chứ không sửa shared state, nên bất đồng bộ và virtual thread giống nhau ở điểm này: cả hai đều tối ưu cách chờ, không tối ưu tính đúng đắn của dữ liệu dùng chung, và nhầm hai việc này sẽ chữa sai bệnh.",
          "day": 1
        },
        {
          "t": "Vì code bất đồng bộ lan khắp ứng dụng mà lỗi của nó chỉ lộ lúc đông người dùng, nên tính đúng đắn của code bất đồng bộ trong toàn bộ ứng dụng phải được kiểm tra bằng test nhiều luồng và review shared state, chứ không phải bằng việc code chạy được một lần."
        }
      ],
      "shape": "definition",
      "difficulty": 1,
      "dontUse": "Không dùng chuyển sang bất đồng bộ làm biện pháp sửa race condition, và không dùng CompletableFuture.supplyAsync chạy ở pool khác rồi cùng sửa một biến chung mà không có Atomic, lock hay cấu trúc an toàn.",
      "quiz": {
        "q": "Hai CompletableFuture cùng chạy supplyAsync và cùng làm biến đếm n++ với n là int thường. Chạy một lần cho kết quả đúng, chạy 100 lần thì kết quả lệch. Kết luận đúng là gì?",
        "answer": "Vẫn là race condition; chạy một lần đúng không chứng minh được an toàn, vì bất đồng bộ chỉ thay đổi thứ tự chạy chứ không làm n++ thành nguyên tử.",
        "why": "n++ vẫn là đọc, cộng, ghi không nguyên tử dù chạy ở thread nào hay ở future nào; muốn an toàn phải dùng AtomicInteger hoặc lock, không phải đổi sang bất đồng bộ."
      }
    }
  ],
  "16":   [
    {
      "what": "Kafka là một nhật ký sự kiện chỉ ghi thêm (append-only log): producer ghi event vào topic, topic chia thành nhiều partition (phần của log, mỗi phần là một dãy có thứ tự riêng), và consumer đọc lại từ offset (vị trí đã đọc tới đâu trong partition). Cùng một key (khóa phân vùng, ví dụ orderId) thì luôn rơi vào cùng một partition, nên thứ tự chỉ được giữ trong một partition, không giữ giữa các partition khác nhau. Một consumer group (nhóm consumer cùng chia việc) sẽ chia các partition cho các consumer trong nhóm, và việc đặt lại offset về vị trí cũ cho phép đọc lại toàn bộ lịch sử event để phân tích lại.",
      "role": "Chọn key sai là cách nhanh nhất để phá thứ tự: nếu key là ngẫu nhiên hoặc để trống, 3 event Created, Paid, Shipped của cùng một đơn có thể rải ra 3 partition và service kế toán xử lý Paid trước Created. Thêm consumer cũng không cứu được khi partition quá ít: topic có 3 partition mà nhóm có 10 consumer thì tối đa 3 consumer có việc, 7 consumer còn lại ngồi không vì một partition trong cùng group chỉ giao cho đúng một consumer. Dấu hiệu nhận ra là thêm consumer mà tốc độ xử lý không tăng, hoặc event của cùng một đơn về đích sai thứ tự.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Message broker > Kafka, kề bên topic đơn hàng, consumer group, bảng lưu offset, và service kế toán hoặc phân tích log",
      "connects": [
        {
          "t": "Vì Kafka vẫn có thể giao lại cùng một event sau khi consumer gặp sự cố, nên dùng Kafka mà không làm consumer chịu được trùng thì tiền và điểm sẽ lệch, và đó chính là bài toán idempotent consumer phải giải.",
          "day": 16
        },
        {
          "t": "Khi chỉ cần giao từng task cho đúng một worker rồi quên đi, Kafka là thừa vì nó giữ lại cả lịch sử log để phát lại, trong khi RabbitMQ giao xong là xong và gọn hơn cho bài toán đó.",
          "day": 16
        },
        {
          "t": "Event mà Kafka giữ lại chỉ có giá trị khi nó thật sự được ghi ra: nếu ghi đơn thành công nhưng publish event thất bại thì không có event nào trong log cả, nên cần outbox để việc ghi đơn và ghi event cùng thành công hoặc cùng thất bại.",
          "day": 17
        },
        {
          "t": "Luồng sự kiện của toàn bộ hệ thống mà chạy trên Kafka thì mọi service hạ nguồn đều đọc cùng một lịch sử, vì vậy một event sai thứ tự hay sai nội dung ở đầu nguồn sẽ lan tới mọi service đọc sau đó."
        }
      ],
      "shape": "trace",
      "difficulty": 2,
      "thresholds": "Số consumer đang chạy trong một group không nên vượt số partition nếu muốn mọi consumer đều có việc; muốn tăng song song thì phải tăng partition trước, nhưng tăng partition sau khi hệ thống đã chạy có thể làm key cũ rơi sang partition khác và phá thứ tự đã có, nên số partition cần tính trước theo tải đỉnh.",
      "dontUse": "Không dùng khi việc cần làm chỉ là giao một task cho một worker xử lý xong là quên, không cần phát lại lịch sử hay cho nhiều service cùng đọc lại event cũ.",
      "quiz": {
        "q": "Topic orders có 3 partition, consumer group có 5 consumer. Bạn thêm tiếp 5 consumer nữa (tổng 10) và kỳ vọng tốc độ tăng gấp đôi. Kết quả thật là gì và vì sao?",
        "answer": "Tốc độ không tăng: tối đa 3 consumer nhận partition, 7 consumer còn lại ngồi không.",
        "why": "Trong một consumer group, mỗi partition chỉ được giao cho đúng một consumer, nên số consumer có việc bị chặn cứng bởi số partition, không phải bởi số consumer bạn chạy thêm."
      }
    },
    {
      "what": "RabbitMQ là hệ thống hàng đợi theo kiểu giao từng message: producer gửi tới exchange (bộ định tuyến, gồm direct định tuyến theo key chính xác, topic theo mẫu key, fanout gửi tới mọi queue), exchange theo binding (luật nối exchange với queue bằng routing key) đưa message vào queue, và consumer lấy từng message ra xử lý rồi xác nhận (ack). Message bị xử lý lỗi nhiều lần sẽ được chuyển sang dead-letter queue (hàng đợi thư chết: nơi chứa message lỗi để xem lại sau) thay vì nằm chặn queue chính.",
      "role": "Thiếu dead-letter và giới hạn số lần thử lại, một message lỗi sẽ kẹt ở đầu queue: consumer lấy nó, lỗi, trả lại, lấy lại, và mọi message xếp sau nó không bao giờ được xử lý, trong khi log phình lên vì cùng một message bị thử lại không ngừng. Ví dụ: queue gửi email có 1 message với địa chỉ nhận sai định dạng, consumer thử lại vô hạn thì 10.000 email xếp sau nó đứng yên cả buổi dù chúng hoàn toàn hợp lệ. Dấu hiệu nhận ra là cả queue đứng yên vì một message, hoặc log lặp lại cùng một message id hàng nghìn lần.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Message broker > RabbitMQ, kề bên exchange và routing key, queue xử lý email, dead-letter queue, và consumer xử lý từng message",
      "connects": [
        {
          "t": "RabbitMQ và Kafka khác nhau ở đơn vị giao việc: RabbitMQ giao mỗi message cho một consumer rồi xóa sau khi ack, còn Kafka giữ lại log để nhiều consumer cùng đọc lại, nên chọn sai là chọn sai cả cách dữ liệu tồn tại sau khi xử lý.",
          "day": 16
        },
        {
          "t": "Việc nào gửi qua RabbitMQ cũng phải qua bài toán sync hay queue trước: chỉ những việc không cần trả lời ngay mới xứng đáng vào queue, còn việc cần kết quả ngay mà đưa vào queue thì user sẽ không biết thành công hay thất bại.",
          "day": 16
        },
        {
          "t": "Một saga kiểu choreography chạy bằng event sẽ dùng chính cơ chế định tuyến và dead-letter này để nối các bước, vì vậy message lỗi mà không có dead-letter sẽ không chỉ kẹt một queue mà còn kẹt cả một bước trong saga.",
          "day": 17
        },
        {
          "t": "Tác vụ nền của toàn bộ hệ thống mà dồn hết vào một queue không có dead-letter thì một message hỏng duy nhất cũng đủ làm tắc toàn bộ tác vụ nền, trong khi tách queue theo loại việc và có dead-letter thì lỗi chỉ khoanh lại trong đúng queue đó."
        }
      ],
      "shape": "trace",
      "difficulty": 2,
      "thresholds": "Đặt giới hạn thử lại trước khi chuyển sang dead-letter (ví dụ 3-5 lần theo ví dụ trong tài liệu ngày 18 cho retry) rồi mới đưa message vào dead-letter; không để retry vô hạn, vì mỗi lần thử lại đều tốn một lượt xử lý và giữ message lỗi ở đầu queue.",
      "dontUse": "Không dùng khi cần phát lại toàn bộ lịch sử event tháng trước hoặc cần nhiều service cùng đọc lại cùng một event, vì message đã ack trong RabbitMQ là bị xóa khỏi queue và không phát lại được như log của Kafka.",
      "quiz": {
        "q": "Exchange fanout nối với 2 queue A và B, producer gửi 1 message. Consumer của A ack xong, consumer của B chưa xử lý. Hỏi message còn ở đâu, và nếu B xử lý lỗi 6 lần liên tiếp (giới hạn retry là 5) thì message đi đâu?",
        "answer": "Message đã bị xóa khỏi queue A sau ack, vẫn còn ở queue B; sau lần lỗi thứ 6 (vượt giới hạn 5) nó bị chuyển sang dead-letter queue, queue B tiếp tục xử lý message tiếp theo.",
        "why": "Mỗi queue giữ một bản copy riêng và ack chỉ xóa bản của queue đó; giới hạn retry là để message lỗi không chặn queue chính mà chuyển sang nơi xem lại sau."
      }
    },
    {
      "what": "At-least-once (giao ít nhất một lần) nghĩa là broker có thể giao cùng một message hai lần: consumer xử lý xong nhưng gặp sự cố trước khi ack hoặc trước khi commit offset thì broker tưởng message chưa xử lý và giao lại. Idempotent consumer (consumer lũy đẳng: xử lý lại cùng một input cho kết quả như chỉ xử lý một lần) là cách bù lại: consumer lưu dedup key (khóa chống trùng, thường là eventId) cùng với tác dụng nghiệp vụ trong một transaction, gặp lại eventId cũ thì bỏ qua. Exactly-once (giao đúng một lần) trong thực tế rất khó và đắt vì nó đòi hỏi broker, consumer và database phối hợp nguyên tử, nên đừng hứa bừa.",
      "role": "Consumer không idempotent thì chỉ cần một lần restart đúng lúc cũng đủ làm tiền lệch: event evt-991 trừ 50 điểm, consumer trừ điểm và commit xong nhưng crash trước khi ack, broker giao lại evt-991, consumer trừ thêm 50 điểm nữa, tổng cộng user mất 100 điểm cho một lần mua dù log không hề có request mới nào từ user. Dấu hiệu nhận ra là số dư lệch đúng bằng một lần xử lý sau mỗi lần consumer restart hoặc deploy, và lệch đúng vào những thời điểm có redelivery trong log.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Message broker > Consumer idempotent, kề bên bảng dedup theo event id, transaction trừ điểm, dead-letter queue, và cơ chế xác nhận message",
      "connects": [
        {
          "t": "Dù chọn Kafka hay RabbitMQ thì redelivery vẫn xảy ra, vì vậy idempotent consumer là lớp phòng thủ bắt buộc ở phía consumer chứ không phải là tính năng mà broker nào hứa thay được.",
          "day": 16
        },
        {
          "t": "RabbitMQ cũng giao lại message khi consumer không ack, nên cùng một lỗi trừ điểm hai lần sẽ xảy ra ở cả hai broker nếu consumer không có dedup, và khác broker không làm lỗi này biến mất.",
          "day": 16
        },
        {
          "t": "Outbox ở phía gửi và dedup ở phía nhận là hai nửa của cùng một đường dây tin cậy: outbox giữ cho event không bị mất khi publish lỗi, còn dedup giữ cho event bị gửi trùng không gây tác dụng hai lần.",
          "day": 17
        },
        {
          "t": "Tính đúng đắn của tiền và điểm trong toàn bộ hệ thống phụ thuộc vào dedup nhiều hơn vào lời hứa của broker, vì broker chỉ hứa giao ít nhất một lần chứ không hứa giao đúng một lần."
        }
      ],
      "shape": "incident",
      "difficulty": 3,
      "thresholds": "Không đặt TTL (thời gian sống) của dedup key ngắn hơn khoảng thời gian mà message còn có thể bị giao lại: với event tài chính, giữ dedup vĩnh viễn hoặc ít nhất dài hơn toàn bộ cửa sổ retry và redelivery, vì xóa dedup sớm thì message giao lại muộn sẽ bị xử lý lần hai như message mới.",
      "dontUse": "Không dùng khi tác dụng phụ không chịu được việc chạy hai lần mà bạn lại chưa có dedup key, ví dụ trừ tiền hay trừ kho mà consumer chỉ trừ rồi ack: lúc đó phải thêm dedup trước, không được đưa consumer trần vào production.",
      "quiz": {
        "q": "Log cho thấy: UPDATE points SET balance = balance - 50 WHERE user_id = 7 (commit thành công), sau đó consumer crash trước khi ack, rồi broker giao lại cùng event evt-991 cho consumer không có dedup. Số dư cuối cùng của user lệch bao nhiêu so với đúng, và sửa bằng dòng kiểm tra nào?",
        "answer": "Lệch thêm 50 điểm (trừ tổng 100 thay vì 50). Sửa bằng cách kiểm tra eventId trong bảng dedup cùng transaction với UPDATE: nếu evt-991 đã có thì bỏ qua, chưa có thì trừ điểm và ghi dedup cùng lúc.",
        "why": "Redelivery sau khi commit nhưng trước ack là trường hợp bình thường của at-least-once, nên chỉ có dedup gắn với tác dụng nghiệp vụ mới phân biệt được lần giao lại với lần xử lý mới."
      }
    },
    {
      "what": "Gọi sync (đồng bộ: gọi và chờ kết quả ngay trong chính request đó) là lựa chọn đúng khi user cần biết ngay thành công hay thất bại để quyết định bước tiếp theo. Đưa vào queue (hàng đợi: ghi việc lại, trả lời ngay, việc chạy sau) là lựa chọn đúng khi việc nặng, không cần ngay, cần chịu tải đột biến hoặc cần retry mà không bắt user chờ. Tiêu chí phân biệt không phải là công nghệ hiện đại hay không, mà là user có cần câu trả lời ngay trong request này hay không.",
      "role": "Đưa nhầm việc cần kết quả ngay vào queue thì user đặt hàng xong chỉ thấy màn hình chờ mà không biết thanh toán thành công hay thất bại, và phải tự quay lại kiểm tra sau. Ngược lại, gọi sync cho việc nặng thì request timeout chỉ vì phải chờ gửi email xong mới trả lời, dù việc đặt hàng thực chất đã xong: ví dụ checkout gọi sync tới service email chậm 20 giây thì user thấy timeout dù đơn đã tạo thành công trong database. Dấu hiệu nhận ra là user phàn nàn không biết trạng thái giao dịch, hoặc request timeout mà nguyên nhân lại là một việc phụ không liên quan tới kết quả chính.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Lựa chọn gọi sync hay queue, kề bên API thanh toán cần trả lời ngay, queue gửi email, queue đồng bộ kế toán, và timeout của client",
      "connects": [
        {
          "t": "RabbitMQ chỉ phát huy khi việc đã được xác định là không cần trả lời ngay, vì vậy quyết định sync hay queue phải đi trước việc chọn broker, và chọn broker trước khi trả lời câu hỏi này là làm ngược thứ tự.",
          "day": 16
        },
        {
          "t": "Kafka cũng chỉ phù hợp với những việc chấp nhận trễ, vì event trong log phải chờ consumer đọc và xử lý, nên việc cần kết quả ngay mà đưa lên Kafka sẽ gặp đúng vấn đề chờ đợi như đưa vào queue.",
          "day": 16
        },
        {
          "t": "Mọi lời gọi sync đều cần timeout và retry có kỷ luật, vì một lời gọi sync không có timeout sẽ giữ thread của mình tới khi dependency trả lời, và đó là lúc bài toán resilience bắt đầu.",
          "day": 18
        },
        {
          "t": "Trải nghiệm chờ đợi của người dùng trong toàn bộ sản phẩm được quyết định ở chính chỗ này: việc nào cần trả lời ngay mà bắt chờ thì user thấy hệ thống chậm, việc nào không cần ngay mà bắt chờ thì hệ thống tự làm mình chậm một cách vô ích."
        }
      ],
      "shape": "decision",
      "difficulty": 1,
      "thresholds": "Mọi lời gọi sync đều phải có timeout rõ ràng (ví dụ trong tài liệu ngày 18: thanh toán 5 giây); quá timeout thì ngắt và trả lỗi rõ ràng, không chờ vô hạn để user tự đoán.",
      "dontUse": "Không dùng queue khi user cần quyết định ngay từ kết quả, ví dụ xác nhận thanh toán trước khi chốt đơn hay kiểm tra tồn kho trước khi cho đặt: lúc đó bắt buộc gọi sync và báo lỗi ngay nếu thất bại.",
      "quiz": {
        "q": "Chọn sync hay queue cho 3 việc sau và giải thích mỗi lựa chọn bằng một câu: (a) xác nhận thanh toán khi checkout, (b) gửi email xác nhận đơn, (c) đồng bộ đơn sang hệ thống kế toán.",
        "answer": "(a) sync vì user cần biết ngay thanh toán thành công hay thất bại để quyết định tiếp. (b) queue vì email chậm vài phút user vẫn chấp nhận và không ảnh hưởng tới việc chốt đơn. (c) queue vì kế toán không cần ngay trong request checkout và có thể xử lý theo lô, retry khi lỗi.",
        "why": "Tiêu chí duy nhất là user có cần câu trả lời ngay trong request này hay không; việc nào không cần ngay thì đưa vào queue để request chính không phải chờ việc phụ."
      }
    }
  ],
  "17":   [
    {
      "what": "Bài toán hai hệ (ghi database rồi gửi message, hoặc ngược lại) là bài toán không có transaction chung: database và message broker là hai hệ độc lập, không có cơ chế nào bảo đảm cả hai cùng thành công trong một bước. Ghi database thành công nhưng gửi message thất bại thì bên nhận không bao giờ biết; gửi message trước rồi ghi database thất bại thì bên nhận xử lý một event của một đơn không tồn tại. Tên gọi hai-phase ở đây chỉ bài toán đó, không phải là lời hứa rằng cứ làm hai bước lần lượt là xong.",
      "role": "Hệ thống rơi vào trạng thái nửa vời mà không có log nào chỉ rõ phải sửa bên nào: đơn #5001 đã commit trong database nhưng mạng chập đúng lúc publish OrderCreated, kho không biết gì về đơn này, đơn ở trạng thái PAID mà kho chưa trừ, và đội trực phải đối soát tay hai database mới thấy lệch. Làm ngược lại cũng tệ không kém: kho trừ hàng cho một đơn mà database sau đó rollback, hàng mất mà đơn không có. Dấu hiệu nhận ra là đơn và kho lệch nhau đúng sau những lần mạng chập hoặc deploy, và lệch theo đúng một bước trong chuỗi hai bước.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Giao dịch nhiều hệ > Nối database và message, kề bên bảng đơn hàng, bảng outbox, message broker, và service kho",
      "connects": [
        {
          "t": "Chính vì hai bước lần lượt không bao giờ cùng thành công một cách chắc chắn nên mới cần outbox: outbox biến bước gửi message thành việc đọc lại từ database, nơi transaction đã bảo vệ tính nguyên tử của cả đơn và event.",
          "day": 17
        },
        {
          "t": "Khi chuỗi không chỉ có hai bước mà kéo dài qua thanh toán rồi trừ kho, bài toán hai hệ này nhân lên thành saga, và mỗi bước thêm vào đều cần một đường quay lại riêng thay vì hy vọng cả chuỗi cùng thành công.",
          "day": 17
        },
        {
          "t": "At-least-once ở phía consumer là hệ quả tất yếu của việc không có transaction chung: vì không thể bảo đảm gửi đúng một lần, phía nhận buộc phải chịu được trùng thay vì giả định message chỉ tới một lần.",
          "day": 16
        },
        {
          "t": "Tính nhất quán xuyên service của toàn bộ hệ thống không thể xây trên lời hứa hai bước lần lượt sẽ cùng thành công, mà phải xây trên cơ chế ghi event cùng transaction và consumer chịu được trùng."
        }
      ],
      "shape": "incident",
      "difficulty": 2,
      "dontUse": "Không dùng cách gọi lần lượt database rồi broker rồi hy vọng cả hai cùng thành công cho bất kỳ luồng nào mà mất một bên sẽ lệch dữ liệu: lúc đó phải dùng outbox hoặc chấp nhận trạng thái nửa vời một cách có chủ đích kèm quy trình đối soát.",
      "quiz": {
        "q": "Code làm theo thứ tự: publish event OrderCreated trước, rồi mới ghi đơn vào database, và bước ghi database lỗi. Service kho nhận event sẽ làm gì sai, và thứ tự nào cũng không sửa được bài toán này?",
        "answer": "Kho sẽ trừ hàng cho một đơn không tồn tại. Đảo thứ tự cũng không sửa được: ghi database trước rồi publish lỗi thì kho không biết gì về đơn đã tạo, vẫn là trạng thái nửa vời.",
        "why": "Hai hệ độc lập không có transaction chung nên bất kỳ thứ tự lần lượt nào cũng có một khe hở giữa hai bước, và chỉ có cơ chế nối hai bước lại (outbox) mới lấp được khe hở đó."
      }
    },
    {
      "what": "Outbox Pattern (mẫu hộp thư đi) là cách ghi dữ liệu nghiệp vụ và event vào cùng một transaction trong cùng một database: bảng orders ghi đơn, bảng outbox_events ghi event tương ứng với trạng thái chưa gửi, và cả hai commit cùng nhau hoặc rollback cùng nhau. Một worker riêng (relay: tiến trình chuyên đọc outbox và gửi message) sau đó quét outbox, publish event lên broker, rồi mới đánh dấu đã gửi; publish thất bại thì event vẫn nằm trong outbox để thử lại, không mất.",
      "role": "Không có outbox, lỗi ở bước gửi là mất luôn event: đơn đã tạo nhưng service nhận event không bao giờ nhận được gì, và chỉ phát hiện khi đối soát dữ liệu hai bên lệch nhau. Có outbox nhưng worker publish xong rồi crash trước khi đánh dấu đã gửi thì event bị gửi trùng, và lúc đó consumer phải có dedup mới không trừ kho hai lần: ví dụ worker publish evt-77 rồi crash, quét lại thấy evt-77 vẫn chưa đánh dấu nên publish lần hai, kho nhận hai lần. Dấu hiệu nhận ra outbox đang thiếu một nửa là đơn có nhưng event không tới (thiếu worker), hoặc kho trừ hai lần cho một đơn (thiếu dedup phía nhận).",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Giao dịch nhiều hệ > Bảng outbox, kề bên bảng đơn hàng, worker gửi message, message broker, và bảng dedup của consumer",
      "connects": [
        {
          "t": "Outbox tồn tại chính là để trả lời bài toán hai hệ: vì không thể bắt database và broker cùng commit, nên nó dời bước gửi message vào trong database, nơi transaction đã bảo vệ được cả đơn và event.",
          "day": 17
        },
        {
          "t": "Mọi bước bù trong saga đều phụ thuộc vào việc event của bước thuận thật sự tới được nơi cần bù, nên saga mà không có outbox sẽ có những bước lỗi mà không ai kích hoạt bù vì event của chúng đã mất trên đường.",
          "day": 17
        },
        {
          "t": "Ở checkpoint tuần dữ liệu, nguyên tắc mọi luồng ghi nhiều bước đều phải có transaction hoặc cơ chế bù đã đặt nền cho outbox: outbox là cách áp dụng nguyên tắc đó khi một trong các bước là gửi message ra ngoài hệ thống.",
          "day": 14
        },
        {
          "t": "Độ tin cậy của event trong toàn bộ hệ thống được đo bằng số event mất, chứ không phải bằng số event gửi thành công trong ngày đẹp trời, và outbox là thứ giữ con số event mất đó ở mức 0 khi publish gặp sự cố."
        }
      ],
      "shape": "trace",
      "difficulty": 2,
      "dontUse": "Không dùng khi hệ thống chỉ có một database và không cần publish event ra ngoài: lúc đó outbox chỉ thêm một bảng và một worker mà không giải quyết bài toán nào, vì không có hệ thứ hai để nối.",
      "quiz": {
        "q": "Worker publish evt-77 thành công, crash trước khi đánh dấu đã gửi, quét lại và publish evt-77 lần hai. Consumer không có dedup sẽ làm gì sai, và dòng code nào ở phía consumer sửa được?",
        "answer": "Consumer trừ kho hai lần cho cùng một đơn. Sửa bằng cách kiểm tra eventId evt-77 trong bảng dedup cùng transaction với việc trừ kho: đã có thì bỏ qua, chưa có thì trừ kho và ghi dedup cùng lúc.",
        "why": "Đánh dấu đã gửi sau khi publish vẫn để lại khe hở trùng, nên outbox chỉ bảo đảm event không mất, còn việc không xử lý trùng hai lần phải do dedup phía nhận bảo đảm."
      }
    },
    {
      "what": "Saga là một giao dịch dài xuyên service được chia thành nhiều bước, mỗi bước có một bước bù tương ứng, vì không có transaction chung nào bao được tất cả các service. Choreography (múa phối hợp: mỗi service nghe event rồi tự làm bước tiếp theo, không có ai điều phối chung) chạy như một dây chuyền: OrderCreated kích hoạt thanh toán, PaymentSucceeded kích hoạt trừ kho. Orchestration (điều phối tập trung: một orchestrator giữ máy trạng thái tổng, gọi từng bước theo thứ tự và gọi bù khi lỗi) chạy như một nhạc trưởng: orchestrator biết saga đang ở bước nào và đã bù tới đâu.",
      "role": "Choreography đơn giản lúc đầu nhưng càng nhiều bước càng khó trả lời câu hỏi cơ bản nhất: saga này đang kẹt ở bước nào? Muốn biết phải lần log của từng service theo event, và khi một event bị mất giữa chừng thì không service nào biết mình phải làm tiếp, đơn kẹt ở trạng thái đã trả tiền nhưng chưa trừ kho mà không có nơi nào ghi rõ nó kẹt. Orchestration trả lời được ngay bằng cách tra trạng thái của orchestrator, nhưng đổi lại orchestrator thành điểm tập trung: nó chết thì mọi saga đang chạy đều đứng, nên nó cần được chăm sóc như một service quan trọng chứ không phải một đoạn code phụ. Dấu hiệu nhận ra choreography đã quá tải là mỗi lần debug sự cố phải mở log của 3 service trở lên mới lần ra được một đơn.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Saga > Điều phối nhiều bước, kề bên service đơn hàng, service thanh toán, service kho, và các bước bù",
      "connects": [
        {
          "t": "Saga chỉ có ý nghĩa khi mỗi bước đều có bước bù đi kèm, vì một chuỗi bước thuận mà không có đường quay lại thì lỗi ở bước cuối sẽ để lại trạng thái kẹt không tiến cũng không lùi.",
          "day": 17
        },
        {
          "t": "Event của saga chỉ đáng tin khi nó được ghi cùng transaction với dữ liệu nghiệp vụ, nên saga mà thiếu outbox sẽ có những bước không bao giờ được kích hoạt chỉ vì event của chúng mất trên đường publish.",
          "day": 17
        },
        {
          "t": "Saga chấp nhận rằng các bước không khớp ngay lập tức mà khớp dần theo thời gian, và đó chính là eventual consistency: đơn có thể ở trạng thái trung gian một lúc trước khi mọi service cùng thấy kết quả cuối.",
          "day": 19
        },
        {
          "t": "Luồng đặt hàng xuyên service của toàn bộ hệ thống mà không chọn rõ choreography hay orchestration thì mỗi team sẽ tự nối bước theo cách riêng, và cuối cùng không ai vẽ được toàn bộ luồng đặt hàng trên một sơ đồ duy nhất."
        }
      ],
      "shape": "compare",
      "difficulty": 3,
      "dontUse": "Không dùng choreography khi luồng có nhiều bước và bạn cần trả lời nhanh câu hỏi đơn này đang kẹt ở bước nào và đã bù tới đâu: lúc đó orchestration tra một nơi nhanh hơn việc lần log của nhiều service.",
      "quiz": {
        "q": "Saga choreography 3 bước: đơn hàng -> thanh toán -> trừ kho. Event PaymentSucceeded bị mất trên đường tới service kho. Đơn sẽ ở trạng thái gì, service nào biết nó kẹt, và cần thêm cơ chế nào để phát hiện?",
        "answer": "Đơn kẹt ở trạng thái đã trả tiền nhưng chưa trừ kho, và không service nào biết nó kẹt vì service kho không nhận được event nên không có gì để báo. Cần thêm cơ chế theo dõi theo thời gian, ví dụ orchestrator hoặc job quét các đơn PAID quá lâu mà chưa có trừ kho rồi kích hoạt bù hoặc cảnh báo.",
        "why": "Choreography không giữ trạng thái tổng, nên một event mất là một bước biến mất âm thầm; chỉ có nơi giữ trạng thái tổng hoặc job quét theo thời gian mới phát hiện được saga kẹt."
      }
    },
    {
      "what": "Hành động bù (compensating action) là thao tác nghiệp vụ ngược lại một bước đã làm: hoàn tiền để bù cho thanh toán, cộng lại kho để bù cho trừ kho, hủy đơn để bù cho tạo đơn. Khác với rollback của transaction, bù không xóa dấu vết mà tạo thêm một thao tác mới đi ngược lại, và lịch sử vẫn ghi cả bước thuận lẫn bước bù. Có những bước không bù được: hàng đã giao vật lý thì không thể tự động thu hồi, tiền đã rút thì không thể tự hoàn nếu không có quy trình đối tác, và những bước đó phải chuyển sang trạng thái chờ xử lý tay với người chịu trách nhiệm rõ ràng.",
      "role": "Saga chỉ có bước thuận mà không có bước bù thì lỗi ở bước cuối để lại đơn đã trả tiền nhưng không giao được, và nhân viên phải sửa tay từng đơn vì không có quy trình bù nào để chạy. Ví dụ: thanh toán 500.000 đồng thành công, trừ kho thất bại vì hết hàng, không có bước bù thì user mất tiền mà không có hàng, đơn treo ở trạng thái không tiến cũng không lùi. Ngược lại, bù mà không có idempotency key (khóa chống trùng cho chính thao tác bù) thì retry của bước bù sẽ hoàn tiền hai lần, biến một lần sửa lỗi thành một lần mất tiền mới.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Saga > Bước bù, kề bên service thanh toán, service kho, bảng đơn hàng và trạng thái đơn, và quy trình xử lý tay cho bước không bù được",
      "connects": [
        {
          "t": "Bù chỉ được kích hoạt khi saga biết mình đang ở bước nào và bước nào đã thành công, nên saga không có điều phối rõ ràng sẽ không biết phải bù từ đâu, và bù sai bước còn tệ hơn không bù.",
          "day": 17
        },
        {
          "t": "Bước bù chỉ chạy được khi event của bước thuận thật sự tới nơi, nên outbox là tiền đề của bù: event mất thì không ai biết có bước nào cần bù.",
          "day": 17
        },
        {
          "t": "Nguyên tắc mọi luồng ghi nhiều bước đều phải có transaction hoặc cơ chế bù ở checkpoint tuần dữ liệu chính là nguồn gốc của bước bù: khi transaction chung không thể bao được nhiều service, bù là cơ chế thay thế nó.",
          "day": 14
        },
        {
          "t": "Khả năng phục hồi của đơn hàng trong toàn bộ hệ thống được đo bằng thời gian từ lúc lỗi tới lúc đơn về trạng thái cuối đúng (đã giao hoặc đã hoàn tiền và hủy), chứ không phải bằng việc hệ thống có vẽ được sơ đồ bù trên giấy hay không."
        }
      ],
      "shape": "incident",
      "difficulty": 2,
      "thresholds": "Mọi thao tác bù liên quan tới tiền đều phải có idempotency key riêng: gọi hoàn tiền hai lần do retry cũng chỉ hoàn một lần, và bước bù phải được ghi trạng thái đã bù để lần chạy lại sau biết mà bỏ qua.",
      "dontUse": "Không dùng bước bù tự động cho bước đã gây tác dụng vật lý không thu hồi được, ví dụ hàng đã giao tới tay khách: lúc đó phải dừng ở trạng thái chờ xử lý tay, không tự bù bừa bằng cách xóa đơn hay trừ tiền thêm.",
      "quiz": {
        "q": "Saga đã trừ kho rồi, bước giao hàng lỗi. Một đoạn code đề xuất xóa row đơn khỏi database để coi như chưa từng đặt hàng. Vì sao cách này sai, và bước bù đúng gồm những gì?",
        "answer": "Sai vì xóa row làm mất dấu vết: không còn bằng chứng đơn từng tồn tại, tiền đã thu và kho đã trừ sẽ không đối soát được. Bù đúng là cộng lại kho, hoàn tiền cho user, và chuyển đơn sang trạng thái đã hủy kèm lý do, giữ lại toàn bộ lịch sử.",
        "why": "Bù là tạo thêm thao tác ngược có dấu vết, không phải xóa quá khứ; xóa dữ liệu để giả vờ chưa xảy ra chỉ làm cho việc đối soát và xử lý khiếu nại sau đó không còn căn cứ."
      }
    }
  ],
  "18":   [
    {
      "what": "Timeout (giới hạn chờ) là khoảng thời gian tối đa cho phép một lời gọi tới service khác tồn tại: connect timeout là thời gian chờ thiết lập kết nối, read timeout là thời gian chờ response sau khi đã kết nối. Quá hạn thì lời gọi bị ngắt, thread và connection đang giữ nó được giải phóng, và phía gọi trả về một lỗi rõ ràng thay vì treo mãi. Timeout biến một dependency chậm thành một lỗi có thời hạn.",
      "role": "Không đặt timeout, một API chậm sẽ giữ thread và connection tới khi cả hệ thống nghẽn theo: ví dụ payment chậm 60 giây, mỗi request checkout giữ một thread 60 giây, pool 50 thread đầy sau 50 request đồng thời và request thứ 51 phải xếp hàng dù CPU còn rảnh, rồi hàng đợi cũng đầy và mọi tính năng khác dùng chung pool bắt đầu timeout theo. Đặt read timeout 5 giây thì mỗi request xấu nhất chỉ giữ thread 5 giây, pool giải phóng nhanh hơn 12 lần, và user nhận được lỗi rõ ràng để thử lại thay vì chờ treo.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Resilience > Timeout, kề bên API thanh toán, thread pool, connection pool, và circuit breaker",
      "connects": [
        {
          "t": "Timeout là tiền đề của retry có kỷ luật: retry một lời gọi không có timeout thì lần thử lại cũng treo như lần đầu, nên retry chỉ an toàn khi mỗi lần thử đều có thời hạn rõ ràng.",
          "day": 18
        },
        {
          "t": "Khi timeout liên tục xảy ra với cùng một dependency, circuit breaker là lớp tiếp theo phải nhảy vào, vì timeout một mình chỉ giới hạn thiệt hại của từng request chứ không ngăn được việc hệ thống cứ gọi mãi vào một service đã chết.",
          "day": 18
        },
        {
          "t": "Thread pool có giới hạn là lý do timeout quan trọng tới vậy: pool là tài nguyên hữu hạn, và một lời gọi không timeout là một thread bị chiếm vô hạn, nên timeout chính là cách bảo vệ pool khỏi dependency chậm.",
          "day": 15
        },
        {
          "t": "Độ ổn định của toàn bộ hệ thống khi dependency chậm được quyết định trước hết bởi timeout, vì timeout là lớp rẻ nhất và sớm nhất ngăn một service chậm lan thành nghẽn toàn hệ thống."
        }
      ],
      "shape": "trace",
      "difficulty": 1,
      "thresholds": "Ví dụ trong tài liệu ngày 18: thanh toán đặt read timeout 5 giây thay vì chờ 60 giây khi đối tác chậm. Nguyên tắc kèm theo: timeout của mình phải ngắn hơn timeout của client đang gọi mình, nếu không client ngắt trước mà server vẫn giữ thread vô ích.",
      "dontUse": "Không dùng timeout dài bằng hoặc dài hơn timeout của client hoặc của request cha: lúc đó timeout của mình không bao giờ kịp cứu vì phía gọi đã ngắt và bỏ đi trước.",
      "quiz": {
        "q": "Pool có 50 thread, payment chậm 60 giây và không đặt timeout, 50 request checkout tới cùng lúc. Request thứ 51 gặp chuyện gì, và nếu đặt read timeout 5 giây thì bức tranh thay đổi ra sao?",
        "answer": "Request thứ 51 phải xếp hàng chờ thread trống, và nếu hàng đợi cũng đầy thì nó timeout ở hàng đợi dù payment hay checkout đều không lỗi logic. Với timeout 5 giây, 50 thread đầu được giải phóng sau tối đa 5 giây thay vì 60 giây, nên request thứ 51 chỉ chờ tối đa 5 giây và nhận lỗi rõ ràng thay vì treo.",
        "why": "Thread là tài nguyên hữu hạn, và thời gian giữ thread của mỗi request quyết định pool đầy nhanh hay chậm; timeout rút ngắn thời gian giữ đó xuống mức có thể chịu được."
      }
    },
    {
      "what": "Retry (thử lại) là gọi lại một lời gọi đã thất bại, backoff (lùi dần) là tăng khoảng chờ giữa các lần thử, ví dụ lần sau chờ lâu hơn lần trước, và jitter (nhiễu ngẫu nhiên) là cộng thêm một khoảng ngẫu nhiên vào thời gian chờ để các lần thử không rơi cùng một thời điểm. Ba thứ này đi cùng nhau vì retry ngay lập tức và đồng loạt sẽ dồn thêm tải lên service đang yếu đúng lúc nó cần được giảm tải nhất, hiện tượng gọi là retry storm (cơn bão thử lại).",
      "role": "Retry không có backoff và jitter biến một sự cố nhỏ thành một đợt tấn công từ chính hệ thống của mình: 1.000 request cùng lỗi 503, mỗi request retry ngay 3 lần thì service đang yếu nhận thêm 3.000 request trong cùng một giây, và mỗi đợt retry thất bại lại sinh thêm đợt nữa. Có backoff và jitter, 3.000 lần thử lại đó vẫn xảy ra nhưng rải ra trong nhiều giây, đỉnh tải thấp hơn và service có khoảng thở để hồi phục. Retry sai loại lỗi còn tệ hơn: retry lỗi 400 (sai dữ liệu) thì lần nào cũng sai, chỉ tốn request; retry thao tác không idempotent mà không có idempotency key thì mỗi lần thử lại là một lần trừ tiền mới.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Resilience > Retry, kề bên API thanh toán, circuit breaker, idempotency key, và hàng đợi retry",
      "connects": [
        {
          "t": "Retry chỉ có ý nghĩa khi mỗi lần thử đều bị giới hạn bởi timeout, vì một lần thử không có timeout sẽ treo và lần thử tiếp theo không bao giờ tới, nên timeout và retry phải cấu hình cùng nhau.",
          "day": 18
        },
        {
          "t": "Khi retry vẫn thất bại liên tục, bulkhead và rate limiter là lớp khoanh vùng tiếp theo: chúng giữ cho đợt retry của một dependency không ăn hết tài nguyên của các dependency khác và không vượt quá tốc độ mà phía nhận chịu được.",
          "day": 18
        },
        {
          "t": "Retry an toàn hay không phụ thuộc vào idempotent consumer: một thao tác thử lại nhiều lần mà mỗi lần đều gây tác dụng mới thì retry không còn là phục hồi mà là nhân đôi giao dịch.",
          "day": 16
        },
        {
          "t": "Khả năng phục hồi của toàn bộ hệ thống khi lỗi tạm thời được đo bằng việc hệ thống có tự khỏi mà không cần can thiệp tay hay không, và retry có backoff và jitter là cách rẻ nhất để đạt được điều đó với lỗi thoáng qua."
        }
      ],
      "shape": "trace",
      "difficulty": 2,
      "thresholds": "Ví dụ trong tài liệu ngày 18: lần 1 thử ngay, lần 2 sau 1 giây, lần 3 sau 2 giây, lần 4 sau 4 giây, cộng jitter ngẫu nhiên cộng trừ 0,5 giây; chỉ retry lỗi tạm thời như timeout và 503, không retry 400.",
      "dontUse": "Không dùng retry cho thao tác không idempotent mà không có idempotency key, và không retry lỗi 400 do sai dữ liệu: lần thử lại nào cũng sai như lần đầu và chỉ tốn thêm request.",
      "quiz": {
        "q": "1.000 request cùng lỗi 503, mỗi request retry 3 lần. Không jitter thì service nhận thêm bao nhiêu request và vào lúc nào; có jitter thì tổng số request thay đổi hay chỉ thời điểm thay đổi, và vì sao jitter vẫn đáng làm?",
        "answer": "Không jitter: thêm 3.000 request dồn trong cùng một thời điểm ngay sau lỗi. Có jitter: tổng số vẫn là 3.000 lần thử lại, nhưng chúng rải ra trong nhiều giây thay vì dồn cùng lúc, nên đỉnh tải thấp hơn và service có khoảng thở để hồi phục.",
        "why": "Jitter không giảm tổng số lần thử mà giảm độ đồng loạt: retry storm gây hại ở đỉnh tải, không phải ở tổng số, nên rải thời gian là đủ để cứu service đang yếu."
      }
    },
    {
      "what": "Circuit breaker (cầu dao) là cơ chế ngắt mạch khi một dependency lỗi liên tục: trạng thái closed (đóng mạch) cho gọi bình thường, open (mở mạch) chặn ngay mọi lời gọi và trả fallback (câu trả lời dự phòng, ví dụ thông báo rõ ràng hoặc dữ liệu cache cũ có ghi chú) mà không gọi tới service đích, half-open (hé mạch) cho một vài request thăm dò đi qua sau thời gian nguội, thành công thì đóng mạch lại, thất bại thì mở lại. Resilience4j là thư viện Java triển khai sẵn máy trạng thái này.",
      "role": "Không có circuit breaker, mọi request đều chờ tới timeout dù service đích đã chết rõ ràng: payment chết, mỗi checkout vẫn chờ đủ 5 giây timeout rồi mới báo lỗi, 50 thread cứ xoay vòng chờ một service không trả lời, và hệ thống gọi cũng chậm theo dù lỗi nằm ở phía bên kia. Có circuit breaker, sau khi mạch mở thì checkout trả ngay thông báo thanh toán tạm gián đoạn trong vài mili-giây, thread không bị giữ, và service chết có thời gian hồi phục vì không còn bị dội request. Dấu hiệu nhận ra mạch đang thiếu là thời gian phản hồi của API mình tăng đúng bằng timeout của dependency dù dependency đã chết hẳn.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Resilience > Circuit breaker, kề bên API thanh toán, timeout, fallback cho người dùng, và metric tỉ lệ lỗi",
      "connects": [
        {
          "t": "Circuit breaker chỉ nhảy vào được khi đã có timeout để đếm lỗi: không có timeout thì request treo chứ không được tính là lỗi, nên mạch không bao giờ có đủ tín hiệu để mở.",
          "day": 18
        },
        {
          "t": "Retry và circuit breaker là hai lớp đối nghịch phải phối hợp: retry cố gọi lại để tự khỏi, còn circuit breaker cố ngừng gọi để cả hai phía hồi phục, và mạch mở chính là tín hiệu dừng retry vô ích.",
          "day": 18
        },
        {
          "t": "Khi service chết giữa chừng, bảng failure mode phải ghi rõ mạch mở thì user thấy gì và ai xử lý tiếp, vì circuit breaker mà không có fallback và không có ca failure mode đi kèm thì user chỉ thấy lỗi chung chung.",
          "day": 20
        },
        {
          "t": "Khả năng chịu lỗi của toàn bộ hệ thống tăng lên nhờ circuit breaker theo cách mà timeout một mình không làm được: timeout giới hạn thiệt hại của từng request, còn circuit breaker giới hạn thiệt hại của cả một đợt lỗi kéo dài."
        }
      ],
      "shape": "trace",
      "difficulty": 2,
      "thresholds": "Ví dụ cấu hình trong tài liệu ngày 18: tỉ lệ lỗi vượt 50% trên cửa sổ 10 request gần nhất thì mở mạch 30 giây, trong 30 giây đó mọi request trả fallback ngay; sau 30 giây cho một vài request thăm dò ở trạng thái half-open, thành công thì đóng mạch lại.",
      "dontUse": "Không dùng circuit breaker mà không có fallback rõ ràng cho user, và không dùng nó cho lỗi sai dữ liệu 400: mở mạch không sửa được dữ liệu sai, chỉ làm cho mọi request hợp lệ cũng bị chặn theo.",
      "quiz": {
        "q": "Mạch đang ở trạng thái open, một user bấm thanh toán ngay lúc đó. Hệ thống có gọi tới service payment không, user thấy gì, và khi nào hệ thống mới thử gọi lại?",
        "answer": "Không gọi tới payment, user thấy ngay thông báo thanh toán tạm gián đoạn và được hướng dẫn thử lại sau. Hệ thống chỉ thử gọi lại sau thời gian nguội 30 giây, bằng một vài request thăm dò ở trạng thái half-open.",
        "why": "Trạng thái open tồn tại để ngừng việc gọi vô ích vào service đã chết; việc thử lại chỉ diễn ra có kiểm soát ở half-open, không phải bằng cách cho mọi request tiếp tục dội vào."
      }
    },
    {
      "what": "Bulkhead (vách ngăn tàu thủy: ngăn nước từ khoang thủng tràn sang khoang khác) là cách chia tài nguyên riêng cho từng dependency: mỗi dependency có pool thread hoặc connection riêng, một dependency chậm chỉ ăn hết phần của nó. Rate limiter (giới hạn tốc độ) là cách giới hạn số request trong một khoảng thời gian theo client hoặc theo dependency, quá giới hạn thì từ chối rõ ràng bằng 429 (mã trạng thái quá nhiều request) kèm header Retry-After (báo client nên chờ bao lâu rồi thử lại). Hai cơ chế này khác nhau: bulkhead khoanh vùng theo dependency, rate limiter khoanh vùng theo tốc độ.",
      "role": "Dùng chung một pool cho mọi dependency thì chỉ cần thanh toán chậm là cả email và các tính năng khác cũng chậm theo: pool chung 40 thread, payment chậm chiếm hết 40 thread đang chờ, request gửi email tới sau phải xếp hàng dù service email hoàn toàn khỏe. Tách pool riêng, ví dụ payment 20 thread và email 20 thread, thì payment chậm nhất cũng chỉ ăn hết 20 của nó, email vẫn còn 20 để chạy. Tương tự, một client quét API với hàng nghìn request mỗi phút sẽ chiếm hết tài nguyên của mọi user khác nếu không có rate limiter chặn nó ở mức 100 request mỗi phút.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Resilience > Vách ngăn và giới hạn tốc độ, kề bên pool riêng cho thanh toán, pool riêng cho email, rate limiter theo client, và thread pool chung",
      "connects": [
        {
          "t": "Circuit breaker chặn việc gọi vào một service đã chết, còn bulkhead chặn việc một service chậm ăn hết tài nguyên của các service khác, nên hai cơ chế này bổ sung cho nhau: một cái chặn theo lỗi, một cái chặn theo tài nguyên.",
          "day": 18
        },
        {
          "t": "Timeout giới hạn thời gian giữ thread của từng request, còn bulkhead giới hạn số thread mà một dependency được giữ, nên timeout mà không có bulkhead thì một dependency chậm vẫn có thể chiếm toàn bộ pool bằng nhiều request cùng lúc.",
          "day": 18
        },
        {
          "t": "Thread pool có giới hạn và chính sách từ chối là nền tảng của bulkhead: bulkhead chính là việc chia một pool chung thành nhiều pool nhỏ có chính sách từ chối riêng cho từng dependency.",
          "day": 15
        },
        {
          "t": "Tính công bằng và ổn định của toàn bộ hệ thống phụ thuộc vào hai cơ chế này: không có chúng thì một dependency chậm hoặc một client tham lam cũng đủ làm mọi user khác chậm theo dù lỗi không nằm ở phần của họ."
        }
      ],
      "shape": "compare",
      "difficulty": 2,
      "thresholds": "Ví dụ trong tài liệu ngày 18: pool riêng cho payment 20 thread và cho email 20 thread thay vì một pool chung 40 thread; rate limiter mỗi client tối đa 100 request mỗi phút, quá giới hạn thì trả 429 kèm Retry-After.",
      "dontUse": "Không dùng chung một pool cho mọi dependency khi một trong số đó có thể chậm, và không dùng rate limiter thay cho phân quyền: trả 429 cho client vượt tốc độ khác với trả 403 cho client không có quyền, và nhầm hai mã này sẽ làm frontend xử lý sai.",
      "quiz": {
        "q": "Pool chung 40 thread, payment chậm đang chiếm hết 40 thread. Một request gửi email tới lúc đó sẽ gặp chuyện gì, và nếu tách pool thành payment 20 và email 20 thì request email đó gặp chuyện gì khác?",
        "answer": "Với pool chung, request email phải xếp hàng hoặc timeout dù service email hoàn toàn khỏe, vì không còn thread trống. Với pool tách riêng, request email dùng 20 thread của email và chạy bình thường, vì phần tài nguyên của email không bị payment chiếm.",
        "why": "Bulkhead khoanh vùng thiệt hại theo dependency: lỗi ở một khoang chỉ ngập đúng khoang đó, các khoang còn lại vẫn nổi."
      }
    }
  ],
  "19":   [
    {
      "what": "CAP là định lý về hệ phân tán khi mạng chia cắt (network partition: hai phía của hệ thống không liên lạc được với nhau): hệ thống không thể cùng lúc có Consistency (nhất quán: mọi node đọc đều thấy cùng dữ liệu mới nhất), Availability (khả dụng: mọi request đều nhận được trả lời, không phải chờ hay bị từ chối) và Partition tolerance (chịu chia cắt). Vì chia cắt là chuyện chắc chắn sẽ xảy ra trong thực tế nên lựa chọn thật chỉ còn lại C hay A trong lúc chia cắt. PACELC bổ sung vế còn lại: Else (khi mạng bình thường, không chia cắt) thì hệ thống vẫn phải chọn giữa Latency (độ trễ thấp) và Consistency (nhất quán cao).",
      "role": "Không chọn rõ thì thiết kế sẽ hứa điều không thể và lỗi chỉ lộ khi mạng chia cắt thật: hai datacenter mất liên lạc, user ở phía A ghi số dư mới, user ở phía B đọc ngay lúc đó, hệ thống hoặc phải từ chối phía B (chọn C, mất A) hoặc trả số cũ cho phía B (chọn A, mất C), không có phương án thứ ba nào cho cả hai cùng đúng cùng lúc. Dấu hiệu nhận ra thiết kế chưa chọn là tài liệu hứa mọi tính năng đều vừa nhất quán vừa khả dụng vừa nhanh, và khi sự cố chia cắt xảy ra thì đội trực mới tranh cãi nên dừng nhận ghi hay cứ nhận ghi rồi hòa hợp sau.",
      "map": "Hệ thống đặt hàng > Tầng kiến trúc > Consistency > Lựa chọn CAP và PACELC, kề bên bản sao dữ liệu, cơ chế đồng bộ, tính năng ví, và tính năng feed",
      "connects": [
        {
          "t": "Strong consistency là một đầu của lựa chọn CAP: chọn nó nghĩa là chấp nhận từ chối hoặc chờ đợi trong lúc chia cắt để mọi lần đọc đều thấy mới nhất, và cái giá đó chỉ đáng trả cho những tính năng mà sai là mất tiền.",
          "day": 19
        },
        {
          "t": "Eventual consistency là đầu còn lại của lựa chọn CAP: chọn nó nghĩa là chấp nhận cửa sổ đọc cũ để hệ thống vẫn trả lời trong lúc chia cắt và đọc nhanh khi mạng bình thường, và cái giá đó chỉ chấp nhận được ở tính năng mà chậm vài giây không gây thiệt hại.",
          "day": 19
        },
        {
          "t": "Saga chạy được chính vì nó chấp nhận lựa chọn eventual của CAP: các bước của saga khớp dần theo thời gian thay vì đòi mọi service thấy cùng một trạng thái ngay lập tức như một transaction chung.",
          "day": 17
        },
        {
          "t": "Thiết kế hệ phân tán của toàn bộ hệ thống không bắt đầu bằng việc chọn một mức nhất quán cho tất cả, mà bắt đầu bằng việc chọn khác nhau cho từng tính năng dựa trên thiệt hại khi đọc cũ và thiệt hại khi bị từ chối."
        }
      ],
      "shape": "definition",
      "difficulty": 3,
      "dontUse": "Không dùng một lựa chọn CAP duy nhất cho mọi tính năng: ví tiền chọn nhất quán, feed bài viết chọn khả dụng, và ép cả hai dùng chung một mức sẽ làm một trong hai tính năng trả giá vô ích.",
      "quiz": {
        "q": "Mạng chia cắt hai phía A và B. Một hệ thống tuyên bố: trong lúc chia cắt, cả hai phía vẫn nhận ghi bình thường và mọi lần đọc sau ghi đều thấy dữ liệu mới nhất. Tuyên bố này vi phạm CAP ở chỗ nào?",
        "answer": "Vi phạm vì trong lúc chia cắt không thể vừa khả dụng ở cả hai phía vừa nhất quán: phía B không liên lạc được với phía A nên không thể biết giá trị mới nhất mà phía A vừa ghi, trừ khi phía B từ chối trả lời.",
        "why": "CAP nói rằng khi đã chia cắt thì phải hy sinh một trong hai: hoặc từ chối để giữ nhất quán, hoặc trả dữ liệu có thể cũ để giữ khả dụng; hứa cả hai là hứa điều không thể."
      }
    },
    {
      "what": "Strong consistency (nhất quán mạnh) nghĩa là sau khi một lần ghi được xác nhận thành công, mọi lần đọc sau đó, từ bất kỳ node nào, đều thấy giá trị mới nhất, không có cửa sổ nào đọc được giá trị cũ. Để giữ lời hứa đó, hệ thống phải đồng bộ trước khi trả lời, ví dụ hỏi đủ đa số bản sao (quorum: số bản sao tối thiểu phải đồng ý thì ghi mới được coi là thành công) hoặc khóa dữ liệu liên quan trong lúc ghi, nên đọc và ghi đều chậm hơn và khó mở rộng hơn.",
      "role": "Nơi cần strong là nơi đọc cũ gây thiệt hại thật: ví có 100.000 đồng, trừ 30.000 đồng xong mà lần đọc ngay sau đó vẫn thấy 100.000 đồng thì user trừ tiếp 30.000 đồng nữa và ví bị chi tiêu vượt số dư thật. Nơi không cần strong mà vẫn áp strong thì hệ thống chậm và khó scale một cách vô ích: feed bài viết và danh sách sản phẩm mà cũng bắt mọi lần đọc phải đồng bộ đa số bản sao thì mỗi lần tải feed đều chậm lại dù chậm vài giây chẳng làm ai mất tiền. Dấu hiệu nhận ra strong đang bị lạm dụng là latency tăng đều ở mọi tính năng, kể cả những tính năng mà user không hề cần dữ liệu mới nhất từng giây.",
      "map": "Hệ thống đặt hàng > Tầng kiến trúc > Consistency > Nhất quán mạnh, kề bên bảng số dư ví, transaction mạnh, cơ chế lock, và bản sao dữ liệu đồng bộ",
      "connects": [
        {
          "t": "Strong consistency là cách cụ thể hóa một đầu của lựa chọn CAP: nó trả lời câu hỏi khi mạng chia cắt thì hệ thống sẽ từ chối hay chờ đợi thay vì trả dữ liệu cũ, và câu trả lời đó là từ chối hoặc chờ.",
          "day": 19
        },
        {
          "t": "Causal consistency yếu hơn strong ở chỗ nó chỉ giữ thứ tự nguyên nhân chứ không hứa mọi lần đọc đều mới nhất, nên một hệ thống chỉ cần giữ thứ tự hiển thị mà áp strong thì đang trả giá đồng bộ cho một lời hứa mà nó không cần.",
          "day": 19
        },
        {
          "t": "Trừ tiền ví mà muốn giữ strong thì không thể thiếu lock: pessimistic lock giữ dòng số dư từ lúc đọc tới lúc ghi để không có hai lần trừ nào chen vào giữa, và lock đó chính là một phần của cái giá mà strong phải trả.",
          "day": 13
        },
        {
          "t": "Tính đúng đắn của tiền trong toàn bộ hệ thống phụ thuộc vào việc giữ strong đúng chỗ: giữ strong ở ví thì tiền không lệch, giữ strong ở mọi nơi thì hệ thống chậm tới mức user bỏ đi trước khi tiền kịp lệch."
        }
      ],
      "shape": "compare",
      "difficulty": 2,
      "dontUse": "Không dùng strong consistency cho feed, danh sách hay bất kỳ tính năng nào mà đọc cũ vài giây không gây thiệt hại: lúc đó strong chỉ làm hệ thống chậm hơn và khó scale hơn mà không cứu được đồng tiền nào.",
      "quiz": {
        "q": "Hệ thống tuyên bố dùng strong consistency cho số dư ví, nhưng một replica chưa kịp đồng bộ vẫn trả số dư cũ cho request đọc tới nó. Hệ thống đó thật sự đang giữ strong hay đã rơi xuống mức khác, và để giữ đúng strong thì request đọc đó phải làm gì?",
        "answer": "Nó đã rơi xuống eventual: strong không cho phép lần đọc nào thấy cũ sau khi ghi đã xác nhận. Để giữ đúng strong, request đọc phải chờ đồng bộ xong hoặc đọc từ node chính đã có giá trị mới, chứ không được trả số cũ từ replica chưa đồng bộ.",
        "why": "Lời hứa của strong là mọi lần đọc sau ghi đều mới, không có ngoại lệ cho replica chậm; một lần trả cũ là lời hứa đã vỡ, dù các lần đọc khác vẫn mới."
      }
    },
    {
      "what": "Eventual consistency (nhất quán cuối cùng) nghĩa là sau khi ghi, các bản sao sẽ khớp với nhau sau một lúc, nhưng ngay sau khi ghi thì người khác vẫn có thể đọc được dữ liệu cũ. Khoảng thời gian giữa lúc ghi và lúc mọi nơi thấy mới gọi là cửa sổ không nhất quán, và hệ thống phải nói rõ cửa sổ này cho user cũng như xử lý nó trong code. Hình dung giống như tin tức lan ra các chi nhánh: trụ sở biết trước, chi nhánh biết sau vài phút, và cuối cùng mọi chi nhánh đều biết cùng một tin.",
      "role": "Eventual là lựa chọn đúng cho những tính năng mà chậm vài giây không gây thiệt hại: đăng bài lúc 10:00:00, bạn ở bản sao khác thấy bài lúc 10:00:04 thì không ai mất tiền; đặt hàng xong mà trang lịch sử đơn chưa hiện đơn trong vài giây đầu thì user chỉ cần thấy dòng đang xử lý thay vì tưởng đơn đã mất. Ngược lại, không nói rõ cửa sổ này thì user tưởng bài đăng bị mất và code sai vì giả định đọc sau ghi luôn thấy mới: ví dụ code vừa tạo đơn xong đã truy vấn danh sách đơn để kiểm tra và kết luận đơn chưa tạo, rồi tạo thêm một đơn nữa. Cache cũng là một dạng eventual: dữ liệu trong cache là cũ cho tới khi hết TTL (thời gian sống) hoặc bị invalidate (xóa hiệu lực).",
      "map": "Hệ thống đặt hàng > Tầng kiến trúc > Consistency > Nhất quán cuối cùng, kề bên feed bài viết, bản sao dữ liệu đồng bộ sau, cache, và trang lịch sử đơn hàng",
      "connects": [
        {
          "t": "Eventual là một đầu của lựa chọn CAP, và chọn nó nghĩa là đã chấp nhận đánh đổi: hệ thống vẫn trả lời trong lúc chia cắt và đọc nhanh khi mạng bình thường, đổi lại là có cửa sổ đọc cũ phải quản lý.",
          "day": 19
        },
        {
          "t": "Strong consistency là đối trọng trực tiếp của eventual: nơi nào eventual chấp nhận đọc cũ thì strong cấm đọc cũ, nên hai mức này không dùng lẫn được mà phải chọn theo thiệt hại khi đọc cũ của từng tính năng.",
          "day": 19
        },
        {
          "t": "Cache là eventual thu nhỏ trong một service: dữ liệu cache cũ cho tới khi hết hạn giống như bản sao chưa đồng bộ, nên mọi bài toán invalidate của cache cũng là bài toán thu hẹp cửa sổ không nhất quán.",
          "day": 12
        },
        {
          "t": "Trải nghiệm người dùng trong toàn bộ sản phẩm khi dữ liệu chưa kịp khớp phụ thuộc vào cách hệ thống nói về cửa sổ này: hiện đang xử lý thì user chờ, hiện không có đơn thì user tưởng mất và tạo lại."
        }
      ],
      "shape": "analogy",
      "difficulty": 1,
      "thresholds": "Không có ngưỡng chuẩn chung cho cửa sổ không nhất quán: ngưỡng là cửa sổ tối đa mà chính tính năng đó chấp nhận, ví dụ feed và lịch sử đơn chấp nhận vài giây, còn số dư ví thì không chấp nhận giây nào và vì vậy không được dùng eventual.",
      "dontUse": "Không dùng eventual cho số dư ví hay tồn kho chốt đơn, nơi một lần đọc cũ cũng đủ gây trừ vượt: lúc đó phải dùng strong hoặc lock, không được an ủi bằng chuyện dữ liệu rồi sẽ khớp sau.",
      "quiz": {
        "q": "User vừa đặt hàng xong, vào trang lịch sử đơn không thấy đơn và kết luận hệ thống bị bug. Kết luận đó đã đủ căn cứ chưa, và bạn kiểm tra thêm điều gì trước khi kết luận?",
        "answer": "Chưa đủ: có thể đơn đang trong cửa sổ không nhất quán, tức là đã ghi nhưng danh sách chưa kịp đồng bộ. Kiểm tra thêm bằng cách đợi vài giây rồi tải lại, và truy vấn trực tiếp đơn theo id thay vì chỉ nhìn danh sách, vì danh sách và chi tiết có thể đồng bộ khác thời điểm.",
        "why": "Trong hệ eventual, không thấy trong danh sách ngay sau ghi là hành vi bình thường trong cửa sổ, không phải bằng chứng của bug; chỉ khi quá cửa sổ mà vẫn không thấy thì mới là lỗi thật."
      }
    },
    {
      "what": "Causal consistency (nhất quán nguyên nhân) nghĩa là các sự kiện có quan hệ nguyên nhân phải được mọi người thấy theo đúng thứ tự đó: bình luận phải hiện sau bài viết mà nó trả lời, câu trả lời phải hiện sau câu hỏi. Causal không yêu cầu mọi người thấy mọi thứ cùng một lúc như strong, và cũng không yêu cầu mọi lần đọc đều mới nhất: nó chỉ giữ thứ tự giữa những sự kiện có liên quan nguyên nhân với nhau.",
      "role": "Eventual thuần mà không giữ causal sẽ cho user thấy bình luận trước khi thấy bài gốc, và cuộc hội thoại đọc không ra nghĩa dù từng sự kiện riêng lẻ đều đã tới nơi: ví dụ bài gốc đăng 10:00, bình luận trả lời đăng 10:01, nhưng bản sao mà user đang đọc nhận được bình luận trước bài gốc nên hiển thị một câu trả lời trơ trọi không có câu hỏi. Causal sửa đúng chỗ này: nó bắt bản sao phải chờ bài gốc tới trước rồi mới hiện bình luận, dù các sự kiện không liên quan khác vẫn có thể hiện theo thứ tự bất kỳ. Dấu hiệu nhận ra causal đang thiếu là reply hiện trước câu hỏi, hoặc bình luận hiện trước bài viết gốc, trong khi dữ liệu thì không hề mất.",
      "map": "Hệ thống đặt hàng > Tầng kiến trúc > Consistency > Thứ tự nguyên nhân, kề bên feed và bình luận, hàng đợi event, bản sao dữ liệu, và cơ chế sắp xếp theo quan hệ nguyên nhân",
      "connects": [
        {
          "t": "Causal là lớp bổ sung trên nền eventual: eventual cho phép khớp chậm, còn causal bắt trong sự khớp chậm đó thì thứ tự nguyên nhân vẫn phải đúng, nên hai mức này đi cùng nhau chứ không thay thế nhau.",
          "day": 19
        },
        {
          "t": "Lựa chọn CAP và PACELC là khung để quyết định có cần causal hay không: khi đã chọn eventual để đổi lấy tốc độ và khả dụng thì causal là cách giữ cho trải nghiệm không vỡ dù dữ liệu tới chậm.",
          "day": 19
        },
        {
          "t": "Kafka giữ thứ tự trong một partition chính là một cách triển khai causal cho các event cùng một key: các event của cùng một đơn đi qua cùng một partition nên tới đích theo đúng thứ tự chúng được ghi.",
          "day": 16
        },
        {
          "t": "Tính mạch lạc của nội dung trong toàn bộ sản phẩm phụ thuộc vào causal nhiều hơn vào tốc độ: một cuộc hội thoại hiện đúng thứ tự dù chậm vài giây vẫn đọc được, còn hiện sai thứ tự dù nhanh thì vẫn khó hiểu."
        }
      ],
      "shape": "trace",
      "difficulty": 2,
      "dontUse": "Không dùng causal thay cho strong khi cần mọi người thấy cùng một giá trị mới nhất ngay lập tức, ví dụ số dư ví: causal chỉ giữ thứ tự, không giữ tính mới nhất, nên đọc sau ghi vẫn có thể thấy cũ dù thứ tự đã đúng.",
      "quiz": {
        "q": "Hai bình luận độc lập, không trả lời nhau, hiển thị đảo thứ tự cho một user. Đó có phải là vi phạm causal consistency không, và trường hợp nào mới thật sự vi phạm?",
        "answer": "Không vi phạm, vì hai bình luận độc lập không có quan hệ nguyên nhân nên thứ tự giữa chúng không bị ràng buộc. Vi phạm thật sự là khi một câu trả lời hiện trước câu hỏi mà nó trả lời, hoặc bình luận hiện trước bài viết gốc mà nó bình luận.",
        "why": "Causal chỉ ràng buộc thứ tự giữa các sự kiện có quan hệ nguyên nhân; các sự kiện độc lập có thể tới theo bất kỳ thứ tự nào mà vẫn giữ đúng causal."
      }
    }
  ],
  "20":   [
    {
      "what": "Failure mode (chế độ lỗi) là một ca lỗi được mô tả đầy đủ bằng 5 mục: chuyện gì xảy ra, user thấy gì, dữ liệu ở trạng thái gì, ai sửa và sửa bằng gì, phát hiện từ log hoặc metric nào. Một bảng failure mode là tập hợp các ca như vậy cho những lỗi đã lường trước, để lúc sự cố thật xảy ra đội trực tra bảng và làm theo thay vì đoán.",
      "role": "Bảng chỉ ghi lỗi mà không có cách phát hiện và cách sửa thì lúc 2 giờ sáng đội trực vẫn phải đoán: ví dụ ca service kho chết giữa chừng được ghi chung chung là hiếm khi xảy ra, nhưng khi nó xảy ra thật thì không ai biết user đang thấy gì, dữ liệu đang ở trạng thái nào và ai chịu trách nhiệm sửa. Ca viết đầy đủ thì khác: user thấy dòng đang xử lý đơn, dữ liệu là đơn PAID nhưng kho chưa trừ, người sửa là saga bù hoàn tiền và hủy đơn hoặc nhân viên xử lý tay nếu hàng đã giao, và phát hiện bằng alert tỉ lệ đơn PAID không có trừ kho. Dấu hiệu nhận ra bảng đang yếu là cùng một ca lỗi lặp lại mà lần nào đội trực cũng xử lý như lần đầu, vì lần trước không để lại cách sửa nào dùng được.",
      "map": "Hệ thống đặt hàng > Tầng vận hành > Bảng failure mode, kề bên alert theo metric, log và trace, quy trình bù của saga, và người trực chịu trách nhiệm sửa",
      "connects": [
        {
          "t": "Một ca trong bảng chỉ đáng tin khi nó đã được drill: drill là cách kiểm chứng xem cách sửa ghi trong bảng có thật sự chạy hay không, chứ không phải tin rằng ghi ra là sẽ chạy.",
          "day": 20
        },
        {
          "t": "Bảng failure mode là nơi ghi lại kết quả của việc rà soát giả định: mỗi giả định nguy hiểm bị gạch bỏ sẽ sinh ra ít nhất một ca trong bảng, kèm theo cơ chế phát hiện và sửa tương ứng.",
          "day": 20
        },
        {
          "t": "Khi service chết giữa chừng, circuit breaker và fallback là những gì user thấy đầu tiên, nên ca failure mode cho trường hợp này phải ghi rõ mạch mở thì fallback trả gì, chứ không chỉ ghi chung là service chết.",
          "day": 18
        },
        {
          "t": "Khả năng ứng phó sự cố của toàn bộ hệ thống được đo bằng thời gian từ lúc alert kêu tới lúc đơn về trạng thái cuối đúng, và bảng failure mode đầy đủ là thứ rút ngắn thời gian đó từ hàng giờ xuống hàng phút."
        }
      ],
      "shape": "definition",
      "difficulty": 1,
      "thresholds": "Ví dụ ca trong tài liệu ngày 20: alert khi tỉ lệ đơn PAID không có trừ kho vượt 1% trong 5 phút; một ca không có ngưỡng metric và thời gian duy trì như vậy thì chưa đủ để alert kêu đúng lúc.",
      "dontUse": "Không dùng bảng failure mode mà ca nào cũng chỉ ghi hiếm khi xảy ra và không có cách phát hiện cùng người sửa: ca như vậy lúc sự cố thật vẫn bắt đội trực đoán, và bảng đó chỉ có tác dụng trang trí.",
      "quiz": {
        "q": "Một ca trong bảng ghi đủ 4 mục: chuyện gì xảy ra, user thấy gì, dữ liệu ở trạng thái gì, phát hiện từ metric nào, nhưng thiếu mục ai sửa và sửa bằng gì. Lúc sự cố thật xảy ra lúc 2 giờ sáng, thiếu sót này gây hậu quả cụ thể gì?",
        "answer": "Không ai chịu trách nhiệm sửa và không có quy trình sửa để làm theo, nên mỗi người trực xử lý một kiểu, sự cố kéo dài, và có thể hai người cùng sửa ngược nhau trên cùng một đơn.",
        "why": "Bốn mục đầu chỉ giúp hiểu sự cố, còn mục ai sửa và sửa bằng gì mới biến hiểu biết thành hành động; thiếu nó thì bảng chỉ là tài liệu mô tả, không phải quy trình ứng phó."
      }
    },
    {
      "what": "Drill (diễn tập lỗi) là việc giả lập một ca lỗi thật trong môi trường an toàn, thường là staging, rồi ghi lại kết quả thật và so với kỳ vọng. Nếu kết quả khác kỳ vọng thì sửa thiết kế, không sửa kỳ vọng cho khớp kết quả. Drill khác với việc đọc lại thiết kế ở chỗ nó tạo ra bằng chứng chạy thật: cơ chế bù có chạy không, user thấy gì, dữ liệu về trạng thái nào.",
      "role": "Bảng failure mode và cơ chế bù mà chưa bao giờ chạy thì chỉ tồn tại trên giấy, và drill giả còn nguy hiểm hơn không drill vì nó tạo cảm giác an toàn sai: tài liệu khẳng định bù đã được thiết kế, nhưng sự cố thật xảy ra thì bù không chạy và không ai biết vì chưa ai thử. Ví dụ drill trong tài liệu: tắt service kho 5 phút ở staging, đặt 10 đơn, ghi lại bao nhiêu đơn kẹt, bù có chạy không, user thấy gì; nếu bù chỉ chạy cho 7 trên 10 đơn mà người viết sửa kỳ vọng thành 7 trên 10 thì drill đã bị biến thành thủ tục cho có. Dấu hiệu nhận ra drill giả là báo cáo drill nào cũng ghi đạt mà không có con số đo và không có thay đổi thiết kế nào sau đó.",
      "map": "Hệ thống đặt hàng > Tầng vận hành > Drill lỗi phân tán, kề bên môi trường staging, bảng failure mode, cơ chế bù của saga, và metric ghi kết quả drill",
      "connects": [
        {
          "t": "Drill kiểm chứng trực tiếp từng ca trong bảng failure mode, nên một ca chưa từng được drill thì trong bảng vẫn chỉ là dự đoán, và drill là thứ biến dự đoán đó thành bằng chứng.",
          "day": 20
        },
        {
          "t": "Sau mỗi drill, danh sách giả định nguy hiểm phải được rà lại: drill nào lộ ra một giả định vỡ thì giả định đó bị gạch và thay bằng cơ chế cụ thể, chứ không được giữ lại với lý do lần này chỉ là diễn tập.",
          "day": 20
        },
        {
          "t": "Saga và hành động bù là đối tượng drill quan trọng nhất, vì bù là cơ chế chỉ chạy khi có lỗi, và cơ chế chỉ chạy khi có lỗi mà không được drill thì lần đầu tiên nó chạy cũng chính là lần sự cố thật.",
          "day": 17
        },
        {
          "t": "Độ tin cậy đã được chứng minh của toàn bộ hệ thống khác với độ tin cậy trên giấy ở đúng một điểm: đã được chứng minh nghĩa là đã có drill với kết quả đo được, còn trên giấy nghĩa là mới chỉ có thiết kế."
        }
      ],
      "shape": "incident",
      "difficulty": 1,
      "thresholds": "Ví dụ drill trong tài liệu ngày 20: tắt service kho 5 phút ở staging, đặt 10 đơn, đếm số đơn kẹt và số lần bù chạy thành công; drill không có con số đo như vậy thì chỉ là diễn tập miệng, không phải bằng chứng.",
      "dontUse": "Không dùng drill trên production bằng cách tắt service thật khi chưa có cơ chế cô lập và rollback: drill diễn ra ở staging hoặc môi trường an toàn trước, và chỉ lên production khi đã có cách giới hạn ảnh hưởng tới user thật.",
      "quiz": {
        "q": "Drill đặt 10 đơn khi tắt kho cho kết quả bù chạy thành công 7 trên 10 đơn, trong khi kỳ vọng là 10 trên 10. Người viết báo cáo sửa kỳ vọng thành 7 trên 10 để báo cáo ghi đạt. Hành động đó đúng hay sai, và hành động đúng là gì?",
        "answer": "Sai. Hành động đúng là giữ kỳ vọng 10 trên 10, điều tra vì sao 3 đơn còn lại bù không chạy, sửa thiết kế rồi drill lại cho tới khi đạt kỳ vọng thật.",
        "why": "Drill tồn tại để phát hiện thiết kế sai, nên sửa kỳ vọng cho khớp kết quả là xóa bằng chứng duy nhất cho thấy thiết kế đang sai."
      }
    },
    {
      "what": "Xóa giả định nguy hiểm là rà lại toàn bộ thiết kế và gạch bỏ những câu bắt đầu bằng hệ thống sẽ luôn hoặc sẽ không bao giờ: message không trùng, mạng không lỗi, service luôn sống, database không bao giờ chậm. Mỗi giả định bị gạch phải được thay bằng một cơ chế cụ thể: message không trùng thì thay bằng dedup, mạng không lỗi thì thay bằng timeout và retry, service luôn sống thì thay bằng circuit breaker và fallback, database chậm thì thay bằng alert và bulkhead. Giả định nào không thay được bằng cơ chế thì phải thay bằng quy trình xử lý tay và người chịu trách nhiệm.",
      "role": "Thiết kế chỉ đúng khi mọi thứ đều tốt sẽ sập ngay khi một giả định vỡ: hệ thống chạy tốt ở demo vì demo không có consumer restart, không có mạng chập và không có service chậm, nhưng production có đủ cả ba ngay trong tuần đầu. Giả định message không trùng vỡ ngay lần consumer restart đầu tiên và làm điểm bị trừ hai lần; giả định service luôn sống vỡ ngay lần payment chậm đầu tiên và làm pool thread đầy dần. Dấu hiệu nhận ra thiết kế còn giả định nguy hiểm là trong tài liệu thiết kế có những câu như Kafka không trùng đâu, mạng nội bộ không lỗi đâu, service này không bao giờ chết đâu, mà phía sau những câu đó không có cơ chế nào.",
      "map": "Hệ thống đặt hàng > Tầng vận hành > Rà soát giả định, kề bên bảng failure mode, cơ chế dedup, timeout và circuit breaker, và alert phát hiện lỗi",
      "connects": [
        {
          "t": "Mỗi giả định bị gạch bỏ sẽ sinh ra ít nhất một ca trong bảng failure mode, vì vậy bảng failure mode đầy đủ hay không phản ánh trực tiếp việc rà soát giả định đã kỹ hay chưa.",
          "day": 20
        },
        {
          "t": "Drill là cách kiểm tra việc gạch giả định có thật hay không: giả định nào vẫn còn trong code sẽ lộ ra ngay khi drill giả lập đúng điều kiện mà giả định đó phủ nhận.",
          "day": 20
        },
        {
          "t": "Giả định message không trùng là ví dụ điển hình nhất, và cơ chế thay thế nó là idempotent consumer: thay vì hy vọng broker không giao trùng, consumer tự bảo vệ mình bằng dedup.",
          "day": 16
        },
        {
          "t": "Tư duy thiết kế cho production của toàn bộ hệ thống khác với tư duy thiết kế cho demo ở đúng điểm này: thiết kế cho production bắt đầu bằng việc liệt kê điều xấu có thể xảy ra, còn thiết kế cho demo bắt đầu bằng việc giả định điều xấu sẽ không xảy ra."
        }
      ],
      "shape": "incident",
      "difficulty": 2,
      "dontUse": "Không dùng giả định làm lý do để bỏ cơ chế phòng thủ cho luồng tiền và kho: nơi giả định vỡ là nơi mất tiền thật, nên càng là luồng quan trọng thì càng không được phép giữ giả định mà không có cơ chế thay thế.",
      "quiz": {
        "q": "Một thiết kế viết: Kafka không trùng đâu nên consumer không cần dedup. Hãy chỉ ra giả định nguy hiểm trong câu đó, giải thích vì sao nó vỡ, và nêu cơ chế thay thế.",
        "answer": "Giả định nguy hiểm là message không trùng. Nó vỡ vì Kafka và mọi broker at-least-once đều có thể giao lại sau khi consumer xử lý xong nhưng crash trước khi ack hoặc commit offset. Cơ chế thay thế là idempotent consumer với dedup key lưu cùng transaction với tác dụng nghiệp vụ.",
        "why": "Broker chỉ hứa giao ít nhất một lần chứ không hứa đúng một lần, nên mọi thiết kế dựa trên lời hứa trùng không xảy ra đều sẽ vỡ ngay lần redelivery đầu tiên."
      }
    }
  ],
  "21": [
    {
      "what": "Monolith là toàn bộ hệ thống đóng gói và triển khai thành một đơn vị duy nhất, mọi module chạy chung một tiến trình và gọi nhau trực tiếp trong bộ nhớ. Bản chất của nó không phải là code lộn xộn, mà là một khối triển khai duy nhất chứa nhiều phần nghiệp vụ khác nhau.",
      "role": "Nó giải quyết bài toán bắt đầu nhanh và vận hành đơn giản: chỉ một thứ để build, một thứ để deploy, một chỗ để xem log. Nếu để module lấn ranh giới nhau, triệu chứng là sửa một tính năng nhỏ cũng sợ vỡ tính năng khác, và càng về sau càng khó tách vì mọi thứ đã đan vào nhau.",
      "map": "Hệ thống > Tầng kiến trúc triển khai > Monolith (một deploy unit, nhiều module nghiệp vụ chạy chung tiến trình), kề bên Modular Monolith, Database dùng chung, và Load Balancer phía trước",
      "connects": [
        {
          "t": "Modular Monolith giữ một deploy unit nhưng chia module rõ ràng hơn",
          "day": 21
        },
        {
          "t": "Bounded Context giúp chia module theo nghiệp vụ thay vì theo bảng",
          "day": 22
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: monolith là lựa chọn khởi đầu trước khi cân nhắc tách service"
        }
      ]
    },
    {
      "what": "Modular Monolith vẫn là một deploy unit duy nhất, nhưng code được chia thành các module có ranh giới rõ ràng, mỗi module sở hữu dữ liệu và quy tắc riêng và chỉ giao tiếp qua cổng đã định trước. Bản chất của nó là kỷ luật ranh giới bên trong, chưa phải là hệ phân tán.",
      "role": "Nó giải quyết bài toán muốn tách sau này mà hôm nay chưa cần trả giá hệ phân tán: vẫn gọi trong tiến trình, vẫn debug trong một chỗ, vẫn deploy một lần. Nếu bỏ qua đáp án này và tách service sớm, triệu chứng là phải trả ngay giá của mạng, nhất quán yếu dần, deploy nhiều mảnh và debug xuyên service, trong khi team và tải chưa cần tới mức đó.",
      "map": "Hệ thống > Tầng kiến trúc triển khai > Modular Monolith (module Đơn hàng, module Thanh toán, module Kho trong một deploy unit), kề bên Bounded Context, Module API công khai, và Database theo module",
      "connects": [
        {
          "t": "Monolith là điểm xuất phát, modular monolith là bước kỷ luật thêm ranh giới",
          "day": 21
        },
        {
          "t": "Aggregate giúp mỗi module giữ đúng ranh giới nhất quán của mình",
          "day": 22
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: modular monolith cho phép tách module thành service sau này mà không viết lại từ đầu"
        }
      ]
    },
    {
      "what": "Microservices là cách chia hệ thống thành nhiều service triển khai độc lập, mỗi service sở hữu dữ liệu riêng, chạy riêng và giao tiếp qua mạng. Bản chất của nó là đổi sự đơn giản của một tiến trình lấy sự độc lập về triển khai và mở rộng từng phần.",
      "role": "Nó giải quyết bài toán các phần cần deploy khác nhịp, scale khác mức hoặc thuộc về team khác nhau. Nếu tách khi chưa có nhu cầu đó, triệu chứng là distributed monolith: tách về mặt deploy nhưng vẫn ràng buộc chặt về dữ liệu và luồng, sửa một chỗ vẫn phải sửa và deploy nhiều chỗ, lại thêm lỗi mạng và lỗi nhất quán.",
      "map": "Hệ thống > Tầng kiến trúc triển khai > Microservices (service Đơn hàng, service Thanh toán, service Kho, mỗi service có database riêng), kề bên API Gateway, Message Queue, và Observability xuyên service",
      "connects": [
        {
          "t": "Modular Monolith là bước trung gian nên cân nhắc trước khi tách thành microservices",
          "day": 21
        },
        {
          "t": "Saga giúp điều phối giao dịch nhiều bước khi không còn transaction chung",
          "day": 17
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: microservices chỉ đáng giá khi lợi ích độc lập lớn hơn chi phí vận hành thêm"
        }
      ]
    },
    {
      "what": "Hexagonal, còn gọi là Clean Architecture, là cách tổ chức code sao cho tầng domain ở trong cùng và không biết gì về tầng ngoài như framework, database hay giao diện. Tầng ngoài chỉ được gọi vào tầng trong qua cổng, và tầng trong trả ra qua cổng, chứ không phụ thuộc ngược lại.",
      "role": "Nó giải quyết bài toán đổi công nghệ ngoài mà không phải viết lại nghiệp vụ: đổi database hay framework thì domain vẫn nguyên. Nếu làm sai, triệu chứng là entity của tầng persistence lọt lên controller, hoặc domain import trực tiếp lớp của framework, nên đổi một thư viện cũng kéo theo sửa logic nghiệp vụ.",
      "map": "Hệ thống > Tầng kiến trúc code > Hexagonal / Clean Architecture (domain ở trong, cổng vào ra, adapter ngoài), kề bên Repository, Use Case, và Controller",
      "connects": [
        {
          "t": "Modular Monolith cần ranh giới module, và kiến trúc này giúp giữ ranh giới đó trong code",
          "day": 21
        },
        {
          "t": "Aggregate nằm ở tầng domain và không nên phụ thuộc framework hay tầng persistence",
          "day": 22
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: domain giữ quy tắc tính tiền và trạng thái đơn, bất kể dùng database hay framework nào"
        }
      ]
    }
  ],
  "22": [
    {
      "what": "Bounded Context là một phạm vi mà trong đó một từ nghiệp vụ chỉ có một nghĩa duy nhất và một model duy nhất. Cùng một từ như đơn hàng có thể mang nghĩa và trường dữ liệu khác nhau ở bán hàng và ở kế toán, nên mỗi context có model riêng của nó.",
      "role": "Nó giải quyết bài toán một model dùng chung cho mọi nơi rồi phình ra và mâu thuẫn: bên này cần trường này, bên kia cần trường khác, sửa cho bên này lại vỡ bên kia. Nếu không tách context, triệu chứng là một thực thể khổng lồ chứa đủ thứ, và mỗi thay đổi nhỏ cũng phải cân nhắc toàn hệ thống.",
      "map": "Hệ thống > Tầng domain (DDD) > Bounded Context (context Bán hàng, context Kế toán, mỗi context có model riêng), kề bên Ubiquitous Language, Domain Event, và Anti-Corruption Layer",
      "connects": [
        {
          "t": "Aggregate là đơn vị nhất quán nằm bên trong một bounded context",
          "day": 22
        },
        {
          "t": "Modular Monolith chia module theo nghiệp vụ, và bounded context là cách xác định ranh giới đó",
          "day": 21
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: bán hàng quan tâm trạng thái giao hàng, kế toán quan tâm chứng từ và doanh thu, dù cùng nói về một đơn"
        }
      ]
    },
    {
      "what": "Aggregate là một cụm gồm aggregate root cùng các entity con và value object đi kèm, có chung một ranh giới nhất quán. Mọi thay đổi từ bên ngoài chỉ được đi qua aggregate root, và transaction cũng chỉ nên ôm trọn một aggregate.",
      "role": "Nó giải quyết bài toán giữ invariant, tức là quy tắc luôn phải đúng, ví dụ tổng tiền phải bằng tổng các dòng hàng. Nếu sửa entity con trực tiếp mà không qua aggregate root, triệu chứng là invariant vỡ lặng lẽ: dòng hàng đổi nhưng tổng tiền không đổi, trạng thái đơn không còn khớp với các dòng bên trong, và lỗi chỉ lộ ra khi đối soát hoặc khi khách khiếu nại.",
      "map": "Hệ thống > Tầng domain (DDD) > Bounded Context > Aggregate (aggregate root + entity con + value object), kề bên Repository, Domain Event, và transaction boundary",
      "connects": [
        {
          "t": "Entity vs Value Object phân biệt phần nào có identity và phần nào chỉ quan trọng bởi giá trị trong aggregate",
          "day": 22
        },
        {
          "t": "Transaction boundary cho biết transaction nên dừng ở ranh giới aggregate thay vì ôm nhiều aggregate",
          "day": 9
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: đơn hàng là một aggregate, và mọi sửa dòng hàng phải đi qua đơn hàng để tổng tiền luôn đúng"
        }
      ]
    },
    {
      "what": "Entity là đối tượng có identity riêng và có vòng đời: cùng một khách hàng dù đổi địa chỉ hay đổi tên vẫn là khách hàng đó. Value Object thì ngược lại, nó chỉ quan trọng bởi giá trị của nó, không có identity riêng, ví dụ một địa chỉ hay một số tiền có cùng giá trị thì coi như giống nhau.",
      "role": "Nó giải quyết bài toán phân biệt cái gì cần theo dõi theo thời gian và cái gì chỉ cần so sánh giá trị. Nếu nhầm hai loại, triệu chứng là hoặc lưu trữ thừa identity cho thứ chỉ là giá trị, khiến code so sánh rối, hoặc coi entity như giá trị rồi làm mất dấu vết thay đổi của nó, khiến lịch sử và đối soát khó truy vết.",
      "map": "Hệ thống > Tầng domain (DDD) > Bounded Context > Aggregate (entity có identity, value object chỉ có giá trị), kề bên Aggregate Root, Repository, và Domain Event",
      "connects": [
        {
          "t": "Aggregate gom entity và value object lại dưới một ranh giới nhất quán",
          "day": 22
        },
        {
          "t": "DTO khác entity: entity là model persistence, DTO là contract trao đổi với bên ngoài",
          "day": 6
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: đơn hàng là entity có vòng đời, còn số tiền và địa chỉ giao hàng là value object đi kèm"
        }
      ]
    },
    {
      "what": "Domain Event là một sự kiện ghi lại điều đã xảy ra trong nghiệp vụ, ví dụ đơn đã được tạo hay thanh toán đã thành công, để các phần khác phản ứng mà không cần gọi trực tiếp nhau. Ubiquitous Language là ngôn ngữ chung mà cả người làm nghiệp vụ và người viết code cùng dùng, thể hiện ngay trong tên class, tên trường và tên API.",
      "role": "Nó giải quyết bài toán các module ràng buộc chặt vào nhau và ngôn ngữ trong code lệch với ngôn ngữ ngoài đời. Nếu thiếu domain event, triệu chứng là module này gọi thẳng module kia, sửa một bên kéo theo bên còn lại. Nếu thiếu ngôn ngữ chung, triệu chứng là cùng một khái niệm có nhiều tên khác nhau, khiến hiểu nhầm tích lũy qua từng lần sửa.",
      "map": "Hệ thống > Tầng domain (DDD) > Bounded Context > Domain Event và Ubiquitous Language (event đã xảy ra, tên gọi thống nhất), kề bên Aggregate, Message Queue, và Outbox",
      "connects": [
        {
          "t": "Bounded Context là nơi ngôn ngữ chung có nghĩa thống nhất, và event là cầu nối giữa các context",
          "day": 22
        },
        {
          "t": "Outbox giúp event được ghi cùng transaction với dữ liệu nghiệp vụ rồi mới gửi đi",
          "day": 17
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: khi thanh toán thành công, một event báo cho kho trừ hàng mà không cần service thanh toán biết kho làm việc ra sao"
        }
      ]
    }
  ],
  "23": [
    {
      "what": "OAuth2 Authorization Code kết hợp PKCE là luồng mà ứng dụng xin quyền thay mặt người dùng: ứng dụng đưa người dùng tới máy chủ cấp quyền, người dùng đồng ý, ứng dụng nhận một mã rồi đổi mã đó lấy token. PKCE thêm một bí mật tạm thời do ứng dụng tự sinh để chứng minh mã đó đúng là của ứng dụng đã xin, giúp luồng an toàn hơn trên ứng dụng không giữ được bí mật cố định.",
      "role": "Nó giải quyết bài toán ứng dụng cần gọi API thay mặt người dùng mà không được biết mật khẩu của họ. Nếu làm sai, triệu chứng là token cấp cho sai đối tượng, mã bị đánh chặn rồi đổi lấy token, hoặc ứng dụng tự giữ mật khẩu người dùng và trở thành điểm lộ thông tin.",
      "map": "Hệ thống > Tầng bảo mật > OAuth2 Authorization Code + PKCE (ứng dụng, máy chủ cấp quyền, API tài nguyên), kề bên OpenID Connect, Access Token, và Refresh Token",
      "connects": [
        {
          "t": "RBAC và ABAC quyết định token đó được phép làm gì sau khi đã xác thực",
          "day": 23
        },
        {
          "t": "JWT là một dạng token thường gặp trong luồng này, và cần kiểm chứng chữ ký trước khi tin nội dung",
          "day": 4
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: người dùng đăng nhập một lần rồi ứng dụng gọi API đơn hàng thay mặt họ mà không cần mật khẩu"
        }
      ]
    },
    {
      "what": "RBAC là phân quyền theo vai trò: ai có vai trò nào thì được làm những việc gắn với vai trò đó. ABAC là phân quyền theo thuộc tính: quyết định còn dựa vào thuộc tính của người dùng, của tài nguyên và của hoàn cảnh, ví dụ người đó có phải chủ sở hữu dữ liệu hay thuộc khu vực nào không.",
      "role": "Nó giải quyết bài toán ai được phép làm gì, ở mức khác nhau: vai trò đủ cho phần lớn hệ thống và dễ quản lý, thuộc tính cần khi quyền phụ thuộc vào chính dữ liệu. Nếu chỉ dùng vai trò trong khi quyền thật sự phụ thuộc dữ liệu, triệu chứng là người cùng vai trò nhưng khác chủ sở hữu vẫn thấy dữ liệu của nhau, dù giao diện đã giấu nút.",
      "map": "Hệ thống > Tầng bảo mật > Phân quyền (RBAC theo vai trò, ABAC theo thuộc tính), kề bên Authorization Filter, Ownership Check, và Policy",
      "connects": [
        {
          "t": "IDOR là lỗ hổng xảy ra khi đã kiểm tra vai trò nhưng quên kiểm tra sở hữu dữ liệu",
          "day": 23
        },
        {
          "t": "JWT mang vai trò trong token, nhưng vai trò đó vẫn phải được kiểm tra lại ở phía server",
          "day": 4
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: vai trò khách hàng cho phép xem đơn, còn thuộc tính chủ sở hữu mới quyết định xem được đơn nào"
        }
      ]
    },
    {
      "what": "IDOR là lỗ hổng khi hệ thống cho phép truy cập một đối tượng chỉ vì người gọi biết ID của nó, mà không kiểm tra người đó có quyền trên đối tượng đó hay không. Kẻ tấn công chỉ cần đổi ID trong request là đọc hoặc sửa được dữ liệu của người khác.",
      "role": "Nó là lỗi ở tầng dữ liệu, không phải ở giao diện: ẩn nút hay giấu đường dẫn ở frontend không phải là bảo mật, vì request vẫn có thể gửi trực tiếp. Nếu thiếu kiểm tra sở hữu ở service hoặc ở tầng truy vấn dữ liệu, triệu chứng là người dùng A đọc được đơn của người dùng B, và lỗi này thường không lộ ra khi chỉ test bằng tài khoản admin hay tài khoản của chính mình.",
      "map": "Hệ thống > Tầng bảo mật > IDOR (kiểm tra sở hữu ở service và repository, không chỉ ở controller), kề bên RBAC và ABAC, Authentication, và Audit Log",
      "connects": [
        {
          "t": "RBAC và ABAC cho khung phân quyền, nhưng IDOR nhắc rằng còn cần kiểm tra sở hữu từng đối tượng",
          "day": 23
        },
        {
          "t": "Luồng login phải kiểm tra đủ điều kiện trước khi cấp token, nếu không token đó vẫn có thể bị lạm dụng",
          "day": 4
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: xem đơn theo ID phải kiểm tra đơn đó thuộc về người đang gọi, trước khi trả dữ liệu"
        }
      ]
    },
    {
      "what": "Mass assignment là lỗ hổng khi server nhận toàn bộ trường mà client gửi lên rồi gán thẳng vào đối tượng nghiệp vụ, kể cả những trường client không được phép đặt. Ví dụ một form bình thường bỗng gửi thêm trường vai trò hay trường giá, và server tin luôn giá trị đó.",
      "role": "Nó giải quyết bài toán ranh giới tin cậy ở biên hệ thống: client chỉ được gửi những gì nó được phép quyết định, còn trường nhạy cảm thì server phải bỏ qua hoặc tự sinh. Nếu tin frontend, triệu chứng là người dùng tự nâng vai trò, tự sửa giá hay tự đổi trạng thái đơn chỉ bằng cách thêm trường vào request, mà giao diện không hề có ô nhập đó.",
      "map": "Hệ thống > Tầng bảo mật > Mass assignment (DTO nhận request, server tự sinh trường nhạy cảm), kề bên Validation, DTO, và Authorization",
      "connects": [
        {
          "t": "IDOR cũng là lỗi tin cậy ở biên: đều do server tin request mà không kiểm tra quyền trên dữ liệu",
          "day": 23
        },
        {
          "t": "DTO khác entity giúp chặn trường nhạy cảm ngay từ contract, thay vì để entity nhận hết",
          "day": 6
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: giá và tổng tiền phải do server tự tính lại, không được nhận từ frontend"
        }
      ]
    }
  ],
  "24": [
    {
      "what": "Đo bottleneck là việc xác định đúng chỗ nghẽn đang làm hệ thống chậm: CPU, ổ đĩa và IO, database, mạng hay lock. Mỗi loại nghẽn có dấu hiệu và công cụ đo khác nhau, nên không thể đoán bằng cảm giác.",
      "role": "Nó giải quyết bài toán tối ưu sai chỗ: tối ưu code vi mô trong khi nghẽn thật nằm ở query hay ở lock thì hệ thống vẫn chậm. Nếu bỏ qua bước đo, triệu chứng là càng sửa càng tốn công mà latency không cải thiện, hoặc thêm tài nguyên vào chỗ không nghẽn trong khi chỗ nghẽn vẫn tắc.",
      "map": "Hệ thống > Tầng hiệu năng > Đo bottleneck (CPU, IO, database, network, lock), kề bên Metrics, Load Test, và EXPLAIN",
      "connects": [
        {
          "t": "Load test và p95/p99 cho con số để thấy nghẽn đang ảnh hưởng tới bao nhiêu người dùng",
          "day": 24
        },
        {
          "t": "EXPLAIN cho biết query đang quét toàn bảng hay đang dùng index",
          "day": 8
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: khi trang danh sách chậm, phải đo xem nghẽn ở query, ở cache hay ở mạng trước khi sửa"
        }
      ]
    },
    {
      "what": "Load test là việc tạo tải giả lập để xem hệ thống chịu được tới đâu và gãy ở điểm nào. p95 và p99 là độ trễ mà 95 phần trăm và 99 phần trăm request đạt được hoặc nhanh hơn, tức là chúng mô tả trải nghiệm của nhóm người dùng chậm nhất thay vì trải nghiệm trung bình.",
      "role": "Nó giải quyết bài toán con số trung bình che giấu trải nghiệm tệ: trung bình có thể trông ổn trong khi một nhóm người dùng vẫn chờ rất lâu. Nếu chỉ nhìn trung bình, triệu chứng là báo cáo nói hệ thống nhanh nhưng khiếu nại vẫn tới từ nhóm chậm nhất, và điểm gãy thật chỉ lộ ra khi tải tăng lên.",
      "map": "Hệ thống > Tầng hiệu năng > Load test và p95/p99 (kịch bản tải, độ trễ theo phân vị, điểm gãy), kề bên Đo bottleneck, Metrics, và Alerting",
      "connects": [
        {
          "t": "Đo bottleneck xác định nguyên nhân sau khi load test chỉ ra hệ thống chậm ở đâu",
          "day": 24
        },
        {
          "t": "GC và thread pool cũng ảnh hưởng tới độ trễ ở đuôi phân phối khi tải cao",
          "day": 1
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: đợt flash sale là lúc p99 quan trọng hơn trung bình, vì nhóm chờ lâu nhất chính là nhóm dễ bỏ đơn nhất"
        }
      ]
    },
    {
      "what": "Caching nhiều tầng là việc đặt bộ nhớ đệm ở nhiều lớp: trình duyệt, CDN, gateway, bộ nhớ trong ứng dụng, Redis và cả database, mỗi tầng giữ lại kết quả hay dùng để request không phải đi tới tận nguồn. Bản chất của cache là đánh đổi tính mới của dữ liệu lấy tốc độ.",
      "role": "Nó giải quyết bài toán đọc lặp lại quá nhiều trong khi dữ liệu ít đổi, nhưng mỗi tầng đều mang bài toán invalidate riêng. Nếu invalidate sai, triệu chứng là người dùng thấy giá cũ, thấy hàng còn trong khi đã hết, hoặc tệ hơn là thấy dữ liệu của người khác vì cache key thiếu tham số phân biệt người dùng.",
      "map": "Hệ thống > Tầng hiệu năng > Caching nhiều tầng (Browser, CDN, Gateway, Application, Redis, Database), kề bên TTL, Cache Invalidate, và Cache Stampede",
      "connects": [
        {
          "t": "Scale stateless và chi phí cloud cũng dựa vào cache để giảm tải cho database trước khi thêm instance",
          "day": 24
        },
        {
          "t": "Cache-aside, TTL và eviction là quy tắc nền tảng để cache không thành dữ liệu cũ vĩnh viễn",
          "day": 12
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: trang danh sách sản phẩm có thể cache ở nhiều tầng, nhưng giá và tồn kho đổi thì phải invalidate kịp thời"
        }
      ]
    },
    {
      "what": "Scale stateless là mở rộng bằng cách thêm bản sao giống hệt nhau của service, điều chỉ làm được khi service không giữ trạng thái riêng trong bộ nhớ hay trên đĩa cục bộ. Muốn vậy, session phải đưa ra bộ nhớ dùng chung, file upload phải đưa ra kho lưu trữ đối tượng, và dữ liệu dùng chung phải nằm ở database.",
      "role": "Nó giải quyết bài toán chịu tải tăng bằng cách thêm instance, nhưng cũng đặt ra bài toán chi phí: mỗi instance, mỗi bản sao đọc và mỗi tầng cache đều tốn tiền. Nếu scale bừa, triệu chứng là hóa đơn tăng mà hệ thống vẫn chậm, điển hình là thêm instance không sửa được query chậm do thiếu index, vì mọi instance đều cùng chạy query chậm đó.",
      "map": "Hệ thống > Tầng hiệu năng và chi phí > Scale stateless và chi phí cloud (instance không trạng thái, session ngoài, kho file ngoài), kề bên Load Balancer, Read Replica, và Caching nhiều tầng",
      "connects": [
        {
          "t": "Caching nhiều tầng là phương án rẻ hơn nên cân nhắc trước khi thêm instance",
          "day": 24
        },
        {
          "t": "Docker và Kubernetes là cách đóng gói và điều phối các instance không trạng thái đó",
          "day": 26
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: mùa cao điểm cần thêm instance cho service đặt hàng, nhưng phải tính chi phí theo từng mức tải chứ không thêm vô hạn"
        }
      ]
    }
  ],
  "25": [
    {
      "what": "Ba trụ của observability là logs, metrics và traces. Logs ghi lại sự kiện đã xảy ra, metrics đếm và đo lường theo thời gian, traces theo dõi một request đi qua nhiều service. Ba thứ bổ sung cho nhau: logs kể chuyện gì, metrics cho biết mức độ, traces cho biết chuyện đó đi qua những đâu.",
      "role": "Nó giải quyết bài toán khi hệ thống lỗi lúc nửa đêm, người trực phải biết lỗi ở đâu mà không đoán mò. Nếu chỉ có một trụ, triệu chứng là hoặc thấy lỗi nhưng không biết tần suất, hoặc thấy tần suất tăng nhưng không biết request nào lỗi, hoặc có request lỗi nhưng không lần được nó đã đi qua những service nào.",
      "map": "Hệ thống > Tầng vận hành > Observability (Logs dạng structured, Metrics, Traces), kề bên Correlation ID, Alerting, và Dashboard",
      "connects": [
        {
          "t": "Correlation ID là sợi chỉ nối logs, metrics và traces của cùng một request lại với nhau",
          "day": 25
        },
        {
          "t": "Alerting dựa vào metrics và traces để kêu đúng lúc, thay vì kêu theo cảm giác",
          "day": 25
        },
        {
          "t": "Bảng failure mode cần log, metric và trace để phát hiện mỗi ca lỗi và biết ai sửa",
          "day": 20
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: khi đơn lỗi, logs cho biết lỗi gì, metrics cho biết bao nhiêu đơn lỗi, traces cho biết đơn đó kẹt ở service nào"
        }
      ]
    },
    {
      "what": "Correlation ID là một mã định danh duy nhất gắn cho một request từ lúc vào hệ thống, rồi được mang theo qua mọi service, mọi log và mọi trace liên quan tới request đó. Nhờ vậy, dù request đi qua nhiều service, người ta vẫn lần được toàn bộ chuỗi sự kiện của nó.",
      "role": "Nó giải quyết bài toán debug hệ nhiều service gần như mù khi không có điểm nối: mỗi service có log riêng, không biết log nào thuộc về cùng một request. Nếu thiếu correlation ID, triệu chứng là sự cố phải mò bằng thời gian và đoán, vừa chậm vừa dễ kết luận sai, nhất là khi nhiều request lỗi cùng lúc.",
      "map": "Hệ thống > Tầng vận hành > Correlation ID (sinh ở gateway, truyền qua header, ghi vào mọi log), kề bên Logs, Metrics, Traces, và Request Context",
      "connects": [
        {
          "t": "Ba trụ Logs, Metrics, Traces chỉ phát huy khi có correlation ID nối chúng lại",
          "day": 25
        },
        {
          "t": "Resilience cần correlation ID để lần một request lỗi qua circuit breaker và retry",
          "day": 18
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: khi khách báo đơn lỗi lúc một thời điểm cụ thể, correlation ID giúp lần từ gateway tới thanh toán và kho trong một chuỗi duy nhất"
        }
      ]
    },
    {
      "what": "Alerting là việc hệ thống tự báo khi một chỉ số vượt ngưỡng và duy trì đủ lâu, kèm theo người nhận và hành động đầu tiên cần làm. Một alert tốt báo về thứ người dùng cảm nhận được, ví dụ tỉ lệ lỗi tăng hay độ trễ p95 tăng, chứ không báo mọi biến động nhỏ.",
      "role": "Nó giải quyết bài toán phát hiện sự cố trước khi khách hàng báo hàng loạt. Nếu alert quá nhiều hoặc alert thứ không ảnh hưởng người dùng, triệu chứng là chai alert: mọi người tắt hoặc bỏ qua alert, và tới khi sự cố thật tới thì không ai phản ứng.",
      "map": "Hệ thống > Tầng vận hành > Alerting (ngưỡng, thời gian duy trì, người nhận, hành động đầu tiên), kề bên Metrics, Logs, Traces, và Runbook",
      "connects": [
        {
          "t": "Ba trụ Logs, Metrics, Traces cung cấp tín hiệu để alert dựa vào, thay vì đoán",
          "day": 25
        },
        {
          "t": "Thứ tự chẩn đoán giúp người nhận alert kiểm tra theo bằng chứng thay vì nhảy tới kết luận",
          "day": 28
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: alert nên kêu khi tỉ lệ đặt hàng lỗi tăng, kèm hướng kiểm tra đầu tiên, chứ không kêu mỗi khi một log cảnh báo xuất hiện"
        }
      ]
    },
    {
      "what": "Log cái gì và không log cái gì là quy tắc chọn nội dung ghi log: log sự kiện nghiệp vụ quan trọng và log lỗi kèm đủ context để lần ra nguyên nhân, nhưng không log mật khẩu, token hay dữ liệu nhạy cảm. Log cũng nên ở dạng có cấu trúc để máy tìm và lọc được, thay vì chỉ là câu chữ tự do.",
      "role": "Nó giải quyết bài toán log vừa đủ dùng mà không trở thành rủi ro: log thiếu thì sự cố không lần được, log thừa thì vừa tốn lưu trữ vừa lộ thông tin. Nếu log mọi thứ ở mức thông tin chung hoặc log cả stack trace dài mà không có context nghiệp vụ, triệu chứng là khi sự cố tới, người trực ngập trong log nhưng vẫn không tìm được dòng nào nói lên điều gì đã xảy ra với đơn hàng cụ thể.",
      "map": "Hệ thống > Tầng vận hành > Quy tắc log (sự kiện nghiệp vụ, lỗi kèm context, không log dữ liệu nhạy cảm), kề bên Correlation ID, Log Level, và Structured Log",
      "connects": [
        {
          "t": "Correlation ID giúp log ít nhưng vẫn lần được, vì mỗi dòng log đều gắn với một request cụ thể",
          "day": 25
        },
        {
          "t": "Secret management quy định mật khẩu và token không được xuất hiện trong log hay trong code",
          "day": 29
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: log nên ghi đơn nào, bước nào lỗi và vì sao, chứ không ghi thông tin thẻ hay token của khách"
        }
      ]
    }
  ],
  "26": [
    {
      "what": "Docker multi-stage build là cách viết Dockerfile thành nhiều stage: stage đầu dùng để build với đầy đủ công cụ, stage cuối chỉ chứa thứ cần chạy, thường là file đã build xong và môi trường chạy tối thiểu. Bản chất của nó là tách môi trường build khỏi môi trường chạy.",
      "role": "Nó giải quyết bài toán image vừa nặng vừa rủi ro: image một stage mang theo cả công cụ build và có thể mang theo cả secret dùng lúc build. Nếu nhét secret vào image, triệu chứng là bất kỳ ai lấy được image cũng lấy được secret, và xoay secret cũng không cứu được image đã phát tán.",
      "map": "Hệ thống > Tầng triển khai > Docker multi-stage build (stage build, stage runtime gọn nhẹ), kề bên Dockerfile, Image Registry, và Secret Management",
      "connects": [
        {
          "t": "CI/CD là nơi chạy multi-stage build và kiểm tra image trước khi deploy",
          "day": 26
        },
        {
          "t": "Secret management quy định secret phải cấp lúc chạy, không nhúng vào image",
          "day": 29
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: image chạy production chỉ chứa app và môi trường chạy, không chứa mã nguồn thừa hay secret"
        }
      ]
    },
    {
      "what": "Kubernetes ở mức review là hiểu các khái niệm đủ để đọc và bàn về hệ thống đang chạy trên nó: Pod là đơn vị chạy nhỏ nhất, Service là địa chỉ ổn định phía trước Pod, Deployment quản lý số bản sao và cập nhật, Ingress là cổng vào từ bên ngoài, ConfigMap và Secret tách cấu hình khỏi code, và HPA tự tăng giảm bản sao theo tải.",
      "role": "Nó giải quyết bài toán điều phối nhiều instance một cách có hệ thống, thay vì chạy tay từng container. Nếu chỉ biết tên mà không hiểu vai trò, triệu chứng là đọc sơ đồ triển khai không biết traffic đi qua đâu, không biết cấu hình nằm ở đâu, và khi Pod chết thì không biết ai chịu trách nhiệm tạo lại nó.",
      "map": "Hệ thống > Tầng triển khai > Kubernetes ở mức review (Pod, Service, Deployment, Ingress, ConfigMap, Secret, HPA), kề bên Docker, CI/CD, và Observability",
      "connects": [
        {
          "t": "Docker multi-stage build tạo ra image mà Kubernetes dùng để chạy Pod",
          "day": 26
        },
        {
          "t": "Scale stateless là điều kiện để HPA tăng giảm bản sao có ý nghĩa",
          "day": 24
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: Kubernetes giữ đủ bản sao cho service đặt hàng vào giờ cao điểm và giảm xuống khi tải thấp"
        }
      ]
    },
    {
      "what": "CI/CD là pipeline tự động đưa code từ lúc commit tới lúc chạy production qua các bước: build, test, quét bảo mật rồi mới deploy, và mỗi môi trường dev, staging, prod được tách biệt. Bản chất của nó là mọi lần deploy đều đi qua cùng một quy trình có thể lặp lại, thay vì deploy tay theo trí nhớ.",
      "role": "Nó giải quyết bài toán deploy không nhất quán và lỗi chỉ lộ ở production: pipeline bắt lỗi sớm và tạo bằng chứng trước khi deploy. Nếu pipeline chỉ có build và deploy mà không có test, health check và rollback, triệu chứng là code lỗi vẫn lên production, và khi lỗi thì không có cách quay lại nhanh.",
      "map": "Hệ thống > Tầng triển khai > CI/CD (build, test, security scan, deploy, health check, rollback), kề bên Docker, Kubernetes, và Migration",
      "connects": [
        {
          "t": "Blue-green, canary và feature flag là các chiến lược deploy mà pipeline có thể thực thi",
          "day": 26
        },
        {
          "t": "Test là bằng chứng pipeline cần có trước khi cho phép deploy",
          "day": 27
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: mỗi thay đổi đều qua pipeline giống nhau, từ kiểm tra tới deploy và kiểm tra sức khỏe sau deploy"
        }
      ]
    },
    {
      "what": "Blue-green là chạy song song bản cũ và bản mới rồi đổi toàn bộ traffic sang bản mới khi đã sẵn sàng. Canary là đổi một phần nhỏ traffic sang bản mới trước để quan sát, rồi mới tăng dần. Feature flag là bật tắt tính năng bằng cờ mà không cần deploy lại code.",
      "role": "Ba chiến lược này giải quyết bài toán deploy mà không muốn đánh cược toàn bộ người dùng vào một lần đổi: blue-green cho phép quay lại nhanh, canary phát hiện lỗi trên nhóm nhỏ, feature flag tách việc deploy code khỏi việc mở tính năng. Nếu deploy code mới trước khi migration tương thích ngược xong, triệu chứng là code mới đọc schema cũ không được hoặc code cũ đọc schema mới không được, và rollback code cũng không cứu được vì migration đã đổi schema.",
      "map": "Hệ thống > Tầng triển khai > Blue-green, canary, feature flag (đổi toàn bộ, đổi một phần, bật bằng cờ), kề bên CI/CD, Migration backward compatible, và Health Check",
      "connects": [
        {
          "t": "CI/CD là pipeline thực thi các chiến lược deploy này một cách lặp lại được",
          "day": 26
        },
        {
          "t": "Migration backward compatible là điều kiện tiên quyết: thêm cột tương thích trước, deploy code mới sau",
          "day": 11
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: tính năng thanh toán mới có thể mở cho một nhóm nhỏ trước bằng canary hoặc feature flag, thay vì mở cho tất cả ngay"
        }
      ]
    }
  ],
  "27": [
    {
      "what": "Test pyramid là hình tháp phân tầng test: tầng dưới là unit test, nhiều và nhanh, kiểm tra từng đơn vị nhỏ; tầng giữa là integration test, ít hơn nhưng thật hơn; tầng trên cùng là end-to-end test, ít nhất vì chậm và dễ vỡ. Bản chất của nó là cân bằng giữa tốc độ phản hồi và độ thật của bằng chứng.",
      "role": "Nó giải quyết bài toán test vừa đủ mà vẫn chạy nhanh: chỉ dựa vào end-to-end thì mỗi lần sửa đều chờ lâu và test hay vỡ vì lý do không liên quan, chỉ dựa vào unit thì lỗi tích hợp vẫn lọt. Nếu tháp đảo ngược, triệu chứng là bộ test chậm, giòn, và team dần bỏ chạy test thay vì sửa nó.",
      "map": "Hệ thống > Tầng kiểm chứng > Test pyramid (unit nhiều và nhanh, integration ít hơn, end-to-end ít nhất), kề bên Integration với database thật, Contract test, và CI/CD",
      "connects": [
        {
          "t": "Integration với database thật là tầng giữa của tháp, nơi lỗi persistence lộ ra",
          "day": 27
        },
        {
          "t": "Build pass không phải bằng chứng, vì build chỉ chứng minh code biên dịch được",
          "day": 28
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: tính tiền được unit test nhanh, luồng tạo đơn được integration test, còn hành trình mua hàng trọn vẹn chỉ cần ít end-to-end test"
        }
      ]
    },
    {
      "what": "Integration test với database thật là test chạy code cùng với database thật, ví dụ dùng Testcontainers để khởi động database thật trong lúc test, thay vì mock database rồi kết luận persistence đúng. Bản chất của nó là kiểm tra hành vi thật của tầng lưu trữ, gồm query, transaction và ràng buộc.",
      "role": "Nó giải quyết bài toán mock che giấu lỗi thật: mock luôn trả đúng như mình dặn, nên code sai query, sai transaction hay sai ràng buộc vẫn pass. Nếu chỉ mock database, triệu chứng là test xanh ở máy dev nhưng production vẫn lưu nửa vời, vẫn vi phạm ràng buộc, hoặc query chạy sai mà không ai biết cho tới khi dữ liệu thật vào.",
      "map": "Hệ thống > Tầng kiểm chứng > Integration với database thật (test chạy cùng database thật qua Testcontainers), kề bên Test pyramid, Transaction boundary, và Migration",
      "connects": [
        {
          "t": "Test pyramid đặt integration test ở tầng giữa, ít hơn unit nhưng thật hơn",
          "day": 27
        },
        {
          "t": "Transaction boundary chỉ chứng minh được bằng test chạy thật, xem rollback có xảy ra không",
          "day": 9
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: test tạo đơn phải chạy với database thật mới biết khi bước cuối lỗi thì các bước trước có rollback hay không"
        }
      ]
    },
    {
      "what": "Contract test là test kiểm tra contract giữa hai bên, ví dụ frontend và backend, có còn khớp nhau không: method, path, tên trường, kiểu dữ liệu và error format. Công cụ thường dùng là Pact hoặc OpenAPI, nhưng bản chất quan trọng hơn công cụ: hai bên phải thống nhất một bản contract và test theo bản đó.",
      "role": "Nó giải quyết bài toán frontend và backend lệch nhau lặng lẽ: một bên đổi tên trường, đổi kiểu hay thêm trường bắt buộc, bên kia vẫn chạy với contract cũ. Nếu không có contract test, triệu chứng là lỗi chỉ lộ khi chạy thật với nhau, thường là dữ liệu hiện sai hoặc bằng không mà không có thông báo lỗi rõ ràng.",
      "map": "Hệ thống > Tầng kiểm chứng > Contract test (OpenAPI hoặc Pact, consumer và provider), kề bên Test pyramid, DTO, và REST API",
      "connects": [
        {
          "t": "Cái gì bắt buộc test bao gồm contract, vì contract lệch là lỗi hay gặp khi nhiều bên cùng phát triển",
          "day": 27
        },
        {
          "t": "DTO là hiện thân của contract, nên contract test thường kiểm tra ngay tại ranh giới DTO",
          "day": 6
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: frontend và backend phải thống nhất contract tạo đơn trước khi mỗi bên tự phát triển"
        }
      ]
    },
    {
      "what": "Cái gì bắt buộc test là danh sách những thứ không được phép chỉ kiểm tra bằng happy path: invariant nghiệp vụ, ranh giới transaction, phân quyền, idempotency, migration và trường hợp biên như giá trị rỗng, số âm, múi giờ hay tiền lẻ. Đây là những chỗ sai thì hậu quả nặng nhất: mất tiền, mất dữ liệu hoặc lộ dữ liệu.",
      "role": "Nó giải quyết bài toán test nhiều mà vẫn bỏ sót chỗ nguy hiểm: test chỉ happy path thì luôn xanh, nhưng lỗi thật nằm ở trường hợp biên và trường hợp lỗi. Nếu thiếu những test này, triệu chứng là tính năng trông xong nhưng thanh toán trùng vẫn trừ tiền hai lần, rollback không xảy ra, hoặc người dùng vượt qua được kiểm tra phân quyền.",
      "map": "Hệ thống > Tầng kiểm chứng > Cái gì bắt buộc test (invariant, transaction, phân quyền, idempotency, migration, trường hợp biên), kề bên Test pyramid, Integration với database thật, và Contract test",
      "connects": [
        {
          "t": "Test pyramid cho biết mỗi loại test bắt buộc này nên nằm ở tầng nào",
          "day": 27
        },
        {
          "t": "IDOR và mass assignment là hai dạng phân quyền bắt buộc phải có test bằng tài khoản người khác",
          "day": 23
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: test thanh toán bắt buộc phải có case trùng request, case sai quyền và case rollback khi trừ kho lỗi"
        }
      ]
    }
  ],
  "28": [
    {
      "what": "Checklist review là danh sách kiểm tra cố định dùng mỗi khi review code, gồm contract, ranh giới tầng, auth, token storage, persistence, transaction, ErrorBoundary, hook, import, secret và test. Review theo checklist thay vì đọc lướt giúp không bỏ sót nhóm lỗi quen thuộc.",
      "role": "Nó giải quyết bài toán review bằng cảm giác: đọc lướt thì dễ tin comment và tin code nhìn có vẻ đúng, trong khi lỗi contract, lỗi auth hay lỗi persistence vẫn nằm đó. Nếu không có checklist, triệu chứng là mỗi lần review bắt một nhóm lỗi khác nhau tùy người review, và lỗi lặp lại qua nhiều lần sửa của nhiều agent.",
      "map": "Hệ thống > Tầng review > Checklist review (contract, tầng, auth, persistence, transaction, secret, test), kề bên Build pass, Thứ tự chẩn đoán, và Test",
      "connects": [
        {
          "t": "Build pass không phải bằng chứng, nên checklist phải kiểm tra cả những gì build không bắt được",
          "day": 28
        },
        {
          "t": "Contract và DTO là hai mục đầu tiên trong checklist, vì lệch contract là lỗi hay lặp lại",
          "day": 6
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: review tính năng tạo đơn phải tick đủ contract, phân quyền, persistence, transaction và test trước khi coi là xong"
        }
      ]
    },
    {
      "what": "Build pass không phải bằng chứng là nguyên tắc rằng việc code biên dịch được, hoặc frontend build xong, chỉ chứng minh code viết đúng cú pháp và import không thiếu ở mức công cụ kiểm tra được. Nó không chứng minh logic nghiệp vụ đúng, contract khớp, phân quyền đủ hay dữ liệu được lưu đúng.",
      "role": "Nó giải quyết bài toán tin nhầm khi làm việc với agent: agent báo đã xong vì build pass, nhưng tính năng tiền bạc vẫn có thể sai. Nếu coi build pass là xong, triệu chứng là lỗi chỉ lộ khi chạy thật hoặc khi dữ liệu thật vào, lúc đó sửa đã đắt hơn nhiều. Chỉ test xanh và chạy thật mới tính là bằng chứng.",
      "map": "Hệ thống > Tầng review > Build pass không phải bằng chứng (build, test, chạy thật là ba mức khác nhau), kề bên Checklist review, Test pyramid, và Thứ tự chẩn đoán",
      "connects": [
        {
          "t": "Checklist review bù cho những gì build không bắt được, như lỗi contract và lỗi logic",
          "day": 28
        },
        {
          "t": "Test pyramid cho bằng chứng mạnh hơn build, vì test kiểm tra hành vi chứ không chỉ cú pháp",
          "day": 27
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: một tính năng thanh toán chỉ được coi là xong khi test xanh và chạy thật đúng, không phải khi build pass"
        }
      ]
    },
    {
      "what": "Thứ tự chẩn đoán là thứ tự kiểm tra cố định khi sự cố xảy ra: xem banner version của server trước, rồi xem file thật trên nhánh chính sau, và chỉ nghi tới browser cache cuối cùng khi đã có bằng chứng loại trừ hai thứ trước. Bản chất của nó là không đổ lỗi cho thứ dễ đổ lỗi nhất trước khi kiểm tra thứ có bằng chứng rõ nhất.",
      "role": "Nó giải quyết bài toán chẩn đoán nhảy tới kết luận: thấy giao diện cũ là vội kết luận do cache, trong khi server chưa deploy bản mới hoặc file trên nhánh chính vốn đã sai. Nếu đảo thứ tự, triệu chứng là tốn thời gian xóa cache, đổi trình duyệt, rồi cuối cùng vẫn phải quay lại kiểm tra server và code, và có khi còn kết luận sai về nguyên nhân thật.",
      "map": "Hệ thống > Tầng review và vận hành > Thứ tự chẩn đoán (banner version server, file trên main, browser cache cuối cùng), kề bên Checklist review, Observability, và Deploy",
      "connects": [
        {
          "t": "Checklist review cũng cần thứ tự: kiểm tra bằng chứng trước, kết luận sau",
          "day": 28
        },
        {
          "t": "CI/CD và deploy quyết định banner version server đang chạy bản nào",
          "day": 26
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: khi giao diện sau deploy vẫn cũ, phải kiểm tra version server và file trên nhánh chính trước khi nói do cache"
        }
      ]
    }
  ],
  "29": [
    {
      "what": "ADR, tức Architecture Decision Record, là một tài liệu ngắn ghi lại một quyết định kiến trúc: bối cảnh lúc đó là gì, đã cân nhắc những phương án nào, vì sao chọn phương án này, phương án nào bị loại và vì sao, và hậu quả nào được chấp nhận đi kèm quyết định đó.",
      "role": "Nó giải quyết bài toán quyết định bị phá dần qua nhiều lần sửa của nhiều người: sau một thời gian không ai còn nhớ vì sao chọn như vậy, nên sửa theo cảm giác và phá vỡ lý do ban đầu. Nếu ADR chỉ ghi quyết định mà thiếu phương án bị loại và hậu quả chấp nhận, triệu chứng là người đọc sau vẫn phải hỏi lại hoặc vẫn chọn lại phương án từng bị loại vì không biết nó từng bị loại vì lý do gì.",
      "map": "Hệ thống > Tầng quyết định > ADR (bối cảnh, phương án, quyết định, phương án bị loại, hậu quả chấp nhận), kề bên Tradeoff phải ghi số, Secret management, và Code Review",
      "connects": [
        {
          "t": "Tradeoff phải ghi số là cách làm cho ADR có căn cứ đo được, thay vì chỉ cảm tính",
          "day": 29
        },
        {
          "t": "Modular Monolith hay microservices là một quyết định nên có ADR, vì nó ảnh hưởng lâu dài",
          "day": 21
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: quyết định chọn loại database hay kiến trúc triển khai phải đọc lại được sau nhiều tháng mà không cần hỏi lại người đã quyết"
        }
      ]
    },
    {
      "what": "Secret management là cách lưu trữ và cấp phát các bí mật như mật khẩu, khóa ký token hay khóa API sao cho chúng không nằm trong code, không nằm trong git và không nằm trong image. Secret được cấp qua biến môi trường hoặc kho bí mật chuyên dụng, chỉ những ai cần mới đọc được, và phải có kế hoạch xoay khi lộ.",
      "role": "Nó giải quyết bài toán lộ bí mật một lần là mất kiểm soát: secret hardcode trong code thì lịch sử git vẫn giữ nó dù đã xóa, secret trong image thì ai có image cũng có secret. Nếu không có kế hoạch xoay, triệu chứng là khi lộ secret, team không biết phải thu hồi cái gì, và việc xoay khóa ký token làm toàn bộ token cũ hết hiệu lực mà không có kế hoạch cho người dùng đăng nhập lại.",
      "map": "Hệ thống > Tầng quyết định và vận hành > Secret management (biến môi trường, kho bí mật, xoay secret), kề bên ADR, Boot-required vs degraded-if-missing, và CI/CD",
      "connects": [
        {
          "t": "Boot-required vs degraded-if-missing quyết định secret nào thiếu thì app phải dừng, secret nào thiếu thì chỉ giảm chức năng",
          "day": 29
        },
        {
          "t": "Docker multi-stage build cũng cấm nhét secret vào image, nên hai quy tắc này bổ sung cho nhau",
          "day": 26
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: khóa ký token và khóa thanh toán phải cấp lúc chạy và xoay được, không được commit vào repo"
        }
      ]
    },
    {
      "what": "Boot-required vs degraded-if-missing là cách phân loại cấu hình và dependency thành hai nhóm: nhóm bắt buộc để app khởi động và chạy đúng, và nhóm thiếu thì app vẫn chạy nhưng chỉ giảm chức năng. Ví dụ thiếu database chính thì không thể chạy, còn thiếu một dịch vụ phụ thì có thể chạy với chức năng đó bị tắt.",
      "role": "Nó giải quyết bài toán một cấu hình thiếu không quan trọng cũng làm cả app không boot, hoặc ngược lại, một cấu hình quan trọng thiếu mà app vẫn chạy nửa vời rồi lỗi lúc có request. Nếu không phân loại rõ, triệu chứng là hoặc app sập vì thứ không đáng sập, hoặc app lên nhưng request đầu tiên mới lỗi vì thiếu thứ bắt buộc mà lúc boot không kiểm tra.",
      "map": "Hệ thống > Tầng quyết định và vận hành > Boot-required vs degraded-if-missing (fail-fast cho nhóm bắt buộc, degrade rõ ràng cho nhóm còn lại), kề bên Secret management, ADR, và Fail-fast khi boot",
      "connects": [
        {
          "t": "Secret management cho biết secret nào thuộc nhóm bắt buộc và phải fail-fast khi thiếu",
          "day": 29
        },
        {
          "t": "Fail-fast khi boot là cơ chế thực thi cho nhóm boot-required",
          "day": 2
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: thiếu kết nối database đơn hàng thì app phải dừng rõ ràng, thiếu dịch vụ gửi email thì đơn vẫn tạo được nhưng báo rõ email sẽ gửi sau"
        }
      ]
    },
    {
      "what": "Tradeoff phải ghi số là nguyên tắc rằng mỗi đánh đổi đều phải kèm con số đo được: nhanh hơn bao nhiêu, tốn thêm bao nhiêu, rủi ro gì và chấp nhận tới mức nào. Nói tốt hơn mà không có số thì chỉ là cảm tính, không thể so sánh hai phương án với nhau.",
      "role": "Nó giải quyết bài toán chọn phương án theo cảm giác rồi hối hận khi chi phí lộ ra: phương án nhanh hơn nhưng tốn gấp nhiều lần, hoặc phương án rẻ hơn nhưng độ trễ tăng tới mức người dùng bỏ đi. Nếu không ghi số, triệu chứng là quyết định không thể xem lại được, và lần sau team lại tranh luận từ đầu vì không có căn cứ cũ để đối chiếu.",
      "map": "Hệ thống > Tầng quyết định > Tradeoff phải ghi số (độ trễ, chi phí, rủi ro, ngưỡng chấp nhận), kề bên ADR, Scale stateless và chi phí cloud, và Load test",
      "connects": [
        {
          "t": "ADR là nơi ghi tradeoff kèm số, để người đọc sau hiểu vì sao phương án đó thắng",
          "day": 29
        },
        {
          "t": "Scale stateless và chi phí cloud là ví dụ điển hình: thêm instance phải so chi phí với lợi ích độ trễ",
          "day": 24
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: chọn thêm cache hay thêm instance phải so chi phí và độ trễ bằng số, không chọn bằng cảm giác"
        }
      ]
    }
  ],
  "30": [
    {
      "what": "Sơ đồ kiến trúc của capstone là bản vẽ tổng thể hệ thống: client, gateway, các service, cache, database, queue, service bên ngoài và observability, trong đó mỗi mũi tên đều nói rõ giao thức và dữ liệu đi qua nó. Một sơ đồ chỉ có hộp mà không có mũi tên có chú thích thì chưa đủ để implement.",
      "role": "Nó giải quyết bài toán mỗi người hiểu hệ thống theo một cách khác nhau: team implement không phải đoán luồng dữ liệu, và người review có thể thấy ngay ranh giới module, điểm nghẽn và điểm lỗi. Nếu sơ đồ thiếu chú thích mũi tên, triệu chứng là implement xong mới phát hiện hai service hiểu khác nhau về dữ liệu trao đổi, và phải sửa lại cả hai bên.",
      "map": "Hệ thống > Tầng tổng hợp capstone > Sơ đồ kiến trúc (client, gateway, service, cache, database, queue, observability), kề bên Contract và dữ liệu, Luồng lỗi và bù, và ADR",
      "connects": [
        {
          "t": "Contract và dữ liệu là phần chi tiết hóa sơ đồ: mỗi mũi tên tương ứng với một contract cụ thể",
          "day": 30
        },
        {
          "t": "Modular Monolith hay microservices là quyết định hình dáng mà sơ đồ này phải thể hiện rõ",
          "day": 21
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: sơ đồ capstone phải cho thấy đơn đi từ client qua gateway tới service nào, qua queue nào và lưu ở database nào"
        }
      ]
    },
    {
      "what": "Contract và dữ liệu trong capstone là phần ghi rõ API chính, model dữ liệu, index, ranh giới transaction và persistence contract cho từng tính năng. Contract nói bên ngoài gọi vào ra sao và lỗi trả về thế nào, dữ liệu nói thông tin sống ở đâu và được bảo vệ bởi transaction hay cơ chế bù nào.",
      "role": "Nó giải quyết bài toán thiết kế đẹp trên sơ đồ nhưng không implement được: thiếu contract thì frontend và backend tự đoán nhau, thiếu persistence contract thì dữ liệu lại trôi về local, thiếu transaction boundary thì ghi nhiều bước lại lưu nửa vời. Nếu bỏ phần này, triệu chứng là team khác đọc thiết kế vẫn phải hỏi lại về quyết định lớn trước khi viết code.",
      "map": "Hệ thống > Tầng tổng hợp capstone > Contract và dữ liệu (OpenAPI, model, index, transaction boundary, persistence contract), kề bên Sơ đồ kiến trúc, Luồng lỗi và bù, và Migration",
      "connects": [
        {
          "t": "Luồng lỗi và bù cho biết khi contract và dữ liệu gặp lỗi thì hệ thống xử lý ra sao",
          "day": 30
        },
        {
          "t": "Contract test là cách kiểm chứng contract này không lệch khi implement",
          "day": 27
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: contract tạo đơn, thanh toán và hủy đơn phải kèm error contract và idempotency, còn dữ liệu phải kèm index và transaction boundary"
        }
      ]
    },
    {
      "what": "Luồng lỗi và bù, vận hành trong capstone là phần trả lời cho những câu hỏi ngoài happy path: thanh toán thành công nhưng trừ kho thất bại thì sao, message trùng thì sao, service chết giữa chừng thì sao, deploy và migration chạy thứ tự nào, alert nào sẽ kêu và chi phí ở từng mức tải là bao nhiêu.",
      "role": "Nó giải quyết bài toán thiết kế chỉ đẹp khi mọi thứ suôn sẻ: hệ thống thật luôn có lỗi, và không có failure mode thì lỗi sẽ được xử lý tùy hứng lúc sự cố xảy ra. Nếu thiếu phần này, triệu chứng là đơn ở trạng thái nửa vời không ai biết sửa bằng gì, message trùng trừ tiền hai lần, và chi phí chỉ lộ ra khi hóa đơn tới, trong khi rubric capstone yêu cầu có cả failure mode và chi phí.",
      "map": "Hệ thống > Tầng tổng hợp capstone > Luồng lỗi và bù, vận hành (failure mode, saga bù, deploy, migration, alert, chi phí theo mức tải), kề bên Sơ đồ kiến trúc, Contract và dữ liệu, và Observability",
      "connects": [
        {
          "t": "Contract và dữ liệu cho biết trạng thái cần bù là trạng thái nào và dữ liệu nào cần khôi phục",
          "day": 30
        },
        {
          "t": "Saga và outbox là cơ chế bù cho giao dịch nhiều bước khi không còn transaction chung",
          "day": 17
        },
        {
          "t": "Toàn bộ hệ thống đặt hàng: capstone đạt yêu cầu khi có bảng failure mode, có bù, có alert và có chi phí theo mức tải, không chỉ có luồng mua hàng thành công"
        }
      ]
    }
  ]
};
