export interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
}

export interface ChatState {
  messages: Message[]
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  hasHistory: boolean
}