"use client";

import { useRef } from "react";
import { Sparkles, Image, Paperclip, Camera } from "lucide-react";

interface ComposerActionsSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenAi: () => void;
  onFilesSelected: (files: FileList) => void;
}

/** Bottom sheet hành động composer — khớp mobile _showComposerActionsSheet */
export function ComposerActionsSheet({
  open,
  onClose,
  onOpenAi,
  onFilesSelected,
}: ComposerActionsSheetProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const pickImage = () => {
    onClose();
    imageRef.current?.click();
  };

  const pickCamera = () => {
    onClose();
    cameraRef.current?.click();
  };

  const pickFile = () => {
    onClose();
    fileRef.current?.click();
  };

  const openAi = () => {
    onClose();
    onOpenAi();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/40" onClick={onClose}>
      <input
        ref={imageRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        multiple
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />

      <div
        className="rounded-t-[20px] bg-[var(--qc-card)] pb-6 pt-2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Tùy chọn đính kèm"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--qc-divider)]" />
        <ul className="px-2">
          <ActionRow
            icon={<Sparkles className="h-6 w-6 text-[var(--qc-primary)]" />}
            label="Trợ lý AI"
            onClick={openAi}
          />
          <ActionRow
            icon={<Camera className="h-6 w-6 text-[var(--qc-text-primary)]" />}
            label="Chụp ảnh"
            onClick={pickCamera}
          />
          <ActionRow
            icon={<Image className="h-6 w-6 text-[var(--qc-text-primary)]" />}
            label="Chọn ảnh/video"
            onClick={pickImage}
          />
          <ActionRow
            icon={<Paperclip className="h-6 w-6 text-[var(--qc-text-primary)]" />}
            label="Đính kèm tệp"
            onClick={pickFile}
          />
        </ul>
      </div>
    </div>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left text-[15px] font-medium text-[var(--qc-text-primary)] hover:bg-[var(--qc-bg)]"
        onClick={onClick}
      >
        {icon}
        {label}
      </button>
    </li>
  );
}
