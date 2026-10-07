import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import React, { useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import stepsData from "../data/steps.json";

export type RuongPhuocProps = {
  durations: number[];
  narration: string | null;
  music: string | null;
};

type Spot = { shape: string; x0: number; y0: number; x1: number; y1: number };
type Cam = { x: number; y: number; zoom: number };

const steps = stepsData.steps;
const N = steps.length;
const [IW, IH] = stepsData.imageSize;
const VW = stepsData.video.width;
const VH = stepsData.video.viewportHeight;

// Vùng nội dung của ảnh (bỏ dải viền trắng ở mép phải và mép dưới bản scan).
const CONTENT = { x0: 2, y0: 2, x1: 1392, y1: 2138 };
// zoom 1 = cả ảnh vừa khung 1080×1600.
const BASE_SCALE = Math.min(VW / IW, VH / IH);

const TRANSITION_S = 1.6;
const KEN_BURNS = 0.035;
const FEATHER = 30; // px theo toạ độ ảnh
const CAPTION_IN_S = 0.6;
const CAPTION_OUT_S = 0.4;

const C = {
  bg: "#14122B",
  box: "#242046",
  border: "#534AB7",
  label: "#AFA9EC",
  gold: "255, 210, 120",
};

// Ngực Đức Phật (tâm vùng spotlight bước 7).
const CHEST = { x: 0.4924 * IW, y: 0.352 * IH };

const ease = Easing.inOut(Easing.cubic);

const useFonts = () => {
  const [handle] = useState(() => {
    const h = delayRender("Tải font Inter");
    Promise.all(
      ["400", "500", "600"].map((w) => document.fonts.load(`${w} 40px Inter`, "Đức Phật Thích Ca ạ ể ỗ ữ")),
    )
      .then(() => document.fonts.ready)
      .then(() => continueRender(h))
      .catch(() => continueRender(h));
    return h;
  });
  return handle;
};

const camAt = (i: number, p: number): Cam => {
  const c = steps[i].camera;
  return { x: c.x, y: c.y, zoom: c.zoom * (1 + KEN_BURNS * p) };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Đổi camera (tâm ảnh x,y tỉ lệ + zoom) thành phép biến đổi ảnh trong khung, có chặn mép.
const toTransform = (cam: Cam) => {
  const s = BASE_SCALE * cam.zoom;
  const axis = (center: number, lo: number, hi: number, view: number) => {
    const size = (hi - lo) * s;
    if (size <= view) return view / 2 - ((lo + hi) / 2) * s;
    const t = view / 2 - center * s;
    return Math.min(-lo * s, Math.max(view - hi * s, t));
  };
  return {
    s,
    tx: axis(cam.x * IW, CONTENT.x0, CONTENT.x1, VW),
    ty: axis(cam.y * IH, CONTENT.y0, CONTENT.y1, VH),
  };
};

const SpotMask: React.FC<{ id: string; spots: Spot[] }> = ({ id, spots }) => (
  <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={IW} height={IH}>
    <rect x={0} y={0} width={IW} height={IH} fill="black" />
    {spots.length === 0 ? (
      <rect x={0} y={0} width={IW} height={IH} fill="white" />
    ) : (
      <g filter={`url(#feather)`}>
        {spots.map((sp, k) => {
          const x0 = sp.x0 * IW;
          const y0 = sp.y0 * IH;
          const x1 = sp.x1 * IW;
          const y1 = sp.y1 * IH;
          return sp.shape === "ellipse" ? (
            <ellipse key={k} cx={(x0 + x1) / 2} cy={(y0 + y1) / 2} rx={(x1 - x0) / 2} ry={(y1 - y0) / 2} fill="white" />
          ) : (
            <rect key={k} x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={12} fill="white" />
          );
        })}
      </g>
    )}
  </mask>
);

// Bước 7: quầng sáng vàng nhẹ ở ngực Đức Phật, nhịp thở ~4 s.
const ChestGlow: React.FC<{ t: number; fade: number }> = ({ t, fade }) => {
  const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 4);
  const r = 80 + 14 * breath;
  return (
    <g style={{ mixBlendMode: "screen" }} opacity={fade * (0.12 + 0.18 * breath)}>
      <circle cx={CHEST.x} cy={CHEST.y} r={r} fill="url(#glow)" />
    </g>
  );
};

// Bước 8: tia vàng mờ toả từ ngực lên trên và sang hai bên.
const RAY_ANGLES = [-90, -78, -102, -66, -114, 0, -8, 8, 180, 172, 188];
const LightRays: React.FC<{ t: number; fade: number }> = ({ t, fade }) => {
  const grow = interpolate(t, [0.3, 2.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <g style={{ mixBlendMode: "screen" }} opacity={fade} filter="url(#raysoft)">
      {RAY_ANGLES.map((a, k) => {
        const rad = (a * Math.PI) / 180;
        const up = a < -45 && a > -135;
        const len = (up ? 380 : 560) * grow * (k % 2 === 0 ? 1 : 0.85);
        const shimmer = 0.75 + 0.25 * Math.sin(t * 2.2 + k * 1.7);
        return (
          <line
            key={k}
            x1={CHEST.x}
            y1={CHEST.y}
            x2={CHEST.x + Math.cos(rad) * len}
            y2={CHEST.y + Math.sin(rad) * len}
            stroke={`url(#ray${up ? "Up" : a === 0 || Math.abs(a) < 45 ? "R" : "L"})`}
            strokeWidth={k < 5 ? 9 : 7}
            strokeLinecap="round"
            opacity={0.65 * shimmer}
          />
        );
      })}
      <circle cx={CHEST.x} cy={CHEST.y} r={70} fill="url(#glow)" opacity={0.5 * grow} />
    </g>
  );
};

export const RuongPhuoc: React.FC<RuongPhuocProps> = ({ durations, narration, music }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Mốc khung hình bắt đầu từng bước.
  const starts: number[] = [];
  let acc = 0;
  for (let i = 0; i < N; i++) {
    starts.push(Math.round(acc * fps));
    acc += durations[i];
  }
  starts.push(durationInFrames);

  let i = N - 1;
  for (let k = 0; k < N; k++) {
    if (frame < starts[k + 1]) {
      i = k;
      break;
    }
  }
  const stepFrames = starts[i + 1] - starts[i];
  const local = frame - starts[i];
  const t = local / fps;
  const p = Math.min(1, local / stepFrames);

  // Chuyển cảnh: 1.6 s đầu mỗi bước nội suy từ trạng thái cuối bước trước.
  const transFrames = TRANSITION_S * fps;
  const e = i > 0 && local < transFrames ? ease(local / transFrames) : 1;
  const cur = camAt(i, p);
  let cam = cur;
  if (e < 1) {
    const prev = camAt(i - 1, 1);
    cam = {
      x: lerp(prev.x, cur.x, e),
      y: lerp(prev.y, cur.y, e),
      zoom: Math.exp(lerp(Math.log(prev.zoom), Math.log(cur.zoom), e)),
    };
  }
  const { s, tx, ty } = toTransform(cam);

  const prevSpots = (i > 0 ? steps[i - 1].spotlight : []) as Spot[];
  const curSpots = steps[i].spotlight as Spot[];
  const imgHref = staticFile("thangka.jpg");

  // Điểm nhấn bước 7 (index 6) và bước 8 (index 7), mờ vào/ra cùng nhịp chuyển cảnh.
  const accentFade = (idx: number) => {
    if (i === idx) {
      const out = interpolate(local, [stepFrames - transFrames * 0.6, stepFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return Math.min(e, out);
    }
    return 0;
  };

  // Phụ đề.
  const caps = steps[i].captions;
  const capFrames = stepFrames / caps.length;
  const ci = Math.min(caps.length - 1, Math.floor(local / capFrames));
  const capLocal = local - ci * capFrames;
  const fadeOf = (lf: number, len: number) =>
    Math.min(
      interpolate(lf, [0, CAPTION_IN_S * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      interpolate(lf, [len - CAPTION_OUT_S * fps, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    );
  const capOpacity = fadeOf(capLocal, capFrames);
  const labelOpacity = fadeOf(local, stepFrames);

  const musicVolume = (f: number) => {
    const base = narration ? 0.15 : 0.5;
    return (
      base *
      Math.min(
        interpolate(f, [0, 2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        interpolate(f, [durationInFrames - 3 * fps, durationInFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      )
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Inter, sans-serif" }}>
      {narration ? <Audio src={staticFile(narration)} /> : null}
      {music ? <Audio src={staticFile(music)} loop volume={musicVolume} /> : null}

      <div style={{ position: "absolute", left: 0, top: 0, width: VW, height: VH, overflow: "hidden" }}>
        <svg
          width={IW}
          height={IH}
          viewBox={`0 0 ${IW} ${IH}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${tx}px, ${ty}px) scale(${s})`,
            overflow: "visible",
          }}
        >
          <defs>
            <clipPath id="content">
              <rect x={CONTENT.x0} y={CONTENT.y0} width={CONTENT.x1 - CONTENT.x0} height={CONTENT.y1 - CONTENT.y0} />
            </clipPath>
            <filter id="feather" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={FEATHER / 2.5} />
            </filter>
            <filter id="dim" colorInterpolationFilters="sRGB">
              {/* giảm bão hoà ~50% rồi còn ~40% độ sáng */}
              <feColorMatrix type="saturate" values="0.5" />
              <feComponentTransfer>
                <feFuncR type="linear" slope="0.4" />
                <feFuncG type="linear" slope="0.4" />
                <feFuncB type="linear" slope="0.4" />
              </feComponentTransfer>
            </filter>
            <filter id="raysoft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={3} />
            </filter>
            <radialGradient id="glow">
              <stop offset="0%" stopColor={`rgb(${C.gold})`} stopOpacity={0.9} />
              <stop offset="45%" stopColor={`rgb(${C.gold})`} stopOpacity={0.35} />
              <stop offset="100%" stopColor={`rgb(${C.gold})`} stopOpacity={0} />
            </radialGradient>
            <linearGradient id="rayUp" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={`rgb(${C.gold})`} stopOpacity={0.9} />
              <stop offset="100%" stopColor={`rgb(${C.gold})`} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rayR" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={`rgb(${C.gold})`} stopOpacity={0.9} />
              <stop offset="100%" stopColor={`rgb(${C.gold})`} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rayL" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor={`rgb(${C.gold})`} stopOpacity={0.9} />
              <stop offset="100%" stopColor={`rgb(${C.gold})`} stopOpacity={0} />
            </linearGradient>
            <SpotMask id="maskPrev" spots={prevSpots} />
            <SpotMask id="maskCur" spots={curSpots} />
          </defs>

          <g clipPath="url(#content)">
            <image href={imgHref} width={IW} height={IH} filter="url(#dim)" />
            {e < 1 ? (
              <g mask="url(#maskPrev)" opacity={1 - e}>
                <image href={imgHref} width={IW} height={IH} />
              </g>
            ) : null}
            <g mask="url(#maskCur)" opacity={e}>
              <image href={imgHref} width={IW} height={IH} />
            </g>
            {i === 6 ? <ChestGlow t={t} fade={accentFade(6)} /> : null}
            {i === 7 ? <LightRays t={t} fade={accentFade(7)} /> : null}
          </g>
        </svg>
      </div>

      {/* Khung phụ đề */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: VH,
          width: VW,
          height: 1920 - VH,
          padding: "22px 36px 30px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            background: C.box,
            border: `2px solid ${C.border}`,
            borderRadius: 24,
            padding: "22px 34px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              color: C.label,
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: 0.3,
              opacity: labelOpacity,
              marginBottom: 10,
            }}
          >
            Bước {steps[i].id}/{N} · Quán tưởng ruộng phước
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 40,
                fontWeight: 500,
                lineHeight: 1.3,
                opacity: capOpacity,
              }}
            >
              {caps[ci]}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
