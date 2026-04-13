import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  CommunityPost,
  CommunityFeedResponse,
  CommentsResponse,
} from "../types";

export function useCommunityFeed(clanId: string | undefined, page = 1) {
  return useQuery<CommunityFeedResponse>({
    queryKey: ["community-feed", clanId, page],
    queryFn: async () => {
      const res = await api.get("/posts/community", {
        params: { clanId, page, limit: 20 },
      });
      return res.data;
    },
    enabled: !!clanId,
  });
}

export function usePublicPost(id: string) {
  return useQuery<CommunityPost>({
    queryKey: ["community-post", id],
    queryFn: async () => {
      const res = await api.get(`/posts/community/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useComments(postId: string, page = 1) {
  return useQuery<CommentsResponse>({
    queryKey: ["post-comments", postId, page],
    queryFn: async () => {
      const res = await api.get(`/posts/${postId}/comments`, {
        params: { page, limit: 20 },
      });
      return res.data;
    },
    enabled: !!postId,
  });
}

export function useCreatePost(clanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title?: string;
      content?: string;
      media?: string[];
    }) => {
      const res = await api.post("/posts", data, {
        params: { clanId },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });
}

export function useCreateComment(postId: string, clanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      const res = await api.post(`/posts/${postId}/comments`, data, {
        params: { clanId },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
    },
  });
}

export function useLikePost(clanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/like`, null, {
        params: { clanId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      queryClient.invalidateQueries({ queryKey: ["community-post"] });
    },
  });
}

export function useUnlikePost(clanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}/like`, {
        params: { clanId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      queryClient.invalidateQueries({ queryKey: ["community-post"] });
    },
  });
}
