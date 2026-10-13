"""Tạo clip phụ (mở đầu / kết) bằng Seedance 2.0 qua OpenRouter.

Cách dùng:  python3 scripts/gen_seedance.py intro outro      (mặc định: tất cả clip trong data/ai-clips.json)
            python3 scripts/gen_seedance.py outro --force    (tạo lại dù đã có file)
Yêu cầu:    biến môi trường OPENROUTER_API_KEY; ffmpeg (để lấy khung hình tham chiếu).
Kết quả:    assets/clips/<id>.mp4 và assets/clips/<id>.json (prompt, job id, chi phí).

Chỉ dùng cho cảnh không có chư tôn — xem ghi chú trong data/ai-clips.json.
"""
import base64, json, os, subprocess, sys, time, urllib.error, urllib.request

API = 'https://openrouter.ai/api/v1/videos'
KEY = os.environ.get('OPENROUTER_API_KEY') or sys.exit('Thiếu OPENROUTER_API_KEY')
cfg = json.load(open('data/ai-clips.json'))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
force = '--force' in sys.argv
ids = args or [c['id'] for c in cfg['clips']]
os.makedirs('assets/clips', exist_ok=True)


def call(method, url, body=None, raw=False):
    req = urllib.request.Request(url, method=method, headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'},
                                 data=json.dumps(body).encode() if body is not None else None)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                data = r.read()
                return data if raw else json.loads(data)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            if e.code in (429, 502, 503) and attempt < 4:
                time.sleep(2 ** (attempt + 2)); continue
            sys.exit(f'Lỗi API {e.code}: {msg}')


def reference_frame(clip_id):
    """Lấy khung hình giữa clip đã tạo làm ảnh tham chiếu nhân vật (data URL JPEG)."""
    src = f'assets/clips/{clip_id}.mp4'
    if not os.path.exists(src):
        sys.exit(f'Cần tạo clip {clip_id} trước (dùng làm tham chiếu).')
    jpg = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '3', '-i', src, '-frames:v', '1', '-q:v', '3', '-f', 'mjpeg', '-'],
                         capture_output=True, check=True).stdout
    return 'data:image/jpeg;base64,' + base64.b64encode(jpg).decode()


for cid in ids:
    clip = next((c for c in cfg['clips'] if c['id'] == cid), None) or sys.exit(f'Không có clip "{cid}"')
    out = f'assets/clips/{cid}.mp4'
    if os.path.exists(out) and not force:
        print(f'{cid}: đã có {out}, bỏ qua (dùng --force để tạo lại)'); continue

    body = {'model': clip.get('model', cfg['model']), 'prompt': clip['prompt'], 'duration': clip['duration'],
            'aspect_ratio': cfg['aspect_ratio'], 'resolution': clip.get('resolution', cfg['resolution']), 'generate_audio': False}
    if clip.get('reference'):
        body['input_references'] = [{'type': 'image_url', 'image_url': {'url': reference_frame(clip['reference'])}}]

    job = call('POST', API, body)
    print(f'{cid}: đã gửi job {job["id"]}', flush=True)
    t0 = time.time()
    while True:
        time.sleep(15)
        st = call('GET', f'{API}/{job["id"]}')
        if st['status'] in ('pending', 'in_progress'):
            print(f'{cid}: {st["status"]} ({time.time() - t0:.0f}s)', flush=True); continue
        break
    if st['status'] != 'completed':
        sys.exit(f'{cid}: job {st["status"]}: {st.get("error")}')

    open(out, 'wb').write(call('GET', f'{API}/{job["id"]}/content', raw=True))
    cost = (st.get('usage') or {}).get('cost')
    json.dump({'id': cid, 'job': job['id'], 'model': body['model'], 'prompt': clip['prompt'], 'cost_usd': cost,
               'reference': clip.get('reference')}, open(f'assets/clips/{cid}.json', 'w'), ensure_ascii=False, indent=2)
    print(f'{cid}: xong → {out}  (chi phí ${cost})', flush=True)
