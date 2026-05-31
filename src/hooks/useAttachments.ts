"use client";

import { useCallback, useRef, useState } from "react";
import { MessageType } from "@/src/types/message";

export interface AttachmentUploadState {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "failed" | "cancelled";
  error?: string;
}

function inferMessageType(file: File): MessageType {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  if (file.type.startsWith("audio/")) return "VOICE";
  return "FILE";
}

export function useAttachments() {
  const [uploads, setUploads] = useState<AttachmentUploadState[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    const items: AttachmentUploadState[] = list.map((file) => ({
      id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      file,
      progress: 0,
      status: "pending",
    }));
    setUploads((prev) => [...prev, ...items]);
    return items.map((item) => ({ ...item, messageType: inferMessageType(item.file) }));
  }, []);

  const updateUpload = useCallback((id: string, patch: Partial<AttachmentUploadState>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const removeUpload = useCallback((id: string) => {
    abortControllers.current.get(id)?.abort();
    abortControllers.current.delete(id);
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const getAbortSignal = useCallback((id: string) => {
    const controller = new AbortController();
    abortControllers.current.set(id, controller);
    return controller.signal;
  }, []);

  const cancelUpload = useCallback((id: string) => {
    abortControllers.current.get(id)?.abort();
    updateUpload(id, { status: "cancelled" });
  }, [updateUpload]);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "done" && u.status !== "cancelled"));
  }, []);

  return {
    uploads,
    addFiles,
    updateUpload,
    removeUpload,
    getAbortSignal,
    cancelUpload,
    clearCompleted,
    inferMessageType,
  };
}
