import { useState } from "react";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import { IMessage } from "@/src/types/message";
import { t, ChatLocale } from "@/src/lib/i18n/chat";

interface PinnedMessagesHeaderProps {
  messages: IMessage[];
  locale?: ChatLocale;
  onJumpToMessage?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

export function PinnedMessagesHeader({
  messages,
  locale = "vi",
  onJumpToMessage,
  onUnpin,
}: PinnedMessagesHeaderProps) {
  const [expanded, setExpanded] = useState(false);

  if (!messages || messages.length === 0) return null;

  const topMessage = messages[0];

  return (
    <div className="border-b bg-white px-4 py-2 text-sm shadow-sm transition-all relative z-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 overflow-hidden text-left"
          onClick={() => {
            if (messages.length > 1) {
              setExpanded(!expanded);
            } else if (onJumpToMessage) {
              onJumpToMessage(topMessage._id);
            }
          }}
        >
          <Pin className="h-4 w-4 shrink-0 text-zalo-blue" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-800">
              {t("pinnedMessage", locale)}
              {messages.length > 1 ? ` (${messages.length})` : ""}
            </p>
            {!expanded && (
              <p className="truncate text-xs text-gray-500">{topMessage.content}</p>
            )}
          </div>
          {messages.length > 1 && (
            expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {expanded && messages.length > 1 && (
        <div className="mt-2 flex flex-col gap-2 border-t pt-2">
          {messages.map((m) => (
            <div key={m._id} className="group flex items-center justify-between rounded-lg p-2 hover:bg-gray-50">
              <button
                type="button"
                className="flex-1 overflow-hidden text-left"
                onClick={() => {
                  onJumpToMessage?.(m._id);
                  setExpanded(false);
                }}
              >
                <p className="truncate text-sm text-gray-700">{m.content}</p>
              </button>
              {onUnpin && (
                <button
                  type="button"
                  onClick={() => onUnpin(m._id)}
                  className="hidden text-xs text-red-500 hover:underline group-hover:block"
                >
                  {t("unpin", locale)}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
