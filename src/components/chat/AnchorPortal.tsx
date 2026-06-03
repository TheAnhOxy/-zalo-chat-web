"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AnchorPlacement, useAnchorPosition } from "@/src/hooks/useAnchorPosition";

interface AnchorPortalProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement: AnchorPlacement;
  offset?: number;
  className?: string;
  children: React.ReactNode;
}

export function AnchorPortal({
  open,
  anchorRef,
  placement,
  offset,
  className = "",
  children,
}: AnchorPortalProps) {
  const [mounted, setMounted] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const { top, left, ready } = useAnchorPosition(open, anchorRef, popRef, placement, offset);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={popRef}
      className={`fixed z-[250] ${className}`}
      style={{
        top,
        left,
        visibility: ready ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
