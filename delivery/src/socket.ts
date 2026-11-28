import { io, Socket } from 'socket.io-client'
import { API_BASE_URL } from './config'
import { getServerUrl } from './api'

let socket: Socket | null = null
let activeUrl: string | null = null

export function getSocket(customUrl?: string): Socket {
  const url = customUrl || API_BASE_URL

  if (!socket || activeUrl !== url) {
    if (socket) {
      socket.disconnect()
    }
    activeUrl = url
    socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    })
  }

  return socket
}

export async function initSocketWithSavedUrl(): Promise<Socket> {
  const url = await getServerUrl()
  return getSocket(url)
}
