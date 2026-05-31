"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { conversationsApi } from "@/src/services/api/conversations";
import {
  computeConversationStorage,
  formatBytes,
  ConversationStorageStats,
} from "@/src/lib/conversation-storage";

interface ConversationStoragePanelProps {
  conversationId: string;
  userId: string;
  onBack: () => void;
}

export function ConversationStoragePanel({
  conversationId,
  userId,
  onBack,
}: ConversationStoragePanelProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ConversationStorageStats | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await conversationsApi.getMessages(conversationId, userId, { limit: 200, skip: 0 });
      setStats(computeConversationStorage(page.messages));
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = stats ? stats.bytesText + stats.bytesMedia : 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--qc-bg)]">
      <div className="flex shrink-0 items-center gap-1 bg-[var(--qc-primary)] px-1 py-2 text-white">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Quay lại
        </button>
        <h3 className="flex-1 text-[17px] font-bold">Dung lượng trò chuyện</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--qc-text-secondary)]">Đang tính...</p>
        ) : stats ? (
          <>
            <div className="rounded-xl border border-[var(--qc-divider)] bg-[var(--qc-card)] p-3">
              <p className="text-sm font-bold text-[var(--qc-text-primary)]">Tổng: {formatBytes(total)}</p>
              <p className="mt-1.5 text-[13px] text-[var(--qc-text-secondary)]">
                Đính kèm: {formatBytes(stats.bytesMedia)}
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--qc-text-secondary)]">
                Video: {formatBytes(stats.bytesVideo)}
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--qc-text-secondary)]">
                Văn bản: {formatBytes(stats.bytesText)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--qc-text-secondary)]/70">
                Số tin đã tính: {stats.count} (tối đa 200 tin gần nhất)
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--qc-primary)] py-3 text-sm font-semibold text-[var(--qc-primary)]"
            >
              <RefreshCw className="h-4 w-4" />
              Tính lại
            </button>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-[var(--qc-text-secondary)]">
            Không tải được dữ liệu
          </p>
        )}
      </div>
    </div>
  );
}
