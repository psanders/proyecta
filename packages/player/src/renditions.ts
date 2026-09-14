/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ManifestItem } from "@proyecta/common";

export type Codec = "vp9" | "h264" | "webp";

export interface Rendition {
  src: string;
  codec: Codec;
}

export interface DecodeSupport {
  supported: boolean;
  smooth: boolean;
  powerEfficient: boolean;
}

export type DecodeProbe = (
  contentType: string,
  width: number,
  height: number
) => Promise<DecodeSupport>;

/** VP9 profile 0, level 4.0, 8-bit (what scripts/transcode.sh emits). */
export const VP9_CONTENT_TYPE = 'video/webm; codecs="vp09.00.40.08"';
/** H.264 High profile, level 4.0. */
export const H264_CONTENT_TYPE = 'video/mp4; codecs="avc1.640028"';

/**
 * Picks the rendition this device should play.
 * Video: VP9 WebM when the device decodes it smoothly and power-efficiently (≈ hardware),
 * otherwise H.264 MP4, otherwise VP9 in software as a last resort. Images: WebP.
 */
export async function pickRendition(
  item: ManifestItem,
  probe: DecodeProbe,
  width: number,
  height: number
): Promise<Rendition | null> {
  const { webm, mp4, webp } = item.renditions;
  if (item.type === "image") return webp ? { src: webp, codec: "webp" } : null;

  const vp9 = webm ? await probe(VP9_CONTENT_TYPE, width, height) : null;
  if (webm && vp9?.supported && vp9.smooth && vp9.powerEfficient)
    return { src: webm, codec: "vp9" };

  const h264 = mp4 ? await probe(H264_CONTENT_TYPE, width, height) : null;
  if (mp4 && h264?.supported) return { src: mp4, codec: "h264" };

  if (webm && vp9?.supported) return { src: webm, codec: "vp9" };
  return null;
}

/** Probe backed by the Media Capabilities API, falling back to canPlayType. Results are cached. */
export function createMediaCapabilitiesProbe(): DecodeProbe {
  const cache = new Map<string, Promise<DecodeSupport>>();
  return (contentType, width, height) => {
    const key = `${contentType}@${width}x${height}`;
    let result = cache.get(key);
    if (!result) {
      result = decode(contentType, width, height);
      cache.set(key, result);
    }
    return result;
  };
}

async function decode(contentType: string, width: number, height: number): Promise<DecodeSupport> {
  if (!("mediaCapabilities" in navigator)) {
    const supported = document.createElement("video").canPlayType(contentType) !== "";
    return { supported, smooth: supported, powerEfficient: false };
  }
  try {
    const info = await navigator.mediaCapabilities.decodingInfo({
      type: "file",
      video: { contentType, width, height, bitrate: 8_000_000, framerate: 30 }
    });
    return { supported: info.supported, smooth: info.smooth, powerEfficient: info.powerEfficient };
  } catch {
    return { supported: false, smooth: false, powerEfficient: false };
  }
}
