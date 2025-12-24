"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Send,
  Loader2,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/lib/toaster";

interface MailMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

export function MailInterface() {
  const { user, token } = useAuth();
  const [mails, setMails] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showComposeForm, setShowComposeForm] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [mailContent, setMailContent] = useState("");

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
        throw new Error("Failed to send mail");
      }

      toast.success("Письмо отправлено успешно");
      setRecipientName("");
      setMailContent("");
      setShowComposeForm(false);
      fetchMails();
    } catch (error) {
      console.error("Error sending mail:", error);
      toast.error("Не удалось отправить письмо");
    } finally {
      setSending(false);
    }
  };

  const isTeacher = user?.role === "teacher";

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <Card className="border shadow-lg">
        <CardHeader className="border-b p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Mail className="h-7 w-7 text-primary" />
              <div>
                <div className="font-bold">Почта</div>
                <div className="text-sm font-normal text-muted-foreground">
                  Школа 2083
                </div>
              </div>
            </CardTitle>

            {isTeacher && (
              <Button
                onClick={() => setShowComposeForm(!showComposeForm)}
                className="flex items-center gap-2"
              >
                {showComposeForm ? (
                  <>
                    <X className="h-4 w-4" />
                    Закрыть
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Новое письмо
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Compose form for teachers */}
          {isTeacher && showComposeForm && (
            <div className="mb-8 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-4">Написать письмо о замене</h3>
              <form onSubmit={handleSendMail} className="space-y-4">
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Содержание письма</label>
                  <textarea
                    placeholder="Введите информацию о замене..."
                    value={mailContent}
                    onChange={(e) => setMailContent(e.target.value)}
                    className="w-full min-h-32 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
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
          )}

          {/* Mails list */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : mails.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground mb-2">Нет писем</p>
              <p className="text-sm text-muted-foreground">
                {isTeacher
                  ? "Пока нет письма о заменах. Отправьте первое письмо!"
                  : "Вы не получили ещё ни одного письма"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mails.map((mail) => (
                <div
                  key={mail.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">
                        От: {mail.sender || "Администратор"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(mail.timestamp).toLocaleString("ru-RU")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{mail.text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
