"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const SOCKET_URL = process.env.NODE_ENV === "production" 
  ? "wss://your-domain.com" 
  : "http://localhost:3002";

interface SendMessageData {
  roomId: string;
  content: string;
  messageType?: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export const useSocket = () => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
  // Refs for stable references
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);
  
  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());

  const maxReconnectAttempts = 5;

  // FIXED: Aligned message handlers with proper type handling
  const handleNewMessage = useCallback((newMessage: Message) => {    
    setRealtimeMessages(prev => {
      // Check for duplicates by server ID
      if (newMessage.id && prev.some(msg => msg.id === newMessage.id)) {
        console.log("🔄 Message already exists, skipping:", newMessage.id);
        return prev;
      }

      // Handle optimistic updates - replace by tempId
      if (newMessage.tempId) {
        const tempIndex = prev.findIndex(msg => 
          msg.tempId === newMessage.tempId
        );
        
        if (tempIndex > -1) {
          console.log("✅ Replacing optimistic message:", newMessage.tempId);
          const updated = [...prev];
          // FIXED: Properly merge message data and remove tempId
          updated[tempIndex] = { 
            ...newMessage, 
            status: 'sent',
            tempId: undefined // Clear tempId after confirmation
          };
          return updated;
        }
      }

      // New message from another user
      console.log("➕ Adding new message:", newMessage.id);
      return [...prev, { ...newMessage, status: 'sent' }];
    });
  }, []);

  const handleMessageConfirmed = useCallback((confirmedMessage: Message) => {    
    setRealtimeMessages(prev => {
      const index = prev.findIndex(msg =>
        msg.id === confirmedMessage.id ||
        msg.tempId === confirmedMessage.tempId ||
        msg.tempId === confirmedMessage.id
      );
      
      if (index > -1) {
        const updated = [...prev];
        updated[index] = { 
          ...updated[index],
          ...confirmedMessage, 
          status: 'confirmed',
          tempId: undefined
        };
        return updated;
      }
      
      return prev;
    });
  }, []);

  const handleMessageError = useCallback((errorData: any) => {
    console.error("❌ Message error:", errorData);
    
    setRealtimeMessages(prev => 
      prev.map(msg => {
        // Mark failed messages
        if ((errorData.tempId && msg.tempId === errorData.tempId) ||
            (errorData.originalMessageId && msg.id === errorData.originalMessageId)) {
          console.log("❌ Marking message as failed:", msg.tempId || msg.id);
          return { ...msg, status: 'failed' as const };
        }
        return msg;
      })
    );
    
    toast({
      title: "Message failed",
      description: errorData.message || "Failed to send message",
      variant: "destructive",
    });
  }, [toast]);

  // Socket event handlers
  const setupSocketListeners = useCallback((socket: Socket) => {
    socket.on("connect", () => {
      console.log("✅ Connected to Socket.io server");
      setConnectionState('connected');
      setReconnectAttempts(0);
    });

    socket.on("connected", (data) => {
      console.log("🎯 Socket.io authentication successful:", data);
      // toast({ title: "Connected", description: "Connected to chat server" });
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from Socket.io server:", reason);
      setConnectionState('disconnected');
      setJoinedRooms(new Set());
      
      if (reason !== "io client disconnect" && !isUnmountingRef.current) {
        handleReconnection();
      }
    });

    socket.on("error", (data) => {
      console.error("💥 Socket.io error:", data);
      setLastError(data.message || 'Socket error occurred');
      setConnectionState('disconnected');
    });

    socket.on("new_message", handleNewMessage);
    socket.on("message_confirmed", handleMessageConfirmed);
    socket.on("message_error", handleMessageError);

    socket.on("joined_room", (data) => {
      console.log("✅ Successfully joined room:", data.roomId);
      setJoinedRooms(prev => new Set(prev).add(data.roomId));
    });

    socket.on("left_room", (data) => {
      console.log("👋 Successfully left room:", data.roomId);
      setJoinedRooms(prev => {
        const updated = new Set(prev);
        updated.delete(data.roomId);
        return updated;
      });
    });

    socket.on("user_joined", (data) => {
      if (data.userId !== user?.id) {
        toast({ 
          title: "User joined", 
          description: `${data.username} joined the room` 
        });
      }
    });

    socket.on("user_left", (data) => {
      if (data.userId !== user?.id) {
        toast({ 
          title: "User left", 
          description: `${data.username} left the room` 
        });
      }
    });

    socket.on("user_typing", (data) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          data.isTyping 
            ? newSet.add(data.username) 
            : newSet.delete(data.username);
          return newSet;
        });
      }
    });
  }, [user?.id, toast, handleNewMessage, handleMessageConfirmed, handleMessageError]);

  // Connection management
  const connectSocket = useCallback(async () => {
    if (socketRef.current?.connected || !isAuthenticated || isUnmountingRef.current) {
      return;
    }

    console.log("🔌 Attempting to connect to Socket.io server...");
    setConnectionState('connecting');

    try {
      const wsTokenResponse = await api.auth.getWsToken();
      if (!wsTokenResponse.data.success || !wsTokenResponse.data.token) {
        throw new Error(`Failed to get WebSocket token: ${wsTokenResponse.data.message}`);
      }

      // Clean up existing connection
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      const socket = io(SOCKET_URL, {
        transports: ["websocket"],
        timeout: 10000,
        forceNew: true,
        reconnection: false,
        auth: { token: wsTokenResponse.data.token },
      });

      socketRef.current = socket;
      setupSocketListeners(socket);

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket && !socket.connected) {
          console.log("⏰ Connection timeout");
          socket.disconnect();
          setConnectionState('disconnected');
          if (!isUnmountingRef.current) {
            handleReconnection();
          }
        }
      }, 15000);

      socket.on('connect', () => clearTimeout(connectionTimeout));

    } catch (error) {
      console.error("💥 Failed to connect to socket:", error);
      setConnectionState('disconnected');
      setLastError(error instanceof Error ? error.message : 'Connection failed');
      
      toast({ 
        title: "Connection failed", 
        description: "Failed to connect to chat server", 
        variant: "destructive" 
      });
      
      if (!isUnmountingRef.current) {
        handleReconnection();
      }
    }
  }, [isAuthenticated, setupSocketListeners, toast]);

  // Reconnection logic
  const handleReconnection = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts || isUnmountingRef.current) {
      if (reconnectAttempts >= maxReconnectAttempts) {
        toast({
          title: "Connection failed",
          description: "Unable to reconnect after multiple attempts",
          variant: "destructive",
        });
      }
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated && !isUnmountingRef.current) {
        setReconnectAttempts(prev => prev + 1);
        connectSocket();
      }
    }, delay);
  }, [reconnectAttempts, isAuthenticated, connectSocket, toast]);

  // Cleanup
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up socket connection...");
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setConnectionState('disconnected');
    setJoinedRooms(new Set());
    setReconnectAttempts(0);
  }, []);

  // FIXED: Aligned sendMessage with proper typing
  const sendMessage = useCallback((data: SendMessageData) => {
    if (!socketRef.current?.connected) {
      toast({ 
        title: "Not connected", 
        description: "Please wait for connection to be established", 
        variant: "destructive" 
      });
      return;
    }

    if (!data.content.trim()) {
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // FIXED: Create properly typed optimistic message
    const optimisticMessage: Message = {
      id: tempId, // Use tempId as temporary ID
      tempId, // Keep tempId for tracking
      content: data.content.trim(),
      createdAt: new Date().toISOString(),
      userId: user?.id || '',
      username: user?.username || 'You',
      roomId: data.roomId,
      messageType: data.messageType || 'text',
      status: 'sending', // Aligned with type definition
    };

    console.log("🚀 Sending optimistic message:", tempId);
    
    // Add optimistic message
    setRealtimeMessages(prev => [...prev, optimisticMessage]);

    // Send to server
    socketRef.current.emit('send_message', { 
      ...data, 
      content: data.content.trim(),
      tempId 
    });

    // Auto-fail after timeout if no response
    setTimeout(() => {
      setRealtimeMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId && msg.status === 'sending'
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }, 30000); // 30 second timeout

  }, [user, toast]);

  const joinRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) {
      console.log("📝 Cannot join room, not connected:", roomId);
      return;
    }

    if (joinedRooms.has(roomId)) {
      console.log("🏠 Room already joined:", roomId);
      return;
    }

    socketRef.current.emit("join_room", { roomId });
    console.log(`🏠 Joining room: ${roomId}`);
  }, [joinedRooms]);

  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit("leave_room", { roomId });
    console.log(`🚪 Leaving room: ${roomId}`);
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
    console.log("🧹 Clearing realtime messages");
    setRealtimeMessages([]);
  }, []);

  // Connection management effects
  useEffect(() => {
    if (isAuthenticated && connectionState === 'disconnected') {
      connectSocket();
    } else if (!isAuthenticated && socketRef.current) {
      cleanup();
    }
  }, [isAuthenticated, connectionState, connectSocket, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  // Error timeout
  useEffect(() => {
    if (lastError) {
      const timer = setTimeout(() => setLastError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [lastError]);

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    lastError,
    reconnectAttempts,
    joinedRooms: Array.from(joinedRooms),
    realtimeMessages,
    typingUsers,
    connectSocket,
    sendMessage,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    clearMessages,
  };
};
