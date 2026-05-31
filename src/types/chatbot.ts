export type ChatbotRole = "user" | "model" | "assistant";

export interface ChatbotAttachment {
  name: string;
  url: string;
  mimeType: string;
}

export interface ChatbotMessage {
  id: string;
  content: string;
  isUser: boolean;
  createdAt: Date;
  toolsUsed?: string[];
  isLoading?: boolean;
  attachments?: ChatbotAttachment[];
}

export interface ChatbotConversation {
  id: string;
  title?: string;
  updatedAt?: string;
}

export interface ChatbotHistoryItem {
  role: "user" | "model";
  content: string;
}

export interface ChatbotSendResult {
  reply: string;
  toolsUsed: string[];
  conversationId?: string;
  userMessageId?: string;
}
