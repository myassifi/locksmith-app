import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, AUTH_TOKEN_EVENT } from '@/integrations/api/client';

let socket: Socket | null = null;
let users = 0;
const url = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000');
function syncToken() {
  if (!socket) return;
  socket.disconnect();
  const token = api.getToken();
  socket.auth = { token };
  if (token && users) socket.connect();
}
function acquire() {
  users++;
  if (!socket) {
    socket = io(url || undefined, { autoConnect: false, auth: { token: api.getToken() }, reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 10000 });
    window.addEventListener(AUTH_TOKEN_EVENT, syncToken);
    if (api.getToken()) socket.connect();
  }
  return socket;
}
function release() {
  if (--users === 0) {
    socket?.disconnect();
    socket = null;
    window.removeEventListener(AUTH_TOKEN_EVENT, syncToken);
  }
}
export function useSocket(channel: string, callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    const connection = acquire();
    let connected = false;
    const handler = () => callbackRef.current();
    const reconnect = () => { if (connected) handler(); connected = true; };
    connection.on(channel, handler);
    connection.on('connect', reconnect);
    return () => { connection.off(channel, handler); connection.off('connect', reconnect); release(); };
  }, [channel]);
}
export function useInventorySocket(onUpdate: () => void) { useSocket('inventory:changed', onUpdate); }
export function useCustomersSocket(onUpdate: () => void) { useSocket('customers:changed', onUpdate); }
export function useJobsSocket(onUpdate: () => void) { useSocket('jobs:changed', onUpdate); }
