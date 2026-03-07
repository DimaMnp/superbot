import { Navigation } from "@/components/navigation";
import { MailInterface } from "@/components/mail-interface";
import { useAuth } from '@/context/auth-context'
import { redirect } from 'next/navigation'

export default function MailPage() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    redirect('/');
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navigation />
      <main className="flex-1 bg-background overflow-hidden">
        <MailInterface />
      </main>
    </div>
  );
}
