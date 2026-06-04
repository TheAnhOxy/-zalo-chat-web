"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { IMediaClusterItem } from "@/src/types/message";
import { mediaClusterGridClass } from "@/src/lib/media-cluster";
import { ImageViewerModal } from "@/src/components/chat/ImageViewerModal";
import { VideoPlayerModal } from "@/src/components/chat/VideoPlayerModal";

interface MediaClusterBubbleProps {
  items: IMediaClusterItem[];
  onMediaLoad?: () => void;
}

export function MediaClusterBubble({ items, onMediaLoad }: MediaClusterBubbleProps) {
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [viewerVideo, setViewerVideo] = useState<string | null>(null);

  if (!items.length) {
    return <p className="text-xs text-gray-400">Không có nội dung media</p>;
  }

  const displayItems = items.slice(0, 4);
  const extra = items.length - displayItems.length;

  return (
    <>
      <div className="grid w-[300px] max-w-full grid-cols-2 gap-1.5">
        {displayItems.map((item, index) => {
          const cellClass = mediaClusterGridClass(displayItems.length, index);
          const isVideo = item.type === "VIDEO";
          const thumbSrc = item.thumbnail?.trim() || item.url;

          return (
            <button
              key={`${item.url}-${index}`}
              type="button"
              className={`relative overflow-hidden rounded-xl bg-gray-100 ${cellClass}`}
              onClick={() => {
                if (isVideo) setViewerVideo(item.url);
                else setViewerImage(item.url);
              }}
              aria-label={isVideo ? "Phát video" : "Xem ảnh"}
            >
              {isVideo ? (
                <>
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                    onLoadedData={onMediaLoad}
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-lg">
                      <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
                    </span>
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  onLoad={onMediaLoad}
                />
              )}
              {extra > 0 && index === displayItems.length - 1 && items.length > 4 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                  +{extra}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <ImageViewerModal
        open={Boolean(viewerImage)}
        src={viewerImage ?? ""}
        onClose={() => setViewerImage(null)}
      />
      <VideoPlayerModal
        open={Boolean(viewerVideo)}
        src={viewerVideo ?? ""}
        onClose={() => setViewerVideo(null)}
      />
    </>
  );
}
