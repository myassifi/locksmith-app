import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function useInventorySocket(onUpdate: () => void) {
  useEffect(() => {
    const socket = getSocket();
    
    socket.on('inventory:updated', onUpdate);
    socket.on('inventory:created', onUpdate);
    socket.on('inventory:deleted', onUpdate);

    return () => {
      socket.off('inventory:updated', onUpdate);
      socket.off('inventory:created', onUpdate);
      socket.off('inventory:deleted', onUpdate);
    };
  }, [onUpdate]);
}

export function useCustomersSocket(onUpdate: () => void) {
  useEffect(() => {
    const socket = getSocket();
    
    socket.on('customer:updated', onUpdate);
    socket.on('customer:created', onUpdate);
    socket.on('customer:deleted', onUpdate);

    return () => {
      socket.off('customer:updated', onUpdate);
      socket.off('customer:created', onUpdate);
      socket.off('customer:deleted', onUpdate);
    };
  }, [onUpdate]);
}

export function useJobsSocket(onUpdate: () => void) {
  useEffect(() => {
    const socket = getSocket();
    
    socket.on('job:updated', onUpdate);
    socket.on('job:created', onUpdate);
    socket.on('job:deleted', onUpdate);

    return () => {
      socket.off('job:updated', onUpdate);
      socket.off('job:created', onUpdate);
      socket.off('job:deleted', onUpdate);
    };
  }, [onUpdate]);
}
