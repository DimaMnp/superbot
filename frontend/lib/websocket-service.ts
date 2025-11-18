import { Message } from "@/types/chat";

class WebSocketService {
  private socket: WebSocket | null = null;
  private currentToken: string | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private errorHandlers: ((error: string) => void)[] = [];

  async connect(token: string): Promise<void> {
    // Quick retry strategy: increase timeout and retry a few times to avoid false timeouts
    const maxAttempts = 3
    const timeoutMs = 3000

    // If already connected with same token, nothing to do
    if (this.socket?.readyState === WebSocket.OPEN && this.currentToken === token) {
      return
    }

    // If there is an existing socket (different token or not open), close it first and wait
    if (this.socket) {
      try {
        await this.waitForSocketClose(1000)
      } catch (err) {
        try {
          this.socket.close()
        } catch (_e) {}
      }
      this.socket = null
      this.currentToken = null
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    if (!baseUrl) {
      throw new Error('API base URL not configured')
    }

    const wsUrl = baseUrl.replace(/^https?:\/\//, 'wss://') + '/ai/'
    const url = `${wsUrl}?Authorization=${encodeURIComponent(token)}`

    console.log('🔌 Connecting to WebSocket...')

    // helper to open a socket once and wait for open or fail
    const openOnce = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        try {
          const ws = new WebSocket(url)

          let connectionTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
            connectionTimer = null
            try {
              ws.close()
            } catch (_e) {}
            const err = new Error('Connection timeout')
            this.notifyErrorHandlers(err.message)
            reject(err)
          }, timeoutMs)

          const cleanup = () => {
            if (connectionTimer) {
              clearTimeout(connectionTimer)
              connectionTimer = null
            }
          }

          ws.onopen = () => {
            cleanup()
            // attach socket and handlers
            this.socket = ws
            this.currentToken = token
            console.log('✅ WebSocket connected successfully')
            this.notifyConnectionHandlers(true)
            resolve()
          }

          ws.onmessage = (event) => {
            const assistantMessage: Message = {
              id: `ai_${Date.now()}`,
              content: event.data,
              sender: 'assistant',
              timestamp: new Date(),
              status: 'sent',
            }
            this.notifyMessageHandlers(assistantMessage)
          }

          ws.onerror = (event) => {
            cleanup()
            const errMsg = (event && (event as any).message) || 'WebSocket connection error'
            this.notifyErrorHandlers(errMsg)
            try {
              ws.close()
            } catch (_e) {}
            reject(new Error(errMsg))
          }

          ws.onclose = () => {
            cleanup()
            console.log('🔌 WebSocket disconnected')
            this.notifyConnectionHandlers(false)
            if (this.socket === ws) {
              this.currentToken = null
              this.socket = null
            }
          }
        } catch (error) {
          this.notifyErrorHandlers((error as Error)?.message || String(error))
          reject(error)
        }
      })
    }

    // attempt loop with simple backoff + jitter
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await openOnce()
        return
      } catch (err: any) {
        // if authorization error, don't retry
        const msg = err?.message || String(err)
        if (msg.includes('401') || msg.toLowerCase().includes('unauthoriz')) {
          throw err
        }

        this.notifyErrorHandlers(msg)

        if (attempt === maxAttempts) {
          throw err
        }

        // backoff with jitter
        const baseDelay = 500 * Math.pow(2, attempt - 1)
        const jitter = Math.floor(Math.random() * 300)
        const delay = Math.min(30000, baseDelay + jitter)
        await new Promise(r => setTimeout(r, delay))
        console.log(`🔁 Retrying WebSocket connect (attempt ${attempt + 1}) after ${delay}ms`)
      }
    }
  }

  private waitForSocketClose(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        resolve();
        return;
      }

      if (
        this.socket.readyState === WebSocket.CLOSED ||
        this.socket.readyState === WebSocket.CLOSING
      ) {
        resolve();
        return;
      }

      const onClose = () => {
        cleanup();
        resolve();
      };

      const onError = (ev: any) => {
        cleanup();
        // still resolve so connect can continue
        resolve();
      };

      const cleanup = () => {
        try {
          if (this.socket) {
            this.socket.removeEventListener("close", onClose);
            this.socket.removeEventListener("error", onError);
          }
        } catch (_e) {}
        if (timer) clearTimeout(timer);
      };

      try {
        this.socket.addEventListener("close", onClose);
        this.socket.addEventListener("error", onError);
      } catch (_e) {}

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timeout waiting for socket to close"));
      }, timeoutMs);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  sendMessage(content: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(content);
    } else {
      throw new Error("WebSocket is not connected");
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  onMessage(handler: (message: Message) => void): void {
    this.messageHandlers.push(handler);
  }

  onConnectionChange(handler: (connected: boolean) => void): void {
    this.connectionHandlers.push(handler);
  }

  onError(handler: (error: string) => void): void {
    this.errorHandlers.push(handler);
  }

  private notifyMessageHandlers(message: Message): void {
    this.messageHandlers.forEach((handler) => handler(message));
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => handler(connected));
  }

  private notifyErrorHandlers(error: string): void {
    this.errorHandlers.forEach((handler) => handler(error));
  }

  removeMessageHandler(handler: (message: Message) => void): void {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
  }

  removeConnectionHandler(handler: (connected: boolean) => void): void {
    this.connectionHandlers = this.connectionHandlers.filter(
      (h) => h !== handler
    );
  }

  removeErrorHandler(handler: (error: string) => void): void {
    this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
  }
}

export const websocketService = new WebSocketService();
