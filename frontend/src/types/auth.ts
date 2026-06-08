export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  fullName: string
  password: string
}

export type RegisterResponse = {
  email: string
  userId: number
}
