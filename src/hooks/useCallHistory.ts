"use client";

import { useCallback, useEffect, useState } from "react";
import { ICall } from "@/src/types/call";
import { callsApi } from "@/src/services/api/calls";
import { socketService } from "@/src/services/socket/socket.service";

export function useCallHistory(conversationId: string, userId?: string) {
  const [calls, setCalls] = useState<ICall[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial calls
  const loadCalls = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await callsApi.listByConversation(conversationId);
      setCalls(result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Error loading calls:", error);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load calls on mount
  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

  // Handle real-time call updates
  useEffect(() => {
    if (!conversationId) return;

    const handleConversationCallUpdated = (data: unknown) => {
      try {
        const eventData = data as any;
        if (eventData?.conversationId !== conversationId) return;

        if (eventData?.callData) {
          const newCall = eventData.callData as ICall;
          setCalls((prev) => {
            const index = prev.findIndex((c) => c._id === newCall._id);
            if (index > -1) {
              // Update existing call
              const updated = [...prev];
              updated[index] = newCall;
              return updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
            // Add new call
            return [newCall, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      } catch (error) {
        console.error("Error handling conversation_call_updated:", error);
      }
    };

    const handleCallTerminalEvent = () => {
      // Re-fetch calls when call ends or is rejected
      void loadCalls();
    };

    socketService.on("conversation_call_updated", handleConversationCallUpdated);
    socketService.on("call_ended", handleCallTerminalEvent);
    socketService.on("call_rejected", handleCallTerminalEvent);

    return () => {
      socketService.off("conversation_call_updated", handleConversationCallUpdated);
      socketService.off("call_ended", handleCallTerminalEvent);
      socketService.off("call_rejected", handleCallTerminalEvent);
    };
  }, [conversationId, loadCalls]);

  return { calls, loading };
}
