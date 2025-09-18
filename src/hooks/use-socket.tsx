"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as React from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import api from "@/lib/api";



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
  const [isShutdown, setIsShutdown] = useState(false);

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
      console.log("✅ Transport connected to Socket.io server");
      // Don't set as connected yet, wait for authentication
      setReconnectAttempts(0);
    });

    socket.on("connected", (data) => {
      console.log("🎯 Socket.io authentication successful:", data);
      setConnectionState('connected'); // Now we are fully connected and authenticated
      // Connection status now shown in header instead of toast
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from Socket.io server:", reason);
      setConnectionState('disconnected');
      setJoinedRooms(new Set());
      
      if (reason !== "io client disconnect" && !isUnmountingRef.current) {
        setReconnectAttempts(prev => {
          const newAttempts = prev + 1;
          handleReconnection(newAttempts);
          return newAttempts;
        });
      }
    });

    socket.on("error", (data) => {
      console.error("💥 Socket.io error:", data);
      setLastError(data.message || 'Socket error occurred');
      setConnectionState('disconnected');
      // Don't trigger reconnection here - disconnect event will handle it
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
      console.log("👋 User joined:", data.username);
      // Removed toast notification for cleaner UX
    });

    socket.on("user_left", (data) => {
      console.log("👋 User left:", data.username);
      // Removed toast notification for cleaner UX
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

  // Connection management
  const connectSocket = useCallback(async () => {
    console.log("🔌 connectSocket called:", { 
      connected: socketRef.current?.connected, 
      isAuthenticated, 
      unmounting: isUnmountingRef.current, 
      connectionState, 
      isShutdown 
    });
    
    if (socketRef.current?.connected || !isAuthenticated || isUnmountingRef.current || connectionState === 'connecting' || isShutdown) {
      console.log("🔌 Skipping connection - already connected/connecting, not authenticated, or shutdown");
      return;
    }

    console.log("🔌 Attempting to connect to Socket.io server...");
    setConnectionState('connecting');

    try {
      console.log("🎫 Getting WebSocket token...");
      const wsTokenResponse = await api.auth.getWsToken();
      if (!wsTokenResponse.data.success || !wsTokenResponse.data.token) {
        throw new Error(`Failed to get WebSocket token: ${wsTokenResponse.data.message}`);
      }
      console.log("✅ WebSocket token obtained successfully");

      // Clean up existing connection
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      const socketOptions = {
        path: "/socket/",
        transports: ["websocket"],
        timeout: 10000,
        forceNew: true,
        reconnection: false,
        auth: { token: wsTokenResponse.data.token },
      };

      const wssUrl = process.env.NEXT_PUBLIC_WSS_URL;
      const socket = io(wssUrl, socketOptions);

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
      
      // Check if it's a 401 error (token expired)
      if (error instanceof Error && error.message.includes('401')) {
        console.log("🔄 Token expired, attempting refresh...");
        // The api client will handle token refresh automatically
      }
      
      if (!isUnmountingRef.current) {
        handleReconnection();
      }
    }
  }, [isAuthenticated, setupSocketListeners, isShutdown]);

  // Reconnection logic
  const handleReconnection = useCallback((currentAttempt?: number) => {
    const attempts = currentAttempt ?? reconnectAttempts;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (attempts >= maxReconnectAttempts || isUnmountingRef.current || connectionState === 'connecting' || isShutdown) {
      if (attempts >= maxReconnectAttempts && !isShutdown) {
        console.log("❌ Max reconnection attempts reached, shutting down");
        setIsShutdown(true);
        cleanup();
        
        const retryAction = () => {
          setIsShutdown(false);
          setReconnectAttempts(0);
          connectSocket();
        };

        toast({
          title: "Connection Failed",
          description: "Unable to connect to chat server. Click to retry.",
          variant: "destructive",
          action: <ToastAction altText="Retry Connection" onClick={retryAction}>Retry</ToastAction>
        });
      }
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${attempts + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated && !isUnmountingRef.current && connectionState !== 'connecting' && !isShutdown) {
        connectSocket();
      }
    }, delay);
  }, [reconnectAttempts, isAuthenticated, connectionState, connectSocket, toast, isShutdown, cleanup]);

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
    
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      content: data.content.trim(),
      createdAt: new Date().toISOString(),
      userId: user?.id || '',
      username: user?.username || 'You',
      roomId: data.roomId,
      messageType: data.messageType || 'text',
      status: 'sending',
    };

    console.log("🚀 Sending optimistic message:", tempId);
    
    setRealtimeMessages(prev => [...prev, optimisticMessage]);

    socketRef.current.emit('send_message', { 
      ...data, 
      content: data.content.trim(),
      tempId 
    });

    setTimeout(() => {
      setRealtimeMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId && msg.status === 'sending'
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }, 30000);

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
  }, [joinedRooms]);

  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("leave_room", { roomId });
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

  // Connection management effects - Auto-connect after authentication
  useEffect(() => {
    console.log("🔌 Connection effect triggered:", { 
      isAuthenticated, 
      connectionState, 
      connected: socketRef.current?.connected, 
      isShutdown 
    });
    
    // Reset unmounting flag when effect runs
    isUnmountingRef.current = false;
    
    if (isAuthenticated && connectionState === 'disconnected' && !socketRef.current?.connected && !isShutdown) {
      console.log("🔌 Auth state changed, auto-connecting socket...");
      // Small delay to ensure cookies are set and avoid multiple calls
      const timer = setTimeout(() => {
        if (isAuthenticated && connectionState === 'disconnected' && !socketRef.current?.connected && !isUnmountingRef.current) {
          connectSocket();
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (!isAuthenticated && socketRef.current) {
      console.log("🔌 Auth lost, cleaning up socket...");
      cleanup();
    }
  }, [isAuthenticated, isShutdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🔌 Socket hook unmounting...");
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
