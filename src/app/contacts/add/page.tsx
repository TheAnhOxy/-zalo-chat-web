"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { useToast } from "@/src/components/providers/toast-provider";
import { ArrowLeft, Search, UserPlus, QrCode } from "lucide-react";
import Image from "next/image";
import { IUser } from "@/src/types/user";
import jsQR from "jsqr";

export default function AddFriendPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const { showToast } = useToast();

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Xin chào, tôi muốn kết bạn với bạn!");
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<IUser | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setSearched(true);
    setFoundUser(null);
    try {
      const user = await contactsService.searchByPhone(phone);
      if (user && user._id !== auth.user?._id) {
        setFoundUser(user);
      } else if (user && user._id === auth.user?._id) {
         showToast("Đây là số điện thoại của bạn", "error");
      }
    } catch (e) {
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
    } catch (e: any) {
      showToast(e.response?.data?.message || "Lời mời kết bạn đã tồn tại hoặc đã là bạn bè", "error");
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
    <main className="h-screen bg-slate-50 text-slate-800">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-4">
        <button onClick={() => router.back()} className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Thêm bạn</h1>
      </header>

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
            <input
              type="text"
              placeholder="Nhập số điện thoại cần tìm..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="flex items-center justify-center bg-slate-100 px-5 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
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
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
              <div className="w-full mt-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nhập lời chào..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  rows={2}
                />
              </div>
              <button
                onClick={handleAddFriend}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-500"
              >
                <UserPlus size={18} /> Gửi lời mời kết bạn
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
