import axios from "axios";
import { apiClient } from "@/src/services/api/client";
import {
  ChatbotHistoryItem,
  ChatbotMessage,
  ChatbotSendResult,
} from "@/src/types/chatbot";

function guessMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
  };
  return map[ext] ?? "application/octet-stream";
}

export const chatbotService = {
  async sendMessage(params: {
    userId: string;
    message: string;
    conversationId?: string;
    history?: ChatbotHistoryItem[];
    files?: { url: string; mimeType: string; name?: string }[];
    targetConversationId?: string;
    targetConversationLimit?: number;
  }): Promise<ChatbotSendResult> {
    try {
      const res = await apiClient.post<ChatbotSendResult>("/chatbot/chat", {
        userId: params.userId,
        message: params.message,
        history: params.history ?? [],
        conversationId: params.conversationId,
        files: params.files,
        targetConversationId: params.targetConversationId,
        targetConversationLimit: params.targetConversationLimit,
      });
      return {
        reply: res.data.reply ?? "Xin lỗi, có lỗi xảy ra.",
        toolsUsed: res.data.toolsUsed ?? [],
        conversationId: res.data.conversationId,
        userMessageId: res.data.userMessageId,
      };
    } catch {
      return {
        reply: "Không thể kết nối tới trợ lý AI. Kiểm tra lại server.",
        toolsUsed: [],
      };
    }
  },

  async listConversations(userId: string) {
    const res = await apiClient.get<{ conversations?: Record<string, unknown>[] }>(
      "/chatbot/conversations",
      { params: { userId } }
    );
    return res.data.conversations ?? [];
  },

  async createConversation(userId: string, title?: string) {
    const res = await apiClient.post<{ id?: string }>("/chatbot/conversations", {
      userId,
      title,
    });
    return res.data.id ?? "";
  },

  async deleteConversation(userId: string, conversationId: string) {
    await apiClient.delete(`/chatbot/conversations/${conversationId}`, {
      params: { userId },
    });
  },

  async renameConversation(userId: string, conversationId: string, title: string) {
    await apiClient.patch(`/chatbot/conversations/${conversationId}`, {
      userId,
      title,
    });
  },

  async getConversationMessages(userId: string, conversationId: string) {
    const res = await apiClient.get<{ messages?: Record<string, unknown>[] }>(
      `/chatbot/conversations/${conversationId}/messages`,
      { params: { userId } }
    );
    return res.data.messages ?? [];
  },

  async deleteMessage(userId: string, conversationId: string, messageId: string) {
    await apiClient.delete(
      `/chatbot/conversations/${conversationId}/messages/${messageId}`,
      { params: { userId } }
    );
  },

  async uploadFile(file: File): Promise<{ fileUrl: string; mimeType: string; name: string }> {
    const mimeType = file.type || guessMimeType(file.name);
    const presignRes = await apiClient.get<{ url?: string; fileUrl?: string }>(
      "/upload/presigned-url",
      { params: { fileName: file.name, contentType: mimeType } }
    );
    const uploadUrl = presignRes.data.url;
    const fileUrl = presignRes.data.fileUrl;
    if (!uploadUrl || !fileUrl) {
      throw new Error("Không lấy được presigned url để upload file");
    }

    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": file.size,
      },
    });

    return { fileUrl, mimeType, name: file.name };
  },

  async uploadFiles(files: File[]) {
    const out: { fileUrl: string; mimeType: string; name: string }[] = [];
    for (const file of files) {
      out.push(await chatbotService.uploadFile(file));
    }
    return out;
  },

  mapApiMessage(raw: Record<string, unknown>): ChatbotMessage {
    const role = String(raw.role ?? "assistant");
    const attachments = ((raw.attachments as unknown[]) ?? [])
      .map((a) => a as Record<string, unknown>)
      .filter((a) => a.url)
      .map((a) => ({
        name: String(a.name ?? "file"),
        url: String(a.url ?? ""),
        mimeType: String(a.mimeType ?? "application/octet-stream"),
      }));

    return {
      id: String(raw.id ?? raw._id ?? `m_${Date.now()}`),
      content: String(raw.content ?? ""),
      isUser: role === "user",
      createdAt: raw.createdAt ? new Date(String(raw.createdAt)) : new Date(),
      toolsUsed: ((raw.toolsUsed as unknown[]) ?? []).map(String),
      attachments,
    };
  },
};

export const CHATBOT_QUICK_REPLIES = [
  "🤝 Tôi có bao nhiêu bạn?",
  "🆕 Tôi vừa kết bạn với ai?",
  "⏳ Ai đang chờ tôi chấp nhận?",
  "📦 Hướng dẫn gửi file",
  "🔍 Tìm bạn theo tên",
];

export const WELCOME_MESSAGE: ChatbotMessage = {
  id: "welcome",
  content:
    "Xin chào! Tôi là trợ lý AI của QuickChat 🤖\n\nTôi có thể giúp bạn:\n• Xem danh sách bạn bè & lời mời kết bạn\n• Đọc và phân tích file bạn gửi\n• Trả lời câu hỏi về tính năng ứng dụng\n\nHãy hỏi tôi bất cứ điều gì!",
  isUser: false,
  createdAt: new Date(),
};
