export function PageLoader({ text = "Đang tải..." }: { text?: string }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">{text}</div>;
}

export function PageError({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center text-white">
      <p>{text}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}
