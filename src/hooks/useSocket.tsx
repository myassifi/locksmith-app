import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
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
