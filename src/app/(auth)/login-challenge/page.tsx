"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthShell } from "@/src/components/ui/auth-shell";
import { useToast } from "@/src/components/providers/toast-provider";
import { useAuth } from "@/src/components/providers/auth-provider";
import { getErrorMessage } from "@/src/utils/error";
import { Mail, ShieldAlert, Clock, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { authService } from "@/src/services/auth/auth.service";
import axios from "axios";

function LoginChallengeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const auth = useAuth();

  // URL parameters
  const challengeId = searchParams.get("challengeId") || "";
  const email = searchParams.get("email") || "";
  const challengeExpiredAt = searchParams.get("challengeExpiredAt") || "";
  const reason = searchParams.get("reason") || "new_device";

  // Component states
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("Đang chờ bạn xác nhận trong email...");
  const [status, setStatus] = useState<"pending" | "consumed" | "rejected" | "expired">("pending");

  // Keep track of completion to avoid handling post-login HTTP 400 errors
  const isCompletedRef = useRef<boolean>(false);

  // Map backend reasons to user-friendly Vietnamese text
  const reasonText = (() => {
    const cleanReason = reason.toLowerCase().trim();
    if (cleanReason === "new_device") {
      return "Phát hiện thiết bị đăng nhập mới. Cần xác thực để tiếp tục.";
    }
    if (cleanReason === "suspicious_login") {
      return "Hệ thống phát hiện đăng nhập bất thường. Vui lòng xác thực tài khoản.";
    }
    if (cleanReason === "missing_device_id") {
      return "Thiếu thông tin nhận diện thiết bị. Cần xác thực email.";
    }
    return "Vui lòng xác nhận yêu cầu đăng nhập qua email để bảo mật tài khoản.";
  })();

  // 1. Countdown Timer
  useEffect(() => {
    if (!challengeExpiredAt) return;
    const expiry = new Date(challengeExpiredAt).getTime();

    const updateTimer = () => {
      const diff = Math.floor((expiry - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        setStatus("expired");
        setStatusText("Yêu cầu xác nhận đã hết hạn.");
      } else {
        setSecondsLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [challengeExpiredAt]);

  // 2. Polling Logic (every 3 seconds)
  useEffect(() => {
    if (!challengeId || status !== "pending") return;

    const poll = async () => {
      if (isCompletedRef.current) return;

      try {
        const response = await authService.checkLoginChallengeStatus({ challengeId });
        const remoteStatus = (response.status || "pending").toLowerCase();

        if (remoteStatus === "pending") {
          setStatusText("Đang chờ bạn xác nhận trong email...");
          return;
        }

        if (remoteStatus === "consumed" || remoteStatus === "approved") {
          isCompletedRef.current = true;
          setStatus("consumed");
          setStatusText("Đăng nhập thành công! Đang chuyển hướng...");
          
          if (response.user && response.tokens) {
            auth.loginWithAuthResponse({
              user: response.user,
              accessToken: response.tokens.accessToken,
              refreshToken: response.tokens.refreshToken,
            });
            showToast("Đăng nhập thành công!", "success");
            router.replace("/");
          } else {
            showToast("Không tìm thấy thông tin đăng nhập từ backend", "error");
            router.replace("/login");
          }
          return;
        }

        if (remoteStatus === "rejected") {
          setStatus("rejected");
          setStatusText("Yêu cầu đăng nhập bị từ chối.");
          showToast("Yêu cầu đăng nhập bị từ chối.", "error");
          return;
        }
      } catch (error) {
        // Catch HTTP 400 errors from backend when challenge is consumed/expired
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          const errCode = error.response.data?.error?.code || "";
          if (
            errCode === "LOGIN_CHALLENGE_ALREADY_COMPLETED" ||
            errCode === "LOGIN_CHALLENGE_INVALID_OR_EXPIRED"
          ) {
            // If the user already authenticated and we are redirecting, ignore this error.
            if (isCompletedRef.current || auth.isAuthenticated) {
              return;
            }
          }
        }
        
        // If not already logged in, show the error message
        if (!isCompletedRef.current) {
          showToast(getErrorMessage(error), "error");
        }
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [challengeId, status, auth, router, showToast]);

  const handleCancel = () => {
    isCompletedRef.current = true;
    router.replace("/login");
  };

  return (
    <AuthShell title="Xác minh Đăng nhập" subtitle="Xác nhận yêu cầu bảo mật">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Animated Status Icon */}
        <div style={{
          position: "relative",
          display: "flex",
          width: "96px",
          height: "96px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          backgroundColor: "#f5f5f5",
          border: "1px solid #e8f5e9",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
        }}>
          {status === "pending" && (
            <>
              <div style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backgroundColor: "rgba(76, 175, 80, 0.1)",
                animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
              }} />
              <Mail className="size-10" style={{ color: "#43a047", animation: "pulse 2s ease-in-out infinite" }} />
            </>
          )}
          {status === "consumed" && (
            <CheckCircle2 className="size-12" style={{ color: "#43a047" }} />
          )}
          {status === "rejected" && (
            <XCircle className="size-12" style={{ color: "#e53935" }} />
          )}
          {status === "expired" && (
            <ShieldAlert className="size-12" style={{ color: "#f9a825" }} />
          )}
        </div>

        {/* Reason Card */}
        <div style={{
          width: "100%",
          borderRadius: "12px",
          backgroundColor: "#fafafa",
          border: "1px solid #e8f5e9",
          padding: "1rem",
          textAlign: "left",
        }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#37474f", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
            <ShieldAlert className="size-4 shrink-0" style={{ color: "#43a047", marginTop: "2px" }} />
            <span>{reasonText}</span>
          </p>
          <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#78909c" }}>
            <p>
              <strong style={{ color: "#37474f" }}>Email:</strong> {email}
            </p>
            {secondsLeft > 0 && status === "pending" && (
              <p style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#43a047", marginTop: "0.375rem", fontWeight: 600 }}>
                <Clock className="size-3.5" />
                Còn lại {secondsLeft} giây để xác nhận
              </p>
            )}
          </div>
        </div>

        {/* Live Status Text */}
        <div style={{ padding: "0.5rem 0" }}>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "#37474f" }}>
            {statusText}
          </p>
          {status === "pending" && (
            <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "center", gap: "0.375rem" }}>
              <span style={{ height: "8px", width: "8px", borderRadius: "50%", backgroundColor: "#43a047", display: "inline-block", animation: "bounce 1s infinite", animationDelay: "-0.3s" }} />
              <span style={{ height: "8px", width: "8px", borderRadius: "50%", backgroundColor: "#43a047", display: "inline-block", animation: "bounce 1s infinite", animationDelay: "-0.15s" }} />
              <span style={{ height: "8px", width: "8px", borderRadius: "50%", backgroundColor: "#43a047", display: "inline-block", animation: "bounce 1s infinite" }} />
            </div>
          )}
        </div>

        {/* Cancel Action */}
        <button
          type="button"
          onClick={handleCancel}
          className="auth-btn-secondary"
          style={{ marginTop: "0.5rem" }}
        >
          <ArrowLeft className="size-4" />
          Hủy và quay lại đăng nhập
        </button>
      </div>
    </AuthShell>
  );
}

export default function LoginChallengePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-emerald-600">
          <div className="text-center space-y-4">
            <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Đang tải...</p>
          </div>
        </div>
      }
    >
      <LoginChallengeInner />
    </Suspense>
  );
}
