import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(140deg,#f3f8ff,#ffffff)] p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-800">Quên mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nhập email hoặc số điện thoại để nhận hướng dẫn đặt lại mật khẩu.
        </p>

        <form className="mt-6 space-y-4">
          <input
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            placeholder="Email hoặc số điện thoại"
          />
          <button
            type="button"
            className="h-11 w-full rounded-lg bg-[#0068ff] text-sm font-semibold text-white transition hover:bg-[#005ae0]"
          >
            Gửi mã xác nhận
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Quay về{" "}
          <Link href="/login" className="font-semibold text-[#0068ff] underline underline-offset-4">
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
