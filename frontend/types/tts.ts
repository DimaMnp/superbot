export interface TokenResponse {
  access_token: string
  expires_at: number
}

export interface TTSState {
  token: string | null
  expiresAt: number | null
  isPlaying: boolean
  currentPlayingId: string | null
  loadingAudioId: string | null
}

export interface CachedAudio {
  id: string
  text: string
  audioData: string
  createdAt: number
  size: number
}