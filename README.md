# Zalo Chat Web (Quick Chat)

Next.js 16 + React 19 web client với auth, danh bạ và **chat 1-v-1** (REST + Socket.IO).

## Yêu cầu

- Node.js 20+
- Backend API + Socket (mặc định `http://localhost:8081`)

## Cấu hình môi trường

Tạo `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
```

Socket/event names khớp `zalo-chat-mobile` (`send_message`, `new_message`, `typing`, …) — xem `docs/MIGRATION_MOBILE_TO_WEB.md`.

## Chạy ứng dụng

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Đăng nhập → **Danh bạ** (`/contacts`) → **Nhắn tin** hoặc truy cập trực tiếp `/chat/[conversationId]`.

## Tests

### Unit (Jest + React Testing Library)

```bash
npm test
```

Coverage chính: `lib/messages`, `Composer`, `MessageItem`, `TypingIndicator`, optimistic reconcile trong `chat-store`.

### E2E (Playwright)

```bash
npm run test:e2e
```

- Mặc định: kiểm tra redirect `/chat/:id` → `/login` khi chưa auth.
- Flow đầy đủ (gửi tin, typing, …): set biến môi trường trước khi chạy:

```bash
E2E_ACCESS_TOKEN=... E2E_CONVERSATION_ID=... E2E_USER_ID=... npm run test:e2e
```

## Kiến trúc chat 1-v-1

| Thành phần | Đường dẫn |
|------------|-----------|
| Route | `src/app/chat/[conversationId]/page.tsx` |
| UI | `src/components/chat/*` |
| Hooks | `src/hooks/useConversation.ts`, `useMessages.ts`, `useTyping.ts`, `usePresence.ts`, `useAttachments.ts` |
| API | `src/services/api/conversations.ts`, `uploads.ts` |
| Socket | `src/services/socket/adapter.ts`, `chat-socket.ts` |
| State | `src/store/chat-store.ts` (Zustand) |
| Cache offline | `src/lib/message-cache.ts` (IndexedDB + localStorage queue) |
| i18n strings | `src/lib/i18n/chat.ts` |

## API contract (khớp zalo-chat-mobile)

```
GET    /conversations/member/:userId
GET    /conversations/:id
POST   /conversations              { type: PRIVATE, members: [...] }
GET    /messages/conversation/:id?userId=&limit=&skip=
POST   /messages/:id/deleted-by
GET    /calls/conversation/:id
GET    /upload/presigned-url
POST   /conversations/avatar/upload
```

Gửi/sửa/xóa tin realtime qua Socket.IO (`send_message`, `edit_message`, `recall_message`, …).

Chi tiết: [docs/MIGRATION_MOBILE_TO_WEB.md](./docs/MIGRATION_MOBILE_TO_WEB.md).

## Migration từ zalo-chat-mobile (Flutter)

Repo mobile không nằm trong workspace này; khi có source, đối chiếu:

1. Socket event names → `src/services/socket/adapter.ts`
2. API DTO → `src/types/message.ts`, `conversation.ts`
3. Màn `ChatScreen` → `ChatWindow` + route `/chat/[conversationId]`
4. BLoC/Provider state → `useChatStore` + React Query

E2EE: nếu mobile có mã hóa đầu cuối, giữ nguyên flow crypto ở client hoặc đánh dấu out-of-scope cho bản web đầu tiên.

## Checklist nghiệm thu

- [x] Page chat responsive (`/chat/[conversationId]`)
- [x] Components: ChatWindow, MessageList, MessageItem, Composer, AttachmentPicker, TypingIndicator, Header, MessageActions
- [x] Socket adapter + handlers
- [x] Pagination + virtualized list (`@tanstack/react-virtual`)
- [x] Upload progress / cancel / retry
- [x] Typing, presence, read receipts, reactions
- [x] Offline queue + reconnect flush
- [x] Unit + e2e scaffold
- [x] README + migration notes
