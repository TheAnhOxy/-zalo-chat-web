"use client";

import { useEffect, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Pause, Play, Eye } from "lucide-react";
import { StoryItem } from "@/src/services/stories/stories.service";
import { useStories } from "@/src/hooks/use-stories";

interface StoryViewerProps {
  stories: StoryItem[];
  initialIndex?: number;
  onClose: () => void;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { viewStory } = useStories();

  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.type === "VIDEO";
  const STORY_DURATION = 5000;

  // Mark viewed + reset on index change
  useEffect(() => {
    if (!currentStory) return;
    if (currentStory._id) viewStory(currentStory._id);
    setProgress(0);
    setIsPaused(false);
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => setIsPaused(true));
    }
  }, [currentIndex]);

  // Progress timer for images
  useEffect(() => {
    if (isPaused || isVideo) return;
    const step = (50 / STORY_DURATION) * 100;
    const timer = setInterval(() => {
      setProgress(prev => (prev + step >= 100 ? 100 : prev + step));
    }, 50);
    return () => clearInterval(timer);
  }, [isPaused, currentIndex, isVideo]);

  // Handle auto-next for images when progress reaches 100
  useEffect(() => {
    if (progress >= 100 && !isVideo) {
      handleNext();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, isVideo]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) setCurrentIndex(p => p + 1);
    else onClose();
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(p => p - 1);
    else { setProgress(0); if (videoRef.current) videoRef.current.currentTime = 0; }
  };

  const togglePause = () => {
    setIsPaused(p => !p);
    if (isVideo && videoRef.current) {
      if (!isPaused) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  if (!currentStory) return null;

  return (
    /* Full-screen overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onMouseDown={() => { setIsPaused(true); if (isVideo && videoRef.current) videoRef.current.pause(); }}
      onMouseUp={() => { setIsPaused(false); if (isVideo && videoRef.current) videoRef.current.play(); }}
      onTouchStart={() => { setIsPaused(true); if (isVideo && videoRef.current) videoRef.current.pause(); }}
      onTouchEnd={() => { setIsPaused(false); if (isVideo && videoRef.current) videoRef.current.play(); }}
    >
      {/* ─── Story panel: Fills entire screen ─────────────── */}
      <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
        {/* ── Blur background (fills letterbox areas) ── */}
        {currentStory.mediaUrl && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${currentStory.mediaUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(24px) brightness(0.35)",
              transform: "scale(1.15)",
            }}
          />
        )}

        {/* ── Media ── */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="absolute inset-0 h-full w-full object-contain"
            autoPlay
            playsInline
            onTimeUpdate={() => {
              if (!videoRef.current) return;
              const { currentTime, duration } = videoRef.current;
              if (duration > 0) setProgress((currentTime / duration) * 100);
            }}
            onEnded={handleNext}
          />
        ) : currentStory.mediaUrl ? (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 px-10 text-center text-2xl font-bold text-white">
            {currentStory.caption || "Không có nội dung"}
          </div>
        )}

        {/* ── Progress bars ── */}
        <div className="absolute left-3 right-3 top-3 z-30 flex gap-1">
          {stories.map((_, idx) => (
            <div key={idx} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
                  transition: idx === currentIndex ? "width 50ms linear" : "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Header: Avatar + name + controls ── */}
        <div className="absolute left-0 right-0 top-7 z-30 flex items-center justify-between px-3 pt-2">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            {currentStory.user?.avatar || currentStory.userAvatar ? (
              <img
                src={currentStory.user?.avatar || currentStory.userAvatar}
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 font-bold text-white ring-2 ring-white">
                {(currentStory.user?.fullName || currentStory.userName || "?").charAt(0)}
              </div>
            )}
            {/* Name + time */}
            <div>
              <p className="text-sm font-semibold leading-tight text-white drop-shadow">
                {currentStory.user?.fullName || currentStory.userName || "Người dùng"}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-white/75">
                <span>{timeAgo(currentStory.createdAt)}</span>
                {currentStory.viewers && currentStory.viewers.length > 0 && (
                  <span className="flex items-center gap-0.5">· <Eye size={11} /> {currentStory.viewers.length}</span>
                )}
              </div>
            </div>
          </div>

          {/* Pause + Close */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); togglePause(); }}
              onMouseDown={e => e.stopPropagation()}
              onMouseUp={e => e.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/15"
            >
              {isPaused ? <Play size={20} fill="white" /> : <Pause size={20} fill="white" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              onMouseDown={e => e.stopPropagation()}
              onMouseUp={e => e.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/15"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* ── Caption ── */}
        {currentStory.caption && currentStory.mediaUrl && (
          <div className="absolute bottom-6 left-4 right-4 z-30 rounded-2xl bg-black/50 px-4 py-3 text-center text-sm text-white backdrop-blur-md">
            {currentStory.caption}
          </div>
        )}

        {/* ── Tap zones (left third = prev, right two-thirds = next) ── */}
        <div className="absolute inset-0 z-20 flex">
          <div className="h-full w-1/3" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
          <div className="h-full w-2/3" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
        </div>

        {/* ── Arrow nav buttons (visible on desktop) ── */}
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
          disabled={currentIndex === 0}
          className="absolute left-2 top-1/2 z-40 hidden -translate-y-1/2 md:flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50 disabled:opacity-30 transition"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
          disabled={currentIndex === stories.length - 1}
          className="absolute right-2 top-1/2 z-40 hidden -translate-y-1/2 md:flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50 disabled:opacity-30 transition"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}
