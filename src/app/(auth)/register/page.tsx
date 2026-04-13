import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#e7f1ff,#f7fbff)] p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-800">Tạo tài khoản mới</h1>
        <p className="mt-2 text-sm text-slate-600">
          Giao diện đăng ký đã sẵn sàng. Bạn chỉ cần nối API MongoDB theo schema hiện tại để hoàn tất luồng tạo tài khoản.
        </p>

        <form className="mt-6 space-y-4">
          <input
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            placeholder="Họ và tên"
          />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            placeholder="Số điện thoại"
          />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            placeholder="Email"
          />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            type="password"
            placeholder="Mật khẩu"
          />
          <button
            type="button"
            className="h-11 w-full rounded-lg bg-[#0068ff] text-sm font-semibold text-white transition hover:bg-[#005ae0]"
          >
            Đăng ký
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-semibold text-[#0068ff] underline underline-offset-4">
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
