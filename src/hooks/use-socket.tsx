"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as React from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { logger } from "@/lib/utils";
import api from "@/lib/api";

type SendMessageData = {
  roomId: string;
  content: string;
  messageType?: string;
};

type ConnectionState = "disconnected" | "connecting" | "connected";

export const useSocket = () => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failTimersRef = useRef(new Map<string, NodeJS.Timeout>());

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());
  const [isShutdown, setIsShutdown] = useState(false);

  const maxReconnectAttempts = 5;

  const connectSocketFnRef = useRef<() => Promise<void>>();
  const stateRef = useRef({ connectionState, isAuthenticated, isShutdown });

  useEffect(() => {
    stateRef.current = { connectionState, isAuthenticated, isShutdown };
  }, [connectionState, isAuthenticated, isShutdown]);

  const cleanup = useCallback(() => {
    logger.log("🧹 Cleaning up socket...");
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    failTimersRef.current.forEach((t) => clearTimeout(t));
    failTimersRef.current.clear();
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionState("disconnected");
    setJoinedRooms(new Set());
    setTypingUsers(new Set());
    setReconnectAttempts(0);
    setLastError(null);
  }, []);

  const handleReconnection = useCallback(
    (currentAttempt: number) => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      const { connectionState: currentState, isShutdown: currentShutdown } =
        stateRef.current;
      if (
        currentAttempt >= maxReconnectAttempts ||
        currentState === "connecting" ||
        currentShutdown
      ) {
        if (currentAttempt >= maxReconnectAttempts && !currentShutdown) {
          logger.log("❌ Max reconnection attempts reached");
          setIsShutdown(true);
          cleanup();
          const retryAction = () => {
            setIsShutdown(false);
            setReconnectAttempts(0);
            connectSocketFnRef.current?.();
          };
          toast({
            title: "Connection Failed",
            description: "Unable to connect. Click to retry.",
            variant: "destructive",
            action: (
              <ToastAction altText="Retry Connection" onClick={retryAction}>
                Retry
              </ToastAction>
            ),
          });
        }
        return;
      }
      const delay =
        Math.min(1000 * Math.pow(2, currentAttempt), 30000) +
        Math.random() * 1000;
      logger.log(`🔄 Reconnecting in ${delay}ms (attempt ${currentAttempt})`);
      reconnectTimeoutRef.current = setTimeout(() => {
        const {
          isAuthenticated: latestAuth,
          connectionState: latestState,
          isShutdown: latestShutdown,
        } = stateRef.current;
        if (
          latestAuth &&
          latestState !== "connecting" &&
          !latestShutdown
        ) {
          connectSocketFnRef.current?.();
        }
      }, delay);
    },
    [cleanup, toast]
  );
  
  const setupSocketListeners = useCallback(
    (socket: Socket) => {
      socket.on("connect", () => {
        logger.log("✅ Transport connected to server");
        setReconnectAttempts(0);
      });
      socket.on("connected", (data) => {
        logger.log("🎯 Auth success:", data);
        setConnectionState("connected");
      });
      socket.on("disconnect", (reason) => {
        logger.log("❌ Disconnected:", reason);
        setConnectionState("disconnected");
        setJoinedRooms(new Set());
        setTypingUsers(new Set());
        if (reason !== "io client disconnect") {
          setReconnectAttempts((prev) => {
            const next = prev + 1;
            handleReconnection(next);
            return next;
          });
        }
      });
      socket.on("error", (data) => {
        logger.error("💥 Socket error:", data);
        setLastError(data.message || "Socket error occurred");
        setConnectionState("disconnected");
      });
       socket.on("user_typing", (data) => {
        if (data.userId !== user?.id) {
          setTypingUsers((prev) => {
            const n = new Set(prev);
            data.isTyping ? n.add(data.username) : n.delete(data.username);
            return n;
          });
        }
      });
      socket.on("message_confirmed", (data: { tempId: string; id: string; status: "confirmed" }) => {
        logger.log("✉️ Message confirmed:");
        setRealtimeMessages((prev) =>
          prev.map((m) => {
            if (m.tempId === data.tempId) {
              // Clear the fail timer if the message is confirmed
              const timer = failTimersRef.current.get(data.tempId);
              if (timer) {
                clearTimeout(timer);
                failTimersRef.current.delete(data.tempId);
              }
              return { ...m, id: data.id, status: data.status };
            }
            return m;
          })
        );
      });
      socket.on("joined_room", (data) => {
        setJoinedRooms((prev) => new Set(prev).add(data.roomId));
      });
      socket.on("left_room", (data) => {
        setJoinedRooms((prev) => {
          const n = new Set(prev);
          n.delete(data.roomId);
          return n;
        });
      });
    },
    [user?.id, handleReconnection]
  );

  const connectSocket = useCallback(async () => {
    if (
      socketRef.current?.connected ||
      !stateRef.current.isAuthenticated ||
      stateRef.current.connectionState === "connecting" ||
      stateRef.current.isShutdown
    ) {
      return;
    }
    setConnectionState("connecting");
    setLastError(null);
    try {
      logger.log("🔌 Attempting to connect socket...");
      const wsTokenResponse = await api.auth.getWsToken();
      if (!wsTokenResponse.data.success || !wsTokenResponse.data.token) {
        throw new Error("Failed to get WebSocket token");
      }
      if (socketRef.current) socketRef.current.disconnect();
      const socket = io(process.env.NEXT_PUBLIC_WSS_URL!, {
        path: "/socket/",
        transports: ["websocket"],
        timeout: 10000,
        forceNew: true,
        reconnection: false,
        auth: { token: wsTokenResponse.data.token },
      });
      socketRef.current = socket;
      setupSocketListeners(socket);
    } catch (err: any) {
      logger.error("💥 Failed to connect:", err);
      setConnectionState("disconnected");
      setLastError(err instanceof Error ? err.message : "Connection failed");
      setReconnectAttempts((prev) => {
        const next = prev + 1;
        handleReconnection(next);
        return next;
      });
    }
  }, [setupSocketListeners, handleReconnection]);

  useEffect(() => {
    connectSocketFnRef.current = connectSocket;
  }, [connectSocket]);

  /* ---------- Public API ---------- */
  const sendMessage = useCallback(
    async (data: SendMessageData) => {
      if (!socketRef.current?.connected) {
        toast({
          title: "Not connected",
          description: "Please wait for connection",
          variant: "destructive",
        });
        return false;
      }

      if (!data.content.trim()) return false;

      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 11)}`;

      const optimisticMessage: Message = {
        id: tempId,
        tempId,
        content: data.content.trim(),
        createdAt: new Date().toISOString(),
        userId: user?.id || "",
        username: user?.username || "You",
        roomId: data.roomId,
        messageType: data.messageType || "text",
        status: "sending",
      };

      setRealtimeMessages((prev) => [...prev, optimisticMessage]);

      const failTimer = setTimeout(() => {
        setRealtimeMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId && m.status === "sending"
              ? { ...m, status: "failed" }
              : m
          )
        );
      }, 30000);
      failTimersRef.current.set(tempId, failTimer);

      try {
        await socketRef.current.emitWithAck("send_message", {
          ...data,
          content: data.content.trim(),
          tempId,
        });
        // If emitWithAck is successful, update status to 'sent' and clear fail timer
        setRealtimeMessages((prev) =>
          prev.map((m) => {
            if (m.tempId === tempId && m.status === "sending") {
              const timer = failTimersRef.current.get(tempId);
              if (timer) {
                clearTimeout(timer);
                failTimersRef.current.delete(tempId);
              }
              return { ...m, status: "sent" };
            }
            return m;
          })
        );
        return true;
      } catch {
        // The handleMessageError listener will also likely be triggered by the server
        setRealtimeMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId ? { ...m, status: "failed" } : m
          )
        );
        toast({
          title: "Message Failed",
          description: "Server did not acknowledge the message.",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, toast]
  );

  const joinRoom = useCallback(
    (roomId: string) => {
      if (socketRef.current?.connected && !joinedRooms.has(roomId)) {
        socketRef.current.emit("join_room", { roomId });
      }
    },
    [joinedRooms]
  );

  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave_room", { roomId });
    }
  }, []);

  const startTyping = useCallback(
    (roomId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("typing_start", { roomId });
      }
    },
    []
  );

  const stopTyping = useCallback(
    (roomId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("typing_stop", { roomId });
      }
    },
    []
  );
  
  const clearMessages = useCallback(() => {
    setRealtimeMessages([]);
  }, []);

  /* ---------- Effects ---------- */
  useEffect(() => {
    let isCancelled = false;

    if (isAuthenticated) {
      logger.log("Auth state is TRUE, scheduling socket connection.");
      const timerId = setTimeout(() => {
        if (!isCancelled) {
          connectSocketFnRef.current?.();
        }
      }, 250);

      return () => {
        logger.log("Cleaning up scheduled socket connection.");
        isCancelled = true;
        clearTimeout(timerId);
      };
    } else {
      cleanup();
    }
  }, [isAuthenticated, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (lastError) {
      const t = setTimeout(() => setLastError(null), 10000);
      return () => clearTimeout(t);
    }
  }, [lastError]);

  return {
    isConnected: connectionState === "connected",
    connectionState,
    lastError,
    reconnectAttempts,
    joinedRooms: Array.from(joinedRooms),
    realtimeMessages,
    typingUsers: Array.from(typingUsers),
    connectSocket,
    sendMessage,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    clearMessages,
  };
};