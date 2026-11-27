import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    })
  }
  return socket
}

export function joinPartnerRoom(token: string) {
  const s = getSocket()
  if (token) {
    s.emit('join_partner', { token })
  }
}
