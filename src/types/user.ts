export type UserRole = 'admin' | 'customer'

export type User = {
  id: string
  email: string
  role: UserRole
}
