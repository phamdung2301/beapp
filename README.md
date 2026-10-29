# BEApp — 30 ngày Backend Senior

Web học Java backend hướng senior theo từng ngày, dùng như app trên laptop
bằng cách cài PWA: mở web bằng Chrome/Edge rồi chọn Install app, biểu tượng
sẽ xuất hiện ngoài desktop/taskbar và mở thành cửa sổ riêng, chạy offline.

Nguồn nội dung: lộ trình 30 ngày trong Google Doc "Theory domains for backend dev"
(32 tab: 00 tổng quan, 01–30 theo ngày, 31 tổng kết), đã chuyển thành dữ liệu
trong `src/data/days.js`.

## Chạy local

```bash
npm install
npm run dev
npm run build
```

## Cấu trúc

- `src/data/days.js` — nội dung 30 ngày: mục tiêu, khái niệm, bài tập, tiêu chí, bẫy agent
- `src/data/conceptExplain.js` + `quizExtra.js` — giải thích sâu 116 khái niệm + quiz (đủ 116/116)
- `src/data/labs.js` — 150 lab (5 loại: fix-bug, predict, skeleton, decision, terminal)
- `src/data/drills.js` — kịch bản Incident Drill (ngày 20, 28) cho `components/IncidentDrill.jsx`
- `src/App.jsx` — toàn bộ màn hình: Dashboard (heatmap + phân bố thông thạo), Timeline,
  Ngày học (6 tab, split view rubric|bài làm), Flashcard 3 chế độ, Tự chấm, Tìm kiếm,
  Phỏng vấn thử, Cài đặt (theme sáng/tối, cỡ chữ, phím tắt, xuất Anki/CSV)
- `src/llm.js` — tầng LLM đa nhà cung cấp (BYOK): tự nhận diện key `AQ.`/`AIza` → Google
  Gemini, `gsk_` → Groq, endpoint OpenAI-compatible khác; stream SSE, tải danh sách model
- `src/tutorContext.js` — bối cảnh mặc định cho gia sư (lý thuyết ngày + đề bài + rubric +
  bài làm hiện tại, không gửi đáp án mẫu/solution)
- `src/components/TutorChat.jsx` + `ChatDock.jsx` — gia sư AI bám bài theo từng phần
  (bài tập, lab, khái niệm, checkpoint), hội thoại nhiều lượt, dock nổi bên phải
- `src/store.js` — tiến độ, ghi chú, điểm tự chấm lưu ở localStorage của trình duyệt;
  chat lưu riêng ở key `beapp-chats-v1`
- `vite.config.js` — cấu hình PWA: manifest, service worker, offline

## AI Gia sư (tùy chọn)

App chạy đầy đủ mà không cần key AI. Muốn bật gia sư: Cài đặt → AI Gia sư → dán key
của bạn (chỉ lưu trên máy bạn): key `AQ.`/`AIza` của Google Gemini hoặc `gsk_` của Groq,
hoặc chọn endpoint OpenAI-compatible khác. Bấm "Kiểm tra key & tải danh sách model" để
xem model nào key của bạn chạy được. Chưa có key vẫn dùng được "Sao chép bối cảnh" để
hỏi ở AI ngoài.

## Deploy

Deploy web tĩnh lên Vercel (import repo, framework Vite, build `npm run build`).
Sau khi có link, mở bằng Chrome/Edge trên laptop và Install app để có biểu tượng.
