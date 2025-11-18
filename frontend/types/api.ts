export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterResponse {
  user_token: string
} 
export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  role: "student" | "retraining" | "teacher" | "management"
  gender: 'male' | 'female'
  age: number
  phone?: string
  department?: string
  position?: string
}

export interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "student" | "retraining" | "teacher" | "management"
  gender: 'male' | 'female'
  age: number
  phone?: string
  department?: string
  position?: string
  createdAt: string
}

export interface UpdateProfileRequest {
  first_name?: string
  last_name?: string
  email?: string
  role?: "student" | "retraining" | "teacher" | "management"
  gender?: 'male' | 'female'
  age?: number
  phone?: string
  department?: string
  position?: string
}

export interface Conversation {
  user_id: string
  messages: ChatMessage[]
}

export interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  timestamp?: string
}

export interface UserWithHistory {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'student' | 'retraining' | 'teacher' | 'management'
  age: number
  gender: 'male' | 'female'
  history: Array<{
    id: string
    collection: string
  }>
}