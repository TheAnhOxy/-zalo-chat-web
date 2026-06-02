import { IMessage } from "@/src/types/message";
import { ICall } from "@/src/types/call";

export type ChatItem = 
  | { type: "message"; message: IMessage; createdAt: Date }
  | { type: "call"; call: ICall; createdAt: Date };

/**
 * Combine messages and calls into a single sorted list
 */
export function combineChatItems(messages: IMessage[], calls: ICall[]): ChatItem[] {
  const items: ChatItem[] = [
    ...messages.map((m) => ({ type: "message" as const, message: m, createdAt: new Date(m.createdAt) })),
    ...calls.map((c) => ({ type: "call" as const, call: c, createdAt: new Date(c.createdAt) })),
  ];

  return items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
