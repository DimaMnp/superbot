"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Send,
  Loader2,
  AlertCircle,
  PenSquare,
} from "lucide-react";
import { toast } from "@/lib/toaster";

interface MailMessage {
  id: string;
  text: string;
}

export function MailInterface() {
  const { user, token } = useAuth();
  const [mails, setMails] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showComposeForm, setShowComposeForm] = useState(false);
  const [selectedMail, setSelectedMail] = useState<MailMessage | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [mailContent, setMailContent] = useState("");

  const isTeacher = user?.role === "teacher";

  // Fetch mails on component mount
  useEffect(() => {
    if (token) {
      fetchMails();
    }
  }, [token]);

  const fetchMails = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch("/api/mail/get", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch mails");
      }

      const data = await response.json();
      setMails(data.mails || []);
    } catch (error) {
      console.error("Error fetching mails:", error);
      toast.error("Не удалось загрузить письма");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientName.trim() || !mailContent.trim()) {
      toast.error("Заполните все поля");
      return;
    }

    if (!token) {
      toast.error("Нет авторизации");
      return;
    }

    try {
      setSending(true);
      const response = await fetch("/api/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          send_to: recipientName,
          text: mailContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.detail || "Не удалось отправить письмо";
        throw new Error(errorMessage);
      }

      toast.success("Письмо отправлено успешно");
      setRecipientName("");
      setMailContent("");
      setShowComposeForm(false);
      setSelectedMail(null);
      fetchMails();
    } catch (error) {
      console.error("Error sending mail:", error);
      const errorMessage = error instanceof Error ? error.message : "Не удалось отправить письмо";
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleMailClick = (mail: MailMessage) => {
    setSelectedMail(mail);
    setShowComposeForm(false);
  };

  const handleComposeClick = () => {
    setShowComposeForm(true);
    setSelectedMail(null);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Левая панель */}
      <div className="w-64 border-r bg-muted/30 flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          {isTeacher && (
            <Button
              onClick={handleComposeClick}
              className="w-full rounded-lg flex items-center gap-2"
            >
              <PenSquare className="h-4 w-4" />
              написать письмо
            </Button>
          )}
        </div>
        <div className="p-4">
          <div className="text-sm font-medium mb-2">входящие:</div>
        </div>
      </div>

      {/* Средняя панель - список писем */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="text-sm font-medium">Список писем</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : mails.length === 0 ? (
            <div className="py-12 text-center px-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Нет писем
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {mails.map((mail) => (
                <div
                  key={mail.id}
                  onClick={() => handleMailClick(mail)}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedMail?.id === mail.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="text-sm line-clamp-3 text-muted-foreground">
                    {mail.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Правая панель - просмотр/написание */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showComposeForm ? (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <h2 className="text-lg font-semibold mb-4">Написать письмо</h2>
            <form onSubmit={handleSendMail} className="flex-1 flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Кому (имя ученика или класс)
                </label>
                <Input
                  type="text"
                  placeholder="Например: Иван Петров или 10А"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                />
              </div>

              <div className="flex-1 flex flex-col space-y-2">
                <label className="text-sm font-medium">Содержание письма</label>
                <textarea
                  placeholder="Введите текст письма..."
                  value={mailContent}
                  onChange={(e) => setMailContent(e.target.value)}
                  className="flex-1 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Отправить письмо
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : selectedMail ? (
          <div className="flex-1 flex flex-col p-6">
            <div className="flex-1 overflow-y-auto">
              <div className="whitespace-pre-wrap text-sm">
                {selectedMail.text}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {isTeacher
                  ? "Выберите письмо для просмотра или напишите новое"
                  : "Выберите письмо для просмотра"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
