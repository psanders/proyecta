/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

function clampAxis(offset: number, viewport: number, content: number): number {
  // Content that fits is centered and cannot move on that axis.
  if (content <= viewport) return (viewport - content) / 2;
  return Math.min(0, Math.max(viewport - content, offset));
}

/**
 * Clamps the translate offset of `content` panned inside `viewport` so no empty space shows
 * past the content edges.
 */
export function clampOffset(offset: Point, viewport: Size, content: Size): Point {
  return {
    x: clampAxis(offset.x, viewport.width, content.width),
    y: clampAxis(offset.y, viewport.height, content.height)
  };
}
