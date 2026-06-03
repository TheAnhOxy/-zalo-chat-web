"use client";

import { useLayoutEffect, useState } from "react";

export type AnchorPlacement =
  | "top-start"
  | "top-end"
  | "top-center"
  | "bottom-start"
  | "bottom-end"
  | "bottom-center";

interface Position {
  top: number;
  left: number;
  ready: boolean;
}

const VIEWPORT_MARGIN = 8;

export function useAnchorPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  popRef: React.RefObject<HTMLElement | null>,
  placement: AnchorPlacement,
  offset = 6
): Position {
  const [pos, setPos] = useState<Position>({ top: 0, left: 0, ready: false });

  useLayoutEffect(() => {
    if (!open) {
      setPos((p) => (p.ready ? { top: 0, left: 0, ready: false } : p));
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      const pop = popRef.current;
      if (!anchor || !pop) return;

      const a = anchor.getBoundingClientRect();
      const p = pop.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top = 0;
      let left = 0;

      if (placement.startsWith("top")) {
        top = a.top - p.height - offset;
        if (top < VIEWPORT_MARGIN) {
          top = a.bottom + offset;
        }
      } else {
        top = a.bottom + offset;
        if (top + p.height > vh - VIEWPORT_MARGIN) {
          top = a.top - p.height - offset;
        }
      }

      if (placement.endsWith("start")) {
        left = a.left;
      } else if (placement.endsWith("end")) {
        left = a.right - p.width;
      } else if (placement.includes("center")) {
        left = a.left + a.width / 2 - p.width / 2;
      } else {
        left = a.left;
      }

      left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - p.width - VIEWPORT_MARGIN));
      top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - p.height - VIEWPORT_MARGIN));

      setPos({ top, left, ready: true });
    };

    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, popRef, placement, offset]);

  return pos;
}
