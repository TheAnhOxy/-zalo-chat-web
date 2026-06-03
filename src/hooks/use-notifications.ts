import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationsApi } from "@/src/services/api/notifications";
import { useAuthGuard } from "./use-auth-guard";

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const auth = useAuthGuard();
  const userId = auth.user?._id;

  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => NotificationsApi.getNotifications(userId!),
    enabled: !!userId,
  });

  const unreadCount = notifications.filter(
    (n) => n.isRead === false || n.isRead === "false" as any
  ).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => NotificationsApi.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      const previousNotifications = queryClient.getQueryData(["notifications", userId]);
      
      queryClient.setQueryData(["notifications", userId], (old: any) => {
        if (!old) return old;
        return old.map((n: any) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
      });

      return { previousNotifications };
    },
    onError: (err, newTodo, context: any) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", userId], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => NotificationsApi.markAllAsRead(userId!),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      const previousNotifications = queryClient.getQueryData(["notifications", userId]);
      
      queryClient.setQueryData(["notifications", userId], (old: any) => {
        if (!old) return old;
        return old.map((n: any) => ({ ...n, isRead: true }));
      });

      return { previousNotifications };
    },
    onError: (err, newTodo, context: any) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", userId], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => NotificationsApi.deleteNotification(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      const previousNotifications = queryClient.getQueryData(["notifications", userId]);
      
      queryClient.setQueryData(["notifications", userId], (old: any) => {
        if (!old) return old;
        return old.filter((n: any) => n.id !== notificationId);
      });

      return { previousNotifications };
    },
    onError: (err, newTodo, context: any) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", userId], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    isError,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
  };
};
