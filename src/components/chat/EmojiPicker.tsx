"use client";

const EMOJI_ROWS: string[][] = [
  ["😀", "😂", "🥰", "😍", "😘", "😭", "😡", "🤔", "👍", "👎", "🙏", "👏"],
  ["❤️", "💔", "🔥", "✨", "🎉", "😎", "🤣", "😅", "😢", "😱", "💯", "⭐"],
  ["🙂", "😊", "😉", "🤗", "😴", "🥳", "🤩", "😇", "🙄", "😬", "🤝", "💪"],
];

interface EmojiPickerProps {
  open: boolean;
  onPick: (emoji: string) => void;
}

export function EmojiPicker({ open, onPick }: EmojiPickerProps) {
  if (!open) return null;

  return (
    <div className="border-t border-[var(--qc-divider)] bg-[var(--qc-card)] px-2 py-2">
      {EMOJI_ROWS.map((row, i) => (
        <div key={i} className="flex flex-wrap justify-center gap-0.5">
          {row.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-[var(--qc-bg)]"
              onClick={() => onPick(emoji)}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
