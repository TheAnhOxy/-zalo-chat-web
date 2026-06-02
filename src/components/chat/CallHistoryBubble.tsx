"use client";

import { ICall } from "@/src/types/call";
import { Phone, PhoneMissed, Video, VideoOff } from "lucide-react";
import { formatChatTime } from "@/src/lib/date-utils";

interface CallHistoryBubbleProps {
  call: ICall;
  currentUserId: string;
  callerName?: string;
  callerAvatar?: string;
}

export function CallHistoryBubble({
  call,
  currentUserId,
  callerName,
  callerAvatar,
}: CallHistoryBubbleProps) {
  const isMe = call.callerId === currentUserId;
  const isMissedOrRejected = call.status === "MISSED" || call.status === "REJECTED";
  const isVideo = call.type === "VIDEO";

  // Format duration
  const durationLabel =
    call.duration > 0
      ? (() => {
          const minutes = Math.floor(call.duration / 60);
          const seconds = call.duration % 60;
          if (minutes > 0) {
            return `${minutes} phút ${seconds} giây`;
          }
          return `${seconds} giây`;
        })()
      : "";

  // Status label
  const statusLabel = (() => {
    if (isMe) {
      return call.status === "MISSED" ? "Cuộc gọi không được trả lời" : `Cuộc gọi ${call.type === "VIDEO" ? "video" : "thoại"}`;
    }
    if (call.status === "MISSED") {
      return "Cuộc gọi nhỡ";
    }
    return `Cuộc gọi ${call.type === "VIDEO" ? "video" : "thoại"}`;
  })();

  const time = formatChatTime(call.createdAt);

  return (
    <div className="mx-auto w-full max-w-xs py-2">
      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
          isMissedOrRejected
            ? "bg-red-50 ring-1 ring-red-200"
            : isVideo
              ? "bg-purple-50 ring-1 ring-purple-200"
              : "bg-blue-50 ring-1 ring-blue-200"
        }`}
      >
        {/* Icon */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isMissedOrRejected
              ? "bg-red-100"
              : isVideo
                ? "bg-purple-100"
                : "bg-blue-100"
          }`}
        >
          {isMissedOrRejected ? (
            isVideo ? (
              <VideoOff className={`h-5 w-5 ${isMissedOrRejected ? "text-red-600" : "text-purple-600"}`} />
            ) : (
              <PhoneMissed className="h-5 w-5 text-red-600" />
            )
          ) : isVideo ? (
            <Video className="h-5 w-5 text-purple-600" />
          ) : (
            <Phone className="h-5 w-5 text-blue-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Caller avatar (only show if not me) */}
            {!isMe && callerAvatar && (
              <img
                src={callerAvatar}
                alt={callerName || "Caller"}
                className="h-6 w-6 rounded-full object-cover"
              />
            )}
            <p
              className={`truncate text-sm font-medium ${
                isMissedOrRejected
                  ? "text-red-900"
                  : isVideo
                    ? "text-purple-900"
                    : "text-blue-900"
              }`}
            >
              {statusLabel}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p
              className={`truncate text-xs ${
                isMissedOrRejected
                  ? "text-red-700"
                  : isVideo
                    ? "text-purple-700"
                    : "text-blue-700"
              }`}
            >
              {durationLabel || "Không có nội dung"}
            </p>
            <span
              className={`shrink-0 text-xs ${
                isMissedOrRejected
                  ? "text-red-600"
                  : isVideo
                    ? "text-purple-600"
                    : "text-blue-600"
              }`}
            >
              {time}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
