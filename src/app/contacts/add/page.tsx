"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { useToast } from "@/src/components/providers/toast-provider";
import { Search, UserPlus, QrCode } from "lucide-react";
import Image from "next/image";
import { IUser } from "@/src/types/user";
import jsQR from "jsqr";
import { ContactsShell } from "@/src/components/layout/contacts-shell";
import { ContactsSubpageHeader } from "@/src/components/layout/contacts-subpage-header";

export default function AddFriendPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const { showToast } = useToast();

  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+84");
  const [message, setMessage] = useState("Xin chào, tôi muốn kết bạn với bạn!");
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<IUser | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = phone.trim();
    if (!raw) return;

    let searchPhone = raw;
    if (searchPhone.startsWith("+")) {
      // Người dùng tự nhập mã quốc gia
    } else if (searchPhone.startsWith("0")) {
      searchPhone = `${countryCode}${searchPhone.substring(1)}`;
    } else {
      searchPhone = `${countryCode}${searchPhone}`;
    }

    setLoading(true);
    setSearched(true);
    setFoundUser(null);
    try {
      const user = await contactsService.searchByPhone(searchPhone);
      if (user && user._id !== auth.user?._id) {
        setFoundUser(user);
      } else if (user && user._id === auth.user?._id) {
        showToast("Đây là số điện thoại của bạn", "error");
      }
    } catch {
      showToast("Lỗi tìm kiếm", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!auth.user || !foundUser) return;
    try {
      await contactsService.sendFriendRequest(auth.user._id, foundUser._id, message);
      showToast("Đã gửi lời mời kết bạn", "success");
      setFoundUser(null);
      setPhone("");
      setMessage("Xin chào, tôi muốn kết bạn với bạn!");
      setSearched(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err.response?.data?.message || "Lời mời kết bạn đã tồn tại hoặc đã là bạn bè", "error");
    }
  };

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data) {
            setPhone(code.data);
            showToast("Đã quét QR thành công", "success");
          } else {
            showToast("Không tìm thấy mã QR trong ảnh này", "error");
          }
        }
      };
    };
    reader.readAsDataURL(file);
  };

  if (!auth.isInitialized || !auth.user) return null;

  return (
    <ContactsShell>
      <ContactsSubpageHeader title="Thêm bạn" onBack={() => router.back()} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-xl p-4 md:p-8">
          <div className="mb-4 flex items-center justify-end">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <QrCode size={18} />
              Tải ảnh mã QR
              <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} />
            </label>
          </div>

          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
              <div className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600 sm:px-4">
                {countryCode}
              </div>
              <input
                type="tel"
                placeholder="Nhập số điện thoại..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 outline-none sm:px-4"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="flex shrink-0 items-center justify-center bg-slate-100 px-4 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 sm:px-5"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {loading && <div className="py-10 text-center text-slate-500">Đang tìm kiếm...</div>}

          {!loading && searched && !foundUser && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-slate-600">Không tìm thấy tài khoản nào với số điện thoại này.</p>
            </div>
          )}

          {foundUser && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative h-24 w-24 overflow-hidden rounded-full bg-slate-200">
                  {foundUser.avatar ? (
                    <Image src={foundUser.avatar} alt={foundUser.fullName} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-3xl font-bold text-emerald-700">
                      {foundUser.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{foundUser.fullName}</h3>
                  <p className="text-sm text-slate-500">{foundUser.phone}</p>
                </div>
                <div className="mt-4 w-full">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Nhập lời chào..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    rows={2}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddFriend}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-500"
                >
                  <UserPlus size={18} /> Gửi lời mời kết bạn
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ContactsShell>
  );
}
