'use client'

import { useState } from 'react'
import EditTodoModal from './EditTodoModal'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, Calendar, Clock, CheckCircle, Flag, RefreshCw } from 'lucide-react'

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
  priority?: 'low' | 'medium' | 'high'
  recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none'
  parent_todo_id?: string | null
}

interface TodoCardProps {
  todo: Todo
  onUpdate: (id: string, updates: Partial<Todo>) => void
  onDelete: (id: string) => void
  onToggleComplete: (todo: Todo) => void
}

export default function TodoCard({ todo, onUpdate, onDelete, onToggleComplete }: TodoCardProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleUpdate = async (title: string, description?: string, due_date?: string, due_time?: string, priority?: 'low' | 'medium' | 'high', recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none') => {
    setLoading(true)
    try {
      await onUpdate(todo.id, { title, description, due_date, due_time, priority, recurrence_rule })
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating todo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      try {
        await onDelete(todo.id)
      } catch (error) {
        console.error('Error deleting todo:', error)
      }
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return null
    try {
      return format(parseISO(timeString), 'HH:mm')
    } catch {
      return timeString
    }
  }

  // Get recurrence label
  const getRecurrenceLabel = (rule: string | undefined) => {
    switch (rule) {
      case 'daily': return 'Daily'
      case 'weekly': return 'Weekly'
      case 'monthly': return 'Monthly'
      default: return null
    }
  }

  // Determine the border color based on completion status, priority, and due date
  const getBorderColor = () => {
    if (todo.completed) return 'border-green-500'
    if (todo.due_date && new Date(todo.due_date) < new Date()) return 'border-red-500'
    if (todo.priority === 'high') return 'border-red-500'
    if (todo.priority === 'medium') return 'border-amber-500'
    return 'border-blue-500'
  }

  // Determine the priority badge color
  const getPriorityColor = () => {
    switch (todo.priority) {
      case 'high': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      case 'low': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    }
  }

  // Get priority icon
  const getPriorityIcon = () => {
    switch (todo.priority) {
      case 'high': return <AlertTriangle className="h-3.5 w-3.5" />
      case 'medium': return <Flag className="h-3.5 w-3.5" />
      case 'low': return <Flag className="h-3.5 w-3.5" />
      default: return <Flag className="h-3.5 w-3.5" />
    }
  }

  // Check if the todo is overdue
  const isOverdue = !todo.completed && todo.due_date && new Date(todo.due_date) < new Date()

  return (
    <div className={`group relative bg-indigo-50/40 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 ${
      todo.completed ? 'border-emerald-200 dark:border-emerald-900/50 opacity-90 bg-emerald-50/30' :
      isOverdue ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/30' :
      'border-indigo-100/50 dark:border-slate-700'
    }`}>
      {/* Status Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${
        todo.completed ? 'bg-emerald-500' :
        isOverdue ? 'bg-rose-500' :
        todo.priority === 'high' ? 'bg-rose-500' :
        todo.priority === 'medium' ? 'bg-amber-500' :
        'bg-indigo-500'
      }`} />

      <div className="p-6 pt-7">
        <div className="flex items-start">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => onToggleComplete(todo)}
              className="h-6 w-6 text-indigo-600 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:ring-offset-0 bg-transparent transition-all cursor-pointer checked:bg-indigo-600 checked:border-indigo-600"
            />
          </div>

          <div className="ml-4 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className={`text-lg font-bold truncate ${
                  todo.completed
                    ? 'text-slate-400 dark:text-slate-500 line-through'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {todo.title}
                </h3>
                {todo.description && (
                  <p className={`mt-1 text-sm line-clamp-2 ${
                    todo.completed ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {todo.description}
                  </p>
                )}
              </div>

              {todo.priority && (
                <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${getPriorityColor()}`}>
                  {getPriorityIcon()}
                  <span className="ml-1">{todo.priority}</span>
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {todo.due_date && (
                <div className={`flex items-center px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
                  isOverdue
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  {formatDate(todo.due_date)}
                  {todo.due_time && <span className="ml-1 opacity-70">@ {formatTime(todo.due_time)}</span>}
                </div>
              )}

              {todo.recurrence_rule && todo.recurrence_rule !== 'none' && (
                <div className="flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  {getRecurrenceLabel(todo.recurrence_rule)}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-4">
              <div className="flex space-x-1">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                  title="Edit task"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                  title="Delete task"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {todo.completed ? (
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Done
                </div>
              ) : isOverdue ? (
                <div className="flex items-center text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                  <Clock className="h-4 w-4 mr-1.5" />
                  Overdue
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
                  ID: ...{todo.id.slice(-6)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditTodoModal
          todo={todo}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdate}
          loading={loading}
        />
      )}
    </div>
  )
}