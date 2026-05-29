import { io, Socket } from "socket.io-client";
import { getStoredTokens, clearStoredTokens, clearStoredUser } from "@/src/utils/storage";

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    if (this.socket?.connected) return;

    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";
    const tokens = getStoredTokens();
    const token = tokens?.accessToken;

    this.socket = io(baseURL, {
      transports: ["websocket"],
      auth: {
        token: `Bearer ${token}`,
      },
      query: {
        userId,
      },
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket?.id);
      this.socket?.emit("join_user_room", { userId });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        this.handleUnauthorizedSocketError("logged_out_all_devices");
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("⚠️ Socket connection error:", error.message);
      if (
        error.message === "xhr poll error" ||
        error.message.toLowerCase().includes("auth") ||
        error.message.toLowerCase().includes("unauthorized")
      ) {
        this.handleUnauthorizedSocketError("session_expired");
      }
    });

    this.socket.on("force_logout", (data) => {
      console.log("ℹ️ Received force_logout event:", data);
      this.handleUnauthorizedSocketError("logged_out_all_devices");
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }

  private handleUnauthorizedSocketError(reason: string) {
    if (typeof window === "undefined") return;

    clearStoredTokens();
    clearStoredUser();
    window.sessionStorage.removeItem("quickchat_pending_login");

    window.location.href = `/login?reason=${reason}`;
  }
}

export const socketService = new SocketService();
