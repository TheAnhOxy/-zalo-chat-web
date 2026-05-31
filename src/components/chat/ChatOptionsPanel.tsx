"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  ChevronRight,
  FolderOpen,
  Image as ImageIcon,
  Pin,
  Search,
  Trash2,
  User,
  UserPlus,
  Users,
  Wallpaper,
  X,
} from "lucide-react";
import { IConversation } from "@/src/types/conversation";
import { IMessage } from "@/src/types/message";
import { conversationsApi } from "@/src/services/api/conversations";
import { CHAT_THEMES, ChatTheme } from "@/src/hooks/useChatTheme";
import { useToast } from "@/src/components/providers/toast-provider";

interface ChatOptionsPanelProps {
  open: boolean;
  onClose: () => void;
  conversation: IConversation;
  currentUserId: string;
  peerName: string;
  peerId?: string;
  theme: ChatTheme;
  onThemeChange: (theme: ChatTheme) => void;
  onSearchMessages: () => void;
  onOpenPinnedMessage?: (messageId: string) => void;
  onHistoryDeleted?: () => void;
}

function muteKey(conversationId: string) {
  return `conv_mute_${conversationId}`;
}

function OptionsSection({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-gray-100 bg-white">{children}</div>;
}

function OptionsRow({
  icon,
  label,
  trailing,
  onClick,
  danger,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  href?: string;
}) {
  const className = `flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50 ${
    danger ? "text-red-600" : "text-gray-900"
  }`;

  const inner = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${danger ? "bg-red-50" : "bg-gray-100"}`}>
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {trailing ?? <ChevronRight className="h-4 w-4 text-gray-400" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 px-2 py-1 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">{icon}</span>
      <span className="max-w-[72px] text-[11px] leading-tight text-gray-600 whitespace-pre-line">{label}</span>
    </button>
  );
}

export function ChatOptionsPanel({
  open,
  onClose,
  conversation,
  currentUserId,
  peerName,
  peerId,
  theme,
  onThemeChange,
  onSearchMessages,
  onOpenPinnedMessage,
  onHistoryDeleted,
}: ChatOptionsPanelProps) {
  const { showToast } = useToast();
  const isGroup = conversation.type === "GROUP";
  const title = isGroup ? (conversation.name || "Nhóm") : peerName;

  const me = conversation.participants.find((p) => p.userId === currentUserId);
  const [isPinned, setIsPinned] = useState(Boolean(me?.isPinned));
  const [isMuted, setIsMuted] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<IMessage[]>(conversation.pinnedMessages ?? []);
  const [mediaPreview, setMediaPreview] = useState<IMessage[]>([]);
  const [storageCount, setStorageCount] = useState<number | null>(null);
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [showMediaList, setShowMediaList] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsPinned(Boolean(me?.isPinned));
    setIsMuted(localStorage.getItem(muteKey(conversation._id)) === "1");

    void conversationsApi.getPinnedMessages(conversation._id, currentUserId).then(setPinnedMessages).catch(() => {
      setPinnedMessages(conversation.pinnedMessages ?? []);
    });

    void conversationsApi
      .getMessages(conversation._id, currentUserId, { limit: 100, skip: 0 })
      .then((page) => {
        const media = page.messages.filter((m) =>
          ["IMAGE", "VIDEO", "FILE", "VOICE"].includes(m.type)
        );
        setMediaPreview(media.slice(-4).reverse());
        setStorageCount(page.messages.length);
      })
      .catch(() => setStorageCount(null));
  }, [open, conversation._id, conversation.pinnedMessages, currentUserId, me?.isPinned]);

  const togglePin = useCallback(async () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      await conversationsApi.setConversationPinned(conversation._id, currentUserId, next);
      showToast(next ? "Đã ghim trò chuyện" : "Đã bỏ ghim trò chuyện");
    } catch {
      setIsPinned(!next);
      showToast("Không thể ghim trò chuyện", "error");
    }
  }, [conversation._id, currentUserId, isPinned, showToast]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    if (next) localStorage.setItem(muteKey(conversation._id), "1");
    else localStorage.removeItem(muteKey(conversation._id));
    showToast(next ? "Đã tắt thông báo" : "Đã bật thông báo");
  }, [conversation._id, isMuted, showToast]);

  const handleDeleteHistory = useCallback(async () => {
    setConfirmDelete(false);
    try {
      await conversationsApi.deleteConversationHistoryForMe(conversation._id, currentUserId);
      showToast("Đã xóa lịch sử trò chuyện");
      onHistoryDeleted?.();
      onClose();
    } catch {
      showToast("Xóa lịch sử thất bại", "error");
    }
  }, [conversation._id, currentUserId, onClose, onHistoryDeleted, showToast]);

  if (!open) return null;

  return (
    <>
      <div
        className="absolute inset-0 z-30 bg-black/20 md:bg-transparent"
        aria-hidden
        onClick={onClose}
      />

      <aside
        className="absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-gray-200 bg-[#f4f5f7] shadow-xl animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-label="Tùy chọn trò chuyện"
      >
        {/* Header bar */}
        <div className="flex items-center gap-2 bg-zalo-blue px-3 py-3 text-white">
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Đóng">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="flex-1 text-base font-semibold">Tùy chọn</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10 md:hidden" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile header */}
          <div className="flex flex-col items-center bg-white px-4 py-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-zalo-blue to-blue-700 text-2xl font-bold text-white">
              {conversation.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={conversation.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                title.slice(0, 1).toUpperCase()
              )}
            </div>
            <p className="mt-3 text-lg font-semibold text-gray-900">{title}</p>
            {isGroup && (
              <p className="text-sm text-gray-500">{conversation.participants.length} thành viên</p>
            )}
          </div>

          {/* 4 action buttons — mobile _ChatOptionsActionRow */}
          <div className="mt-2 bg-white py-4">
            <div className="flex justify-evenly">
              <ActionButton
                icon={<Search className="h-5 w-5" />}
                label={"Tìm\ntin nhắn"}
                onClick={() => {
                  onClose();
                  onSearchMessages();
                }}
              />
              <ActionButton
                icon={isGroup ? <UserPlus className="h-5 w-5" /> : <User className="h-5 w-5" />}
                label={isGroup ? "Thêm\nthành viên" : "Trang\ncá nhân"}
                onClick={() => {
                  if (isGroup) {
                    showToast("Mở nhóm để thêm thành viên");
                  } else if (peerId) {
                    window.open(`/contacts?user=${peerId}`, "_self");
                  }
                }}
              />
              <ActionButton
                icon={<Wallpaper className="h-5 w-5" />}
                label={"Đổi\nhình nền"}
                onClick={() => setShowWallpaper(true)}
              />
              <ActionButton
                icon={isMuted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                label={isMuted ? "Bật\nthông báo" : "Tắt\nthông báo"}
                onClick={toggleMute}
              />
            </div>
          </div>

          {/* Section: media + pinned */}
          <div className="mt-2">
            <OptionsSection>
              <button
                type="button"
                className="w-full px-4 py-3 text-left"
                onClick={() => setShowMediaList(true)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                    <FolderOpen className="h-4 w-4 text-orange-500" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-gray-900">Ảnh, file, link</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                {mediaPreview.length > 0 && (
                  <div className="mt-3 flex gap-2 pl-11">
                    {mediaPreview.map((m) => (
                      <div key={m._id} className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100">
                        {m.type === "IMAGE" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.content} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </button>
              <OptionsRow
                icon={<Pin className="h-4 w-4 text-zalo-blue" />}
                label="Tin nhắn đã ghim"
                trailing={
                  pinnedMessages.length > 0 ? (
                    <span className="text-xs text-gray-400">{pinnedMessages.length}</span>
                  ) : undefined
                }
                onClick={() => setShowPinnedList(true)}
              />
            </OptionsSection>
          </div>

          {/* Section: group / private actions */}
          <div className="mt-2">
            <OptionsSection>
              {!isGroup && peerId && (
                <>
                  <OptionsRow
                    icon={<Users className="h-4 w-4 text-zalo-blue" />}
                    label={`Tạo nhóm với ${peerName}`}
                    href="/groups"
                    onClick={onClose}
                  />
                  <OptionsRow
                    icon={<UserPlus className="h-4 w-4 text-zalo-blue" />}
                    label={`Thêm ${peerName} vào nhóm`}
                    onClick={() => showToast("Chọn nhóm trong mục Nhóm để thêm thành viên")}
                  />
                </>
              )}
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                  <Pin className="h-4 w-4 text-zalo-blue" />
                </span>
                <span className="flex-1 text-sm font-medium text-gray-900">Ghim trò chuyện</span>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={togglePin}
                  className="h-4 w-4 accent-zalo-blue"
                  aria-label="Ghim trò chuyện"
                />
              </label>
            </OptionsSection>
          </div>

          {/* Storage */}
          <div className="mt-2">
            <OptionsSection>
              <OptionsRow
                icon={<FolderOpen className="h-4 w-4 text-gray-600" />}
                label="Dung lượng trò chuyện"
                trailing={
                  <span className="text-xs text-gray-400">
                    {storageCount != null ? `~${storageCount} tin gần đây` : "—"}
                  </span>
                }
                onClick={() =>
                  showToast(
                    storageCount != null
                      ? `Đã tải ${storageCount} tin nhắn gần nhất trong phiên này`
                      : "Không lấy được dung lượng"
                  )
                }
              />
            </OptionsSection>
          </div>

          {/* Danger zone */}
          <div className="mt-2 mb-6">
            <OptionsSection>
              <OptionsRow
                icon={<Trash2 className="h-4 w-4" />}
                label="Xóa lịch sử trò chuyện"
                danger
                onClick={() => setConfirmDelete(true)}
              />
            </OptionsSection>
          </div>
        </div>

        {/* Wallpaper picker sub-panel */}
        {showWallpaper && (
          <div className="absolute inset-0 z-50 flex flex-col bg-white">
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <button type="button" onClick={() => setShowWallpaper(false)} className="rounded-full p-1.5 hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h3 className="font-semibold">Đổi nền đoạn chat</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              {(Object.keys(CHAT_THEMES) as ChatTheme[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onThemeChange(key);
                    setShowWallpaper(false);
                    showToast(`Đã đổi nền: ${CHAT_THEMES[key].label}`);
                  }}
                  className={`rounded-xl border-2 p-2 ${theme === key ? "border-zalo-blue" : "border-transparent"}`}
                >
                  <div className={`h-16 rounded-lg ${CHAT_THEMES[key].gradient}`} />
                  <p className="mt-2 text-xs font-medium text-gray-700">{CHAT_THEMES[key].label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pinned messages sub-panel */}
        {showPinnedList && (
          <div className="absolute inset-0 z-50 flex flex-col bg-white">
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <button type="button" onClick={() => setShowPinnedList(false)} className="rounded-full p-1.5 hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h3 className="font-semibold">Tin nhắn đã ghim</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {pinnedMessages.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">Chưa có tin nhắn ghim</p>
              ) : (
                pinnedMessages.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    className="block w-full border-b px-4 py-3 text-left hover:bg-gray-50"
                    onClick={() => {
                      onOpenPinnedMessage?.(m._id);
                      setShowPinnedList(false);
                      onClose();
                    }}
                  >
                    <p className="truncate text-sm text-gray-900">{m.content || `[${m.type}]`}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(m.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Media list sub-panel */}
        {showMediaList && (
          <div className="absolute inset-0 z-50 flex flex-col bg-white">
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <button type="button" onClick={() => setShowMediaList(false)} className="rounded-full p-1.5 hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h3 className="font-semibold">Ảnh, file, link</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {mediaPreview.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Chưa có media</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaPreview.map((m) => (
                    <div key={m._id} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                      {m.type === "IMAGE" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.content} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-2 text-center">
                          <FolderOpen className="h-6 w-6 text-gray-400" />
                          <span className="mt-1 truncate text-[10px] text-gray-500">
                            {m.metadata?.fileName ?? m.type}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="text-base font-semibold text-gray-900">Xóa lịch sử trò chuyện</h3>
              <p className="mt-2 text-sm text-gray-600">
                Toàn bộ tin nhắn sẽ bị xóa khỏi thiết bị của bạn. Thao tác này không thể hoàn tác.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  onClick={() => setConfirmDelete(false)}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                  onClick={handleDeleteHistory}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
