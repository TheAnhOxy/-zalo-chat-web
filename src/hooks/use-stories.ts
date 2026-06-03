import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storiesService } from "@/src/services/stories/stories.service";
import { useAuthGuard } from "./use-auth-guard";

export const useStories = () => {
  const auth = useAuthGuard();
  const userId = auth.user?._id;
  const queryClient = useQueryClient();

  const exploreQuery = useQuery({
    queryKey: ["stories", "explore", userId],
    queryFn: () => storiesService.getStories(userId as string),
    enabled: Boolean(userId),
  });

  const feedQuery = useQuery({
    queryKey: ["stories", "feed", userId],
    queryFn: () => storiesService.getStoryFeed(userId as string),
    enabled: Boolean(userId),
  });

  const viewStoryMutation = useMutation({
    mutationFn: (storyId: string) => storiesService.viewStory(storyId, userId as string),
    onSuccess: () => {
      // Invalidate to update the "unseen" rings if needed
      // queryClient.invalidateQueries({ queryKey: ["stories", "feed", userId] });
    }
  });

  const refetchAll = () => {
    exploreQuery.refetch();
    feedQuery.refetch();
  };

  return {
    explore: exploreQuery.data || [],
    feed: feedQuery.data || [],
    isLoading: exploreQuery.isLoading || feedQuery.isLoading,
    isFetching: exploreQuery.isFetching || feedQuery.isFetching,
    refetchAll,
    viewStory: viewStoryMutation.mutateAsync,
  };
};
