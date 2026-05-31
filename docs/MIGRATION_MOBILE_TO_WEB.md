# Migration: zalo-chat-mobile → zalo-chat-web (audited)

Source: `zalo-chat-mobile/lib/` — đã đối chiếu trực tiếp với repo trong workspace.

## REST API (mobile `api_service.dart`)

| Mobile | Web (`conversations.ts`) |
|--------|--------------------------|
| `GET /conversations/member/:userId` | `listForUser` |
| `GET /conversations/:id` | `getById` |
| `POST /conversations` `{ type: PRIVATE, members: [...] }` | `findOrCreateDirect` |
| `GET /messages/conversation/:id?userId&limit&skip` | `getMessages` |
| `POST /messages/:id/deleted-by` | `deleteMessageForMe` |
| `GET /calls/conversation/:id` | `getCalls` |
| `GET /upload/presigned-url` | `uploads.ts` `getPresignedUrl` |
| `POST /conversations/avatar/upload` (multipart) | `uploads.ts` `uploadViaBackend` |

**Không dùng trên mobile (web cũ đã bỏ):** `POST /conversations/direct`, `GET /conversations/:id/messages?cursor`, `PATCH /messages/:id`, `POST /conversations/:id/seen`.

## Socket (`socket_service.dart` + `chat_controller.dart`)

### Client → Server

| Event | Payload (chính) |
|-------|-----------------|
| `join_user_room` | `{ userId }` |
| `join_conversation` | `{ conversationId }` |
| `send_message` | `{ conversationId, senderId, content, type, replyToId?, metadata? }` |
| `edit_message` | `{ messageId, content, conversationId }` |
| `recall_message` | `{ messageId, conversationId }` |
| `delete_message_me` | `{ messageId, userId }` |
| `add_reaction` | `{ messageId, userId, type, conversationId }` |
| `typing` | `{ conversationId, userId }` |
| `stop_typing` | `{ conversationId, userId }` |
| `seen_conversation` | `{ conversationId, userId }` |

### Server → Client

| Event | Web handler |
|-------|-------------|
| `new_message` | `onMessage` |
| `message_seen` | `onMessageSeen` (status + seenBy) |
| `typing` / `stop_typing` | `onTyping` |
| `user_status_changed` | `onPresence` |
| `message_updated` | `onMessageUpdated` |
| `message_deleted` | `onMessageRecalled` |

Web mapping: `src/services/socket/adapter.ts` + `chat-socket.ts`.

## Message model

| Mobile `MessageModel` | Web `IMessage` |
|-----------------------|----------------|
| `id` / `_id` | `_id` |
| `messageType` / `type` | `type` |
| `replyTo` / `replyToId` (send) | `replyTo` / `replyToId` socket |
| `reactionType` in Reaction | `type` in `IReaction` |
| `status` SENDING/SENT/DELIVERED/SEEN | same |

Parser: `src/lib/parse-api.ts` → `parseMessageFromApi`.

## Conversation type

Mobile dùng `PRIVATE` | `GROUP` — web dùng cùng (`ConversationType`), không dùng `DIRECT`.

## Gửi tin / media

1. Text: **socket** `send_message` (không POST REST).
2. Ảnh/file: upload `POST /conversations/avatar/upload` hoặc presigned S3 → `send_message` với `content: fileUrl`.
3. Optimistic UI: `clientTempId` local; reconcile khi `new_message` về.

## Typing

- Emit: `typing` / `stop_typing` (debounce 400ms / idle 2s — `useTyping.ts`).
- Listen: `typing` / `stop_typing` (không phải `user_typing`).

## Read receipts

- Emit: `seen_conversation` (không REST mark seen).
- Listen: `message_seen`.

## Forward

Mobile: `forward_message_screen.dart` → lặp `send_message` từng đích. Web: `ChatWindow` bulk forward qua socket tương tự.

## E2EE

Không thấy crypto layer trong mobile repo — **out of scope** cho bản web hiện tại.

## Files web tương ứng màn hình mobile

| Mobile | Web |
|--------|-----|
| `chat_detail_screen.dart` | `ChatWindow.tsx` + `/chat/[conversationId]` |
| `chat_controller.dart` | `useMessages.ts` + `chat-store.ts` |
| `socket_service.dart` | `chat-socket.ts` |
| `api_service.dart` (messages) | `conversations.ts` |
| `chat_media_service.dart` | `uploads.ts` + `useAttachments.ts` |
