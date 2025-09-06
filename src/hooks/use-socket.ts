"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api"; // Import api

const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "wss://your-domain.com"
    : "http://localhost:3002";

interface SendMessageData {
  roomId: string;
  content: string;
  messageType?: string;
}

export const useSocket = () => {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const roomToJoinRef = useRef<string | null>(null);
  const connectionAttemptRef = useRef<boolean>(false); // ✅ Prevent multiple connections

  const [isConnected, setIsConnected] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // ✅ Improved connection effect with proper cleanup
  useEffect(() => {
    console.log("useSocket effect triggered:", {
      isAuthenticated,
      hasSocket: !!socketRef.current,
    });

    if (isAuthenticated && !socketRef.current) {
      connectSocket();
    } else if (!isAuthenticated && socketRef.current) {
      // Disconnect when not authenticated
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }

    return () => {
      // ✅ Proper cleanup
      if (socketRef.current) {
        console.log("Cleaning up socket connection");
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        connectionAttemptRef.current = false;
      }
    };
  }, [isAuthenticated]); // ✅ Only depend on isAuthenticated

  const connectSocket = useCallback(async () => {
    // ✅ Prevent multiple simultaneous connections
    if (connectionAttemptRef.current || socketRef.current?.connected) {
      console.log("Connection already in progress or connected");
      return;
    }

    connectionAttemptRef.current = true;

    try {
      console.log("Connecting to Socket.io server...");

      // Make a request to the API Gateway to get the HttpOnly WebSocket token
      // The browser will automatically send the HttpOnly wsToken cookie during handshake
      // const wsTokenResponse = await fetch("/api/auth/ws-token", {
      //   credentials: "include", // Ensure cookies are sent
      // });

      // if (!wsTokenResponse.ok) {
      //   throw new Error(`Failed to get WebSocket token: ${wsTokenResponse.status}`);
      // }
      // No need to parse token from body, it's set as HttpOnly cookie

      // Use api.auth.getWsToken() instead of fetch
      const wsTokenResponse = await api.auth.getWsToken();
      if (!wsTokenResponse.data.success || !wsTokenResponse.data.token) {
        throw new Error(`Failed to get WebSocket token: ${wsTokenResponse.data.message}`);
      }
      const wsToken = wsTokenResponse.data.token;

      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        timeout: 10000,
        forceNew: true,
        reconnection: false,
        auth: { token: wsToken }, // Pass token in auth property
      });

      const socket = socketRef.current;

      socket.on("connect", () => {
        console.log("Connected to Socket.io server");
        setIsConnected(true);
        connectionAttemptRef.current = false;
      });

      socket.on("connected", (data) => {
        console.log("Socket.io authentication successful:", data);
        toast({
          title: "Connected",
          description: "Connected to chat server",
        });

        if (roomToJoinRef.current) {
          socket.emit("join_room", { roomId: roomToJoinRef.current });
          console.log("Auto-joined room:", roomToJoinRef.current);
          roomToJoinRef.current = null;
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("Disconnected from Socket.io server:", reason);
        setIsConnected(false);
        connectionAttemptRef.current = false;

        // ✅ Only reconnect for unexpected disconnections
        if (
          reason !== "io client disconnect" &&
          isAuthenticated
        ) {
          console.log("Attempting to reconnect in 3 seconds...");
          setTimeout(() => {
            if (isAuthenticated && !socketRef.current?.connected) {
              connectSocket();
            }
          }, 3000);
        }
      });

      socket.on("error", (data) => {
        console.error("Socket.io error:", data);
        connectionAttemptRef.current = false;

        if (
          data.message?.includes("Invalid token") ||
          data.message?.includes("Unauthorized")
        ) {
          
        }
      });

      // Message events
      socket.on("new_message", (message: Message) => {
        setRealtimeMessages((prev) => [...prev, message]);
      });

      socket.on("user_joined", (data) => {
        toast({
          title: "User joined",
          description: `${data.username} joined the room`,
        });
      });

      socket.on("user_left", (data) => {
        toast({
          title: "User left",
          description: `${data.username} left the room`,
        });
      });

      socket.on("user_typing", (data) => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.username);
          } else {
            newSet.delete(data.username);
          }
          return newSet;
        });
      });
    } catch (error) {
      console.error("Failed to connect to socket:", error);
      connectionAttemptRef.current = false;

      toast({
        title: "Connection failed",
        description: "Failed to connect to chat server",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, toast]);

  const joinRoom = useCallback((roomId: string) => {
    console.log("useSocket: joinRoom called for roomId=", roomId);
    roomToJoinRef.current = roomId;

    if (socketRef.current?.connected) {
      socketRef.current.emit("join_room", { roomId });
      console.log("useSocket: Emitted join_room for roomId=", roomId);
      roomToJoinRef.current = null;
    }
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave_room", { roomId });
    }
  }, []);

  const sendMessage = useCallback((data: SendMessageData) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      console.log("🚀 Preparing to emit send_message");
      console.log("📝 Socket ID:", socketRef.current.id);
      console.log("📝 Data to send:", data);

      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        userId: user?.id || "",
        username: user?.username || "",
        roomId: data.roomId,
        content: data.content,
        messageType: data.messageType || "text",
        createdAt: new Date().toISOString(),
        status: "pending", // Custom status for optimistic message
      };

      setRealtimeMessages((prev) => [...prev, optimisticMessage]);

      // Define callback function first
      const acknowledmentCallback = (response: any) => {
        console.log("📨 Received acknowledgment from server:", response);
        // This callback is for the immediate acknowledgment, not the final message
        // The actual message update will come via 'new_message' or 'message_error'
      };

      try {
        console.log("🚀 EMITTING send_message with callback function");

        // Emit with explicit callback
        socketRef.current.emit("send_message", data, acknowledmentCallback);

        console.log("✅ emit() call completed, waiting for acknowledgment...");
        resolve(optimisticMessage); // Resolve immediately with optimistic message
      } catch (error) {
        console.error("💥 Exception during emit:", error);
        // Remove optimistic message on immediate emit failure
        setRealtimeMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        reject(error);
      }
    });
  }, [user]);

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

  return {
    socket: socketRef.current,
    isConnected,
    realtimeMessages,
    typingUsers: Array.from(typingUsers),
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    clearMessages,
  };
};