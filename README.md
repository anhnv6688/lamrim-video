# Lamrim 45 — Video quán tưởng ruộng phước

Bộ dữ liệu để Claude Code dựng video dọc 9:16 (Remotion) hướng dẫn quán tưởng ruộng phước cây quy y trên nền bức thangka.

## Thư mục

- `assets/thangka.jpg` — ảnh thangka gốc
- `data/steps.json` — 18 bước: thời lượng, vị trí camera, vùng làm sáng, phụ đề, lời đọc
- `data/subtitles.srt` — phụ đề
- `data/narration.txt` — lời đọc 18 câu (đọc theo khi thu âm)
- `scripts/align_audio.py` — chia file lời đọc thành 18 đoạn theo khoảng lặng
- `data/ai-clips.json`, `scripts/gen_seedance.py`, `assets/clips/` — clip mở đầu/kết tạo bằng Seedance 2.0 (chỉ cảnh hành giả, không có chư tôn)
- `audio/` — đặt `narration.mp3` (lời đọc) và/hoặc `music.mp3` (nhạc nền) vào đây
- `CLAUDE.md` — hướng dẫn cho Claude Code
- `out/` — video dựng xong

## Chạy trên Claude Code cloud

1. Cài đặt cloud environment: **Network access → Custom**, tick "Also include default list of common package managers", thêm `remotion.media`. Thêm biến môi trường `BASH_DEFAULT_TIMEOUT_MS=1800000`.
2. Mở session mới trên repo này, gõ: **"Dựng video theo CLAUDE.md"**.
3. Khi có lời đọc: tải `audio/narration.mp3` lên repo, rồi gõ: **"Đã có lời đọc, dựng lại video khớp với audio"**.
