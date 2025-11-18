import { TokenResponse } from '@/types/tts'
import { ttsCache } from './tts-cache'

class TTSService {
  private token: string | null = null
  private expiresAt: number | null = null
  private renewPromise: Promise<string> | null = null
  private tokenCheckInterval: NodeJS.Timeout | null = null

  async getToken(forceRefresh = false): Promise<string> {
    // Если принудительное обновление или токен недействителен
    if (forceRefresh || !this.isTokenValid()) {
      console.log('🔄 Token refresh required')
      return await this.refreshToken()
    }

    // Если уже идет процесс обновления, ждем его
    if (this.renewPromise) {
      return this.renewPromise
    }

    return this.token!
  }

  private isTokenValid(): boolean {
    if (!this.token || !this.expiresAt) {
      return false
    }

    // Добавляем запас в 2 минуты до истечения срока
    const now = Date.now()
    const bufferTime = 2 * 60 * 1000 // 2 минуты в миллисекундах
    
    return now < (this.expiresAt / 1000 - bufferTime)
  }

  private async refreshToken(): Promise<string> {
    // Если уже идет обновление, ждем его
    if (this.renewPromise) {
      return this.renewPromise
    }

    this.renewPromise = this.fetchNewToken()
    try {
      this.token = await this.renewPromise
      console.log('✅ Token refreshed successfully')
      return this.token
    } finally {
      this.renewPromise = null
    }
  }

  private async fetchNewToken(): Promise<string> {
    console.log('🔄 Fetching new token from API...')
    
    const response = await fetch('/api/tts/token', {
      method: 'POST'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Token request failed:', response.status, errorText)
      throw new Error(`Token request failed: ${response.status} ${response.statusText}`)
    }

    const data: TokenResponse = await response.json()
    
    // expires_at уже в секундах, конвертируем в миллисекунды
    this.expiresAt = data.expires_at * 1000
    this.token = data.access_token

    console.log('📝 Token expires at:', new Date(this.expiresAt).toLocaleTimeString())

    // Сохраняем в localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_token', data.access_token)
      localStorage.setItem('tts_expires_at', this.expiresAt.toString())
    }

    return data.access_token
  }

  async synthesizeSpeech(text: string): Promise<{ blob: Blob; cached: boolean }> {
    // Проверяем кеш
    const cachedResult = await ttsCache.getCachedAudio(text)
    if (cachedResult) {
      console.log('🎵 Using cached TTS audio for:', text.substring(0, 50) + '...')
      return { blob: cachedResult.blob, cached: true }
    }

    // Получаем токен (с автоматическим обновлением если нужно)
    const token = await this.getToken()

    console.log('🔊 Making TTS request...')
    const response = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, token })
    })

    if (!response.ok) {
      // Если ошибка 401, пробуем обновить токен и повторить запрос
      if (response.status === 401) {
        console.log('🔄 Token expired, refreshing...')
        const newToken = await this.getToken(true) // Принудительное обновление
        const retryResponse = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text, token: newToken })
        })

        if (!retryResponse.ok) {
          throw new Error(`TTS request failed after token refresh: ${retryResponse.statusText}`)
        }

        const blob = await retryResponse.blob()
        await this.cacheAudio(text, blob)
        return { blob, cached: false }
      }

      throw new Error(`TTS request failed: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()

    // Сохраняем в кеш
    await this.cacheAudio(text, blob)

    return { blob, cached: false }
  }

  private async cacheAudio(text: string, blob: Blob): Promise<void> {
    try {
      await ttsCache.cacheAudio(text, blob)
      console.log('💾 Audio cached successfully for:', text.substring(0, 50) + '...')
    } catch (error) {
      console.error('Error caching audio:', error)
    }
  }

  // Восстановление токена из localStorage
  restoreToken(): void {
    if (typeof window === 'undefined') return

    const savedToken = localStorage.getItem('tts_token')
    const savedExpiresAt = localStorage.getItem('tts_expires_at')

    if (savedToken && savedExpiresAt) {
      const expiresAt = parseInt(savedExpiresAt)
      this.token = savedToken
      this.expiresAt = expiresAt
      
      console.log('🔍 Restored token from storage, expires:', new Date(expiresAt).toLocaleTimeString())
      
      // Если токен скоро истечет, обновляем его заранее
      if (!this.isTokenValid()) {
        console.log('⚠️ Restored token is expired or expiring soon')
        this.refreshToken().catch(error => {
          console.error('Failed to refresh token on restore:', error)
        })
      }
    } else {
      console.log('📝 No saved token found, will fetch when needed')
    }

    // Очищаем устаревшие записи в кеше
    ttsCache.cleanupExpired()

    // Запускаем периодическую проверку токена
    this.startTokenMonitor()
  }

  private startTokenMonitor(): void {
    // Очищаем существующий интервал
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval)
    }

    // Проверяем токен каждые 30 секунд
    this.tokenCheckInterval = setInterval(() => {
      if (this.token && this.expiresAt) {
        const timeUntilExpiry = this.expiresAt - Date.now()
        const fiveMinutes = 5 * 60 * 1000
        
        if (timeUntilExpiry < fiveMinutes && !this.renewPromise) {
          console.log('🔄 Proactive token refresh (expiring soon)')
          this.refreshToken().catch(error => {
            console.error('Proactive token refresh failed:', error)
          })
        }
      }
    }, 30 * 1000) // 30 секунд
  }

  clearToken(): void {
    this.token = null
    this.expiresAt = null
    
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval)
      this.tokenCheckInterval = null
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tts_token')
      localStorage.removeItem('tts_expires_at')
    }
  }

  // Методы для управления кешем
  getCacheStats() {
    return ttsCache.getCacheStats()
  }

  clearCache(): void {
    ttsCache.cleanupCache()
  }

  // Для отладки
  getTokenInfo() {
    return {
      hasToken: !!this.token,
      expiresAt: this.expiresAt ? new Date(this.expiresAt).toLocaleTimeString() : null,
      isValid: this.isTokenValid(),
      timeUntilExpiry: this.expiresAt ? this.expiresAt - Date.now() : null
    }
  }
}

export const ttsService = new TTSService()