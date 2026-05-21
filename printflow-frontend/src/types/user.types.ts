export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'CUSTOMER' | 'OWNER'
  avatarUrl?: string
  createdAt?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}
