"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/src/components/providers/toast-provider";

export default function BirthdaySettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [notify, setNotify] = useState(true);
  const [showDob, setShowDob] = useState(true);

  const handleSave = (setting: "notify" | "showDob", value: boolean) => {
    if (setting === "notify") setNotify(value);
    if (setting === "showDob") setShowDob(value);
    showToast("Cập nhật cài đặt thành công", "success");
  };

  return (
    <main className="h-screen bg-slate-50 text-slate-800">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-4">
        <button onClick={() => router.back()} className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Cài đặt sinh nhật</h1>
      </header>

      <div className="mx-auto w-full max-w-xl p-4 md:p-8 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="font-semibold">Nhận thông báo sinh nhật</p>
              <p className="mt-1 text-sm text-slate-500">Thông báo cho bạn khi đến sinh nhật của bạn bè.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center shrink-0">
              <input type="checkbox" className="peer sr-only" checked={notify} onChange={(e) => handleSave("notify", e.target.checked)} />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="font-semibold">Hiển thị ngày sinh</p>
              <p className="mt-1 text-sm text-slate-500">Cho phép người khác thấy ngày sinh của bạn.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center shrink-0">
              <input type="checkbox" className="peer sr-only" checked={showDob} onChange={(e) => handleSave("showDob", e.target.checked)} />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>
        </div>
      </div>
    </main>
  );
}
