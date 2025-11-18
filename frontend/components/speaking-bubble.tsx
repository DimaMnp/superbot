"use client"

import React, { useEffect, useRef } from 'react'
import { roles } from '@/lib/data/roles'

interface SpeakingBubbleProps {
  roleKey: keyof typeof roles | string
  isPlaying: boolean
  isLoading: boolean
  onToggle: () => void
  size?: number
  progress?: number // 0..1
  isPaused?: boolean
}

export default function SpeakingBubble({ roleKey, isPlaying, isLoading, onToggle, size = 120, progress = 0, isPaused = false }: SpeakingBubbleProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const role = (roles as any)[roleKey] ?? roles.student
  const isPlayingRef = useRef<boolean>(isPlaying)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // keep ref up to date for event listeners
    isPlayingRef.current = isPlaying

    // Muted video can autoplay reliably
    if (isPlaying) {
      v.play().catch(() => {
        // ignore
      })
    } else {
      v.pause()
    }

    // ensure video restarts when it ends while audio is still playing
    const handleEnded = () => {
      try {
        if (isPlayingRef.current) {
          // reset and play again
          v.currentTime = 0
          v.play().catch(() => {})
        }
      } catch (e) {
        // ignore
      }
    }

    v.addEventListener('ended', handleEnded)
    return () => {
      v.removeEventListener('ended', handleEnded)
    }
  }, [isPlaying])

  const radius = 46
  const circumference = Math.PI * 2 * radius

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      title={isLoading ? 'Загрузка аудио...' : isPaused ? 'Воспроизвести' : isPlaying ? 'Пауза' : 'Воспроизвести'}
      className={`relative flex items-center justify-center rounded-full overflow-hidden cursor-pointer transition-all duration-300 ease-in-out select-none`}
      style={{ width: size, height: size }}
      role="button"
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute -inset-1"
        width={size + 8}
        height={size + 8}
        aria-hidden
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="g-bubble" x1="0" x2="1">
            <stop offset="0%" stopColor="#fb2c36" />
            <stop offset="100%" stopColor="#ff4852" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="46" strokeWidth="2" stroke="#e5e7eb" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="46"
          strokeWidth="2"
          stroke="url(#g-bubble)"
          fill="none"
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, progress)))}
          style={{ transition: 'stroke-dashoffset 400ms linear' }}
        />
      </svg>

      {/* video for character; muted so audio from TTS plays separately */}
      <video
        ref={videoRef}
        src={role.video}
        style={{ width: size - 16, height: size - 16 }}
        className="object-cover rounded-full p-3"
        controls={false}
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
      />

      {/* subtle overlay during loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
        </div>
      )}

      {/* pause icon when paused */}
      {isPaused && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 bg-white/90 rounded-md flex items-center justify-center shadow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="4" width="4" height="16" fill="#0f172a" />
              <rect x="15" y="4" width="4" height="16" fill="#0f172a" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
