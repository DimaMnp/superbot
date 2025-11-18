import { CachedAudio } from '@/types/tts'

class TTSCache {
  private readonly CACHE_KEY = 'tts_audio_cache'
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
  private readonly MAX_ITEMS = 100

  getCache(): CachedAudio[] {
    if (typeof window === 'undefined') return []

    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      return cached ? JSON.parse(cached) : []
    } catch (error) {
      console.error('Error reading TTS cache:', error)
      return []
    }
  }

  setCache(cache: CachedAudio[]): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.error('Error writing TTS cache:', error)
      this.cleanupCache()
    }
  }

  generateCacheId(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return 'tts_' + Math.abs(hash).toString(36)
  }

  // Сохраняем только метаданные, без blob URL
  async cacheAudio(text: string, audioBlob: Blob): Promise<CachedAudio> {
    const cacheId = this.generateCacheId(text)
    
    // Конвертируем blob в base64 для сохранения
    const base64Audio = await this.blobToBase64(audioBlob)
    
    const cachedAudio: CachedAudio = {
      id: cacheId,
      text,
      audioData: base64Audio, // Сохраняем данные, а не URL
      createdAt: Date.now(),
      size: audioBlob.size
    }

    const cache = this.getCache()
    
    // Удаляем существующую запись с таким же ID
    const filteredCache = cache.filter(item => item.id !== cacheId)
    filteredCache.unshift(cachedAudio)

    // Очищаем кеш если нужно
    const cleanedCache = this.cleanupCacheIfNeeded(filteredCache)
    this.setCache(cleanedCache)

    return cachedAudio
  }

  // Получаем кешированное аудио как Blob
  async getCachedAudio(text: string): Promise<{ blob: Blob; cachedAudio: CachedAudio } | null> {
    const cacheId = this.generateCacheId(text)
    const cache = this.getCache()
    const cachedItem = cache.find(item => item.id === cacheId)

    if (!cachedItem || !cachedItem.audioData) {
      return null
    }

    try {
      // Конвертируем base64 обратно в Blob
      const blob = await this.base64ToBlob(cachedItem.audioData, 'audio/wav')
      return { blob, cachedAudio: cachedItem }
    } catch (error) {
      console.error('Error converting cached audio:', error)
      // Удаляем поврежденную запись из кеша
      this.removeFromCache(cacheId)
      return null
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64.split(',')[1]) // Убираем data:audio/wav;base64, префикс
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private async base64ToBlob(base64: string, contentType: string): Promise<Blob> {
    const response = await fetch(`data:${contentType};base64,${base64}`)
    return await response.blob()
  }

  private removeFromCache(cacheId: string): void {
    const cache = this.getCache()
    const filteredCache = cache.filter(item => item.id !== cacheId)
    this.setCache(filteredCache)
  }

  private cleanupCacheIfNeeded(cache: CachedAudio[]): CachedAudio[] {
    let totalSize = cache.reduce((sum, item) => sum + item.size, 0)
    let cleanedCache = [...cache]

    while (
      cleanedCache.length > this.MAX_ITEMS || 
      totalSize > this.MAX_CACHE_SIZE
    ) {
      const removed = cleanedCache.pop()
      if (removed) {
        totalSize -= removed.size
      }
    }

    return cleanedCache
  }

  cleanupCache(): void {
    localStorage.removeItem(this.CACHE_KEY)
  }

  // Очистка устаревших записей (старше 7 дней)
  cleanupExpired(): void {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    const now = Date.now()

    const cache = this.getCache()
    const validCache = cache.filter(item => {
      return now - item.createdAt <= SEVEN_DAYS
    })

    this.setCache(validCache)
  }

  // Получить статистику кеша
  getCacheStats() {
    const cache = this.getCache()
    const totalSize = cache.reduce((sum, item) => sum + item.size, 0)
    
    return {
      totalItems: cache.length,
      totalSize: totalSize,
      maxSize: this.MAX_CACHE_SIZE,
      maxItems: this.MAX_ITEMS
    }
  }
}

export const ttsCache = new TTSCache()