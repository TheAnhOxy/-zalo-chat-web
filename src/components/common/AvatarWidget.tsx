"use client";

import { getAvatarInitials } from "@/src/lib/avatar-utils";
import { useState } from "react";

type AvatarWidgetProps = {
  url?: string | null;
  name: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
  className?: string;
};

/** Avatar giống mobile `AvatarWidget` — gradient primary + chữ cái khi không có ảnh */
export function AvatarWidget({
  url,
  name,
  size = 48,
  showOnline = false,
  isOnline = false,
  className = "",
}: AvatarWidgetProps) {
  const [imgError, setImgError] = useState(false);
  const hasImage = Boolean(url?.trim()) && !imgError;
  const initials = getAvatarInitials(name);
  const fontSize = Math.round(size * 0.35);
  const dotSize = Math.round(size * 0.27);

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)] font-bold text-white"
        style={{ fontSize }}
        aria-hidden
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url!.trim()}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          initials
        )}
      </div>
      {showOnline && isOnline ? (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-[var(--qc-online,#4caf50)]"
          style={{ width: dotSize, height: dotSize }}
        />
      ) : null}
    </div>
  );
}
