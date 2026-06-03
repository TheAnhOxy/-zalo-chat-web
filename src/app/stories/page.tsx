"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Eye, ImageIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { PageLoader } from "@/src/components/ui/page-state";
import { useStories } from "@/src/hooks/use-stories";
import { StoryItem } from "@/src/services/stories/stories.service";
import { StoryViewer } from "@/src/components/stories/story-viewer";
import { CreateStoryModal } from "@/src/components/stories/create-story-modal";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export default function StoriesPage() {
  const auth = useAuthGuard();
  const { explore, feed, isLoading, refetchAll } = useStories();
  
  const [viewerStories, setViewerStories] = useState<StoryItem[] | null>(null);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const searchParams = useSearchParams();

  // Auto-open story if navigated from notification
  useEffect(() => {
    if (!isLoading && searchParams) {
      const targetUserId = searchParams.get("userId");
      if (targetUserId) {
        // Try finding in feed (friends)
        const group = feed.find(g => g.user.id === targetUserId);
        if (group && group.stories.length > 0) {
          handleOpenViewer(group.stories, 0, { fullName: group.user.fullName, avatar: group.user.avatar });
          return;
        }
        // Try finding in explore (others)
        const exploreIndex = explore.findIndex(s => (s.userId === targetUserId || (s as any).user?.id === targetUserId));
        if (exploreIndex >= 0) {
          handleOpenViewer(explore, exploreIndex);
        }
      }
    }
  }, [isLoading, searchParams, feed, explore]);

  if (!auth.isInitialized || !auth.user || isLoading) return <PageLoader />;

  const handleOpenViewer = (stories: StoryItem[], index: number = 0, groupUser?: { fullName?: string; avatar?: string }) => {
    if (stories.length > 0) {
      // Enrich stories with user info from group if individual stories don't have it
      const enriched = groupUser
        ? stories.map(s => ({
            ...s,
            user: s.user?.fullName ? s.user : { fullName: groupUser.fullName, avatar: groupUser.avatar },
          }))
        : stories;
      setViewerStories(enriched);
      setViewerInitialIndex(index);
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-slate-50 text-slate-800">
      <div className="h-full w-full md:grid md:grid-cols-[72px_1fr]">
        <AppNavSidebar activeTab="stories" />

        <section className="flex h-full flex-col overflow-hidden bg-[#f0f2f5] md:m-4 md:rounded-2xl md:shadow-sm md:ring-1 md:ring-slate-200">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h1 className="text-xl font-bold text-slate-900">Tin</h1>
          </header>

          <div className="flex-1 overflow-y-auto">
            {/* Story Tray (Thanh ngang FB Style) */}
            <div className="bg-white px-4 py-4 shadow-sm">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {/* Nút Tạo tin */}
                <div
                  onClick={() => setShowCreateModal(true)}
                  className="relative h-48 w-32 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="h-2/3 w-full bg-slate-100">
                    {auth.user.avatar ? (
                      <img src={auth.user.avatar} alt="Me" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-300 text-2xl font-bold text-white">
                        {auth.user.fullName?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex h-1/3 flex-col items-center justify-end pb-3">
                    <span className="text-xs font-semibold text-slate-800">Tạo tin</span>
                  </div>
                  <div className="absolute bottom-[22%] left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-blue-500 text-white">
                    <Plus size={16} strokeWidth={3} />
                  </div>
                </div>

                {/* Danh sách người dùng có tin */}
                {feed.map((group) => {
                  const latestStory = group.stories[group.stories.length - 1];
                  return (
                    <div 
                      key={group.user.id} 
                      className="group relative h-48 w-32 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-slate-900 shadow-sm transition-transform hover:scale-[1.02]"
                      onClick={() => handleOpenViewer(group.stories, 0, { fullName: group.user.fullName, avatar: group.user.avatar })}
                    >
                      {/* Background ảnh/video của story mới nhất */}
                      {latestStory?.type === "VIDEO" ? (
                        <video src={`${latestStory.mediaUrl}#t=0.1`} className="absolute inset-0 h-full w-full object-cover opacity-80" preload="metadata" muted />
                      ) : (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-80"
                          style={{ backgroundImage: `url(${latestStory?.mediaUrl || ""})` }}
                        />
                      )}
                      
                      {/* Avatar */}
                      <div className={`absolute left-3 top-3 h-10 w-10 overflow-hidden rounded-full border-[3px] ${group.hasUnseen ? "border-blue-500" : "border-slate-300"} bg-slate-200`}>
                        {group.user.avatar ? (
                          <img src={group.user.avatar} alt={group.user.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-400 font-bold text-white">
                            {group.user.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      
                      {/* Tên */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                        <span className={`block text-center text-xs leading-tight ${group.hasUnseen ? "font-semibold text-white" : "font-medium text-slate-200"} drop-shadow-md line-clamp-2`}>
                          {group.user.fullName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Story Grid (Lưới khám phá - 3x3 cố định) */}
            <div className="p-4 sm:p-6 md:p-8">
              <h2 className="mb-6 text-xl font-bold text-slate-800 sm:text-2xl">Khám phá</h2>
              
              {explore.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Không có tin nào gần đây.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                  {explore.map((story, index) => (
                    <article
                      key={story._id}
                      onClick={() => handleOpenViewer([story])}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 shadow-md transition-all duration-200 hover:shadow-xl hover:scale-[1.05] aspect-[9/16]"
                    >
                      {/* Ảnh mờ làm background */}
                      {story.type !== "VIDEO" && story.mediaUrl && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-60 blur-md transition-opacity group-hover:opacity-40"
                          style={{ backgroundImage: `url(${story.mediaUrl})` }}
                        />
                      )}
                      
                      {/* Card Overlay - Top Section */}
                      <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 pb-8">
                        {/* User Info (Top Left) */}
                        <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-2">
                          <div className="h-9 w-9 shrink-0 rounded-full border-2 border-blue-400 bg-slate-200 overflow-hidden shadow-sm">
                            {story.user?.avatar || story.userAvatar ? (
                              <img src={story.user?.avatar || story.userAvatar} className="h-full w-full object-cover" alt="" />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-slate-500 text-xs font-bold text-white">
                                {(story.user?.fullName || story.userName || "?").charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <p className="truncate text-sm font-semibold text-white leading-tight drop-shadow-md">
                              {story.user?.fullName || story.userName || "Người dùng"}
                            </p>
                            <p className="text-[11px] text-white/90 leading-tight drop-shadow-md">{timeAgo(story.createdAt)}</p>
                          </div>
                        </div>

                        {/* Badge (Top Right) */}
                        <div className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm shadow-md ${
                          story.type === "VIDEO" 
                            ? "bg-rose-500/85" 
                            : "bg-blue-500/85"
                        }`}>
                          {story.type === "VIDEO" ? (
                            <><Play size={10} fill="currentColor" /> VIDEO</>
                          ) : (
                            <><ImageIcon size={10} /> ẢNH</>
                          )}
                        </div>
                      </div>

                      {/* Content chính */}
                      <div className="absolute inset-0 z-10 flex flex-col justify-end">
                        {story.mediaUrl ? (
                          story.type === "VIDEO" ? (
                            <video src={`${story.mediaUrl}#t=0.1`} className="absolute inset-0 h-full w-full object-contain" preload="metadata" muted />
                          ) : (
                            <img src={story.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
                          )
                        ) : (
                          <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-center text-sm font-medium text-white">
                            <span className="line-clamp-4">{story.caption}</span>
                          </div>
                        )}
                        
                        {/* Viewers count (Bottom Right) */}
                        {story.viewers && story.viewers.length > 0 && (
                          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                            <Eye size={12} /> <span>{story.viewers.length}</span>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Story Viewer Modal */}
      {viewerStories && (
        <StoryViewer 
          stories={viewerStories} 
          initialIndex={viewerInitialIndex} 
          onClose={() => setViewerStories(null)} 
        />
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <CreateStoryModal
          userId={auth.user._id}
          onClose={() => {
            setShowCreateModal(false);
            refetchAll();
          }}
        />
      )}
    </main>
  );
}
