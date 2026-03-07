"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from "@/components/navigation";
import { MailInterface } from "@/components/mail-interface";
import { useAuth } from '@/context/auth-context'

export default function MailPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // render nothing until auth state known
  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navigation />
      <main className="flex-1 bg-background overflow-hidden">
        <MailInterface />
      </main>
    </div>
  );
}
