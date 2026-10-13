import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import stepsData from "../data/steps.json";
import { RuongPhuoc, RuongPhuocProps, layout } from "./RuongPhuoc";

const FPS = stepsData.video.fps;

type Media = { timings: boolean; narration: string | null; music: string | null; intro: boolean; outro: boolean };
type Timings = { steps: { id: number; duration: number }[] };

const defaultProps: RuongPhuocProps = {
  durations: stepsData.steps.map((s) => s.duration),
  narration: null,
  music: null,
  intro: false,
  outro: false,
};

const calculateMetadata: CalculateMetadataFunction<RuongPhuocProps> = async () => {
  let media: Media = { timings: false, narration: null, music: null, intro: false, outro: false };
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

  const props: RuongPhuocProps = {
    durations,
    narration: media.narration,
    music: media.music,
    intro: Boolean(media.intro),
    outro: Boolean(media.outro),
  };
  return { durationInFrames: layout(props, FPS).total, props };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="RuongPhuoc"
    component={RuongPhuoc}
    width={stepsData.video.width}
    height={stepsData.video.height}
    fps={FPS}
    durationInFrames={layout(defaultProps, FPS).total}
    defaultProps={defaultProps}
    calculateMetadata={calculateMetadata}
  />
);
