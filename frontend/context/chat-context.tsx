"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Message, ChatState } from '@/types/chat'
import { Conversation, ChatMessage as ApiChatMessage } from '@/types/api'
import { websocketService } from '@/lib/websocket-service'
import { useAuth } from '@/context/auth-context'
import { apiService } from '@/lib/api'

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void
  connect: () => Promise<void>
  disconnect: () => void
  clearMessages: () => void
  clearConversation: () => Promise<void>
  retryConnection: () => Promise<void>
  loadConversation: () => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated } = useAuth()
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isConnected: false,
    isConnecting: false,
    error: null,
    hasHistory: false,
  })

  // Загрузка истории
  const loadConversation = useCallback(async (): Promise<void> => {
    if (!token) return

    try {
      console.log('📖 Loading conversation history...')
      const conversation = await apiService.getConversation(token)
      
      // Конвертируем сообщения из API в наш формат
      const messages: Message[] = conversation.messages.map((msg: ApiChatMessage, index: number) => ({
        id: `hist_${index}_${Date.now()}`,
        content: msg.content,
        sender: msg.role === 'user' ? 'user' : 'assistant',
        timestamp: new Date(),
        status: 'sent'
      }))

      setChatState(prev => ({
        ...prev,
        messages,
        hasHistory: messages.length > 0
      }))
      
      console.log('✅ Conversation history loaded:', messages.length, 'messages')
      await connect();
    } catch (error: any) {
      console.log('ℹ️ No conversation history found or error loading:', error.message)
      // Если истории нет - это нормально, но все равно пытаемся подключиться
      try {
        await connect();
      } catch (connectError) {
        console.error('❌ Failed to connect after loading conversation:', connectError)
      }
    }
  }, [token])

  // Очистка истории
  // Синхронное обновление состояния: оставляем только последнее сообщение
  const syncClearState = useCallback(() => {
    setChatState(prev => {
      const firstMessage = prev.messages[0]
      const clearedMessages = firstMessage ? [firstMessage] : []
      return {
        ...prev,
        messages: clearedMessages,
        hasHistory: false,
      }
    })
  }, [])

  // Асинхронно очищаем историю на сервере
  const doRemoteClearConversation = useCallback(async (): Promise<void> => {
    if (!token) return
    try {
      console.log('🗑️ Clearing conversation history (remote)...')
      await apiService.clearConversation(token)
      console.log('✅ Conversation history cleared (remote)')
    } catch (error) {
      console.error('❌ Error clearing conversation (remote):', error)
      // Обновляем ошибку в стейте, но не бросаем, чтобы не нарушать синхронные вызовы
      setChatState(prev => ({ ...prev, error: 'Ошибка очистки истории' }))
      throw error
    }
  }, [token])

  // Полная очистка с ожиданием удаления на сервере
  const clearConversation = useCallback(async (): Promise<void> => {
    // сначала синхронно обновляем UI
    syncClearState()
    // затем выполняем удаление на сервере и возвращаем промис для вызывающего
    await doRemoteClearConversation()
  }, [syncClearState, doRemoteClearConversation])

  const addMessage = useCallback((message: Message) => {
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      error: null,
      hasHistory: true
    }))
  }, [])

  const updateMessageStatus = useCallback((messageId: string, status: Message['status']) => {
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
    }))
  }, [])

  const connect = useCallback(async (): Promise<void> => {
    if (!token || !isAuthenticated) {
      throw new Error('User not authenticated')
    }

    setChatState(prev => {
      if (prev.isConnected || prev.isConnecting) {
        console.log('🔄 Connection already in progress or established')
        return prev
      }
      return { ...prev, isConnecting: true, error: null }
    })

    console.log('🔌 Starting WebSocket connection...')

    try {
      await websocketService.connect(token)
      console.log('✅ WebSocket connected successfully')
      setChatState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false 
      }))
    } catch (error: any) {
      console.error('❌ WebSocket connection failed:', error)
      
      let errorMessage = 'Не удалось подключиться к ассистенту'
      if (error.message?.includes('401')) {
        errorMessage = 'Ошибка авторизации'
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Таймаут подключения. Проверьте соединение с интернетом.'
      }
      
      setChatState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: errorMessage
      }))
      throw error
    }
  }, [token, isAuthenticated])

  const disconnect = useCallback((): void => {
    console.log('🔌 Disconnecting WebSocket...')
    websocketService.disconnect()
    setChatState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }))
  }, [])

  const sendMessage = useCallback((content: string): void => {
    if (!chatState.isConnected) {
      throw new Error('WebSocket is not connected')
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    }

    addMessage(userMessage)

    try {
      websocketService.sendMessage(content)
      updateMessageStatus(userMessage.id, 'sent')
    } catch (error) {
      console.error('Error sending message:', error)
      updateMessageStatus(userMessage.id, 'error')
      setChatState(prev => ({ ...prev, error: 'Ошибка отправки сообщения' }))
    }
  }, [chatState.isConnected, addMessage, updateMessageStatus])

  // Синхронно очищает локальные сообщения и запускает удаление на сервере в фоне
  const clearMessages = useCallback((): void => {
    // Обновляем UI немедленно (оставляем только последнее сообщение, как на бэкенде)
    syncClearState()

    // Запускаем удаление на сервере в фоне — не ждём его в обработчике событий
    if (token) {
      doRemoteClearConversation().catch(() => {
        // Ошибка уже обработана внутри doRemoteClearConversation
      })
    }
  }, [syncClearState, doRemoteClearConversation, token])

  const retryConnection = useCallback(async (): Promise<void> => {
    console.log('🔄 Manual reconnection attempt')
    await connect()
  }, [connect])

  // Подписка на события WebSocket
  useEffect(() => {
    const handleMessage = (message: Message) => {
      addMessage(message)
    }

    const handleConnectionChange = (connected: boolean) => {
      console.log(`🔌 WebSocket connection changed: ${connected}`)
      setChatState(prev => ({
        ...prev,
        isConnected: connected,
        isConnecting: false,
      }))
    }

    const handleError = (error: string) => {
      console.error('❌ WebSocket error:', error)
      setChatState(prev => ({ 
        ...prev, 
        error,
        isConnecting: false 
      }))
    }

    websocketService.onMessage(handleMessage)
    websocketService.onConnectionChange(handleConnectionChange)
    websocketService.onError(handleError)

    return () => {
      websocketService.removeMessageHandler(handleMessage)
      websocketService.removeConnectionHandler(handleConnectionChange)
      websocketService.removeErrorHandler(handleError)
      disconnect()
    }
  }, [addMessage, disconnect])

  // Загрузка истории при аутентификации
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('👤 User authenticated, loading conversation...')
      loadConversation()
    } else {
      // При выходе очищаем сообщения
      setChatState({
        messages: [],
        isConnected: false,
        isConnecting: false,
        error: null,
        hasHistory: false,
      })
    }
  }, [isAuthenticated, token, loadConversation])

  return (
    <ChatContext.Provider value={{
      ...chatState,
      sendMessage,
      connect,
      disconnect,
      clearMessages,
      clearConversation,
      retryConnection,
      loadConversation,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}