import fs from "node:fs";
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setConcurrency(4);

// Đồng bộ ảnh, timings và audio vào public/ mỗi khi chạy lệnh remotion,
// rồi ghi public/media.json để composition biết có lời đọc / nhạc nền hay không.
const root = process.cwd();
const pub = path.join(root, "public");
fs.mkdirSync(pub, { recursive: true });

const sync = (src: string, dest: string) => {
  const s = path.join(root, src);
  const d = path.join(pub, dest);
  if (!fs.existsSync(s)) {
    if (fs.existsSync(d)) fs.rmSync(d);
    return false;
  }
  if (!fs.existsSync(d) || fs.statSync(d).mtimeMs < fs.statSync(s).mtimeMs || fs.statSync(d).size !== fs.statSync(s).size) {
    fs.copyFileSync(s, d);
  }
  return true;
};

const findAudio = (base: string): string | null => {
  const dir = path.join(root, "audio");
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).find((n) => /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(n) && path.parse(n).name === base);
  return f ?? null;
};

sync("assets/thangka.jpg", "thangka.jpg");
const hasTimings = sync("data/timings.json", "timings.json");

for (const n of fs.readdirSync(pub)) {
  if (/^(narration|music)\./.test(n)) fs.rmSync(path.join(pub, n));
}
const narration = findAudio("narration");
const music = findAudio("music");
if (narration) sync(`audio/${narration}`, narration);
if (music) sync(`audio/${music}`, music);

// Clip phụ do scripts/gen_seedance.py tạo (assets/clips/*.mp4).
fs.mkdirSync(path.join(pub, "clips"), { recursive: true });
const intro = sync("assets/clips/intro.mp4", "clips/intro.mp4");
const outro = sync("assets/clips/outro.mp4", "clips/outro.mp4");

fs.writeFileSync(
  path.join(pub, "media.json"),
  JSON.stringify({ timings: hasTimings, narration, music, intro, outro }, null, 2),
);
