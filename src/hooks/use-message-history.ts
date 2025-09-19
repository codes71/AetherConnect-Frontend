"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "@/lib/types";
import api from "@/api/api";
import { enhancedApiCall } from "@/api/api-helpers";
import { useToast } from "@/hooks/use-toast";

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
        const { success, data } = await enhancedApiCall<{ messages: Message[] }>({
          apiCall: api.message.getMessages(currentRoomId, currentPage, MESSAGE_LIMIT),
          errorContext: `messages-history-${currentRoomId}`,
          suppressErrorToast: currentPage > 1, // Only show toast for initial load failures
        });

        if (success && data && Array.isArray(data.messages)) {
          const newMessages = data.messages;
          setHistoryMessages((prev) =>
            currentPage === 1 ? newMessages : [...prev, ...newMessages]
          );
          setHasMore(newMessages.length === MESSAGE_LIMIT);
        } else {
          console.warn("API response for messages did not contain a 'messages' array:", data);
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
        
        // Only show error for initial load
        if (currentPage === 1) {
          toast({
            title: "Failed to load messages",
            description: "Could not load message history",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [toast]
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