"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getMessageHistory } from "@/lib/api";

const MESSAGE_LIMIT = 20;

export const useMessageHistory = (roomId: string) => {
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const { toast } = useToast();

  const fetchHistory = useCallback(
    async (currentPage: number, currentRoomId: string) => {
      if (!currentRoomId) return;

      setIsLoadingHistory(true);
      try {
        const response = await getMessageHistory(currentRoomId, currentPage, MESSAGE_LIMIT);

        if (response.success && response.messages) {
          // Transform API messages to match our Message type
          const transformedMessages: Message[] = response.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            userId: msg.userId,
            username: msg.username,
            roomId: msg.roomId,
            messageType: msg.messageType || 'text',
            status: 'sent' as const,
          }));

          setHistoryMessages((prev) =>
            currentPage === 1 ? transformedMessages : [...prev, ...transformedMessages]
          );

          // Check if there are more pages
          const hasMorePages = response.pagination ?
            (response.pagination.hasNext || currentPage < response.pagination.totalPages) : false;
          setHasMore(hasMorePages);
        } else {
          console.error("Failed to fetch message history:", response.message);
          if (currentPage === 1) {
            setHistoryMessages([]);
          }
          setHasMore(false);
        }
      } catch (error) {
        console.error("Failed to fetch message history:", error);
        if (currentPage === 1) {
          setHistoryMessages([]);
        }
        setHasMore(false);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    []
  );

  // Load initial messages only once per room
  useEffect(() => {
    // Always clear messages when room changes - CRITICAL for privacy
    setHistoryMessages([]);
    setPage(1);
    setHasMore(true);
    setHasLoadedInitial(false);

    if (roomId) {
      setHasLoadedInitial(true);
      fetchHistory(1, roomId);
    }
  }, [roomId, fetchHistory]);

  const loadMoreHistory = useCallback(() => {
    if (isLoadingHistory || !hasMore || !roomId) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, roomId);
  }, [isLoadingHistory, hasMore, page, roomId, fetchHistory]);

  const refreshMessages = useCallback(() => {
    if (!roomId) return;
    setPage(1);
    setHasMore(true);
    fetchHistory(1, roomId);
  }, [roomId, fetchHistory]);

  return { 
    historyMessages, 
    isLoadingHistory, 
    loadMoreHistory, 
    hasMore,
    refreshMessages,
    hasLoadedInitial
  };
};
