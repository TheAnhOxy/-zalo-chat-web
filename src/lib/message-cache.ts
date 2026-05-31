import { IMessage } from "@/src/types/message";
import { dedupeMessagesById, sortMessagesAsc } from "@/src/lib/messages";

const DB_NAME = "zalo-chat-cache";
const STORE = "messages";
const DB_VERSION = 1;
const MAX_MESSAGES_PER_CONVERSATION = 500;

type CacheRecord = {
  conversationId: string;
  messages: IMessage[];
  skip: number;
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "conversationId" });
      }
    };
  });
}

export async function getCachedMessages(conversationId: string): Promise<CacheRecord | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(conversationId);
      req.onsuccess = () => resolve((req.result as CacheRecord) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedMessages(
  conversationId: string,
  messages: IMessage[],
  skip: number
): Promise<void> {
  try {
    const db = await openDb();
    const trimmed = sortMessagesAsc(dedupeMessagesById(messages)).slice(-MAX_MESSAGES_PER_CONVERSATION);
    const record: CacheRecord = {
      conversationId,
      messages: trimmed,
      skip,
      updatedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore cache errors
  }
}

const OFFLINE_QUEUE_KEY = "zalo_chat_offline_queue";

export interface QueuedOutgoingMessage {
  id: string;
  conversationId: string;
  payload: {
    type: string;
    content: string;
    replyTo?: string;
    metadata?: IMessage["metadata"];
    clientTempId: string;
  };
  attempts: number;
  createdAt: number;
}

export function getOfflineQueue(): QueuedOutgoingMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedOutgoingMessage[]) : [];
  } catch {
    return [];
  }
}

export function setOfflineQueue(queue: QueuedOutgoingMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueOfflineMessage(item: QueuedOutgoingMessage): void {
  const queue = getOfflineQueue();
  queue.push(item);
  setOfflineQueue(queue);
}

export function dequeueOfflineMessage(id: string): void {
  setOfflineQueue(getOfflineQueue().filter((q) => q.id !== id));
}
