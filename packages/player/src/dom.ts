/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
/** Creates an element with classes and optional text. Text is set via textContent (never HTML). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Wraps a trusted, bundled SVG string (icons only) in a span. */
export function icon(svg: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span;
}
