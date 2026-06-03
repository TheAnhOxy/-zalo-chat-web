"use client";

import { useEffect, useState } from "react";

interface GroupDescriptionDialogProps {
  open: boolean;
  editable: boolean;
  initialDescription: string;
  saving?: boolean;
  onClose: () => void;
  onSave?: (description: string) => void | Promise<void>;
  onReadOnlyInteract?: () => void;
}

export function GroupDescriptionDialog({
  open,
  editable,
  initialDescription,
  saving = false,
  onClose,
  onSave,
  onReadOnlyInteract,
}: GroupDescriptionDialogProps) {
  const [text, setText] = useState(initialDescription);

  useEffect(() => {
    if (open) setText(initialDescription);
  }, [open, initialDescription]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--qc-card)] p-5 shadow-xl"
        role="dialog"
        aria-labelledby="group-desc-title"
      >
        <h3 id="group-desc-title" className="text-base font-bold text-[var(--qc-text-primary)]">
          Mô tả nhóm
        </h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={!editable}
          onClick={() => {
            if (!editable) onReadOnlyInteract?.();
          }}
          onFocus={() => {
            if (!editable) onReadOnlyInteract?.();
          }}
          rows={5}
          placeholder="Nhập mô tả cho nhóm"
          className="mt-3 w-full resize-none rounded-[10px] bg-[var(--qc-bg)] px-3 py-2.5 text-sm text-[var(--qc-text-primary)] outline-none ring-1 ring-[var(--qc-divider)] focus:ring-[var(--qc-primary)] read-only:cursor-default read-only:opacity-90"
          autoFocus={editable}
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm text-[var(--qc-text-secondary)] hover:bg-[var(--qc-bg)]"
            onClick={onClose}
            disabled={saving}
          >
            {editable ? "Huỷ" : "Đóng"}
          </button>
          {editable && onSave ? (
            <button
              type="button"
              className="rounded-lg bg-[var(--qc-primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
              disabled={saving}
              onClick={() => void onSave(text.trim())}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
