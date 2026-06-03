"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/src/components/providers/toast-provider";
import { ContactsShell } from "@/src/components/layout/contacts-shell";
import { ContactsSubpageHeader } from "@/src/components/layout/contacts-subpage-header";

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
    <ContactsShell>
      <ContactsSubpageHeader title="Cài đặt sinh nhật" onBack={() => router.back()} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
      <div className="mx-auto w-full max-w-xl space-y-4 p-4 md:p-8">
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
      </div>
    </ContactsShell>
  );
}
