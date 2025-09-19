"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as React from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { logger } from "@/lib/utils";
import api from "@/api/api";
import { enhancedApiCall } from "@/api/api-helpers";

type SendMessageData = {
  roomId: string;
  content: string;
  messageType?: string;
};

type ConnectionState = "disconnected" | "connecting" | "connected";

interface SocketError extends Error {
  code?: string;
  context?: string;
}

export const useSocket = () => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failTimersRef = useRef(new Map<string, NodeJS.Timeout>());
  const connectionAttemptRef = useRef(0);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());
  const [isShutdown, setIsShutdown] = useState(false);

  const maxReconnectAttempts = 5;
  const maxConnectionAttempts = 3;

  const connectSocketFnRef = useRef<() => Promise<void>>();
  const stateRef = useRef({ connectionState, isAuthenticated, isShutdown });

  useEffect(() => {
    stateRef.current = { connectionState, isAuthenticated, isShutdown };
  }, [connectionState, isAuthenticated, isShutdown]);

  const cleanup = useCallback(() => {
    logger.log("🧹 Cleaning up socket...");

    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    failTimersRef.current.forEach((timer) => clearTimeout(timer));
    failTimersRef.current.clear();

    // Cleanup socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Reset state
    setConnectionState("disconnected");
    setJoinedRooms(new Set());
    setTypingUsers(new Set());
    setReconnectAttempts(0);
    setLastError(null);
    connectionAttemptRef.current = 0;
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

      const baseDelay = Math.min(1000 * Math.pow(2, currentAttempt), 30000);
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;

      logger.log(
        `🔄 Reconnecting in ${delay}ms (attempt ${
          currentAttempt + 1
        }/${maxReconnectAttempts})`
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        const {
          isAuthenticated: latestAuth,
          connectionState: latestState,
          isShutdown: latestShutdown,
        } = stateRef.current;

        if (latestAuth && latestState !== "connecting" && !latestShutdown) {
          connectSocketFnRef.current?.();
        }
      }, delay);
    },
    [cleanup, toast, maxReconnectAttempts]
  );

  const setupSocketListeners = useCallback(
    (socket: Socket) => {
      const handleSocketError = (error: unknown) => {
        const socketError = error as SocketError;
        logger.error("💥 Socket error:", socketError);
        setLastError(socketError.message || "Socket error occurred");
        setConnectionState("disconnected");
      };

      socket.on("connect", () => {
        logger.log("✅ Transport connected to server");
        setReconnectAttempts(0);
        connectionAttemptRef.current = 0;
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

      socket.on("error", handleSocketError);
      socket.on("connect_error", handleSocketError);

      socket.on("new_message", (message: Message) => {
        setRealtimeMessages((prev) => {
          return [...prev, { ...message, status: "sending" }];
        });
      });

      socket.on("user_typing", (data) => {
        if (data.userId !== user?.id) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            // --- FIX STARTS HERE ---
            if (data.isTyping) {
              newSet.add(data.username);
            } else {
              newSet.delete(data.username);
            }
            // --- FIX ENDS HERE ---
            return newSet;
          });
        }
      });

      socket.on(
        "message_confirmed",
        (data: { tempId: string; id: string; status: "confirmed" }) => {
          logger.log("✉️ Message confirmed:", data.tempId);
          setRealtimeMessages((prev) =>
            prev.map((m) => {
              if (m.tempId === data.tempId) {
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
        }
      );

      socket.on("message_error", (data: { tempId: string; error: string }) => {
        logger.error("❌ Message error:", data);
        setRealtimeMessages((prev) =>
          prev.map((m) =>
            m.tempId === data.tempId ? { ...m, status: "failed" } : m
          )
        );

        toast({
          title: "Message Failed",
          description: data.error || "An unknown error occurred.",
          variant: "destructive",
        });
      });

      socket.on("joined_room", (data) => {
        setJoinedRooms((prev) => new Set(prev).add(data.roomId));
      });

      socket.on("left_room", (data) => {
        setJoinedRooms((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.roomId);
          return newSet;
        });
      });
    },
    [user?.id, handleReconnection, toast]
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

    // Prevent too many connection attempts
    if (connectionAttemptRef.current >= maxConnectionAttempts) {
      logger.warn("Too many connection attempts, backing off");
      return;
    }

    connectionAttemptRef.current++;
    setConnectionState("connecting");
    setLastError(null);

    try {
      logger.log("🔌 Attempting to connect socket...");

      const { success, data, error } = await enhancedApiCall({
        apiCall: api.auth.getWsToken(),
        errorContext: "socket-connection",
        suppressErrorToast: true,
      });

      if (!success || !data?.token) {
        throw error || new Error("Failed to get WebSocket token");
      }

      // Cleanup existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const socket = io(process.env.NEXT_PUBLIC_WSS_URL!, {
        path: "/socket/",
        transports: ["websocket"],
        timeout: 10000,
        forceNew: true,
        reconnection: false,
        auth: { token: data.token },
      });

      socketRef.current = socket;
      setupSocketListeners(socket);
    } catch (error: unknown) {
      const appError =
        error instanceof Error ? error : new Error("Connection failed");
      logger.error("💥 Failed to connect:", appError);

      setConnectionState("disconnected");
      setLastError(appError.message);

      setReconnectAttempts((prev) => {
        const next = prev + 1;
        handleReconnection(next);
        return next;
      });
    }
  }, [setupSocketListeners, handleReconnection, maxConnectionAttempts]);

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

      // Set fail timer
      const failTimer = setTimeout(() => {
        setRealtimeMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId && m.status === "sending"
              ? { ...m, status: "failed" }
              : m
          )
        );
        failTimersRef.current.delete(tempId);
      }, 30000);

      failTimersRef.current.set(tempId, failTimer);

      try {
        await socketRef.current.emitWithAck("send_message", {
          ...data,
          content: data.content.trim(),
          tempId,
        });

        // Clear fail timer on success
        const timer = failTimersRef.current.get(tempId);
        if (timer) {
          clearTimeout(timer);
          failTimersRef.current.delete(tempId);
        }

        return true;
      } catch {
        // Server will also trigger message_error, but we handle locally too
        const timer = failTimersRef.current.get(tempId);
        if (timer) {
          clearTimeout(timer);
          failTimersRef.current.delete(tempId);
        }

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

  const startTyping = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing_start", { roomId });
    }
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing_stop", { roomId });
    }
  }, []);

  const clearMessages = useCallback(() => {
    setRealtimeMessages([]);
  }, []);

  const reconnect = useCallback(() => {
    setIsShutdown(false);
    setReconnectAttempts(0);
    connectSocket();
  }, [connectSocket]);

  /* ---------- Effects ---------- */
  useEffect(() => {
    let isMounted = true;
    let connectionTimer: NodeJS.Timeout;

    if (isAuthenticated) {
      logger.log("✅ Auth state is TRUE, scheduling socket connection.");
      connectionTimer = setTimeout(() => {
        if (isMounted) {
          connectSocketFnRef.current?.();
        }
      }, 250);
    } else {
      cleanup();
    }

    return () => {
      isMounted = false;
      if (connectionTimer) {
        clearTimeout(connectionTimer);
      }
    };
  }, [isAuthenticated, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (lastError) {
      const errorTimer = setTimeout(() => setLastError(null), 10000);
      return () => clearTimeout(errorTimer);
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
    reconnect,
    isShutdown,
  };
};
