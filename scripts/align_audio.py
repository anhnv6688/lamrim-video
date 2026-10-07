"""Chia file lời đọc thành 18 đoạn theo khoảng lặng, ghi ra data/timings.json.

Cách dùng:  python3 scripts/align_audio.py audio/narration.mp3
Yêu cầu:    ffmpeg có trong PATH.
Kết quả:    data/timings.json = {"audio": ..., "total": giây, "steps": [{"id", "start", "end", "duration"}]}
            Mỗi bước kéo dài từ lúc bắt đầu câu đọc đến lúc bắt đầu câu kế tiếp (bước cuối thêm 3 giây lặng).
"""
import json, re, subprocess, sys

audio = sys.argv[1] if len(sys.argv) > 1 else 'audio/narration.mp3'
steps = json.load(open('data/steps.json'))['steps']
N = len(steps)

def run(noise, dmin):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', audio, '-af', f'silencedetect=noise={noise}dB:d={dmin}', '-f', 'null', '-'],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', p.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', p.stderr)]
    dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', p.stderr).groups()[2]) + \
          60 * float(re.search(r'Duration: (\d+):(\d+)', p.stderr).group(2)) + \
          3600 * float(re.search(r'Duration: (\d+)', p.stderr).group(1))
    return list(zip(starts, ends)), dur

best = None
for noise in (-40, -35, -45, -30):
    for dmin in (0.6, 0.8, 0.5, 1.0, 0.4):
        sil, total = run(noise, dmin)
        inner = [(s, e) for s, e in sil if s > 0.3 and e < total - 0.3]
        if len(inner) >= N - 1:
            inner = sorted(sorted(inner, key=lambda x: x[1] - x[0], reverse=True)[:N - 1])
            best = (inner, total, noise, dmin); break
    if best: break

if not best:
    sys.exit(f'Không tìm đủ {N - 1} khoảng lặng giữa các câu. Hãy đọc chậm hơn, nghỉ 1–2 giây giữa các câu, hoặc chia thủ công.')

inner, total, noise, dmin = best
cut = [0.0] + [(s + e) / 2 for s, e in inner] + [total + 3.0]
out = [{"id": steps[i]["id"], "start": round(cut[i], 3), "end": round(cut[i + 1], 3),
        "duration": round(cut[i + 1] - cut[i], 3)} for i in range(N)]
json.dump({"audio": audio, "total": round(cut[-1], 3), "silence": {"noise_db": noise, "min_s": dmin}, "steps": out},
          open('data/timings.json', 'w'), ensure_ascii=False, indent=2)
for o in out: print(f'Bước {o["id"]:2}: {o["start"]:7.2f} → {o["end"]:7.2f}  ({o["duration"]:.1f}s)')
print('Đã ghi data/timings.json')
