'use client';

import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/lib/types';
import api from '@/lib/api';

const MESSAGE_LIMIT = 50;

export const useMessageHistory = (roomId: string) => {
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (currentPage: number, currentRoomId: string) => {
    if (!currentRoomId) return;
    setIsLoadingHistory(true);
    try {
      const response = await api.message.getMessages(currentRoomId, currentPage, MESSAGE_LIMIT);
      if (response.data && Array.isArray(response.data.messages)) {
        const newMessages = response.data.messages;
        setHistoryMessages(prev => currentPage === 1 ? newMessages : [...newMessages, ...prev]);
        setHasMore(newMessages.length === MESSAGE_LIMIT);
      } else {
        setHistoryMessages(prev => currentPage === 1 ? [] : prev);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch message history:', error);
      setHasMore(false);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    setHistoryMessages([]);
    setPage(1);
    setHasMore(true);
    if (roomId) {
      fetchHistory(1, roomId);
    }
  }, [roomId, fetchHistory]);

  const loadMoreHistory = useCallback(() => {
    if (isLoadingHistory || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, roomId);
  }, [isLoadingHistory, hasMore, page, roomId, fetchHistory]);

  return { historyMessages, isLoadingHistory, loadMoreHistory, hasMore };
};