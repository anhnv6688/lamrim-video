# Lamrim video — hướng dẫn cho Claude Code

Repo này dựng video dọc 9:16 hướng dẫn **quán tưởng ruộng phước cây quy y** (Lamrim 45) trên nền bức thangka `assets/thangka.jpg`, bằng **Remotion**. Người dùng là Victor; trả lời và viết commit message bằng tiếng Việt.

## Dữ liệu (nguồn sự thật — không tự sửa nội dung pháp)

- `data/steps.json`: 18 bước. Mỗi bước có `duration` (giây), `camera` (`x`, `y` là tỉ lệ 0–1 theo chiều rộng/cao ảnh; `zoom` = 1 nghĩa là cả ảnh vừa khung 1080×1600), `spotlight` (danh sách vùng `ellipse`/`rect`, toạ độ tỉ lệ 0–1), `captions` (1 câu, riêng bước 17 có 3 câu xuất hiện lần lượt), `narration` (lời đọc).
- `data/subtitles.srt`, `data/narration.txt`: phụ đề và lời đọc, sinh từ `steps.json`.
- `data/timings.json` (chỉ có khi đã có lời đọc): thời lượng thực của từng bước — **ưu tiên dùng thay cho `duration`** trong `steps.json`.
- Câu chữ phụ đề, thứ tự bước, tên chư tôn là nội dung pháp đã được người dùng duyệt. Không viết lại, không thêm bớt. Nếu thấy chỗ nghi sai, hỏi người dùng.

## Yêu cầu video

- 1080×1920, 30 fps, H.264 (`--codec h264 --crf 20`), xuất ra `out/ruong-phuoc.mp4`.
- Khung trên 1080×1600 là ảnh thangka; dải dưới 320px là khung phụ đề (nền tím đậm `#242046`, viền `#534AB7`, bo góc 24px, chữ trắng 40px, dòng nhỏ phía trên "Bước n/18 · Quán tưởng ruộng phước" màu `#AFA9EC`). Nền tổng `#14122B`.
- Font: Inter qua npm `@fontsource/inter` (không phụ thuộc CDN). Kiểm tra dấu tiếng Việt hiển thị đúng.
- **Camera**: giữa hai bước, nội suy `x`, `y`, `zoom` trong 1.6 s bằng easing mượt (`Easing.inOut(Easing.cubic)` hoặc `spring` không nảy). Trong lúc giữ một bước, zoom chậm thêm khoảng 3.5% (Ken Burns). Ở `zoom` 1, ảnh được căn giữa, không để lộ mép trắng quá mức.
- **Spotlight**: phần ngoài các vùng `spotlight` bị làm tối (~40% độ sáng, giảm bão hoà ~50%), mép vùng sáng mềm (feather ~30px theo toạ độ ảnh). Chuyển spotlight bằng crossfade cùng nhịp với camera. Bước không có `spotlight` → ảnh sáng toàn bộ.
- **Phụ đề**: fade in 0.6 s, fade out 0.4 s cuối bước. Bước 17 chia đều 3 câu theo thời lượng bước.
- **Điểm nhấn (tuỳ chọn, giữ tinh tế)**: bước 7 (bộ ba tâm) có quầng sáng vàng nhẹ ở ngực Đức Phật nhịp thở ~4 s; bước 8 (tia sáng) có các tia vàng mờ toả từ ngực Đức Phật lên trên và sang hai bên. Không vẽ đè lên chư tôn, không dùng hiệu ứng loè loẹt.
- Không dùng AI tạo/biến đổi hình chư tôn. Chỉ dùng ảnh thangka gốc.

## Âm thanh

- Nếu có `audio/narration.*`: chạy `python3 scripts/align_audio.py audio/narration.<ext>` để sinh `data/timings.json`, dùng thời lượng đó cho các bước, và phát lời đọc bằng `<Audio>`. In bảng thời gian để người dùng kiểm tra; nếu script báo không đủ khoảng lặng thì dừng lại hỏi người dùng.
- Nếu có `audio/music.*`: phát làm nhạc nền, âm lượng ~0.15 khi có lời đọc (~0.5 khi không có), fade in 2 s, fade out 3 s, lặp nếu ngắn hơn video.
- Nếu chưa có audio: video câm, thời lượng theo `steps.json` (170 s).

## Clip mở đầu / kết (Seedance 2.0)

- Người dùng đã chọn hướng "kết hợp": thangka vẫn là ảnh gốc; AI chỉ tạo cảnh phụ **không có chư tôn, tượng, tranh hay chữ** — một hành giả ngồi thiền (mở đầu) và mở mắt chắp tay lúc bình minh (kết).
- Prompt và thời lượng ở `data/ai-clips.json`. Tạo bằng `python3 scripts/gen_seedance.py [intro] [outro] [--force]` (cần `OPENROUTER_API_KEY`, ~$3 mỗi clip 8 s 1080p). File ra `assets/clips/<id>.mp4` kèm `<id>.json` (job, chi phí). Không tự tạo lại clip khi chưa được người dùng đồng ý vì tốn phí.
- Seedance từ chối ảnh tham chiếu có người thật, nên nhân vật giữa hai clip được giữ giống nhau bằng mô tả trong prompt.
- Nếu có `assets/clips/intro.mp4` / `outro.mp4`, composition tự chèn vào trước bước 1 / sau bước 18, crossfade 1 s; khung phụ đề hiện tên bài (`title` trong `steps.json`). Lời đọc và `timings.json` vẫn chỉ áp cho 18 bước (lời đọc bắt đầu khi vào bước 1).

## Quy trình

1. Nếu chưa có dự án Remotion: tạo `package.json`, `remotion.config.ts`, `src/index.ts`, `src/Root.tsx`, `src/RuongPhuoc.tsx` (composition id `RuongPhuoc`, đọc `data/steps.json` và `data/timings.json` nếu có; tính `durationInFrames` từ tổng thời lượng). Đặt ảnh/audio vào `public/` hoặc dùng `staticFile` cho đúng cách Remotion.
2. `npm install`, rồi `npx remotion browser ensure`.
   - Nếu tải trình duyệt bị lỗi 403: môi trường cloud đang chặn. Dừng lại và nhắn người dùng: vào cài đặt cloud environment → Network access → **Custom**, tick "Also include default list…", thêm dòng `remotion.media`, rồi mở session mới.
3. Kiểm tra trước khi render cả video: `npx remotion still RuongPhuoc out/still-NN.png --frame=<f>` tại giữa các bước 1, 5, 7, 9, 13, 15, 17, 18. Xem ảnh, đối chiếu vùng sáng với đúng chư tôn được nói trong phụ đề; chỉnh nếu lệch.
4. Render: `npx remotion render RuongPhuoc out/ruong-phuoc.mp4 --codec h264 --crf 20 --concurrency 4`. Lệnh có thể chạy 5–15 phút; nếu bị ngắt vì timeout, chạy nền và theo dõi tiến độ.
5. Kiểm tra file ra bằng `ffprobe` (thời lượng, kích thước). Nếu > 90 MB, nén lại với `--crf 24`.
6. Commit `out/ruong-phuoc.mp4` cùng mã nguồn (không commit `node_modules`), push lên nhánh làm việc, báo người dùng đường dẫn file trên GitHub để tải về.

## Lưu ý môi trường cloud

- Máy cloud: ~4 vCPU, 16 GB RAM. Đặt `--concurrency 4`.
- Nếu cần giọng đọc tự động (TTS), chỉ làm khi người dùng yêu cầu và đã thêm tên miền API + khoá API vào cloud environment. Không tự đăng ký dịch vụ.
