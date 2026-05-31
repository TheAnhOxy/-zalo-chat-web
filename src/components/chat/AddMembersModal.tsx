"use client";

import { useMemo, useState } from "react";
import { X, Search, Check } from "lucide-react";
import { IUser } from "@/src/types/user";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";

interface AddMembersModalProps {
  open: boolean;
  onClose: () => void;
  friends: IUser[];
  existingMemberIds: string[];
  onConfirm: (userIds: string[]) => void | Promise<void>;
  loading?: boolean;
}

export function AddMembersModal({
  open,
  onClose,
  friends,
  existingMemberIds,
  onConfirm,
  loading,
}: AddMembersModalProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const existing = useMemo(() => new Set(existingMemberIds), [existingMemberIds]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return friends.filter((f) => {
      if (existing.has(f._id)) return false;
      if (!q) return true;
      const name = (f.fullName || f.username || "").toLowerCase();
      return name.includes(q) || (f.phone || "").includes(q);
    });
  }, [friends, existing, query]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="absolute inset-0 z-[65] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--qc-card)] shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--qc-divider)] px-4 py-3">
          <h2 className="text-base font-bold">Thêm thành viên</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-[var(--qc-bg)]" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-[var(--qc-divider)] px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--qc-bg)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--qc-text-secondary)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bạn bè"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--qc-text-secondary)]">Không có bạn bè để thêm</p>
          ) : (
            candidates.map((f) => {
              const name = f.fullName || f.username || "Người dùng";
              const checked = selected.has(f._id);
              return (
                <button
                  key={f._id}
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-[var(--qc-divider)] px-4 py-3 text-left hover:bg-[var(--qc-bg)]"
                  onClick={() => toggle(f._id)}
                >
                  <AvatarWidget url={f.avatar} name={name} size={40} />
                  <span className="flex-1 truncate text-sm font-medium">{name}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border ${
                      checked ? "border-[var(--qc-primary)] bg-[var(--qc-primary)] text-white" : "border-gray-300"
                    }`}
                  >
                    {checked ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-[var(--qc-divider)] p-3">
          <button
            type="button"
            disabled={selected.size === 0 || loading}
            className="w-full rounded-lg bg-[var(--qc-primary)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void onConfirm([...selected])}
          >
            {loading ? "Đang thêm..." : `Thêm (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
