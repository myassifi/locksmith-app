import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000');
    const options = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    };

    socket = SOCKET_URL ? io(SOCKET_URL, options) : io(options);
  }
  return socket;
}

export function useSocket(channel: string, callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const socket = getSocket();

    const handler = () => {
      callbackRef.current();
    };

    socket.on(channel, handler);

    return () => {
      socket.off(channel, handler);
    };
  }, [channel]);
}

export function useInventorySocket(onUpdate: () => void) {
  useSocket('inventory:changed', onUpdate);
}

export function useCustomersSocket(onUpdate: () => void) {
  useSocket('customers:changed', onUpdate);
}

export function useJobsSocket(onUpdate: () => void) {
  useSocket('jobs:changed', onUpdate);
}
