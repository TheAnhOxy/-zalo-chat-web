"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Pause,
  Play,
  Video,
} from "lucide-react";
import { conversationsApi } from "@/src/services/api/conversations";
import { IMessage } from "@/src/types/message";
import {
  fileDisplayName,
  formatVoiceDuration,
  indexMessagesForGallery,
  LinkItem,
} from "@/src/lib/chat-media";
import { SubPanelShell } from "@/src/components/chat/SubPanelShell";

const PAGE_SIZE = 50;

type TabId = "media" | "files" | "links" | "voices";

const TABS: { id: TabId; label: string }[] = [
  { id: "media", label: "Ảnh/Video" },
  { id: "files", label: "File" },
  { id: "links", label: "Link" },
  { id: "voices", label: "Thoại" },
];

interface ConversationMediaGalleryProps {
  conversationId: string;
  userId: string;
  title: string;
  onBack: () => void;
}

export function ConversationMediaGallery({
  conversationId,
  userId,
  title,
  onBack,
}: ConversationMediaGalleryProps) {
  const [tab, setTab] = useState<TabId>("media");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [allMessages, setAllMessages] = useState<IMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const { media, files, voices, links } = useMemo(
    () => indexMessagesForGallery(allMessages),
    [allMessages]
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const skip = allMessages.length;
      const page = await conversationsApi.getMessages(conversationId, userId, {
        limit: PAGE_SIZE,
        skip,
      });
      setAllMessages((prev) => [...prev, ...page.messages]);
      setHasMore(page.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [conversationId, userId, hasMore, allMessages.length]);

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    setAllMessages([]);
    void (async () => {
      try {
        const page = await conversationsApi.getMessages(conversationId, userId, {
          limit: PAGE_SIZE,
          skip: 0,
        });
        setAllMessages(page.messages);
        setHasMore(page.hasMore);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [conversationId, userId]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 320) {
      void loadMore();
    }
  }, [loading, loadingMore, hasMore, loadMore]);

  const tabCount = useMemo(
    () => ({
      media: media.length,
      files: files.length,
      links: links.length,
      voices: voices.length,
    }),
    [media.length, files.length, links.length, voices.length]
  );

  return (
    <SubPanelShell title={title} onBack={onBack}>
      <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-[var(--qc-divider)] bg-[var(--qc-card)] px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 py-2.5 text-xs font-semibold transition ${
              tab === t.id
                ? "border-b-2 border-[var(--qc-primary)] text-[var(--qc-primary)]"
                : "text-[var(--qc-text-secondary)]"
            }`}
          >
            {t.label}
            {tabCount[t.id] > 0 ? ` (${tabCount[t.id]})` : ""}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" onScroll={handleScroll}>
        {loading ? (
          <p className="py-12 text-center text-sm text-[var(--qc-text-secondary)]">Đang tải...</p>
        ) : (
          <>
            {tab === "media" ? <MediaTab items={media} /> : null}
            {tab === "files" ? <FilesTab items={files} /> : null}
            {tab === "links" ? <LinksTab items={links} /> : null}
            {tab === "voices" ? <VoicesTab items={voices} /> : null}
            {loadingMore ? (
              <p className="py-4 text-center text-xs text-[var(--qc-text-secondary)]">Đang tải thêm...</p>
            ) : null}
          </>
        )}
      </div>
    </SubPanelShell>
  );
}

function MediaTab({ items }: { items: IMessage[] }) {
  if (!items.length) {
    return <Empty label="Chưa có ảnh hoặc video" />;
  }
  return (
    <div className="grid grid-cols-3 gap-0.5 p-0.5 sm:grid-cols-4">
      {items.map((m) => (
        <a
          key={m._id}
          href={m.content}
          target="_blank"
          rel="noopener noreferrer"
          className="relative aspect-square overflow-hidden bg-[var(--qc-bg)]"
        >
          {m.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.content} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-black/80 text-white">
              <Video className="h-8 w-8" />
              <span className="mt-1 text-[10px]">Video</span>
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

function FilesTab({ items }: { items: IMessage[] }) {
  if (!items.length) return <Empty label="Chưa có tệp" />;
  return (
    <ul className="divide-y divide-[var(--qc-divider)] bg-[var(--qc-card)]">
      {items.map((m) => {
        const name = fileDisplayName(m);
        return (
          <li key={m._id}>
            <a
              href={m.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--qc-bg)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e3f2fd]">
                <FileText className="h-5 w-5 text-[#1976d2]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--qc-text-primary)]">{name}</p>
                <p className="text-xs text-[var(--qc-text-secondary)]">
                  {new Date(m.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-[var(--qc-text-secondary)]" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function LinksTab({ items }: { items: LinkItem[] }) {
  if (!items.length) return <Empty label="Chưa có link" />;
  return (
    <ul className="divide-y divide-[var(--qc-divider)] bg-[var(--qc-card)]">
      {items.map((item, i) => (
        <li key={`${item.url}-${i}`}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--qc-bg)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff3e0]">
              <Link2 className="h-5 w-5 text-[#ff9800]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium text-[var(--qc-primary)]">{item.url}</p>
              <p className="mt-1 line-clamp-2 text-xs text-[var(--qc-text-secondary)]">
                {item.message.content}
              </p>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function VoicesTab({ items }: { items: IMessage[] }) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setPlayingId(null);
      setCurrentTime(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDur);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playingId]);

  const toggleVoice = (m: IMessage) => {
    const url = m.content?.trim();
    if (!url) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === m._id) {
      if (isPlaying) {
        audio.pause();
      } else {
        void audio.play();
      }
      return;
    }

    setPlayingId(m._id);
    audio.src = url;
    setCurrentTime(0);
    const metaDur = m.metadata?.duration;
    if (metaDur && metaDur > 0) setDuration(metaDur);
    void audio.play();
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || playingId == null) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  if (!items.length) return <Empty label="Chưa có tin thoại" />;

  return (
    <>
      <audio ref={audioRef} className="hidden" preload="metadata" />
      <ul className="divide-y divide-[var(--qc-divider)] bg-[var(--qc-card)]">
        {items.map((m) => {
          const isCurrent = playingId === m._id;
          const metaDur = m.metadata?.duration ?? 0;
          const total = isCurrent && duration > 0 ? duration : metaDur > 0 ? metaDur : 0;
          const pos = isCurrent ? currentTime : 0;
          const maxSec = Math.max(total, 1);

          return (
            <li key={m._id}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--qc-bg)]"
                onClick={() => toggleVoice(m)}
              >
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[var(--qc-primary-light)]">
                  {isCurrent && isPlaying ? (
                    <Pause className="h-5 w-5 text-[var(--qc-primary)]" />
                  ) : (
                    <Play className="h-5 w-5 text-[var(--qc-primary)]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--qc-text-primary)]">Tin nhắn thoại</p>
                  {isCurrent ? (
                    <div className="mt-2">
                      <input
                        type="range"
                        min={0}
                        max={maxSec}
                        step={0.1}
                        value={Math.min(pos, maxSec)}
                        onChange={(e) => {
                          e.stopPropagation();
                          seek(Number(e.target.value));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-1 w-full accent-[var(--qc-primary)]"
                      />
                      <div className="mt-1 flex justify-between text-xs text-[var(--qc-text-secondary)]">
                        <span>{formatClock(pos)}</span>
                        <span>{formatClock(maxSec)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-[var(--qc-text-secondary)]">
                      {formatVoiceDuration(metaDur)} ·{" "}
                      {new Date(m.createdAt).toLocaleString("vi-VN")}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-[var(--qc-text-secondary)]">
      <ImageIcon className="mb-2 h-10 w-10 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
