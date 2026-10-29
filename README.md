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
- `src/App.jsx` — toàn bộ màn hình: Dashboard, Timeline, Ngày học, Flashcard, Checkpoint, Tìm kiếm, Cài đặt
- `src/store.js` — tiến độ, ghi chú, điểm tự chấm lưu ở localStorage của trình duyệt
- `vite.config.js` — cấu hình PWA: manifest, service worker, offline

## Deploy

Deploy web tĩnh lên Vercel (import repo, framework Vite, build `npm run build`).
Sau khi có link, mở bằng Chrome/Edge trên laptop và Install app để có biểu tượng.
