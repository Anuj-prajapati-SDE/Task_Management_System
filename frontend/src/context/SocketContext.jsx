import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { transports: ['websocket'] });
      socketRef.current.emit('join_room', user._id);

      socketRef.current.on('new_notification', (notification) => {
        toast(notification.message, { icon: '🔔', duration: 4000 });
        window.dispatchEvent(new CustomEvent('new_notification', { detail: notification }));
      });

      return () => socketRef.current?.disconnect();
    }
  }, [user]);

  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
