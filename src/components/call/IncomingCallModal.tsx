"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import { IncomingCallPayload } from "@/src/services/socket/call-events";

interface IncomingCallModalProps {
  call: IncomingCallPayload;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
  const isVideo = call.type === "VIDEO";
  const title = call.isGroup
    ? call.groupName || "Cuộc gọi nhóm"
    : call.callerName || "Người dùng";
  const subtitle = call.isGroup
    ? `${isVideo ? "Video" : "Thoại"} nhóm • ${call.participants?.length ?? 0} người`
    : isVideo
      ? "Cuộc gọi video đến"
      : "Cuộc gọi thoại đến";

  return (
    <div className="fixed inset-0 z-200 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-2xl bg-(--qc-card) p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="incoming-call-title"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <AvatarWidget
              url={call.isGroup ? call.groupAvatar : call.callerAvatar}
              name={title}
              size={80}
            />
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-(--qc-primary) text-white">
              {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            </span>
          </div>

          <h2
            id="incoming-call-title"
            className="mt-4 text-lg font-bold text-(--qc-text-primary)"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-(--qc-text-secondary)">{subtitle}</p>

          <div className="mt-6 flex w-full items-center justify-center gap-8">
            <button
              type="button"
              onClick={onReject}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
              aria-label="Từ chối"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-(--qc-primary) text-white shadow-md hover:brightness-95"
              aria-label="Trả lời"
            >
              <Phone className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
