"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Send,
  Bot,
  User,
  Play,
  Pause,
  Database,
  Loader2,
  MessageCircle,
  Trash2,
  MoveDown,
  ArrowDown,
  Mic,
} from "lucide-react";
import { Message } from "@/types/chat";
import { useTTS } from "@/context/tts-context";
import { toast } from "@/lib/toaster";
import { useChat } from "@/context/chat-context";
import { useAuth } from "@/context/auth-context";
import { roles } from "@/lib/data/roles";
import SpeakingBubble from "./speaking-bubble";
import { ttsCache } from "@/lib/tts-cache";

interface ChatMessageProps {
  message: Message;
}

function ChatMessage({ message }: ChatMessageProps) {
  const { user } = useAuth();
  const {
    isPlaying,
    currentPlayingId,
    loadingAudioId,
    progress,
    playMessage,
    pauseMessage,
    resumeMessage,
  } = useTTS();

  const [isCached, setIsCached] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const isCurrentMessagePlaying = currentPlayingId === message.id && isPlaying;
  const isLoading = loadingAudioId === message.id;

  const handlePlayPause = async () => {
    try {
      if (isCurrentMessagePlaying) {
        pauseMessage();
      } else {
        const cached = await checkCache();
        setIsCached(cached);
        // show bubble when user triggers playback
        setShowBubble(true);
        // scroll to the bubble (after it renders)
        setTimeout(() => {
          try {
            bubbleRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          } catch (e) {
            /* ignore */
          }
        }, 80);

        if (currentPlayingId === message.id && !isPlaying) {
          resumeMessage();
        } else {
          await playMessage(message.id, message.content);
        }
      }
    } catch (error) {
      console.error("TTS error:", error);
      toast.error("Ошибка воспроизведения аудио");
    }
  };

  // hide bubble when playback ended or another message started
  useEffect(() => {
    // if (!isPlaying && currentPlayingId !== message.id) {
    //   // if nothing playing or other message playing, hide
    //   // hide only if not cached
    //   // keep visible if cached
    //   const cached = isCached;
    //   console.log("isCached", isCached);
    //   if (!cached) setShowBubble(false);
    // }

    if (
      currentPlayingId === message.id &&
      (isPlaying || loadingAudioId === message.id)
    ) {
      setShowBubble(true);
    }
  }, [isPlaying, currentPlayingId, loadingAudioId, message.id]);

  // on mount check cache for this message text and keep bubble if cached
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cached = await ttsCache.getCachedAudio(message.content);
        if (mounted && cached) {
          setIsCached(true);
          setShowBubble(true);
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [message.content]);

  const checkCache = async (): Promise<boolean> => {
    try {
      // Попытка использовать ttsService cache через контекст
      // Временно возвращаем false, так как useTTS не предоставляет прямой getCachedAudio
      return false;
    } catch (e) {
      return false;
    }
  };

  const getButtonIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    } else if (isCurrentMessagePlaying) {
      return <Pause className="h-4 w-4" />;
    } else {
      return <Play className="h-4 w-4" />;
    }
  };

  const getButtonTooltip = () => {
    if (isLoading) {
      return "Загрузка аудио...";
    } else if (isCurrentMessagePlaying) {
      return "Пауза";
    } else {
      return "Воспроизвести";
    }
  };

  const getButtonStyles = () => {
    if (isLoading) {
      return "bg-primary/50 text-white hover:bg-blue-600";
    } else if (isCurrentMessagePlaying) {
      return "bg-white text-gray-900 hover:bg-gray-100";
    } else {
      return "bg-primary text-white hover:bg-primary/80";
    }
  };

  return (
    <>
      <div
        className={`flex gap-3 flex-wrap ${
          message.sender === "user" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div className={`flex gap-3 w-full justify-start ${message.sender === "user" ? 'flex-row-reverse ' : 'flex-row'}`}>
          {message.sender === "user" ? (
            <div
              className={`flex items-center justify-center h-8 w-8 md:h-10 md:w-10 rounded-full flex-shrink-0 ${
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <User className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          ) : (
            <img
              src={
                (
                  roles[(user?.role as keyof typeof roles) ?? "student"]
                    ?.avatar || roles.student.avatar
                ).src
              }
              className="h-12 w-12"
              alt="Аватарка бота"
            />
          )}

          <div
            className={`max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 md:px-4 md:py-3 ${
              message.sender === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <div className="flex items-start gap-2 md:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <div
                  className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 md:gap-8 mt-2 md:mt-3 text-xs ${
                    message.sender === "user"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                  {message.sender === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className={`h-9 md:h-10 px-2 md:px-3 rounded-full transition-all duration-200 border-2 text-xs md:text-sm ${getButtonStyles()}`}
                          onClick={handlePlayPause}
                          disabled={message.content.length === 0 || isLoading}
                          title={getButtonTooltip()}
                        >
                          {getButtonIcon()}
                          <span className="ml-1 md:ml-2">Прослушать</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {message.sender === "assistant" && (
          <div className="mt-3 ml-15 w-full">
            {showBubble && (
              <div ref={bubbleRef} className="flex items-center">
                <SpeakingBubble
                  roleKey={(user?.role as keyof typeof roles) ?? "student"}
                  isPlaying={isCurrentMessagePlaying}
                  isLoading={isLoading}
                  progress={currentPlayingId === message.id ? progress : 0}
                  isPaused={currentPlayingId === message.id && !isPlaying}
                  size={200}
                  onToggle={async () => {
                    // Если уже играет данное сообщение — пауза
                    if (currentPlayingId === message.id && isPlaying) {
                      pauseMessage();
                      return;
                    }

                    // Если другое сообщение играет, остановим и запустим это
                    if (currentPlayingId && currentPlayingId !== message.id) {
                      // playMessage will cleanup and play
                      await playMessage(message.id, message.content);
                      return;
                    }

                    // Если это сообщение не играет, запустим (resume если есть audioRef)
                    if (currentPlayingId === message.id && !isPlaying) {
                      resumeMessage();
                      return;
                    }

                    // В остальных случаях — старт воспроизведения
                    await playMessage(message.id, message.content);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function ChatInterface() {
  const [inputMessage, setInputMessage] = useState("");
  const { user } = useAuth();
  const {
    messages,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    clearMessages,
  } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const [isRecognizing, setIsRecognizing] = useState(false)
  const pathname = usePathname()

  const scrollToBottom = (immediate = false, bottom = false) => {
    const doScroll = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      try {
        if (immediate) el.scrollTo({ top: el.scrollHeight });
        else el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } catch (e) {
        el.scrollTop = el.scrollHeight;
      }
    };

    setTimeout(doScroll, 60);
  };

  // Try scrolling multiple times until container height stabilizes (helps when images/videos change layout)
  const ensureScrollToBottom = (maxAttempts = 8, delay = 120) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let attempts = 0;
    let lastHeight = -1;

    const tick = () => {
      const h = el.scrollHeight;
      try {
        el.scrollTo({ top: h, behavior: "smooth" });
      } catch (e) {
        el.scrollTop = h;
      }

      attempts++;
      if (h !== lastHeight && attempts < maxAttempts) {
        lastHeight = h;
        setTimeout(tick, delay);
      }
    };

    tick();
  };

  useEffect(() => {
    ensureScrollToBottom();
  }, []);

  useEffect(() => {
    ensureScrollToBottom();
  }, [messages]);

  useEffect(() => {
    const t = setTimeout(() => ensureScrollToBottom(), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected) return;

    try {
      sendMessage(inputMessage);
      setInputMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Ошибка отправки сообщения");
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Recorder not supported in this browser')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Prefer formats supported by Sber: OPUS in OGG, then webm/opus, then webm
      const preferredMimes = [
        'audio/ogg;codecs=opus',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mpeg'
      ]

      let selectedMime: string | undefined
      for (const m of preferredMimes) {
        if ((window as any).MediaRecorder && (window as any).MediaRecorder.isTypeSupported && (window as any).MediaRecorder.isTypeSupported(m)) {
          selectedMime = m
          break
        }
      }

      const mr = selectedMime ? new MediaRecorder(stream, { mimeType: selectedMime }) : new MediaRecorder(stream)
      recordedChunksRef.current = []

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data)
      }

      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: recordedChunksRef.current[0] instanceof Blob ? (recordedChunksRef.current[0] as Blob).type : (selectedMime || 'audio/webm') })

        // Convert recorded blob to PCM16LE raw at 16kHz (Sber supports PCM_S16LE with or without WAV header)
        try {
          const arrayBuffer = await blob.arrayBuffer()

          setIsRecognizing(true)

          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const decoded = await audioCtx.decodeAudioData(arrayBuffer)

          const targetRate = 16000
          let resampled = decoded
          if (Math.abs(decoded.sampleRate - targetRate) > 1) {
            // resample using OfflineAudioContext
            const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, Math.ceil(decoded.duration * targetRate), targetRate)
            // create buffer source
            const bufferSource = offlineCtx.createBufferSource()
            // If decoded has multiple channels, downmix to mono by copying first channel into a new mono buffer
            if (decoded.numberOfChannels > 1) {
              const mono = offlineCtx.createBuffer(1, decoded.length, decoded.sampleRate)
              const out = mono.getChannelData(0)
              const chCount = decoded.numberOfChannels
              for (let i = 0; i < decoded.length; i++) {
                let sum = 0
                for (let c = 0; c < chCount; c++) sum += decoded.getChannelData(c)[i]
                out[i] = sum / chCount
              }
              bufferSource.buffer = mono
            } else {
              // single channel
              const tmp = offlineCtx.createBuffer(1, decoded.length, decoded.sampleRate)
              tmp.getChannelData(0).set(decoded.getChannelData(0))
              bufferSource.buffer = tmp
            }

            bufferSource.connect(offlineCtx.destination)
            bufferSource.start(0)
            const rendered = await offlineCtx.startRendering()
            resampled = rendered
          } else {
            // ensure mono
            if (decoded.numberOfChannels > 1) {
              // mixdown
              const tmpCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, decoded.length, decoded.sampleRate)
              const bs = tmpCtx.createBufferSource()
              const mono = tmpCtx.createBuffer(1, decoded.length, decoded.sampleRate)
              const out = mono.getChannelData(0)
              const chCount = decoded.numberOfChannels
              for (let i = 0; i < decoded.length; i++) {
                let sum = 0
                for (let c = 0; c < chCount; c++) sum += decoded.getChannelData(c)[i]
                out[i] = sum / chCount
              }
              bs.buffer = mono
              bs.connect(tmpCtx.destination)
              bs.start(0)
              resampled = await tmpCtx.startRendering()
            }
          }

          // encode PCM16LE raw
          const channelData = resampled.getChannelData(0)
          const len = channelData.length
          const bufferOut = new ArrayBuffer(len * 2)
          const view = new DataView(bufferOut)
          let offset = 0
          for (let i = 0; i < len; i++) {
            let s = Math.max(-1, Math.min(1, channelData[i]))
            const int16 = s < 0 ? s * 0x8000 : s * 0x7fff
            view.setInt16(offset, int16, true)
            offset += 2
          }

          // send raw PCM16LE with sample rate header in Content-Type
          const resp = await fetch('/api/tts/recognize', {
            method: 'POST',
            headers: {
              'Content-Type': `audio/x-pcm;bit=16;rate=${targetRate}`,
            },
            body: bufferOut
          })

          setIsRecognizing(false)

          if (!resp.ok) {
            const txt = await resp.text()
            console.error('Recognition failed', resp.status, txt)
            toast.error('Ошибка распознавания')
            return
          }

          const data = await resp.json()
          // If Sber returns format like { result: ["..."] } then join results
          let transcript = ''
          try {
            if (data && typeof data === 'object') {
              if (Array.isArray(data.result)) {
                transcript = data.result.filter(Boolean).join(' ')
              } else if (Array.isArray(data.results) && data.results.every((r: any) => typeof r === 'string')) {
                transcript = data.results.filter(Boolean).join(' ')
              } else if (Array.isArray(data.results) && data.results[0]?.alternatives) {
                transcript = data.results[0].alternatives[0]?.transcript || ''
              } else if (data.alternatives && Array.isArray(data.alternatives)) {
                transcript = data.alternatives[0]?.transcript || ''
              } else if (data.text) {
                transcript = data.text
              } else if (data.hypotheses && Array.isArray(data.hypotheses)) {
                transcript = data.hypotheses[0]?.utterance || ''
              } else {
                transcript = ''
              }
            }
          } catch (e) {
            transcript = ''
          }

          if (transcript) setInputMessage((prev) => (prev ? prev + ' ' + transcript : transcript))
        } catch (err) {
          console.error('Recognition error', err)
          toast.error('Ошибка распознавания')
          setIsRecognizing(false)
        }
      }

      mediaRecorderRef.current = mr
      mr.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Recorder error', err)
      toast.error('Не удалось начать запись')
    }
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      mr.stop()
      // stop tracks
      try { (mr as any).stream?.getTracks?.().forEach((t: any) => t.stop()) } catch (e) {}
    }
    setIsRecording(false)
  }

  // Stop recording if user navigates to another page
  useEffect(() => {
    if (isRecording) {
      try {
        stopRecording()
      } catch (e) {}
    }
    // we intentionally only watch pathname
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Ensure recorder is stopped on unmount
  useEffect(() => {
    return () => {
      try { stopRecording() } catch (e) {}
    }
  }, [])

  return (
    <Card className="w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col border shadow-lg mx-2 md:mx-auto">
      <CardHeader className="border-b p-3 md:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 md:gap-3 text-lg md:text-xl">
            <MessageCircle className="h-5 w-5 md:h-7 md:w-7 text-primary" />
            <div>
              <div className="font-bold text-sm md:text-base">Метроша</div>
              <div className="text-xs md:text-sm font-normal text-muted-foreground hidden sm:block">
                Корпоративный университет
              </div>
            </div>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={clearMessages}
              className="flex items-center gap-1 md:gap-2 h-8 md:h-9"
              title="Очистить историю"
            >
              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">
                Очистить
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => ensureScrollToBottom()}
              className="flex items-center gap-1 md:gap-2 h-8 md:h-9"
              title="Прокрутить вниз"
            >
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline text-xs md:text-sm">Вниз</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col h-4/5">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6"
        >
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* {error && (
            <div className="flex justify-center">
              <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-xs md:text-sm">
                {error}
              </div>
            </div>
          )} */}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="p-3 md:p-4 border-t bg-muted/30"
        >
          <div className="flex gap-4">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isConnected
                  ? "Введите ваше сообщение..."
                  : "Вызываем метрошу..."
              }
              className="flex-1 h-10 md:h-12 text-sm md:text-base border-2 focus:border-primary transition-colors"
              disabled={!isConnected || isConnecting}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={'outline'}
                onClick={() => {
                  if (isRecording) stopRecording(); else startRecording();
                }}
                className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center relative"
                title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
                aria-pressed={isRecording}
              >
                {isRecording ? (
                  <span className="block w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
                {isRecording && <span className="sr-only">Recording</span>}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-10 w-13 md:h-12 px-3 md:px-6 bg-primary hover:bg-primary/90 transition-all duration-200"
                disabled={!inputMessage.trim() || !isConnected || isConnecting}
              >
                {isRecognizing ? (
                  <Loader2 className="h-5 w-5 md:h-5 md:w-5 animate-spin" />
                ) : isConnecting ? (
                  <Loader2 className="h-5 w-5 md:h-5 md:w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 md:h-5 md:w-5" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
