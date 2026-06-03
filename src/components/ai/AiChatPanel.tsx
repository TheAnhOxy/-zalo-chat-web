"use client";

import { FormEvent, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Paperclip,
  MessageSquarePlus,
  MessagesSquare,
  Trash2,
  X,
  Copy,
  Undo2,
  Loader2,
} from "lucide-react";
import { useChatbot } from "@/src/hooks/use-chatbot";
import { chatbotService } from "@/src/services/chatbot/chatbot.service";
import { ChatbotMessage } from "@/src/types/chatbot";

const ALLOWED_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "txt",
  "csv",
  "json",
  "docx",
  "doc",
];

type AiChatPanelProps = {
  userId: string;
  targetConversationId?: string | null;
  autoSummarizeOnOpen?: boolean;
  /** `page` = /ai (có bottom nav); `sheet` = bottom sheet từ chat */
  layout?: "page" | "sheet";
};

export function AiChatPanel({
  userId,
  targetConversationId,
  autoSummarizeOnOpen,
  layout = "page",
}: AiChatPanelProps) {
  const isSheet = layout === "sheet";
  const [input, setInput] = useState("");
  const [showConversations, setShowConversations] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bot = useChatbot({
    userId,
    targetConversationId,
    autoSummarizeOnOpen,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input;
    setInput("");
    void bot.sendMessage(text);
  };

  const openConversations = async () => {
    setShowConversations(true);
    await bot.refreshConversations();
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--qc-bg)]">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--qc-divider)] bg-white px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)] text-white sm:h-9 sm:w-9">
          <Sparkles size={16} className="sm:h-[18px] sm:w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-bold text-[var(--qc-text-primary)] sm:text-sm">
            Trợ lý AI
          </h1>
          <p className="hidden truncate text-xs text-[var(--qc-primary)] sm:block">
            Powered by QuickChat AI
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => void openConversations()}
            className="rounded-lg p-2 text-[var(--qc-text-secondary)] transition hover:bg-[var(--qc-primary-light)] hover:text-[var(--qc-primary)]"
            title="Danh sách cuộc trò chuyện"
            aria-label="Danh sách cuộc trò chuyện"
          >
            <MessagesSquare size={20} />
          </button>
          <button
            type="button"
            onClick={() => void bot.newConversation()}
            className="rounded-lg p-2 text-[var(--qc-text-secondary)] transition hover:bg-[var(--qc-primary-light)] hover:text-[var(--qc-primary)]"
            title="Cuộc trò chuyện mới"
            aria-label="Cuộc trò chuyện mới"
          >
            <MessageSquarePlus size={20} />
          </button>
          <button
            type="button"
            onClick={() => void bot.deleteCurrentConversation()}
            className="rounded-lg p-2 text-[var(--qc-text-secondary)] transition hover:bg-rose-50 hover:text-rose-600"
            title="Xóa cuộc trò chuyện"
            aria-label="Xóa cuộc trò chuyện"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-4 sm:py-4">
          {bot.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRecall={() => void bot.recallMessage(msg.id)}
            />
          ))}
          <div ref={bot.listEndRef} />
        </div>
      </div>

      {/* Quick replies */}
      {bot.showQuickReplies ? (
        <div className="shrink-0 border-t border-[var(--qc-divider)] bg-white px-2 py-2 sm:px-3">
          <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {bot.quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void bot.sendMessage(q)}
                className="shrink-0 rounded-full border border-[var(--qc-primary)]/30 bg-[var(--qc-primary-light)] px-3 py-1.5 text-xs font-medium text-[var(--qc-primary)] transition hover:bg-[var(--qc-primary)]/15"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className={`shrink-0 border-t border-[var(--qc-divider)] bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)] ${
          isSheet
            ? "px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-3"
            : "px-2 py-2 sm:px-3 sm:py-3"
        }`}
      >
        <div className="mx-auto w-full max-w-3xl">
        {bot.selectedFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {bot.selectedFiles.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex max-w-[min(200px,70vw)] items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  disabled={bot.isSending}
                  onClick={() => bot.removeFile(i)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex min-w-0 items-end gap-1.5 sm:gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) bot.addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={bot.isSending}
            onClick={() => fileInputRef.current?.click()}
            className={`shrink-0 rounded-full p-2.5 transition ${
              bot.selectedFiles.length > 0
                ? "text-[var(--qc-primary)] bg-[var(--qc-primary-light)]"
                : "text-[var(--qc-text-secondary)] hover:bg-slate-100"
            }`}
            title="Đính kèm file"
          >
            <Paperclip size={20} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as FormEvent);
              }
            }}
            rows={1}
            placeholder="Hỏi trợ lý AI..."
            disabled={bot.isSending}
            className="max-h-28 min-h-[40px] min-w-0 flex-1 resize-none rounded-3xl bg-[var(--qc-bg)] px-3 py-2 text-sm text-[var(--qc-text-primary)] outline-none placeholder:text-[var(--qc-text-secondary)] focus:ring-2 focus:ring-[var(--qc-primary)]/25 sm:min-h-[44px] sm:px-4 sm:py-2.5"
          />
          <button
            type="submit"
            disabled={bot.isSending || (!input.trim() && bot.selectedFiles.length === 0)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)] text-white transition hover:brightness-110 disabled:opacity-50 sm:h-11 sm:w-11"
          >
            {bot.isSending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        </div>
      </form>

      {/* Conversations drawer */}
      {showConversations ? (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/30">
          <div
            className="absolute inset-0"
            onClick={() => setShowConversations(false)}
            aria-hidden
          />
          <aside className="relative flex h-[100dvh] w-full max-w-full flex-col bg-white shadow-2xl sm:max-w-sm">
            <div className="flex items-center justify-between border-b border-[var(--qc-divider)] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pt-3">
              <h2 className="truncate text-base font-bold text-slate-800 sm:text-lg">Cuộc trò chuyện</h2>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowConversations(false);
                    void bot.newConversation();
                  }}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--qc-primary)] hover:bg-[var(--qc-primary-light)]"
                >
                  + Mới
                </button>
                <button
                  type="button"
                  onClick={() => setShowConversations(false)}
                  className="rounded-lg p-1.5 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {bot.loadingConversations ? (
                <p className="py-8 text-center text-sm text-slate-500">Đang tải...</p>
              ) : bot.conversations.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Chưa có cuộc trò chuyện nào</p>
              ) : (
                bot.conversations.map((c) => {
                  const id = String(c.id ?? c._id ?? "");
                  const title = String(c.title ?? "").trim() || "Cuộc trò chuyện";
                  const active = id === bot.conversationId;
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 ${
                        active ? "bg-[var(--qc-primary-light)]" : "hover:bg-slate-50"
                      }`}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-sm font-semibold text-slate-800"
                        onClick={() => {
                          setShowConversations(false);
                          void bot.loadConversationById(id);
                        }}
                      >
                        <span className="block truncate">{title}</span>
                      </button>
                      <button
                        type="button"
                        title="Đổi tên"
                        className="rounded p-1 text-slate-400 hover:text-[var(--qc-primary)]"
                        onClick={async () => {
                          const next = prompt("Đổi tên cuộc trò chuyện:", title);
                          if (!next?.trim()) return;
                          await chatbotService.renameConversation(userId, id, next.trim());
                          await bot.refreshConversations();
                        }}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        title="Xóa"
                        className="rounded p-1 text-slate-400 hover:text-rose-600"
                        onClick={async () => {
                          if (!confirm("Xóa cuộc trò chuyện này?")) return;
                          await chatbotService.deleteConversation(userId, id);
                          await bot.refreshConversations();
                          if (id === bot.conversationId) void bot.newConversation();
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  onRecall,
}: {
  message: ChatbotMessage;
  onRecall: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isUser = message.isUser;
  const canRecall =
    isUser && /^[0-9a-fA-F]{24}$/.test(message.id) && !message.isLoading;

  return (
    <div
      className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)] text-white">
          <Sparkles size={14} />
        </div>
      )}
      <div className={`max-w-[min(88vw,78%)] sm:max-w-[78%] ${isUser ? "items-end" : "items-start"} flex min-w-0 flex-col`}>
        <div
          className={`relative rounded-2xl px-3.5 py-2.5 shadow-sm ${
            isUser
              ? "rounded-br-md bg-[var(--qc-primary)] text-white"
              : "rounded-bl-md bg-white text-[var(--qc-text-primary)]"
          }`}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen(true);
          }}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--qc-primary)] [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--qc-primary)] [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--qc-primary)]" />
            </div>
          ) : (
            <>
              {message.content ? (
                <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              ) : null}
              {message.attachments?.map((a) => (
                <a
                  key={a.url}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-2 block text-xs underline ${isUser ? "text-white/90" : "text-[var(--qc-primary)]"}`}
                >
                  📎 {a.name}
                </a>
              ))}
            </>
          )}
        </div>
        {message.toolsUsed && message.toolsUsed.length > 0 ? (
          <span className="mt-1 rounded-full bg-[var(--qc-primary-light)] px-2 py-0.5 text-[10px] text-[var(--qc-primary)]">
            🔧 {message.toolsUsed.join(", ")}
          </span>
        ) : null}
        <span className="mt-0.5 text-[10px] text-[var(--qc-text-secondary)]">
          {message.createdAt.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {menuOpen ? (
          <div className="relative">
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  void navigator.clipboard.writeText(message.content);
                  setMenuOpen(false);
                }}
              >
                <Copy size={14} /> Sao chép
              </button>
              {canRecall ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => {
                    onRecall();
                    setMenuOpen(false);
                  }}
                >
                  <Undo2 size={14} /> Thu hồi
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
