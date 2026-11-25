import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

const SOCKET_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function getSocket(): Socket {
  if (!socket) {
    // In production with VITE_API_URL, connects directly to cloud server.
    // In dev, connects through Vite proxy (/socket.io).
    socket = io(SOCKET_URL || undefined, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to real-time server:', socket?.id)
    })

    socket.on('disconnect', (reason: any) => {
      console.log('[Socket.IO] Disconnected:', reason)
    })
  }

  return socket
}
