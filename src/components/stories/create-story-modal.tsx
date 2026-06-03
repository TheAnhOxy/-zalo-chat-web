"use client";

import { useRef, useState, useCallback } from "react";
import {
  X, Image as ImageIcon, Video, Send, RefreshCw, Play, Pause, ChevronRight
} from "lucide-react";
import { apiClient } from "@/src/services/api/client";
import { useQueryClient } from "@tanstack/react-query";

interface CreateStoryModalProps {
  userId: string;
  onClose: () => void;
}

type MediaType = "IMAGE" | "VIDEO";
type Step = "pick" | "preview";

export function CreateStoryModal({ userId, onClose }: CreateStoryModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [step, setStep] = useState<Step>("pick");
  const [mediaType, setMediaType] = useState<MediaType>("IMAGE");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Pick File ──────────────────────────────────────────────────────────────
  const handlePickFile = (type: MediaType) => {
    setMediaType(type);
    fileInputRef.current!.accept = type === "IMAGE" ? "image/*" : "video/*";
    fileInputRef.current!.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    // Reset state
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setIsPlaying(false);

    const url = URL.createObjectURL(picked);
    setFile(picked);
    setPreviewUrl(url);
    setStep("preview");

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // ── Video Play/Pause ────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // ── Upload & Post ─────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file || !userId) return;
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const isVideo = mediaType === "VIDEO";
      const contentType = file.type || (isVideo ? "video/mp4" : "image/jpeg");
      const fileName = `story_${Date.now()}_${file.name.replace(/\s/g, "_")}`;

      // 1. Lấy presigned URL từ backend
      const presignedRes = await apiClient.get<{ uploadUrl: string; fileUrl: string }>(
        `/upload/presigned-url?fileName=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(contentType)}`
      );
      const { uploadUrl, fileUrl } = presignedRes.data;

      // 2. PUT file trực tiếp lên S3
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      setUploadProgress(80);

      // 3. Tạo story với URL public từ S3
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await apiClient.post("/stories", {
        userId,
        mediaUrl: fileUrl,
        type: mediaType,
        caption: caption.trim(),
        expiresAt,
        viewers: [],
      });

      setUploadProgress(100);

      // 4. Refresh stories list
      queryClient.invalidateQueries({ queryKey: ["stories"] });

      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Back to pick ───────────────────────────────────────────────────────────
  const handleRepick = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setCaption("");
    setStep("pick");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex h-full w-full max-w-md flex-col bg-black sm:h-[90vh] sm:rounded-2xl sm:shadow-2xl overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10">
            <X size={22} />
          </button>
          <h2 className="text-[16px] font-semibold text-white">Tạo Story mới</h2>
          <div className="w-9" />
        </div>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        {/* ── Step: Pick ─────────────────────────────────────────────── */}
        {step === "pick" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
            {/* Icon placeholder */}
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/10 bg-white/5">
              <ImageIcon size={52} className="text-white/30" />
            </div>
            <p className="text-base font-medium text-white/70">Chọn nội dung để chia sẻ</p>

            <div className="flex w-full flex-col gap-4">
              {/* Pick Image */}
              <button
                onClick={() => handlePickFile("IMAGE")}
                className="flex w-full items-center gap-4 rounded-2xl border border-blue-500/40 bg-blue-500/10 px-5 py-4 text-left transition hover:bg-blue-500/20"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500">
                  <ImageIcon size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Chọn ảnh</p>
                  <p className="text-xs text-white/50">JPG, PNG, WEBP</p>
                </div>
                <ChevronRight size={18} className="text-white/30" />
              </button>

              {/* Pick Video */}
              <button
                onClick={() => handlePickFile("VIDEO")}
                className="flex w-full items-center gap-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-left transition hover:bg-rose-500/20"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500">
                  <Video size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Chọn video</p>
                  <p className="text-xs text-white/50">Tối đa 60 giây</p>
                </div>
                <ChevronRight size={18} className="text-white/30" />
              </button>
            </div>

            <button onClick={onClose} className="text-sm font-medium text-white/40 hover:text-white/60">
              Hủy bỏ
            </button>
          </div>
        )}

        {/* ── Step: Preview ──────────────────────────────────────────── */}
        {step === "preview" && previewUrl && (
          <>
            {/* Media Preview */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
              {/* Blur background for image */}
              {mediaType === "IMAGE" && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl"
                  style={{ backgroundImage: `url(${previewUrl})` }}
                />
              )}

              {/* Media Badge */}
              <div className={`absolute left-3 top-3 z-20 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm shadow ${
                mediaType === "VIDEO" ? "bg-rose-500/80" : "bg-blue-500/80"
              }`}>
                {mediaType === "VIDEO" ? <><Play size={10} fill="currentColor" /> VIDEO</> : <><ImageIcon size={10} /> ẢNH</>}
              </div>

              {mediaType === "IMAGE" ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="relative z-10 max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="relative h-full w-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    className="max-h-full max-w-full object-contain"
                    loop
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Play/Pause overlay */}
                  <button
                    onClick={togglePlay}
                    className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                    style={{ opacity: isPlaying ? 0 : 1 }}
                  >
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="shrink-0 border-t border-white/10 bg-black px-4 pb-6 pt-4">
              {/* Caption input */}
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
                placeholder="Thêm caption cho Story của bạn..."
                rows={2}
                className="w-full resize-none rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
              />
              <div className="mt-1 text-right text-[11px] text-white/30">{caption.length}/200</div>

              {/* Error */}
              {error && (
                <p className="mt-2 rounded-xl bg-red-500/20 px-3 py-2 text-xs text-red-400">{error}</p>
              )}

              {/* Upload progress */}
              {isUploading && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-center text-xs text-white/40">
                    {uploadProgress > 0 ? `Đang tải lên ${uploadProgress}%...` : "Đang xử lý..."}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              {!isUploading && (
                <div className="mt-3 flex items-center gap-3">
                  {/* Hủy */}
                  <button
                    onClick={onClose}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25"
                  >
                    <X size={20} />
                  </button>

                  {/* Chọn lại */}
                  <button
                    onClick={handleRepick}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/20"
                  >
                    <RefreshCw size={14} />
                    Chọn lại
                  </button>

                  <div className="flex-1" />

                  {/* Đăng */}
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
                  >
                    Đăng
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
