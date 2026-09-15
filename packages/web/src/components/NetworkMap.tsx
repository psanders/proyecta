/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * "La Red" map. Desktop shows the whole country, static. Mobile zooms in (the scale of the
 * web-home-mobile frame) and lets the visitor drag the map, clamped to its edges, to find the
 * other cities. See the "note: web-home-mobile / La Red" annotation in design/pencil.pen.
 */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import clsx from "clsx";
import { Icon } from "./Icon.js";
import { MAP_HOME, MAP_PINS, MAP_SHAPES, MAP_SIZE } from "./mapData.js";
import { clampOffset } from "../lib/clampOffset.js";
import type { Point } from "../lib/clampOffset.js";
import { strings } from "../strings.js";

/** Zoom used by the mobile frame (777.6px of art for a 486px source). */
const MOBILE_SCALE = 1.6;
/** Breathing room so edge pins never sit flush against the card when fully panned. */
const MOBILE_PAD = 24;
const KEY_STEP = 40;
/** Pointer travel (px) before a press counts as a drag and the hint goes away. */
const DRAG_SLOP = 4;

function layerSize(scale: number, pad: number) {
  return { width: MAP_SIZE.width * scale + pad * 2, height: MAP_SIZE.height * scale + pad * 2 };
}

const MOBILE_CONTENT = layerSize(MOBILE_SCALE, MOBILE_PAD);

function MapLayer({ scale, pad }: { scale: number; pad: number }) {
  const size = layerSize(scale, pad);
  return (
    <div className="relative" style={size}>
      <svg
        aria-hidden
        className="absolute"
        style={{ left: pad, top: pad }}
        width={MAP_SIZE.width * scale}
        height={MAP_SIZE.height * scale}
        viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
      >
        {MAP_SHAPES.map((shape) => (
          <path
            key={`${shape.x}-${shape.y}`}
            d={shape.d}
            transform={`translate(${shape.x} ${shape.y})`}
            fill="#2C2D2C"
          />
        ))}
      </svg>
      {MAP_PINS.map((pin) => (
        <div
          key={pin.name}
          data-pin={pin.name}
          className={clsx(
            "absolute flex items-center gap-2.5",
            pin.labelLeft
              ? "-translate-x-full -translate-y-1/2 flex-row-reverse"
              : "-translate-y-1/2"
          )}
          style={{
            left: pad + pin.x * scale + (pin.labelLeft ? 7 : -7),
            top: pad + pin.y * scale
          }}
        >
          <span
            aria-hidden
            className="size-3.5 shrink-0 rounded-full bg-signal outline-6 outline-signal/33"
          />
          <span className="rounded-md bg-stage/80 px-2.5 py-[5px] font-mono text-[13px] font-medium whitespace-nowrap text-white">
            {pin.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function MapNote({ className }: { className: string }) {
  return (
    <p
      className={clsx(
        "pointer-events-none absolute font-mono text-[11px] tracking-[2px] text-subtle",
        className
      )}
    >
      {strings.network.mapNote}
    </p>
  );
}

export function StaticNetworkMap({ className }: { className?: string }) {
  return (
    <div
      data-testid="network-map-desktop"
      className={clsx("relative h-[560px] overflow-hidden rounded-[20px] bg-stage", className)}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[54%]">
        <MapLayer scale={1} pad={0} />
      </div>
      <MapNote className="bottom-7 left-8" />
    </div>
  );
}

export function DraggableNetworkMap({ className }: { className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const offset = useRef<Point>({ x: 0, y: 0 });
  const placed = useRef(false);
  const drag = useRef<{ pointerId: number; start: Point; origin: Point } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [explored, setExplored] = useState(false);

  const moveTo = useCallback((next: Point) => {
    const card = cardRef.current;
    const layer = layerRef.current;
    if (!card || !layer) return;
    const clamped = clampOffset(
      next,
      { width: card.clientWidth, height: card.clientHeight },
      MOBILE_CONTENT
    );
    offset.current = clamped;
    layer.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;
  }, []);

  // Start centered on the home city. The card can be hidden (0×0) at first, so place it on
  // the first real size, and only re-clamp on later resizes to keep the visitor's position.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const home = MAP_PINS.find((pin) => pin.name === MAP_HOME);
    const sync = () => {
      if (card.clientWidth === 0) return;
      if (!placed.current && home) {
        placed.current = true;
        moveTo({
          x: card.clientWidth / 2 - (MOBILE_PAD + home.x * MOBILE_SCALE),
          y: card.clientHeight / 2 - (MOBILE_PAD + home.y * MOBILE_SCALE)
        });
        return;
      }
      moveTo(offset.current);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(card);
    return () => observer.disconnect();
  }, [moveTo]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: offset.current
    };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.start.x;
    const dy = event.clientY - current.start.y;
    moveTo({ x: current.origin.x + dx, y: current.origin.y + dy });
    if (!explored && Math.hypot(dx, dy) > DRAG_SLOP) setExplored(true);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, Point> = {
      ArrowLeft: { x: KEY_STEP, y: 0 },
      ArrowRight: { x: -KEY_STEP, y: 0 },
      ArrowUp: { x: 0, y: KEY_STEP },
      ArrowDown: { x: 0, y: -KEY_STEP }
    };
    const delta = step[event.key];
    if (!delta) return;
    event.preventDefault();
    moveTo({ x: offset.current.x + delta.x, y: offset.current.y + delta.y });
    setExplored(true);
  };

  return (
    <div
      ref={cardRef}
      data-testid="network-map-mobile"
      role="group"
      aria-roledescription="mapa"
      aria-label={strings.network.mapAria}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className={clsx(
        "relative h-80 touch-none overflow-hidden rounded-[20px] bg-stage select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
    >
      <div
        ref={layerRef}
        data-testid="network-map-layer"
        className="absolute top-0 left-0 will-change-transform"
      >
        <MapLayer scale={MOBILE_SCALE} pad={MOBILE_PAD} />
      </div>
      <p
        aria-hidden
        className={clsx(
          "pointer-events-none absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-stage/80 px-3 py-1.5 font-mono text-[11px] text-white transition-opacity duration-300",
          explored && "opacity-0"
        )}
      >
        <Icon name="dragPan" className="size-3.5 text-signal" />
        {strings.network.dragHint}
      </p>
      <MapNote className="bottom-4 left-4" />
    </div>
  );
}
