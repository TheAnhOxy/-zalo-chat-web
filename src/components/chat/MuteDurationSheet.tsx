"use client";

import { MuteDurationOption } from "@/src/lib/conversation-mute";

const OPTIONS: { id: MuteDurationOption; label: string }[] = [
  { id: "1h", label: "Tắt trong 1 giờ" },
  { id: "4h", label: "Tắt trong 4 giờ" },
  { id: "until8am", label: "Tắt đến 8 giờ sáng" },
  { id: "untilOn", label: "Tắt cho đến khi tôi mở lại" },
];

interface MuteDurationSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (option: MuteDurationOption) => void;
}

export function MuteDurationSheet({ open, onClose, onSelect }: MuteDurationSheetProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white pb-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Chọn thời gian tắt thông báo"
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-[var(--qc-divider)]" />
        <p className="px-5 pb-2 pt-3 text-center text-sm font-semibold text-[var(--qc-text-primary)]">
          Tắt thông báo
        </p>
        <ul>
          {OPTIONS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="w-full px-5 py-3.5 text-left text-[15px] text-[#222] hover:bg-[var(--qc-bg)]"
                onClick={() => {
                  onSelect(opt.id);
                  onClose();
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-1 w-full px-5 py-3 text-center text-sm text-[var(--qc-text-secondary)]"
          onClick={onClose}
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}
