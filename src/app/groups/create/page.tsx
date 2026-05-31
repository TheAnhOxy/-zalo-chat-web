"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useFriends } from "@/src/hooks/use-contacts";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { useToast } from "@/src/components/providers/toast-provider";
import { ArrowLeft, Check, Users } from "lucide-react";
import Image from "next/image";

function CreateGroupContent() {
  const auth = useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillId = searchParams.get("prefill");
  const { showToast } = useToast();
  const friendsQuery = useFriends(auth.user?._id);

  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!prefillId || prefillId === auth.user?._id) return;
    setSelectedIds((prev) => (prev.includes(prefillId) ? prev : [...prev, prefillId]));
  }, [prefillId, auth.user?._id]);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const friends = friendsQuery.data || [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreateGroup = async () => {
    if (!auth.user) return;
    if (!groupName.trim()) {
      showToast("Vui lòng nhập tên nhóm", "error");
      return;
    }
    if (selectedIds.length < 2) {
      showToast("Cần chọn ít nhất 2 thành viên", "error");
      return;
    }

    setLoading(true);
    try {
      const memberIds = [auth.user._id, ...selectedIds];
      let avatarUrl = undefined;
      if (avatarFile) {
        avatarUrl = await contactsService.uploadGroupAvatar(avatarFile);
      }
      await contactsService.createGroup(groupName.trim(), memberIds, auth.user._id, avatarUrl);
      showToast("Tạo nhóm thành công", "success");
      router.push("/contacts");
    } catch (e) {
      showToast("Lỗi tạo nhóm", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!auth.isInitialized || !auth.user) return null;

  return (
    <main className="flex h-screen flex-col bg-slate-50 text-slate-800">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Tạo nhóm mới</h1>
        </div>
        <button
          onClick={handleCreateGroup}
          disabled={loading || !groupName.trim() || selectedIds.length < 2}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Đang tạo..." : "Tạo nhóm"}
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left Side: Info */}
        <div className="border-b border-slate-200 bg-white p-6 md:w-1/3 md:border-b-0 md:border-r">
          <div className="flex flex-col items-center">
            <label className="relative mb-4 flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                }
              }} />
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Group Avatar" fill className="object-cover" unoptimized />
              ) : (
                <Users size={40} />
              )}
            </label>
            <input
              type="text"
              placeholder="Nhập tên nhóm..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border-b border-slate-300 bg-transparent px-2 py-2 text-center text-xl font-bold outline-none placeholder:font-normal focus:border-emerald-500"
            />
            <p className="mt-4 text-sm text-slate-500">
              Đã chọn {selectedIds.length} thành viên (cần ít nhất 2).
            </p>
          </div>
        </div>

        {/* Right Side: Friends Selection */}
        <div className="flex-1 overflow-y-auto bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase text-slate-500">Chọn bạn bè vào nhóm</h3>
          {friendsQuery.isLoading && <p className="text-sm text-slate-500">Đang tải bạn bè...</p>}
          <div className="space-y-1">
            {friends.map((friend) => {
              const isSelected = selectedIds.includes(friend._id);
              return (
                <button
                  key={friend._id}
                  onClick={() => toggleSelect(friend._id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${
                    isSelected ? "bg-emerald-50" : ""
                  }`}
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 text-white font-bold">
                    {friend.avatar ? (
                      <Image src={friend.avatar} alt={friend.fullName} fill className="object-cover" unoptimized />
                    ) : (
                      friend.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <p className="flex-1 font-semibold">{friend.fullName}</p>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CreateGroupPage() {
  return (
    <Suspense fallback={null}>
      <CreateGroupContent />
    </Suspense>
  );
}
