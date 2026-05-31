"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { PageLoader } from "@/src/components/ui/page-state";
import { storiesService } from "@/src/services/stories/stories.service";

export default function StoriesPage() {
  const auth = useAuthGuard();
  const storiesQuery = useQuery({
    queryKey: ["stories"],
    queryFn: () => storiesService.getStories(),
    enabled: Boolean(auth.user?._id),
  });

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  return (
    <main className="h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-800">
      <div className="h-full w-full md:grid md:grid-cols-[72px_1fr]">
        <AppNavSidebar activeTab="stories" />

        <section className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h1 className="text-xl font-bold text-slate-900">Tin</h1>
            <button
              type="button"
              onClick={() => storiesQuery.refetch()}
              className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
              title="Làm mới"
            >
              <RefreshCw size={20} className={storiesQuery.isFetching ? "animate-spin" : ""} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {storiesQuery.isLoading ? (
              <p className="py-12 text-center text-sm text-slate-500">Đang tải tin...</p>
            ) : (storiesQuery.data?.length ?? 0) === 0 ? (
              <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="font-semibold text-slate-800">Chưa có tin nào</p>
                <p className="mt-2 text-sm text-slate-500">
                  Bạn bè đăng tin sẽ hiển thị tại đây — giống tab Tin trên ứng dụng di động.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {storiesQuery.data?.map((story) => (
                  <article
                    key={story._id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {story.mediaUrl ? (
                      <div className="relative aspect-[9/16] bg-slate-100">
                        <Image
                          src={story.mediaUrl}
                          alt={story.caption || "Story"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[9/16] items-center justify-center bg-slate-100 text-sm text-slate-400">
                        Không có ảnh
                      </div>
                    )}
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {story.user?.fullName || "Người dùng"}
                      </p>
                      {story.caption ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{story.caption}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
