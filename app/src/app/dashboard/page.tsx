'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useTodos } from '@/context/TodoContext'
import TodoList from '@/components/todos/TodoList'
import { MoonIcon, SunIcon, PlusIcon, RefreshCw } from 'lucide-react'
import { useTheme } from 'next-themes'
import FloatingChatButton from '../../components/FloatingChatButton'
import AddTodoModal from '../../components/todos/AddTodoModal'
import { createTodo } from '@/lib/api'
import { useToast } from '@/lib/toast'

// Define the Todo interface to match the API response
interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  user_id: string
  created_at: string
  updated_at: string
  due_date?: string
  due_time?: string
  priority?: 'low' | 'medium' | 'high' // Adding priority field
  recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none'
  parent_todo_id?: string | null
}

export default function DashboardPage() {
  const { user, loading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const { todos, loadingTodos, refreshTodos, addTodoToState } = useTodos()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()

  const [showAddModal, setShowAddModal] = useState(false)
  const [addingTodo, setAddingTodo] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    } else if (isAuthenticated) {
      refreshTodos()
    }
  }, [loading, isAuthenticated, router]) // Removed refreshTodos from deps to avoid loop if it's not memoized

  // Polling for auto-refresh (if chatbot adds a todo in the background)
  useEffect(() => {
    if (!isAuthenticated) return

    const intervalId = setInterval(() => {
      refreshTodos()
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(intervalId)
  }, [isAuthenticated, refreshTodos])

  const handleAddTodo = async (title: string, description?: string, due_date?: string, due_time?: string, priority?: 'low' | 'medium' | 'high', recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none') => {
    setAddingTodo(true)
    try {
      const newTodo = await createTodo(title, description, due_date, due_time, priority, recurrence_rule)
      addTodoToState(newTodo)
      setShowAddModal(false)
      showToast('Todo added successfully!', 'success')
    } catch (error: any) {
      console.error('Error adding todo:', error)
      showToast(error.message || 'Failed to add todo', 'error')
    } finally {
      setAddingTodo(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error during logout:', error)
      // Even if API logout fails, redirect to login
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Calculate stats
  const totalTasks = todos.length
  const completedTasks = todos.filter(todo => todo.completed).length
  const pendingTasks = todos.filter(todo => !todo.completed).length
  const overdueTasks = todos.filter(todo =>
    !todo.completed &&
    todo.due_date &&
    new Date(todo.due_date) < new Date()
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-200 via-slate-200 to-indigo-200 dark:from-purple-800 dark:via-gray-700 dark:to-purple-700 transition-colors duration-500">
      <header className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md shadow-sm border-b border-indigo-100 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Todo Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => refreshTodos()}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title="Refresh todos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loadingTodos ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FloatingChatButton />

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/30"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Todo
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg transform transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-400/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium opacity-80">Total Tasks</h3>
                <p className="text-2xl font-bold">{totalTasks}</p>
              </div>
            </div>
            {totalTasks === 0 && (
              <p className="mt-3 text-sm opacity-80">No tasks yet – let's get started!</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg transform transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-400/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium opacity-80">Completed</h3>
                <p className="text-2xl font-bold">{completedTasks}</p>
              </div>
            </div>
            {completedTasks === 0 && (
              <p className="mt-3 text-sm opacity-80">No completed tasks yet – let's change that!</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg transform transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-amber-400/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium opacity-80">Pending</h3>
                <p className="text-2xl font-bold">{pendingTasks}</p>
              </div>
            </div>
            {pendingTasks === 0 && (
              <p className="mt-3 text-sm opacity-80">All tasks completed – great job!</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-6 text-white shadow-lg transform transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-400/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium opacity-80">Overdue</h3>
                <p className="text-2xl font-bold">{overdueTasks}</p>
              </div>
            </div>
            {overdueTasks === 0 && (
              <p className="mt-3 text-sm opacity-80">No overdue tasks – excellent!</p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Your Todos
          </h2>
          {loadingTodos && todos.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <TodoList />
          )}
        </div>
      </main>

      {showAddModal && (
        <AddTodoModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTodo}
          loading={addingTodo}
        />
      )}
    </div>
  )
}
