"use client"

import { useAuth } from '@/context/auth-context'
import { Navigation } from '@/components/navigation'
import { ProfileForm } from '@/components/profile-form'
import { redirect } from 'next/navigation'

export default function ProfilePage() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto py-4 md:py-8 px-2 md:px-4">
        <ProfileForm />
      </main>
    </div>
  )
}