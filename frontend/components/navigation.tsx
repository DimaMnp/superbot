"use client"

import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { MessageCircle, User, LogOut, Train, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navigation() {
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <Link href="/" className="flex items-center gap-2 md:gap-3 font-semibold">
            <Train className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <div className="hidden sm:block">
              <div className="text-sm md:text-lg font-bold">Метроша</div>
            </div>
          </Link>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              Чат
            </Link>
            <Link 
              href="/profile" 
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
            >
              <User className="h-4 w-4" />
              Профиль
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {user && (
            <>
              <Link href='/profile' className="hidden sm:flex items-center gap-3 text-sm">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="font-medium">{user.first_name} {user.last_name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                </div>
              </Link>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <Link 
              href="/" 
              className="flex items-center gap-3 py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <MessageCircle className="h-4 w-4" />
              Чат
            </Link>
            <Link 
              href="/profile" 
              className="flex items-center gap-3 py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User className="h-4 w-4" />
              Профиль
            </Link>
            {user && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-3 py-2 text-sm">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}