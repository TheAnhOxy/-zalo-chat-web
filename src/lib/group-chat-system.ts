import { userService } from "@/src/services/user/user.service";
import { socketService } from "@/src/services/socket/socket.service";
import { SOCKET_CLIENT } from "@/src/services/socket/adapter";

function emitSystemMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  socketService.emit(SOCKET_CLIENT.sendMessage, {
    conversationId,
    senderId,
    type: "SYSTEM",
    content,
  });
}

/** Khớp mobile group_options_screen._openAddMembers */
export async function emitAddMemberSystemMessages(
  conversationId: string,
  senderId: string,
  actorName: string,
  newUserIds: string[]
) {
  const actor = actorName.trim() || "Bạn";

  try {
    const users = await Promise.all(newUserIds.map((id) => userService.getProfile(id)));
    for (let i = 0; i < newUserIds.length; i++) {
      const peerName =
        users[i]?.fullName?.trim() || users[i]?.email?.trim() || "một thành viên";
      emitSystemMessage(conversationId, senderId, `ADD_MEMBER|${actor}|${peerName}`);
    }
  } catch {
    for (const _ of newUserIds) {
      emitSystemMessage(conversationId, senderId, `ADD_MEMBER|${actor}|một thành viên`);
    }
  }
}

export function emitLeaveGroupSystemMessage(
  conversationId: string,
  senderId: string,
  actorName: string
) {
  const actor = actorName.trim() || "Bạn";
  emitSystemMessage(conversationId, senderId, `LEAVE_GROUP|${actor}`);
}

/** MAKE_ADMIN|{member}|{by} — khớp backend chatbot parser */
export function emitMakeAdminSystemMessage(
  conversationId: string,
  senderId: string,
  actorName: string,
  memberName: string
) {
  const by = actorName.trim() || "Bạn";
  const member = memberName.trim() || "một thành viên";
  emitSystemMessage(conversationId, senderId, `MAKE_ADMIN|${member}|${by}`);
}

/** REVOKE_ADMIN|{member}|{by} */
export function emitRevokeAdminSystemMessage(
  conversationId: string,
  senderId: string,
  actorName: string,
  memberName: string
) {
  const by = actorName.trim() || "Bạn";
  const member = memberName.trim() || "một thành viên";
  emitSystemMessage(conversationId, senderId, `REVOKE_ADMIN|${member}|${by}`);
}
