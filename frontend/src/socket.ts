import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    // In dev, connects through Vite proxy (/socket.io); in prod, connects to current origin
    socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to real-time server:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason)
    })
  }

  return socket
}
