// Giải thích khái niệm cho tab thứ 5, key theo day.id, mảng khớp đúng thứ tự khái niệm đã enrich (days.js + dayExtra.js).
// Mỗi mục: what (nó là gì), role (nhiệm vụ + triệu chứng khi sai), map (breadcrumb + thành phần kề bên), connects (>=3: cùng ngày, sang ngày khác có field day, lên hệ thống lớn hơn).
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
  "11": [
    {
      "what": "Flyway và Liquibase là công cụ quản lý thay đổi schema bằng các bản migration có phiên bản và chạy theo đúng thứ tự. Mỗi migration chỉ chạy một lần và được ghi lại, nên mọi môi trường đều đi qua cùng một lịch sử thay đổi. Bản chất của nó là biến schema thành mã nguồn có thể xem lại, thay vì để ai đó sửa tay trực tiếp trên database.",
      "role": "Nó giải quyết việc schema ở các môi trường lệch nhau mà không ai biết bản thật là gì. Nếu thiếu nó hoặc sửa tay schema production, deploy sau có thể chạy trên schema khác với schema đã test, gây lỗi khó truy vết. Triệu chứng cụ thể là code chạy tốt ở dev nhưng lỗi thiếu cột hoặc sai kiểu ở production.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Migration > Flyway/Liquibase, kề bên schema của bảng đơn hàng và sản phẩm, pipeline triển khai, script seed dữ liệu, và công cụ kiểm tra schema sau deploy",
      "connects": [
        {
          "t": "Migration backward compatible",
          "day": 11
        },
        {
          "t": "Persistence contract",
          "day": 11
        },
        {
          "t": "CI/CD và thứ tự chạy migration trong pipeline",
          "day": 26
        },
        {
          "t": "Quy trình deploy có thể lặp lại và rollback được của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Migration backward compatible là cách đổi schema theo nhiều bước mà code cũ và code mới đều chạy được trong thời gian chuyển đổi. Ví dụ thêm cột bắt buộc phải làm ba bước: thêm cột nullable trước, backfill dữ liệu, rồi mới siết thành NOT NULL. Bản chất của nó là không bao giờ bắt code và schema phải đổi đồng thời trong một lần deploy.",
      "role": "Nó giải quyết việc deploy sập giữa chừng vì code mới gặp schema cũ hoặc ngược lại. Nếu đổi kiểu hoặc xóa cột ngay trong lúc deploy, request đang chạy có thể lỗi hàng loạt và rollback code cũng không cứu được vì migration đã chạy. Triệu chứng cụ thể là deploy xong API lỗi thiếu cột hoặc dữ liệu cũ chưa có giá trị cho cột bắt buộc mới.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Migration > Thay đổi schema từng bước, kề bên code backend đang chạy, bảng đơn hàng và sản phẩm, pipeline triển khai, và kế hoạch rollback",
      "connects": [
        {
          "t": "Flyway/Liquibase",
          "day": 11
        },
        {
          "t": "Persistence contract",
          "day": 11
        },
        {
          "t": "Chiến lược blue-green, canary và feature flag khi deploy",
          "day": 26
        },
        {
          "t": "Độ tin cậy khi triển khai của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Persistence contract là cam kết bằng văn bản cho mỗi tính năng: dữ liệu sống ở đâu, thuộc entity nào, API nào đọc và ghi, đồng bộ lúc nào. Nếu không ghi rõ local-only với lý do thì mặc định dữ liệu người dùng phải lưu ở server. Bản chất của nó là buộc spec phải trả lời câu hỏi về nơi ở của dữ liệu trước khi viết code.",
      "role": "Nó giải quyết việc frontend tự chọn nơi lưu dữ liệu theo thói quen, thường là bộ nhớ cục bộ của trình duyệt. Nếu thiếu contract, dữ liệu có thể mất khi đổi thiết bị hoặc xóa bộ nhớ trình duyệt dù backend đã có sẵn API. Triệu chứng cụ thể là tính năng chạy tốt trên một máy nhưng giỏ hàng hoặc hồ sơ biến mất trên máy khác.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đặc tả tính năng > Persistence contract, kề bên entity giỏ hàng và hồ sơ người dùng, API đọc và ghi, cơ chế đồng bộ khi mất mạng, và thiết kế dữ liệu tổng thể",
      "connects": [
        {
          "t": "Bài học giỏ hàng",
          "day": 11
        },
        {
          "t": "Flyway/Liquibase",
          "day": 11
        },
        {
          "t": "Thiết kế dữ liệu tổng thể ở checkpoint tuần dữ liệu",
          "day": 14
        },
        {
          "t": "Trải nghiệm người dùng xuyên thiết bị của toàn bộ sản phẩm"
        }
      ]
    },
    {
      "what": "Bài học giỏ hàng là trường hợp backend đã có đủ API giỏ hàng nhưng frontend chỉ merge một lần lúc login rồi sau đó chỉ lưu ở máy người dùng. Nguyên nhân gốc không phải thiếu API mà là spec không bắt buộc dữ liệu sống ở đâu. Bản chất của bài học là một spec thiếu persistence contract sẽ để implementation tự quyết định nơi lưu dữ liệu.",
      "role": "Nó cho thấy hậu quả thực tế của việc bỏ trống persistence contract: dữ liệu người dùng không đồng bộ và dễ mất. Nếu lặp lại lỗi này ở wishlist hay hồ sơ, người dùng sẽ mất dữ liệu khi đổi thiết bị dù hệ thống vẫn báo thành công. Triệu chứng cụ thể là giỏ hàng đầy trên điện thoại nhưng trống trên máy tính, hoặc mất sau khi xóa bộ nhớ trình duyệt.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Giỏ hàng > Đồng bộ giỏ hàng, kề bên API giỏ hàng ở backend, bộ nhớ cục bộ của trình duyệt, luồng đăng nhập và merge giỏ, và hồ sơ người dùng",
      "connects": [
        {
          "t": "Persistence contract",
          "day": 11
        },
        {
          "t": "Migration backward compatible",
          "day": 11
        },
        {
          "t": "Thiết kế dữ liệu cho giỏ hàng ở checkpoint tuần dữ liệu",
          "day": 14
        },
        {
          "t": "Độ tin cậy của dữ liệu người dùng trong toàn bộ sản phẩm"
        }
      ]
    }
  ],
  "12": [
    {
      "what": "Cache-aside, write-through và write-behind là ba cách phân công ai chịu trách nhiệm ghi cache. Cache-aside để ứng dụng tự đọc cache, trượt thì đọc database rồi ghi lại cache. Write-through ghi database và cache cùng lúc, còn write-behind ghi cache trước rồi mới ghi database sau. Bản chất của chúng là ba cách đánh đổi khác nhau giữa tốc độ, độ đúng của dữ liệu và rủi ro mất dữ liệu.",
      "role": "Chúng giải quyết việc đọc nhanh hơn mà vẫn kiểm soát được lúc cache và database lệch nhau. Nếu chọn sai, hệ thống có thể trả dữ liệu cũ lâu hoặc mất dữ liệu tưởng là đã lưu. Triệu chứng cụ thể là giá đã đổi nhưng trang vẫn hiện giá cũ, hoặc write-behind gặp sự cố trước khi ghi database thì dữ liệu người dùng vừa lưu biến mất.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Cache > Chiến lược ghi cache, kề bên Redis, database chính, application cache, và cơ chế invalidate khi dữ liệu đổi",
      "connects": [
        {
          "t": "TTL và eviction",
          "day": 12
        },
        {
          "t": "Cache stampede",
          "day": 12
        },
        {
          "t": "Cache nhiều tầng từ trình duyệt tới database",
          "day": 24
        },
        {
          "t": "Tốc độ đọc và độ đúng của dữ liệu trong toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "TTL là thời gian sống của một mục cache, hết hạn thì lần đọc sau phải lấy lại từ nguồn thật. Eviction là chính sách đuổi mục ít dùng nhất khi cache đầy. Bản chất của hai cơ chế này là giới hạn cho cache: một giới hạn về thời gian, một giới hạn về dung lượng. Cache không có TTL thành dữ liệu cũ vĩnh viễn, cache không có giới hạn thành rò rỉ bộ nhớ.",
      "role": "Chúng giải quyết việc cache phình vô hạn và dữ liệu cũ tồn tại mãi. Nếu thiếu TTL hoặc không invalidate khi dữ liệu đổi, người dùng thấy giá cũ hoặc trạng thái hết hàng sai cả ngày. Triệu chứng cụ thể là sửa giá trong database nhưng trang vẫn hiện giá cũ, hoặc bộ nhớ của cache tăng dần cho tới khi hết bộ nhớ.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Cache > Redis (in-memory), kề bên database chính (SQL/MongoDB), application cache (Caffeine), CDN, và cơ chế invalidate",
      "connects": [
        {
          "t": "Cache-aside, write-through, write-behind",
          "day": 12
        },
        {
          "t": "Cache penetration",
          "day": 12
        },
        {
          "t": "Spec giới hạn tài nguyên cho cache",
          "day": 1
        },
        {
          "t": "Bộ nhớ và độ ổn định của toàn bộ hệ thống khi cache phình"
        }
      ]
    },
    {
      "what": "Cache stampede là hiện tượng nhiều request cùng đổ về database cùng lúc khi một mục cache hot hết hạn. Trước đó mọi request đều đọc cache nên database rảnh, ngay sau khi hết hạn mọi request đều trượt cache cùng lúc. Bản chất của nó là một điểm hết hạn chung biến thành một đợt tấn công nội bộ vào database.",
      "role": "Nó giải quyết nguy cơ database quá tải đúng lúc cache hết hạn dù lượng truy cập không tăng. Nếu không xử lý, database có thể chậm hoặc sập dây chuyền sang các tính năng khác. Triệu chứng cụ thể là database đột nhiên quá tải đúng chu kỳ hết hạn của cache, rồi tự hết khi cache được làm mới.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Cache > Làm mới cache hot, kề bên Redis, database chính, hàng đợi request đang chờ cache mới, và cơ chế làm mới sớm trước khi hết hạn",
      "connects": [
        {
          "t": "TTL và eviction",
          "day": 12
        },
        {
          "t": "Cache-aside, write-through, write-behind",
          "day": 12
        },
        {
          "t": "Timeout và circuit breaker để lỗi không lan",
          "day": 18
        },
        {
          "t": "Khả năng chịu tải đột biến của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Cache penetration là hiện tượng request hỏi key không tồn tại cứ xuyên qua cache xuống database lần nào cũng vậy. Vì key không có dữ liệu nên cache không có gì để giữ, lần sau lại trượt tiếp. Bản chất của nó là cache chỉ giúp được khi dữ liệu tồn tại, còn dữ liệu không tồn tại thì cache mặc định là vô dụng.",
      "role": "Nó giải quyết việc database bị quét bằng hàng loạt id bịa hoặc id đã xóa. Nếu không xử lý, kẻ xấu hoặc crawler có thể làm database quá tải mà cache không chặn được gì. Triệu chứng cụ thể là database chịu nhiều query cho các id không tồn tại, trong khi tỉ lệ hit của cache vẫn thấp bất thường.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Cache > Bảo vệ database khỏi key không tồn tại, kề bên Redis, database chính, lớp kiểm tra tính hợp lệ của id, và cơ chế cache kết quả rỗng",
      "connects": [
        {
          "t": "Cache-aside, write-through, write-behind",
          "day": 12
        },
        {
          "t": "TTL và eviction",
          "day": 12
        },
        {
          "t": "Rate limiter chống quét API",
          "day": 18
        },
        {
          "t": "An toàn và độ ổn định của toàn bộ hệ thống trước lưu lượng xấu"
        }
      ]
    }
  ],
  "13": [
    {
      "what": "Transaction isolation là mức độ mà một transaction được cách ly khỏi các transaction chạy cùng lúc. Mức thấp cho phép đọc lại thấy dữ liệu khác nhau giữa hai lần đọc, mức cao giữ cho lần đọc sau giống lần đọc trước nhưng đổi lấy tốc độ chậm hơn. Bản chất của nó là một thang đánh đổi: càng giống chạy tuần tự thì càng an toàn nhưng càng chậm và càng dễ deadlock. Mức mặc định của từng hệ quản trị cần kiểm chứng theo tài liệu của hệ đó.",
      "role": "Nó giải quyết việc hai transaction cùng chạm vào một tài nguyên làm kết quả sai hoặc báo cáo lệch. Nếu chọn mức quá thấp cho nghiệp vụ tiền bạc, báo cáo chạy hai lần có thể ra hai con số khác nhau trong cùng một transaction. Triệu chứng cụ thể là tổng tiền hoặc tồn kho lệch chỉ khi có nhiều request cùng lúc, còn test một mình thì luôn đúng.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Transaction > Mức isolation, kề bên transaction boundary ở service, cơ chế lock, bảng số dư và tồn kho, và query báo cáo",
      "connects": [
        {
          "t": "Lost update",
          "day": 13
        },
        {
          "t": "Optimistic lock bằng version",
          "day": 13
        },
        {
          "t": "Transaction boundary trong JPA và Hibernate",
          "day": 9
        },
        {
          "t": "Tính đúng đắn của tiền và tồn kho trong toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Lost update là hiện tượng hai request cùng đọc một giá trị, cùng sửa rồi cùng ghi đè lên nhau, làm mất một lần sửa. Ví dụ hai request cùng đọc số dư, cùng trừ một khoản, cùng ghi kết quả của riêng mình thì cuối cùng chỉ trừ một lần thay vì hai lần. Bản chất của nó là chuỗi đọc-sửa-ghi không nguyên tử, nên lần ghi sau xóa dấu vết của lần ghi trước.",
      "role": "Nó giải quyết bài toán sai số chỉ lộ khi có đồng thời, và là lý do phải có lock hoặc ghi có điều kiện. Nếu không xử lý, tiền hoặc tồn kho sẽ lệch đúng bằng một lần trừ mỗi khi hai request trùng nhau. Triệu chứng cụ thể là bán quá tồn kho hoặc số dư cao hơn thực tế, mà log tính toán của từng request nhìn riêng đều đúng.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Transaction > Xung đột ghi đồng thời, kề bên bảng số dư ví, bảng tồn kho, cơ chế lock, và transaction isolation",
      "connects": [
        {
          "t": "Transaction isolation",
          "day": 13
        },
        {
          "t": "Pessimistic lock và deadlock",
          "day": 13
        },
        {
          "t": "Race condition ở tầng ứng dụng",
          "day": 15
        },
        {
          "t": "Tính toàn vẹn của tiền và hàng hóa trong toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Optimistic lock bằng version là cách ghi có điều kiện: mỗi lần đọc kèm theo số version, lúc ghi chỉ thành công khi version chưa đổi. Nếu version đã đổi nghĩa là có người khác sửa trước, lần ghi này thất bại và người dùng được báo xung đột để thử lại. Bản chất của nó là không khóa dòng trong lúc chờ, chỉ kiểm tra ở phút cuối.",
      "role": "Nó giải quyết lost update mà không phải giữ lock lâu, nên hợp khi xung đột hiếm như sửa hồ sơ. Nếu dùng nó cho điểm nóng như vé hot hay tồn kho hot, xung đột xảy ra liên tục và người dùng thử lại hoài không xong. Triệu chứng cụ thể là tỉ lệ báo xung đột tăng cao đúng giờ cao điểm ở một mặt hàng hot.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Transaction > Lock lạc quan, kề bên cột version của bảng, transaction isolation, cơ chế retry có kiểm soát, và thông báo xung đột cho người dùng",
      "connects": [
        {
          "t": "Lost update",
          "day": 13
        },
        {
          "t": "Transaction isolation",
          "day": 13
        },
        {
          "t": "Retry chỉ an toàn khi operation idempotent",
          "day": 18
        },
        {
          "t": "Trải nghiệm người dùng khi sửa cùng một dữ liệu trong toàn bộ sản phẩm"
        }
      ]
    },
    {
      "what": "Pessimistic lock là cách khóa dòng ngay từ lúc đọc, transaction khác muốn chạm vào dòng đó phải chờ. Deadlock xảy ra khi hai transaction khóa ngược thứ tự và chờ nhau mãi, lúc đó database sẽ giết một transaction để phá vòng chờ. Bản chất của nó là trả giá bằng thời gian chờ để đổi lấy chắc chắn không ai sửa chen ngang.",
      "role": "Nó giải quyết lost update khi xung đột thường xuyên, như trừ tiền ví hay giữ ghế. Nếu giữ lock quá lâu hoặc khóa không theo một thứ tự cố định, hàng đợi kéo dài và deadlock lặp lại. Triệu chứng cụ thể là request chậm dần thành hàng đợi dài, hoặc transaction bị database hủy với lỗi deadlock đúng lúc nhiều người cùng mua một mặt hàng.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Transaction > Lock bi quan, kề bên câu lệnh khóa dòng khi đọc, bảng tồn kho và số dư, thứ tự khóa thống nhất, và cơ chế retry có giới hạn",
      "connects": [
        {
          "t": "Optimistic lock bằng version",
          "day": 13
        },
        {
          "t": "Lost update",
          "day": 13
        },
        {
          "t": "Saga khi lock một database không đủ cho nhiều service",
          "day": 17
        },
        {
          "t": "Tính đúng đắn của giao dịch trong toàn bộ hệ thống"
        }
      ]
    }
  ],
  "14": [
    {
      "what": "Chọn SQL, MongoDB hay kết hợp là quyết định gán mỗi phần dữ liệu cho loại database phù hợp với nó, thay vì ép một loại cho tất cả. SQL hợp với dữ liệu cần transaction mạnh, ràng buộc và báo cáo join, MongoDB hợp với document linh hoạt đọc theo cụm. Bản chất của nó là thừa nhận không có loại database nào tốt nhất cho mọi hình dạng dữ liệu.",
      "role": "Nó giải quyết việc thiết kế bị kẹt: hoặc transaction khó vì tách nhỏ quá, hoặc join khó vì document không hợp cho báo cáo. Nếu chọn một loại cho tất cả, có phần sẽ phải bù bằng code phức tạp và dễ sai. Triệu chứng cụ thể là báo cáo phải kéo hết dữ liệu về code để tính, hoặc luồng nhiều bước không có transaction tử tế để bảo vệ.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Thiết kế tổng thể > Lựa chọn database, kề bên bảng đơn hàng và thanh toán ở SQL, document giỏ hàng và catalog ở MongoDB, Redis cho session, và tầng cache",
      "connects": [
        {
          "t": "Transaction và cơ chế bù",
          "day": 14
        },
        {
          "t": "So sánh với thiết kế tuần trước",
          "day": 14
        },
        {
          "t": "Model embedding hay referencing của MongoDB",
          "day": 10
        },
        {
          "t": "Kiến trúc dữ liệu của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Transaction và cơ chế bù là hai cách đảm bảo luồng ghi nhiều bước không để lại trạng thái nửa vời. Transaction dùng được khi các bước cùng một database, còn cơ chế bù dùng khi các bước ở nhiều service khác nhau và không có transaction chung. Bản chất của nó là mọi luồng nhiều bước đều phải có đáp án cho câu hỏi bước giữa lỗi thì các bước trước ra sao.",
      "role": "Nó giải quyết trạng thái kẹt như thanh toán thành công nhưng trừ kho thất bại. Nếu không có transaction hoặc bù, đơn sẽ ở trạng thái vừa trả tiền vừa không giao được mà không ai biết phải hoàn tiền cho ai. Triệu chứng cụ thể là đơn ở trạng thái đã thanh toán nhưng kho không trừ, hoặc kho trừ rồi mà không có đơn.",
      "map": "Hệ thống đặt hàng > Tầng dữ liệu > Luồng nhiều bước > Transaction và bù, kề bên service thanh toán, service kho, bảng đơn hàng, và trạng thái trung gian của đơn",
      "connects": [
        {
          "t": "Chọn SQL, MongoDB hay kết hợp",
          "day": 14
        },
        {
          "t": "So sánh với thiết kế tuần trước",
          "day": 14
        },
        {
          "t": "Saga và hành động bù ở hệ phân tán",
          "day": 17
        },
        {
          "t": "Tính nhất quán của đơn hàng trong toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "So sánh với thiết kế tuần trước là bước rà lại thiết kế ngày 11 sau khi đã học thêm cache, lock và migration, rồi ghi rõ chỗ nào đã sửa và vì sao. Nó không phải chép lại thiết kế cũ cho đẹp hơn mà là kiểm tra xem kiến thức mới có làm thay đổi quyết định cũ không. Bản chất của nó là vòng lặp thiết kế: học thêm một ràng buộc thì thiết kế phải cập nhật theo.",
      "role": "Nó giải quyết việc thiết kế đứng yên trong khi hiểu biết đã thay đổi, khiến lỗi đã học vẫn nằm nguyên trong bản vẽ. Nếu bỏ qua bước này, checkpoint chỉ là bản sao của thiết kế cũ và các quyết định sai về lock hay cache không được sửa. Triệu chứng cụ thể là thiết kế ngày 14 giống hệt ngày 11 dù đã học thêm cả tuần về cache và lock.",
      "map": "Hệ thống đặt hàng > Tầng thiết kế > Checkpoint tuần dữ liệu > Rà soát thiết kế, kề bên persistence contract ngày 11, thiết kế cache ngày 12, quyết định lock ngày 13, và thiết kế dữ liệu ngày 14",
      "connects": [
        {
          "t": "Chọn SQL, MongoDB hay kết hợp",
          "day": 14
        },
        {
          "t": "Transaction và cơ chế bù",
          "day": 14
        },
        {
          "t": "Persistence contract đã viết ở tuần dữ liệu",
          "day": 11
        },
        {
          "t": "Chất lượng thiết kế của toàn bộ dự án qua các tuần"
        }
      ]
    }
  ],
  "15": [
    {
      "what": "Race condition là lỗi xảy ra khi kết quả phụ thuộc vào thứ tự chạy của các thread mà thứ tự đó không được đảm bảo. Deadlock là trạng thái các thread giữ lock và chờ lock của nhau thành vòng tròn nên không ai tiến triển được. Bản chất chung của hai lỗi này là chúng chỉ lộ khi có đồng thời, nên test chạy một lần thường vẫn pass.",
      "role": "Chúng giải quyết bài toán lỗi không tái hiện đều: code nhìn đúng nhưng sai khi đông người dùng. Nếu không nhận ra, hệ thống sẽ đếm lệch, mất cập nhật hoặc kẹt cứng mà CPU vẫn thấp. Triệu chứng cụ thể là kết quả đếm thay đổi theo mỗi lần chạy, hoặc ứng dụng kẹt không tiến triển dù không có request nào báo lỗi rõ ràng.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đồng thời > Race và deadlock, kề bên biến đếm dùng chung, cache dùng chung, thứ tự khóa, và thread pool",
      "connects": [
        {
          "t": "Thread-safe collection",
          "day": 15
        },
        {
          "t": "Thread pool",
          "day": 15
        },
        {
          "t": "Lost update ở tầng database",
          "day": 13
        },
        {
          "t": "Độ tin cậy của toàn bộ hệ thống lúc đông người dùng"
        }
      ]
    },
    {
      "what": "Thread-safe collection là các cấu trúc dữ liệu được thiết kế để nhiều thread dùng chung mà không hỏng trạng thái nội bộ. Ví dụ bộ đếm dùng phép tăng nguyên tử thay vì đọc rồi cộng rồi ghi, và cache dùng chung dùng map dành cho đồng thời thay vì map thường. Bản chất của chúng là đưa tính nguyên tử vào trong cấu trúc, thay vì trông chờ code bên ngoài khóa đúng mọi chỗ.",
      "role": "Chúng giải quyết việc map thường bị hỏng cấu trúc hoặc mất entry khi nhiều thread ghi cùng lúc. Nếu dùng sai cấu trúc, lỗi chỉ lộ lúc đông người dùng và rất khó tái hiện ở máy dev. Triệu chứng cụ thể là cache mất entry không rõ lý do, hoặc bộ đếm lệch đúng bằng số request đồng thời.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đồng thời > Cấu trúc dữ liệu an toàn, kề bên biến đếm dùng chung, cache dùng chung, thread pool, và cơ chế khóa ngắn",
      "connects": [
        {
          "t": "Race condition và deadlock",
          "day": 15
        },
        {
          "t": "Bất đồng bộ không có nghĩa là an toàn",
          "day": 15
        },
        {
          "t": "Virtual thread và shared state không an toàn",
          "day": 1
        },
        {
          "t": "Tính đúng đắn của trạng thái dùng chung trong toàn bộ ứng dụng"
        }
      ]
    },
    {
      "what": "Thread pool là một tập hợp thread có giới hạn, kèm hàng đợi có giới hạn và chính sách từ chối rõ ràng khi quá tải. Thay vì tạo thread mới cho mỗi request, hệ thống tái sử dụng thread trong pool và từ chối có kiểm soát khi pool và hàng đợi đều đầy. Bản chất của nó là đặt trần cho tài nguyên, để hệ thống chậm lại một cách có kiểm soát thay vì chết vì hết bộ nhớ.",
      "role": "Nó giải quyết việc tạo thread không giới hạn làm ứng dụng hết bộ nhớ trước khi hết CPU. Nếu không giới hạn pool và hàng đợi, traffic tăng đột biến sẽ làm ứng dụng chết thay vì chỉ trả lỗi cho một phần request. Triệu chứng cụ thể là ứng dụng hết bộ nhớ khi traffic tăng dù CPU còn rảnh, hoặc request xếp hàng vô hạn tới khi timeout hàng loạt.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đồng thời > Thread pool, kề bên hàng đợi request, timeout của client, chính sách từ chối khi đầy, và cơ chế bulkhead chia pool theo dependency",
      "connects": [
        {
          "t": "Race condition và deadlock",
          "day": 15
        },
        {
          "t": "Thread-safe collection",
          "day": 15
        },
        {
          "t": "Timeout để giải phóng thread khi dependency chậm",
          "day": 18
        },
        {
          "t": "Khả năng chịu tải của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Bất đồng bộ không có nghĩa là an toàn là nhắc nhở rằng chạy không đồng bộ chỉ thay đổi thứ tự và thời điểm chạy, không tự sửa shared state không an toàn. Hai tác vụ bất đồng bộ cùng sửa một biến chung vẫn race như hai thread bình thường. Bản chất của nó là tách hai khái niệm hay bị nhập chung: chờ IO hiệu quả và an toàn khi dùng chung dữ liệu.",
      "role": "Nó giải quyết ảo tưởng rằng cứ chuyển sang bất đồng bộ là hết race condition. Nếu tin vào ảo tưởng đó, code bất đồng bộ vẫn đếm lệch và mất cập nhật, mà lỗi còn khó tái hiện hơn vì thứ tự chạy càng không đảm bảo. Triệu chứng cụ thể là code bất đồng bộ chạy một lần đúng nhưng chạy nhiều lần lệch, giống hệt lỗi race của code đồng bộ.",
      "map": "Hệ thống đặt hàng > Tầng ứng dụng > Đồng thời > Tác vụ bất đồng bộ, kề bên biến dùng chung, thread pool chạy tác vụ nền, cơ chế khóa và phép nguyên tử, và luồng xử lý IO",
      "connects": [
        {
          "t": "Thread-safe collection",
          "day": 15
        },
        {
          "t": "Race condition và deadlock",
          "day": 15
        },
        {
          "t": "Virtual thread không sửa được code giữ lock lâu",
          "day": 1
        },
        {
          "t": "Tính đúng đắn của code bất đồng bộ trong toàn bộ ứng dụng"
        }
      ]
    }
  ],
  "16": [
    {
      "what": "Kafka là hệ thống message dạng log, chia dữ liệu thành partition và cho consumer đọc lại từ offset đã lưu. Thứ tự chỉ được đảm bảo trong một partition, và consumer group chia partition cho các consumer trong nhóm. Bản chất của nó là một luồng sự kiện có thể phát lại, hợp với dữ liệu lớn và cần phân tích lại sau.",
      "role": "Nó giải quyết việc xử lý luồng sự kiện lớn và cần replay, mà hàng đợi thông thường khó làm tốt. Nếu chọn sai key partition, thứ tự của cùng một đơn có thể lộn xộn hoặc thêm consumer cũng không tăng tốc vì partition ít hơn consumer. Triệu chứng cụ thể là thêm consumer mà tốc độ không tăng, hoặc các sự kiện của cùng một đơn xử lý sai thứ tự.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Message broker > Kafka, kề bên topic đơn hàng, consumer group, bảng lưu offset, và service kế toán hoặc phân tích log",
      "connects": [
        {
          "t": "At-least-once và idempotent consumer",
          "day": 16
        },
        {
          "t": "RabbitMQ",
          "day": 16
        },
        {
          "t": "Outbox Pattern để ghi event cùng transaction",
          "day": 17
        },
        {
          "t": "Luồng sự kiện của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "RabbitMQ là hệ thống message dạng hàng đợi, dùng exchange để định tuyến message tới queue rồi tới consumer. Message lỗi nhiều lần được đưa sang dead-letter queue để xem sau thay vì chặn queue chính. Bản chất của nó là một hệ thống giao từng message tới đúng nơi cần xử lý, hợp với task queue và định tuyến linh hoạt.",
      "role": "Nó giải quyết việc giao task tới đúng consumer và xử lý message lỗi mà không làm tắc toàn bộ. Nếu thiếu dead-letter và giới hạn retry, một message lỗi có thể chặn queue chính hoặc retry vô hạn làm đầy log. Triệu chứng cụ thể là cả queue đứng yên vì một message lỗi, hoặc log phình vì cùng một message được thử lại không ngừng.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Message broker > RabbitMQ, kề bên exchange và routing key, queue xử lý email, dead-letter queue, và consumer xử lý từng message",
      "connects": [
        {
          "t": "Kafka",
          "day": 16
        },
        {
          "t": "Khi nào gọi sync là đủ",
          "day": 16
        },
        {
          "t": "Saga choreography dùng event để nối các bước",
          "day": 17
        },
        {
          "t": "Xử lý tác vụ nền của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "At-least-once nghĩa là message có thể được giao ít nhất một lần, tức là có thể trùng khi consumer gặp sự cố sau khi xử lý nhưng trước khi xác nhận. Idempotent consumer là consumer xử lý message trùng mà không gây tác dụng phụ lần hai, thường bằng cách lưu key dedup cùng với tác dụng nghiệp vụ. Exactly-once trong thực tế rất khó và đắt, nên không nên hứa bừa. Bản chất của cặp này là chấp nhận trùng ở tầng giao message và bù lại bằng tính idempotent ở tầng xử lý.",
      "role": "Nó giải quyết việc trừ điểm, trừ tiền hay trừ kho bị nhân đôi khi message giao lại. Nếu consumer không idempotent, chỉ một lần restart đúng lúc cũng đủ làm điểm bị trừ hai lần. Triệu chứng cụ thể là điểm hoặc tiền lệch đúng bằng một lần xử lý sau khi consumer restart, dù log cho thấy không có request mới từ người dùng.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Message broker > Consumer idempotent, kề bên bảng dedup theo event id, transaction trừ điểm, dead-letter queue, và cơ chế xác nhận message",
      "connects": [
        {
          "t": "Kafka",
          "day": 16
        },
        {
          "t": "RabbitMQ",
          "day": 16
        },
        {
          "t": "Outbox Pattern và dedup khi gửi trùng",
          "day": 17
        },
        {
          "t": "Tính đúng đắn của tiền và điểm trong toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Khi nào gọi sync là đủ là nguyên tắc chọn gọi đồng bộ khi cần kết quả ngay và cần báo lỗi ngay cho người dùng. Việc nặng, không cần ngay, cần chịu tải đột biến hoặc cần retry thì mới đưa vào queue. Bản chất của nó là không phải cứ dùng queue là hiện đại, mà là chọn theo nhu cầu về thời gian trả lời của từng việc.",
      "role": "Nó giải quyết việc đưa nhầm việc cần kết quả ngay vào queue, khiến người dùng không biết thành công hay thất bại. Ngược lại, gọi sync cho việc nặng sẽ làm request timeout dù việc vẫn chạy nền. Triệu chứng cụ thể là người dùng đặt hàng xong không biết thanh toán ra sao, hoặc request timeout chỉ vì phải chờ gửi email xong mới trả lời.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Lựa chọn gọi sync hay queue, kề bên API thanh toán cần trả lời ngay, queue gửi email, queue đồng bộ kế toán, và timeout của client",
      "connects": [
        {
          "t": "RabbitMQ",
          "day": 16
        },
        {
          "t": "Kafka",
          "day": 16
        },
        {
          "t": "Timeout và retry cho lời gọi sync",
          "day": 18
        },
        {
          "t": "Trải nghiệm chờ đợi của người dùng trong toàn bộ sản phẩm"
        }
      ]
    }
  ],
  "17": [
    {
      "what": "Vấn đề 2-phase ở đây là bài toán ghi database và gửi message là hai hệ khác nhau nên không có transaction chung bảo vệ cả hai. Ghi database thành công nhưng gửi message thất bại thì bên nhận không biết, và ngược lại cũng vậy. Bản chất của nó là không thể đảm bảo hai hệ độc lập cùng thành công trong một bước nếu không có cơ chế nối chúng lại.",
      "role": "Nó giải quyết ảo tưởng rằng cứ gọi lần lượt hai thao tác là chúng sẽ cùng thành công. Nếu không có cơ chế nối, hệ thống sẽ rơi vào trạng thái nửa vời như có đơn nhưng kho không trừ, hoặc kho trừ rồi mà không có đơn. Triệu chứng cụ thể là đơn và kho lệch nhau sau một lần mạng chập, mà không có log nào cho biết phải sửa bên nào.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Giao dịch nhiều hệ > Nối database và message, kề bên bảng đơn hàng, bảng outbox, message broker, và service kho",
      "connects": [
        {
          "t": "Outbox Pattern",
          "day": 17
        },
        {
          "t": "Saga choreography vs orchestration",
          "day": 17
        },
        {
          "t": "At-least-once và idempotent consumer",
          "day": 16
        },
        {
          "t": "Tính nhất quán xuyên service của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Outbox Pattern là cách ghi dữ liệu nghiệp vụ và event vào cùng một transaction trong cùng một database, event nằm trong bảng outbox. Một worker riêng sau đó đọc outbox và gửi message, thất bại thì thử lại chứ không mất event. Bản chất của nó là biến việc gửi message thành việc đọc lại từ database, nơi transaction đã bảo vệ tính nguyên tử.",
      "role": "Nó giải quyết việc mất event khi ghi database xong nhưng gửi message thất bại giữa chừng. Nếu không có outbox, lỗi ở bước gửi là mất luôn event và không có worker nào gửi lại. Triệu chứng cụ thể là đơn đã tạo nhưng service nhận event không bao giờ nhận được gì, và chỉ phát hiện khi đối soát dữ liệu hai bên.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Giao dịch nhiều hệ > Bảng outbox, kề bên bảng đơn hàng, worker gửi message, message broker, và bảng dedup của consumer",
      "connects": [
        {
          "t": "Vấn đề 2-phase",
          "day": 17
        },
        {
          "t": "Hành động bù",
          "day": 17
        },
        {
          "t": "Transaction và cơ chế bù ở checkpoint tuần dữ liệu",
          "day": 14
        },
        {
          "t": "Độ tin cậy của event trong toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Saga choreography là kiểu mỗi service nghe event rồi tự làm bước tiếp theo, không có ai điều phối chung. Saga orchestration là kiểu một orchestrator giữ trạng thái tổng, gọi từng bước theo thứ tự và gọi bù khi lỗi. Bản chất khác nhau nằm ở chỗ trạng thái tổng nằm rải rác trong các event hay nằm tập trung ở một nơi.",
      "role": "Chúng giải quyết giao dịch nhiều bước xuyên service mà không có transaction chung. Choreography đơn giản lúc đầu nhưng khó theo dõi khi nhiều bước, lỗi ở bước giữa khó biết saga đang ở đâu và phải bù từ đâu. Orchestration dễ theo dõi hơn nhưng orchestrator thành điểm tập trung cần được chăm sóc. Triệu chứng cụ thể là saga lỗi giữa chừng mà không ai trả lời được nó đang kẹt ở bước nào.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Saga > Điều phối nhiều bước, kề bên service đơn hàng, service thanh toán, service kho, và các bước bù",
      "connects": [
        {
          "t": "Hành động bù",
          "day": 17
        },
        {
          "t": "Outbox Pattern",
          "day": 17
        },
        {
          "t": "Eventual consistency làm nền cho saga",
          "day": 19
        },
        {
          "t": "Luồng đặt hàng xuyên service của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Hành động bù là thao tác ngược lại một bước đã làm, ví dụ hoàn tiền để bù cho thanh toán, cộng lại kho để bù cho trừ kho, hủy đơn để bù cho tạo đơn. Không phải bước nào cũng bù được, như hàng đã giao vật lý thì không thể tự động thu hồi. Bản chất của nó là chấp nhận không rollback được như transaction, nên phải thiết kế sẵn đường quay lại cho từng bước.",
      "role": "Nó giải quyết trạng thái kẹt khi saga lỗi giữa chừng mà không có cách nào sửa. Nếu saga chỉ có bước thuận mà không có bước bù, lỗi ở bước cuối sẽ để lại đơn đã trả tiền nhưng không giao được. Triệu chứng cụ thể là đơn ở trạng thái không tiến cũng không lùi, và nhân viên phải sửa tay từng đơn vì không có quy trình bù.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Saga > Bước bù, kề bên service thanh toán, service kho, bảng đơn hàng và trạng thái đơn, và quy trình xử lý tay cho bước không bù được",
      "connects": [
        {
          "t": "Saga choreography vs orchestration",
          "day": 17
        },
        {
          "t": "Outbox Pattern",
          "day": 17
        },
        {
          "t": "Transaction và cơ chế bù ở checkpoint tuần dữ liệu",
          "day": 14
        },
        {
          "t": "Khả năng phục hồi của đơn hàng trong toàn bộ hệ thống"
        }
      ]
    }
  ],
  "18": [
    {
      "what": "Timeout là giới hạn thời gian chờ tối đa cho một lời gọi tới service khác, quá hạn thì ngắt và trả lỗi rõ ràng thay vì chờ vô hạn. Nó biến một dependency chậm thành một lỗi có thời hạn, để thread và connection được giải phóng. Bản chất của nó là không cho một lời gọi chậm giữ tài nguyên của mình mãi mãi.",
      "role": "Nó giải quyết việc một API chậm giữ thread và connection cho tới khi cả hệ thống nghẽn theo. Nếu không đặt timeout, pool thread sẽ đầy dần dù lượng truy cập không tăng. Triệu chứng cụ thể là thread pool đầy dần khi đối tác chậm, rồi request mới timeout hàng loạt dù CPU còn rảnh.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Resilience > Timeout, kề bên API thanh toán, thread pool, connection pool, và circuit breaker",
      "connects": [
        {
          "t": "Retry + backoff + jitter",
          "day": 18
        },
        {
          "t": "Circuit breaker (Resilience4j)",
          "day": 18
        },
        {
          "t": "Thread pool có giới hạn",
          "day": 15
        },
        {
          "t": "Độ ổn định của toàn bộ hệ thống khi dependency chậm"
        }
      ]
    },
    {
      "what": "Retry là thử lại lời gọi thất bại, backoff là tăng dần khoảng chờ giữa các lần thử, jitter là thêm ngẫu nhiên để các lần thử không rơi cùng một thời điểm. Ba thứ này đi cùng nhau vì retry ngay lập tức và đồng loạt sẽ làm service đang yếu càng yếu. Bản chất của nó là thử lại có kỷ luật, chỉ cho lỗi tạm thời và có rải thời gian.",
      "role": "Nó giải quyết việc retry vô kỷ luật tạo ra retry storm lên service đang yếu. Nếu retry cả lỗi sai dữ liệu thì chỉ tốn request vô ích, và nếu retry thao tác không idempotent thì có thể nhân đôi giao dịch. Triệu chứng cụ thể là service đang yếu nhận thêm gấp nhiều lần lưu lượng ngay sau khi lỗi, đúng lúc nó cần được giảm tải nhất.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Resilience > Retry, kề bên API thanh toán, circuit breaker, idempotency key, và hàng đợi retry",
      "connects": [
        {
          "t": "Timeout",
          "day": 18
        },
        {
          "t": "Bulkhead và rate limiter",
          "day": 18
        },
        {
          "t": "Idempotent consumer để retry không nhân đôi tác dụng",
          "day": 16
        },
        {
          "t": "Khả năng phục hồi của toàn bộ hệ thống khi lỗi tạm thời"
        }
      ]
    },
    {
      "what": "Circuit breaker là cơ chế ngắt mạch khi một dependency lỗi liên tục: thay vì tiếp tục gọi service đang chết, hệ thống trả fallback nhanh. Sau một thời gian nguội, nó cho một vài request thử lại, thành công thì đóng mạch, thất bại thì mở lại. Bản chất của nó là dừng việc gọi vô ích để cả hai phía đều có thời gian hồi phục.",
      "role": "Nó giải quyết việc lỗi lan: gọi mãi service chết sẽ làm timeout chồng timeout và nghẽn cả hệ thống gọi. Nếu không có fallback rõ ràng, người dùng chỉ thấy lỗi chung chung thay vì biết chuyện gì đang xảy ra. Triệu chứng cụ thể là mọi request đều chờ tới timeout dù service đích đã chết rõ ràng, và hệ thống gọi cũng chậm theo.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Resilience > Circuit breaker, kề bên API thanh toán, timeout, fallback cho người dùng, và metric tỉ lệ lỗi",
      "connects": [
        {
          "t": "Timeout",
          "day": 18
        },
        {
          "t": "Retry + backoff + jitter",
          "day": 18
        },
        {
          "t": "Failure mode khi service chết giữa chừng",
          "day": 20
        },
        {
          "t": "Khả năng chịu lỗi của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Bulkhead là vách ngăn tài nguyên: chia pool riêng cho từng dependency để một dependency chậm không ăn hết thread của tất cả. Rate limiter là giới hạn tốc độ request theo client hoặc theo dependency, quá giới hạn thì từ chối rõ ràng. Bản chất chung của hai cơ chế này là khoanh vùng thiệt hại, để lỗi ở một chỗ không lan thành lỗi của mọi chỗ.",
      "role": "Chúng giải quyết việc một dependency chậm hoặc một client quét API làm nghẽn cho mọi người khác. Nếu dùng chung một pool cho mọi dependency, chỉ cần thanh toán chậm là cả email và các tính năng khác cũng chậm theo. Triệu chứng cụ thể là một service chậm làm mọi tính năng chậm theo, hoặc một client quét API làm người dùng khác không gọi được.",
      "map": "Hệ thống đặt hàng > Tầng tích hợp > Resilience > Vách ngăn và giới hạn tốc độ, kề bên pool riêng cho thanh toán, pool riêng cho email, rate limiter theo client, và thread pool chung",
      "connects": [
        {
          "t": "Circuit breaker (Resilience4j)",
          "day": 18
        },
        {
          "t": "Timeout",
          "day": 18
        },
        {
          "t": "Thread pool có giới hạn và chính sách từ chối",
          "day": 15
        },
        {
          "t": "Tính công bằng và ổn định của toàn bộ hệ thống"
        }
      ]
    }
  ],
  "19": [
    {
      "what": "CAP nói rằng khi mạng chia cắt, hệ thống phải chọn giữa nhất quán và khả dụng, không thể có cả hai cùng lúc. PACELC bổ sung rằng khi mạng bình thường, hệ thống vẫn phải đánh đổi giữa độ trễ và nhất quán. Bản chất của cặp này là mọi hệ phân tán đều phải chọn, và lựa chọn đó nên khác nhau theo từng tính năng chứ không phải một lựa chọn cho tất cả.",
      "role": "Nó giải quyết ảo tưởng rằng hệ thống có thể luôn nhất quán, luôn khả dụng và luôn nhanh cùng lúc. Nếu không chọn rõ, thiết kế sẽ hứa điều không thể và lỗi chỉ lộ khi mạng chia cắt thật. Triệu chứng cụ thể là khi mạng chia cắt, hệ thống hoặc dừng nhận ghi mà không ai lường trước, hoặc nhận ghi rồi dữ liệu hai phía lệch nhau mà không có kế hoạch hòa hợp.",
      "map": "Hệ thống đặt hàng > Tầng kiến trúc > Consistency > Lựa chọn CAP và PACELC, kề bên bản sao dữ liệu, cơ chế đồng bộ, tính năng ví, và tính năng feed",
      "connects": [
        {
          "t": "Strong consistency",
          "day": 19
        },
        {
          "t": "Eventual consistency",
          "day": 19
        },
        {
          "t": "Saga cần eventual consistency để chạy nhiều bước",
          "day": 17
        },
        {
          "t": "Thiết kế hệ phân tán của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Strong consistency nghĩa là sau khi ghi xong, mọi lần đọc sau đều thấy dữ liệu mới nhất, không có cửa sổ đọc dữ liệu cũ. Để làm được điều đó, hệ thống phải đồng bộ mạnh trước khi trả lời, nên đọc chậm hơn và khó mở rộng hơn. Bản chất của nó là ưu tiên đúng ngay lập tức hơn là nhanh và dễ scale.",
      "role": "Nó giải quyết những nơi sai là mất tiền, như số dư ví: đọc ra số cũ sau khi trừ sẽ khiến người dùng trừ tiếp và làm âm ví. Nếu đòi strong cho mọi thứ, hệ thống sẽ chậm và khó scale một cách vô ích ở những tính năng không cần. Triệu chứng cụ thể là số dư đọc ra cũ ngay sau khi trừ, hoặc hệ thống chậm hẳn chỉ vì áp mức nhất quán mạnh cho cả feed và danh sách.",
      "map": "Hệ thống đặt hàng > Tầng kiến trúc > Consistency > Nhất quán mạnh, kề bên bảng số dư ví, transaction mạnh, cơ chế lock, và bản sao dữ liệu đồng bộ",
      "connects": [
        {
          "t": "CAP và PACELC",
          "day": 19
        },
        {
          "t": "Causal consistency",
          "day": 19
        },
        {
          "t": "Pessimistic lock cho trừ tiền ví",
          "day": 13
        },
        {
          "t": "Tính đúng đắn của tiền trong toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Eventual consistency nghĩa là sau khi ghi, dữ liệu sẽ khớp sau một lúc, nhưng ngay sau khi ghi người khác có thể đọc dữ liệu cũ. Khoảng thời gian đó gọi là cửa sổ không nhất quán, và hệ thống phải nói rõ cho người dùng cũng như xử lý trong code. Bản chất của nó là chấp nhận chậm khớp một chút để đổi lấy tốc độ và khả năng mở rộng.",
      "role": "Nó giải quyết việc scale cho những tính năng mà chậm vài giây không gây thiệt hại, như feed bài viết. Nếu không nói rõ cửa sổ này, người dùng sẽ tưởng bài đăng bị mất và code sẽ sai vì giả định đọc sau ghi luôn thấy mới. Triệu chứng cụ thể là vừa đăng bài xong mà bạn bè chưa thấy ngay, hoặc vừa đặt hàng xong mà trang lịch sử đơn chưa hiện đơn.",
      "map": "Hệ thống đặt hàng > Tầng kiến trúc > Consistency > Nhất quán cuối cùng, kề bên feed bài viết, bản sao dữ liệu đồng bộ sau, cache, và trang lịch sử đơn hàng",
      "connects": [
        {
          "t": "CAP và PACELC",
          "day": 19
        },
        {
          "t": "Strong consistency",
          "day": 19
        },
        {
          "t": "Cache cũng là một dạng eventual consistency",
          "day": 12
        },
        {
          "t": "Trải nghiệm người dùng trong toàn bộ sản phẩm khi dữ liệu chưa kịp khớp"
        }
      ]
    },
    {
      "what": "Causal consistency nghĩa là các sự kiện có quan hệ nguyên nhân phải được thấy theo đúng thứ tự đó. Bình luận phải hiện sau bài viết mà nó trả lời, câu trả lời phải hiện sau câu hỏi. Bản chất của nó là giữ thứ tự nguyên nhân, dù không yêu cầu mọi người thấy mọi thứ cùng một lúc như strong consistency.",
      "role": "Nó giải quyết việc thứ tự hiển thị bị đảo làm người dùng khó hiểu, dù từng sự kiện riêng lẻ đều đã tới nơi. Nếu hệ eventual mà không giữ causal, người dùng có thể thấy bình luận trước khi thấy bài gốc. Triệu chứng cụ thể là reply hiện trước câu hỏi, hoặc bình luận hiện trước bài viết gốc, khiến cuộc hội thoại đọc không ra nghĩa.",
      "map": "Hệ thống đặt hàng > Tầng kiến trúc > Consistency > Thứ tự nguyên nhân, kề bên feed và bình luận, hàng đợi event, bản sao dữ liệu, và cơ chế sắp xếp theo quan hệ nguyên nhân",
      "connects": [
        {
          "t": "Eventual consistency",
          "day": 19
        },
        {
          "t": "CAP và PACELC",
          "day": 19
        },
        {
          "t": "Kafka giữ thứ tự trong một partition",
          "day": 16
        },
        {
          "t": "Tính mạch lạc của nội dung trong toàn bộ sản phẩm"
        }
      ]
    }
  ],
  "20": [
    {
      "what": "Failure mode là một ca lỗi được mô tả đầy đủ: chuyện gì xảy ra, người dùng thấy gì, dữ liệu ở trạng thái gì, ai sửa và sửa bằng gì, phát hiện từ log hoặc metric nào. Một bảng failure mode là tập hợp các ca như vậy cho những lỗi đã lường trước. Bản chất của nó là biến sự cố từ chuyện đoán mò thành chuyện tra bảng và làm theo.",
      "role": "Nó giải quyết việc lúc sự cố thật xảy ra, không ai biết phải làm gì dù lỗi đã từng được nghĩ tới. Nếu bảng chỉ ghi lỗi hiếm khi xảy ra mà không có cách phát hiện và cách sửa, lúc 2 giờ sáng đội trực vẫn phải đoán. Triệu chứng cụ thể là sự cố kéo dài vì mỗi người xử lý một kiểu, hoặc cùng một ca lỗi lặp lại mà lần nào cũng xử lý như lần đầu.",
      "map": "Hệ thống đặt hàng > Tầng vận hành > Bảng failure mode, kề bên alert theo metric, log và trace, quy trình bù của saga, và người trực chịu trách nhiệm sửa",
      "connects": [
        {
          "t": "Drill",
          "day": 20
        },
        {
          "t": "Xóa giả định nguy hiểm",
          "day": 20
        },
        {
          "t": "Circuit breaker và fallback cho service chết",
          "day": 18
        },
        {
          "t": "Khả năng ứng phó sự cố của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Drill là việc giả lập một ca lỗi thật trong môi trường an toàn rồi ghi lại kết quả thật, sau đó so với kỳ vọng. Nếu kết quả khác kỳ vọng thì sửa thiết kế, không sửa kỳ vọng cho khớp kết quả. Bản chất của nó là kiểm chứng bằng hành động thay vì tin rằng thiết kế trên giấy sẽ chạy đúng khi lỗi thật.",
      "role": "Nó giải quyết việc bảng failure mode và cơ chế bù chỉ tồn tại trên giấy mà chưa bao giờ chạy. Nếu drill làm cho có và ghi đạt dù bù không chạy, drill giả còn nguy hiểm hơn không drill vì tạo cảm giác an toàn sai. Triệu chứng cụ thể là sự cố thật xảy ra và cơ chế bù không chạy, dù tài liệu khẳng định nó đã được thiết kế.",
      "map": "Hệ thống đặt hàng > Tầng vận hành > Drill lỗi phân tán, kề bên môi trường staging, bảng failure mode, cơ chế bù của saga, và metric ghi kết quả drill",
      "connects": [
        {
          "t": "Failure mode",
          "day": 20
        },
        {
          "t": "Xóa giả định nguy hiểm",
          "day": 20
        },
        {
          "t": "Saga và hành động bù cần được drill",
          "day": 17
        },
        {
          "t": "Độ tin cậy đã được chứng minh của toàn bộ hệ thống"
        }
      ]
    },
    {
      "what": "Xóa giả định nguy hiểm là rà lại thiết kế và gạch bỏ những giả định như message không trùng, mạng không lỗi, service luôn sống, database không bao giờ chậm. Mỗi giả định bị gạch phải được thay bằng một cơ chế cụ thể như dedup, timeout, retry, circuit breaker, fallback hoặc alert. Bản chất của nó là thiết kế cho điều kiện xấu, chứ không phải thiết kế cho demo khi mọi thứ đều tốt.",
      "role": "Nó giải quyết việc thiết kế chỉ đúng khi mọi thứ đều tốt, nên sập ngay khi một giả định vỡ. Nếu giữ giả định nguy hiểm, lỗi sẽ không được xử lý mà chỉ được hy vọng là không xảy ra. Triệu chứng cụ thể là hệ thống chạy tốt ở demo nhưng lỗi dây chuyền trong production ngay khi có một service chậm hoặc một message trùng đầu tiên.",
      "map": "Hệ thống đặt hàng > Tầng vận hành > Rà soát giả định, kề bên bảng failure mode, cơ chế dedup, timeout và circuit breaker, và alert phát hiện lỗi",
      "connects": [
        {
          "t": "Failure mode",
          "day": 20
        },
        {
          "t": "Drill",
          "day": 20
        },
        {
          "t": "Idempotent consumer thay cho giả định message không trùng",
          "day": 16
        },
        {
          "t": "Tư duy thiết kế cho production của toàn bộ hệ thống"
        }
      ]
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
