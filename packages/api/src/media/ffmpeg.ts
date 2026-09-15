/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AssetKind, AssetRenditions } from "@proyecta/common";

const run = promisify(execFile);

/** What inspecting a file found: its media kind, pixel size and (videos) length in seconds. */
export interface ProbedMedia {
  kind: AssetKind;
  width: number;
  height: number;
  durationSec: number | null;
}

/** Reads a file's media facts, or null when it isn't a video or image ffmpeg can read. */
export type MediaProbe = (file: string) => Promise<ProbedMedia | null>;

/** Produces an asset's player renditions and poster in `dir`, returning their file names. */
export type RenditionRenderer = (input: {
  source: string;
  dir: string;
  kind: AssetKind;
  width: number;
  height: number;
}) => Promise<AssetRenditions>;

interface FfprobeOutput {
  streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number }[];
  format?: { format_name?: string; duration?: string };
}

const IMAGE_CODECS = new Set(["mjpeg", "png", "webp"]);

/** Classifies ffprobe JSON output. Exported for tests. */
export function classifyProbe(output: FfprobeOutput): ProbedMedia | null {
  const stream = output.streams?.find((s) => s.codec_type === "video");
  if (!stream?.width || !stream.height) return null;
  const format = output.format?.format_name ?? "";
  const isImageFormat = format === "image2" || format.endsWith("_pipe");
  if (isImageFormat && IMAGE_CODECS.has(stream.codec_name ?? "")) {
    return { kind: "IMAGE", width: stream.width, height: stream.height, durationSec: null };
  }
  const duration = Number(output.format?.duration);
  if (!isImageFormat && Number.isFinite(duration) && duration > 0) {
    return { kind: "VIDEO", width: stream.width, height: stream.height, durationSec: duration };
  }
  return null;
}

/** A probe backed by the `ffprobe` binary. */
export function createFfprobe(binary = "ffprobe"): MediaProbe {
  return async (file) => {
    try {
      const { stdout } = await run(
        binary,
        [
          "-v",
          "error",
          "-print_format",
          "json",
          "-show_entries",
          "format=format_name,duration:stream=codec_type,codec_name,width,height",
          file
        ],
        { maxBuffer: 1024 * 1024 }
      );
      return classifyProbe(JSON.parse(stdout) as FfprobeOutput);
    } catch {
      return null;
    }
  };
}

/** Output size: the source size capped at 1920 on the long side, with even dimensions. */
export function renditionSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, 1920 / Math.max(width, height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

/**
 * A renderer backed by the `ffmpeg` binary, with the same encoder settings as scripts/transcode.sh
 * (VP9 CRF 32 + H.264 CRF 21, no audio, 30 fps; WebP quality 90), scaled to the asset's own size.
 */
export function createFfmpegRenderer(binary = "ffmpeg"): RenditionRenderer {
  return async ({ source, dir, kind, width, height }) => {
    const size = renditionSize(width, height);
    const scale = `scale=${size.width}:${size.height}`;
    const ffmpeg = (args: string[]) =>
      run(binary, ["-y", "-loglevel", "error", ...args], { maxBuffer: 1024 * 1024 });

    if (kind === "IMAGE") {
      await ffmpeg([
        "-i",
        source,
        "-vf",
        scale,
        "-frames:v",
        "1",
        "-c:v",
        "libwebp",
        "-quality",
        "90",
        join(dir, "image.webp")
      ]);
      return { webp: "image.webp", poster: "image.webp" };
    }

    await ffmpeg([
      "-i",
      source,
      "-an",
      "-vf",
      `${scale},fps=30`,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "0",
      "-crf",
      "32",
      "-row-mt",
      "1",
      join(dir, "video.webm")
    ]);
    await ffmpeg([
      "-i",
      source,
      "-an",
      "-vf",
      `${scale},fps=30`,
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-crf",
      "21",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      join(dir, "video.mp4")
    ]);
    await ffmpeg([
      "-ss",
      "1",
      "-i",
      source,
      "-vf",
      scale,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      "80",
      join(dir, "poster.webp")
    ]);
    return { webm: "video.webm", mp4: "video.mp4", poster: "poster.webp" };
  };
}
