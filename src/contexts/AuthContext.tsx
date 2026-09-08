import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchCurrentUser,
  isAuthApiEnabled,
  loginUser,
  logoutUser,
  registerUser,
  type RegisterResult,
} from '../lib/authApi'
import type { User } from '../types/user'

type AuthContextValue = {
  user: User | null
  loading: boolean
  error: string | null
  isAdmin: boolean
  isCustomer: boolean
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string) => Promise<RegisterResult>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isAuthApiEnabled())
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isAuthApiEnabled()) {
      setUser(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const current = await fetchCurrentUser()
      setUser(current)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nu am putut verifica sesiunea.'
      setError(message)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginUser(email, password)
    setUser(next)
    setError(null)
    return next
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const next = await registerUser(email, password)
    setUser(next.user)
    setError(null)
    return next
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAdmin: user?.role === 'admin',
      isCustomer: user?.role === 'customer',
      login,
      register,
      logout,
      refresh,
    }),
    [error, loading, login, logout, register, refresh, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth trebuie folosit in interiorul AuthProvider.')
  }
  return context
}
