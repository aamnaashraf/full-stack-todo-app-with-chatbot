'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { login as loginAPI, register as registerAPI, logout as logoutAPI } from './api'
import { useToast } from './toast'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { showToast } = useToast()

  // Update token state when localStorage changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentToken = localStorage.getItem('access_token')
      setTokenState(currentToken)
    }
  }, [])

  useEffect(() => {
    // Function to handle storage changes (token updates from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        // Update token state
        setTokenState(e.newValue);

        if (e.newValue) {
          // New token set, decode and set user
          try {
            const tokenParts = e.newValue.split('.');
            if (tokenParts.length !== 3) {
              throw new Error('Invalid token format');
            }

            let payload = tokenParts[1];
            payload = payload.replace(/-/g, '+').replace(/_/g, '/');
            while (payload.length % 4) {
              payload += '=';
            }

            const tokenPayload = JSON.parse(atob(payload));
            const currentTime = Math.floor(Date.now() / 1000);

            if (tokenPayload.exp && tokenPayload.exp < currentTime) {
              // Token is expired
              localStorage.removeItem('access_token');
              setUser(null);
              setTokenState(null);
              showToast('Session expired. Please log in again.', 'error');
            } else {
              // Token is valid, set the user
              // sub is the email, and user_id is stored separately in the token
              if (!tokenPayload.user_id) {
                // Fallback to sub if user_id is not available (for backward compatibility)
                setUser({
                  id: tokenPayload.sub,
                  email: tokenPayload.sub
                });
              } else {
                setUser({
                  id: tokenPayload.user_id,
                  email: tokenPayload.sub
                });
              }
            }
          } catch (error) {
            console.error('Error decoding token from storage change:', error);
            localStorage.removeItem('access_token');
            setUser(null);
            setTokenState(null);
          }
        } else {
          // Token was removed
          setUser(null);
          setTokenState(null);
        }
      }
    };

    // Check if user is logged in on initial load
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Decode JWT token payload safely
          const tokenParts = token.split('.');
          if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
          }

          // Decode the payload part (second part)
          let payload = tokenParts[1];
          // Add padding if needed
          payload = payload.replace(/-/g, '+').replace(/_/g, '/');
          while (payload.length % 4) {
            payload += '=';
          }

          const tokenPayload = JSON.parse(atob(payload));

          // Check if token is expired
          const currentTime = Math.floor(Date.now() / 1000);
          if (tokenPayload.exp && tokenPayload.exp < currentTime) {
            // Token is expired
            localStorage.removeItem('access_token');
            setTokenState(null);
            showToast('Session expired. Please log in again.', 'error');
          } else {
            // Token is valid, set the user
            if (!tokenPayload.user_id) {
              // Fallback to sub if user_id is not available (for backward compatibility)
              setUser({
                id: tokenPayload.sub,
                email: tokenPayload.sub
              });
            } else {
              setUser({
                id: tokenPayload.user_id,
                email: tokenPayload.sub
              });
            }
          }
        } catch (error) {
          console.error('Error decoding token:', error);
          localStorage.removeItem('access_token');
          setTokenState(null);
          showToast('Session expired. Please log in again.', 'error');
        }
      }
    }
    setLoading(false);

    // Add storage event listener
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [showToast]);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginAPI(email, password)
      const { access_token, user } = response

      // Store the token in localStorage
      localStorage.setItem('access_token', access_token)

      // Update token state to trigger re-render
      setTokenState(access_token);

      // Set the user in context
      setUser({
        id: user.id,
        email: user.email
      })

      // Show success message
      showToast('Login successful!', 'success')

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      showToast(error.message || 'Login failed. Please try again.', 'error')
      throw error
    }
  }

  const register = async (email: string, password: string) => {
    try {
      const response = await registerAPI(email, password)
      const { access_token, user } = response

      // Store the token in localStorage
      localStorage.setItem('access_token', access_token)

      // Update token state to trigger re-render
      setTokenState(access_token);

      // Set the user in context
      setUser({
        id: user.id,
        email: user.email
      })

      // Show success message
      showToast('Registration successful!', 'success')

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Registration error:', error)
      showToast(error.message || 'Registration failed. Please try again.', 'error')
      throw error
    }
  }

  const logout = async () => {
    try {
      await logoutAPI()
      setUser(null)
      localStorage.removeItem('access_token')
      setTokenState(null); // Update token state to trigger re-render
      showToast('You have been logged out.', 'info')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if the API logout fails, clear the local state
      setUser(null)
      localStorage.removeItem('access_token')
      setTokenState(null); // Update token state to trigger re-render
      showToast('You have been logged out.', 'info')
      router.push('/login')
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    token,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}