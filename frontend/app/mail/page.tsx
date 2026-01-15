import { Navigation } from "@/components/navigation";
import { MailInterface } from "@/components/mail-interface";

export default function MailPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navigation />
      <main className="flex-1 bg-background overflow-hidden">
        <MailInterface />
      </main>
    </div>
  );
}
