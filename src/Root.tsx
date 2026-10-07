import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import stepsData from "../data/steps.json";
import { RuongPhuoc, RuongPhuocProps } from "./RuongPhuoc";

const FPS = stepsData.video.fps;

type Media = { timings: boolean; narration: string | null; music: string | null };
type Timings = { steps: { id: number; duration: number }[] };

const defaultProps: RuongPhuocProps = {
  durations: stepsData.steps.map((s) => s.duration),
  narration: null,
  music: null,
};

const calculateMetadata: CalculateMetadataFunction<RuongPhuocProps> = async () => {
  let media: Media = { timings: false, narration: null, music: null };
  try {
    const r = await fetch(staticFile("media.json"));
    if (r.ok) media = await r.json();
  } catch {
    // không có media.json → video câm, thời lượng theo steps.json
  }

  let durations = stepsData.steps.map((s) => s.duration);
  if (media.timings) {
    const t: Timings = await (await fetch(staticFile("timings.json"))).json();
    durations = stepsData.steps.map((s) => {
      const m = t.steps.find((x) => x.id === s.id);
      return m ? m.duration : s.duration;
    });
  }

  const total = durations.reduce((a, b) => a + b, 0);
  return {
    durationInFrames: Math.round(total * FPS),
    props: { durations, narration: media.narration, music: media.music },
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="RuongPhuoc"
    component={RuongPhuoc}
    width={stepsData.video.width}
    height={stepsData.video.height}
    fps={FPS}
    durationInFrames={Math.round(defaultProps.durations.reduce((a, b) => a + b, 0) * FPS)}
    defaultProps={defaultProps}
    calculateMetadata={calculateMetadata}
  />
);
