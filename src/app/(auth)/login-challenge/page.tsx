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
    <AuthShell title="Xác minh Đăng nhập" subtitle="Email Login Challenge">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Animated Status Icon */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-inner">
          {status === "pending" && (
            <>
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping opacity-75" />
              <Mail className="size-10 text-cyan-300 animate-pulse" />
            </>
          )}
          {status === "consumed" && (
            <CheckCircle2 className="size-12 text-emerald-400 animate-bounce" />
          )}
          {status === "rejected" && (
            <XCircle className="size-12 text-rose-400" />
          )}
          {status === "expired" && (
            <ShieldAlert className="size-12 text-amber-400" />
          )}
        </div>

        {/* Reason Card */}
        <div className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-left">
          <p className="text-sm font-medium text-white/90 flex items-start gap-2">
            <ShieldAlert className="size-4 text-cyan-300 mt-0.5 shrink-0" />
            <span>{reasonText}</span>
          </p>
          <div className="mt-3 text-xs text-white/70 space-y-1">
            <p>
              <strong className="text-white/90">Email:</strong> {email}
            </p>
            {secondsLeft > 0 && status === "pending" && (
              <p className="flex items-center gap-1.5 text-cyan-200 mt-1 font-medium">
                <Clock className="size-3.5" />
                Còn lại {secondsLeft} giây để xác nhận
              </p>
            )}
          </div>
        </div>

        {/* Live Status Text */}
        <div className="py-2">
          <p className="text-base font-semibold tracking-wide text-white/90 transition-all duration-300">
            {statusText}
          </p>
          {status === "pending" && (
            <div className="mt-3 flex justify-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce"></span>
            </div>
          )}
        </div>

        {/* Cancel Action */}
        <button
          type="button"
          onClick={handleCancel}
          className="group mt-4 flex items-center justify-center gap-2 w-full h-11 rounded-lg border border-white/20 bg-white/5 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
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
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center space-y-4">
            <div className="h-10 w-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/60">Đang tải...</p>
          </div>
        </div>
      }
    >
      <LoginChallengeInner />
    </Suspense>
  );
}
