import { Navigation } from "@/components/navigation";
import { MailInterface } from "@/components/mail-interface";

export default function MailPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1 flex items-center justify-center bg-background py-8">
        <MailInterface />
      </main>
    </div>
  );
}
