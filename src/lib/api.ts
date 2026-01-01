// API service for backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Helper function to get the auth token from localStorage
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token')
  }
  return null
}

// Helper function to make authenticated requests
const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken()

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle 401 Unauthorized - token might be expired
  if (response.status === 401) {
    // Remove the expired token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
    // Optionally redirect to login page - but we'll just throw the error for the calling function to handle
    throw new Error('Unauthorized. Your session may have expired. Please log in again.')
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorData.message || errorMessage
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

// Auth API functions
export const authAPI = {
  register: async (email: string, password: string) => {
    return makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  login: async (email: string, password: string) => {
    return makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  logout: async () => {
    // In a real implementation, you might want to call an API endpoint
    // For now, we just remove the token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
    }
  },
}

// Todo API functions
export const todoAPI = {
  getTodos: async () => {
    return makeRequest('/api/todos')
  },

  createTodo: async (title: string, description?: string, due_date?: string, due_time?: string, priority?: 'low' | 'medium' | 'high', recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none') => {
    return makeRequest('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title, description, due_date, due_time, priority, recurrence_rule }),
    })
  },

  getTodo: async (id: string) => {
    return makeRequest(`/api/todos/${id}`)
  },

  updateTodo: async (id: string, updates: { title?: string; description?: string; completed?: boolean; due_date?: string; due_time?: string; priority?: 'low' | 'medium' | 'high'; recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none' }) => {
    return makeRequest(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  deleteTodo: async (id: string) => {
    return makeRequest(`/api/todos/${id}`, {
      method: 'DELETE',
    })
  },
}

// Chat API functions
export const chatAPI = {
  sendMessage: async (message: string, conversationId?: string) => {
    return makeRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId
      }),
    })
  }
}

// Convenience functions that directly return data
export const register = authAPI.register
export const login = authAPI.login
export const logout = authAPI.logout
export const getTodos = todoAPI.getTodos
export const createTodo = todoAPI.createTodo
export const getTodo = todoAPI.getTodo
export const updateTodo = todoAPI.updateTodo
export const deleteTodo = todoAPI.deleteTodo
export const sendMessage = chatAPI.sendMessage