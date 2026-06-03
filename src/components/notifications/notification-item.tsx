"use client";

import { useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  UserPlus,
  Users,
  Heart,
  PhoneMissed,
  MessageCircle,
  GalleryVertical,
  Bell,
  Check,
  X,
  Play
} from "lucide-react";
import { ApiNotification } from "@/src/services/api/notifications";
import { useRouter } from "next/navigation";

interface NotificationItemProps {
  notification: ApiNotification;
  onRead: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter();
  const { _id, id, type, content, isRead, createdAt, senderName, senderAvatar, conversationId } = notification;
  const notifId = _id || id || "";

  const { icon: Icon, colorClass, bgColorClass } = useMemo(() => {
    switch (type) {
      case "FRIEND_REQUEST":
        return { icon: UserPlus, colorClass: "text-blue-500", bgColorClass: "bg-blue-100" };
      case "FRIEND_ACCEPTED":
        return { icon: Users, colorClass: "text-green-500", bgColorClass: "bg-green-100" };
      case "MESSAGE_REACTION":
        return { icon: Heart, colorClass: "text-pink-500", bgColorClass: "bg-pink-100" };
      case "CALL":
      case "MISSED_CALL":
        return { icon: PhoneMissed, colorClass: "text-red-500", bgColorClass: "bg-red-100" };
      case "MESSAGE":
        return { icon: MessageCircle, colorClass: "text-purple-500", bgColorClass: "bg-purple-100" };
      case "STORY":
        return { icon: GalleryVertical, colorClass: "text-orange-500", bgColorClass: "bg-orange-100" };
      default:
        return { icon: Bell, colorClass: "text-gray-500", bgColorClass: "bg-gray-100" };
    }
  }, [type]);

  const formattedTime = useMemo(() => {
    try {
      const date = new Date(createdAt);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: vi });
      }
      return format(date, "dd/MM HH:mm");
    } catch {
      return "";
    }
  }, [createdAt]);

  const handleClick = () => {
    if (isRead === false || isRead === "false" as any) {
      onRead(notifId);
    }
    
    // Xử lý điều hướng
    if (type === "STORY" && notification.senderId) {
      router.push(`/stories?userId=${notification.senderId}`);
    } else if ((type === "CALL" || type === "MISSED_CALL" || type === "MESSAGE") && conversationId) {
      router.push(`/?conversation=${conversationId}`);
    } else if (type === "FRIEND_REQUEST") {
      router.push("/contacts/requests");
    }
  };

  const handleActionClick = (e: React.MouseEvent, actionType: string) => {
    e.stopPropagation(); // Không trigger handleClick của thẻ cha
    if (isRead === false || isRead === "false" as any) {
      onRead(notifId);
    }

    if (actionType === "ACCEPT_FRIEND") {
      router.push("/contacts/requests"); // Có thể gọi API kết bạn luôn ở đây
    } else if (actionType === "CALL_BACK" && conversationId) {
      router.push(`/?conversation=${conversationId}`);
    } else if (actionType === "VIEW_STORY" && notification.senderId) {
      router.push(`/stories?userId=${notification.senderId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex cursor-pointer gap-4 rounded-2xl p-4 transition-all hover:shadow-md ${
        !(isRead === true || isRead === "true" as any) 
          ? "bg-[#F4FAFF] border border-blue-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]" 
          : "bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
      }`}
    >
      {/* Avatar & Type Icon */}
      <div className="relative shrink-0">
        {senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderName}
            className="h-14 w-14 rounded-full object-cover shadow-sm ring-1 ring-slate-100"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-lg font-bold text-indigo-700 shadow-sm ring-1 ring-slate-100">
            {senderName?.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ${bgColorClass} ${colorClass}`}>
          <Icon size={12} strokeWidth={2.5} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] leading-snug text-slate-800">
            <span className="font-semibold">{senderName} </span>
            <span className={!(isRead === true || isRead === "true" as any) ? "font-medium text-slate-900" : "text-slate-600"}>
              {content}
            </span>
          </p>
          {!(isRead === true || isRead === "true" as any) && (
            <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 shadow-sm" />
          )}
        </div>
        <span className="mt-1 text-xs font-medium text-slate-400">{formattedTime}</span>

        {/* Action Buttons */}
        <div className="mt-2.5 flex items-center gap-2">
          {type === "FRIEND_REQUEST" && (
            <>
              <button 
                onClick={(e) => handleActionClick(e, "ACCEPT_FRIEND")}
                className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
              >
                <Check size={16} />
                <span>Chấp nhận</span>
              </button>
              <button className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200">
                <X size={16} />
                <span>Bỏ qua</span>
              </button>
            </>
          )}

          {(type === "CALL" || type === "MISSED_CALL") && (
            <button 
              onClick={(e) => handleActionClick(e, "CALL_BACK")}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
            >
              <MessageCircle size={16} />
              <span>Nhắn tin</span>
            </button>
          )}

          {type === "STORY" && (
            <button 
              onClick={(e) => handleActionClick(e, "VIEW_STORY")}
              className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-100"
            >
              <Play size={16} />
              <span>Xem tin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
