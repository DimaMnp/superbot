"use client"

import React, { createContext, useContext, useState, useRef } from 'react'
import { ttsService } from '@/lib/tts-service'

interface TTSContextType {
  isPlaying: boolean
  currentPlayingId: string | null
  loadingAudioId: string | null
  playMessage: (messageId: string, text: string) => Promise<void>
  pauseMessage: () => void
  resumeMessage: () => void
  getCacheStats: () => any
  clearCache: () => void
  progress: number
  duration: number | null
}

const TTSContext = createContext<TTSContextType | undefined>(undefined)

export function TTSProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentBlobUrl = useRef<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [duration, setDuration] = useState<number | null>(null)

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current)
      currentBlobUrl.current = null
    }
  }

  const playMessage = async (messageId: string, text: string): Promise<void> => {
    try {
      // Если уже играет какое-то сообщение, останавливаем его
      if (currentPlayingId && currentPlayingId !== messageId) {
        cleanupAudio()
        setIsPlaying(false)
        setCurrentPlayingId(null)
      }

      setCurrentPlayingId(messageId)
      setLoadingAudioId(messageId)

      // Получаем аудио от TTS сервиса
      const { blob, cached } = await ttsService.synthesizeSpeech(text)
      
      console.log(cached ? '🎵 Playing from cache' : '🔊 Generating new TTS')

      const blobUrl = URL.createObjectURL(blob)
      currentBlobUrl.current = blobUrl

      // Создаем audio элемент
      const audio = new Audio(blobUrl)
      audioRef.current = audio

      // Предзагрузка метаданных
      await new Promise((resolve, reject) => {
        audio.addEventListener('loadedmetadata', resolve)
        audio.addEventListener('error', reject)
      })

      audio.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentPlayingId(null)
        setLoadingAudioId(null)
        cleanupAudio()
        setProgress(0)
        setDuration(null)
      })

      audio.addEventListener('pause', () => {
        setIsPlaying(false)
      })

      audio.addEventListener('play', () => {
        setIsPlaying(true)
        setLoadingAudioId(null)
      })

      audio.addEventListener('loadedmetadata', () => {
        try {
          setDuration(audio.duration || null)
          setProgress(audio.currentTime && audio.duration ? audio.currentTime / audio.duration : 0)
        } catch (e) {
          setDuration(null)
          setProgress(0)
        }
      })

      audio.addEventListener('timeupdate', () => {
        if (audio.duration && audio.duration > 0) {
          setProgress(audio.currentTime / audio.duration)
        }
      })

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e)
        setLoadingAudioId(null)
        setIsPlaying(false)
        setCurrentPlayingId(null)
        cleanupAudio()
        setProgress(0)
        setDuration(null)
      })

      await audio.play()


    } catch (error) {
      console.error('TTS playback error:', error)
      setIsPlaying(false)
      setCurrentPlayingId(null)
      setLoadingAudioId(null)
      cleanupAudio()
      throw error
    }
  }

  const pauseMessage = (): void => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const resumeMessage = (): void => {
    if (audioRef.current && currentPlayingId) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const getCacheStats = () => {
    return ttsService.getCacheStats()
  }

  const clearCache = (): void => {
    ttsService.clearCache()
  }

  // reset progress when cleaning up
  React.useEffect(() => {
    return () => {
      setProgress(0)
      setDuration(null)
    }
  }, [])

  React.useEffect(() => {
    ttsService.restoreToken()
    
    return () => {
      cleanupAudio()
    }
  }, [])

  return (
    <TTSContext.Provider value={{
      isPlaying,
      currentPlayingId,
      loadingAudioId,
      playMessage,
      pauseMessage,
      resumeMessage,
      getCacheStats,
      clearCache,
      progress,
      duration,
    }}>
      {children}
    </TTSContext.Provider>
  )
}

export function useTTS() {
  const context = useContext(TTSContext)
  if (context === undefined) {
    throw new Error('useTTS must be used within a TTSProvider')
  }
  return context
}