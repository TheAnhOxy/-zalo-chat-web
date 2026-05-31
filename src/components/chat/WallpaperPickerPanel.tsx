"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { SubPanelShell } from "@/src/components/chat/SubPanelShell";
import {
  GROUP_BG_COUNT,
  GROUP_BG_GRADIENTS,
  GROUP_BG_LABELS,
} from "@/src/lib/group-chat-backgrounds";
import { CHAT_THEMES, ChatTheme } from "@/src/hooks/useChatTheme";

const PRIVATE_THEMES = Object.keys(CHAT_THEMES) as ChatTheme[];

interface WallpaperPickerPanelProps {
  isGroup: boolean;
  isAdmin: boolean;
  privateTheme?: ChatTheme;
  selectedGroupIndex?: number;
  onBack: () => void;
  onSelectPrivate: (theme: ChatTheme) => void;
  onSelectGroupPreset: (index: number, applyForAll: boolean) => void | Promise<void>;
  onSelectGroupCustom: (base64: string, applyForAll: boolean) => void | Promise<void>;
}

export function WallpaperPickerPanel({
  isGroup,
  isAdmin,
  privateTheme = "default",
  selectedGroupIndex = 0,
  onBack,
  onSelectPrivate,
  onSelectGroupPreset,
  onSelectGroupCustom,
}: WallpaperPickerPanelProps) {
  const [applyForAll, setApplyForAll] = useState(isGroup && isAdmin);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 350_000) {
      alert("Ảnh nền quá lớn để áp dụng cho cả nhóm. Hãy chọn ảnh nhẹ hơn (< 350KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setBusy(true);
      try {
        await onSelectGroupCustom(base64, applyForAll && isAdmin);
        onBack();
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isGroup) {
    return (
      <SubPanelShell title="Đổi hình nền" onBack={onBack}>
        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4">
          {PRIVATE_THEMES.map((key) => (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => {
                onSelectPrivate(key);
                onBack();
              }}
              className={`rounded-xl p-2 text-left ${
                privateTheme === key ? "ring-2 ring-[var(--qc-primary)]" : "ring-1 ring-[var(--qc-divider)]"
              }`}
            >
              <div className={`h-16 rounded-lg ${CHAT_THEMES[key].gradient}`} />
              <p className="mt-2 text-xs font-medium">{CHAT_THEMES[key].label}</p>
            </button>
          ))}
        </div>
      </SubPanelShell>
    );
  }

  return (
    <SubPanelShell title="Đổi hình nền" onBack={onBack}>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isAdmin ? (
          <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--qc-divider)] px-3 py-2.5">
            <input
              type="checkbox"
              checked={applyForAll}
              onChange={(e) => setApplyForAll(e.target.checked)}
              className="h-4 w-4 accent-[var(--qc-primary)]"
            />
            <span className="text-sm text-[var(--qc-text-primary)]">Áp dụng cho cả nhóm</span>
          </label>
        ) : (
          <p className="mb-3 text-xs text-[var(--qc-text-secondary)]">
            Chỉ bạn thấy nền này. Quản trị viên có thể áp dụng cho cả nhóm.
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--qc-divider)] py-4 text-sm text-[var(--qc-primary)]"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-5 w-5" />
          Chọn ảnh từ thiết bị
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: GROUP_BG_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSelectGroupPreset(i, applyForAll && isAdmin);
                  onBack();
                } finally {
                  setBusy(false);
                }
              }}
              className={`rounded-xl p-1.5 text-left ${
                selectedGroupIndex === i ? "ring-2 ring-[var(--qc-primary)]" : "ring-1 ring-[var(--qc-divider)]"
              }`}
            >
              <div className={`h-14 rounded-lg ${GROUP_BG_GRADIENTS[i]}`} />
              <p className="mt-1 truncate text-[10px] font-medium text-[var(--qc-text-secondary)]">
                {GROUP_BG_LABELS[i]}
              </p>
            </button>
          ))}
        </div>
      </div>
    </SubPanelShell>
  );
}
