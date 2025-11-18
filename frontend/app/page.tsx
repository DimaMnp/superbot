"use client"

import { useAuth } from '@/context/auth-context'
import { AuthForm } from '@/components/auth-form'
import { ChatInterface } from '@/components/chat-interface'
import { Navigation } from '@/components/navigation'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()

  // Пока идёт восстановление сессии, показываем пустой экран чтобы не было мерцания формы входа
  if (loading) {
    return null
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto py-4 md:py-8 px-2 md:px-4">
        <div className="flex justify-center">
          <ChatInterface />
        </div>
      </main>
    </div>
  )
}