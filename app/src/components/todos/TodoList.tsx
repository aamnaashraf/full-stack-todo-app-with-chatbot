'use client'

import { useState, useMemo } from 'react'
import { useTodos } from '@/context/TodoContext'
import TodoCard from './TodoCard'
import AddTodoModal from './AddTodoModal'
import { createTodo, updateTodo, deleteTodo } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { Search, Filter, Calendar, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

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

export default function TodoList() {
  const { todos, addTodoToState, updateTodoInState, removeTodoFromState, refreshTodos } = useTodos()
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'overdue' | 'high-priority'>('all')
  const [sort, setSort] = useState<'due_date' | 'priority' | 'alphabetical' | 'created'>('due_date')
  const { showToast } = useToast()

  // Filter and sort todos
  const filteredAndSortedTodos = useMemo(() => {
    let result = [...todos]

    // Apply search filter
    if (searchTerm) {
      result = result.filter(todo =>
        todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Apply status filter
    if (filter === 'completed') {
      result = result.filter(todo => todo.completed)
    } else if (filter === 'pending') {
      result = result.filter(todo => !todo.completed)
    } else if (filter === 'overdue') {
      result = result.filter(todo =>
        !todo.completed &&
        todo.due_date &&
        new Date(todo.due_date) < new Date()
      )
    } else if (filter === 'high-priority') {
      result = result.filter(todo =>
        !todo.completed &&
        todo.priority === 'high'
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sort === 'due_date') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      } else if (sort === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const aPriority = priorityOrder[a.priority || 'low']
        const bPriority = priorityOrder[b.priority || 'low']
        if (aPriority !== bPriority) return bPriority - aPriority
        // If priorities are the same, sort by due date
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      } else if (sort === 'alphabetical') {
        return a.title.localeCompare(b.title)
      } else { // created
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return result
  }, [todos, searchTerm, filter, sort])

  const handleAddTodo = async (title: string, description?: string, due_date?: string, due_time?: string, priority?: 'low' | 'medium' | 'high', recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none') => {
    setLoading(true)
    try {
      const newTodo = await createTodo(title, description, due_date, due_time, priority, recurrence_rule)
      addTodoToState(newTodo)
      setShowAddModal(false)
      showToast('Todo added successfully!', 'success')
    } catch (error: any) {
      console.error('Error adding todo:', error)
      const errorMessage = error.message || 'Failed to add todo. Please try again.'
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      const updatedTodo = await updateTodo(id, updates)
      updateTodoInState(updatedTodo)
      showToast('Todo updated successfully!', 'success')
    } catch (error: any) {
      console.error('Error updating todo:', error)
      showToast(error.message || 'Failed to update todo. Please try again.', 'error')
    }
  }

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo(id)
      removeTodoFromState(id)
      showToast('Todo deleted successfully!', 'info')
    } catch (error: any) {
      console.error('Error deleting todo:', error)
      showToast(error.message || 'Failed to delete todo. Please try again.', 'error')
    }
  }

  const handleToggleComplete = async (todo: Todo) => {
    try {
      const updatedTodo = await updateTodo(todo.id, { completed: !todo.completed })
      updateTodoInState(updatedTodo)
      showToast(todo.completed ? 'Todo marked as incomplete' : 'Todo marked as complete!', 'success')
    } catch (error: any) {
      console.error('Error toggling todo completion:', error)
      showToast(error.message || 'Failed to update todo status. Please try again.', 'error')
    }
  }

  return (
    <div className="space-y-8">
      {/* Search and Filter Controls */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search tasks by title or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="appearance-none pl-9 pr-8 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white cursor-pointer"
            >
              <option value="all">⚡ All Tasks</option>
              <option value="completed">✅ Completed</option>
              <option value="pending">⏳ Pending</option>
              <option value="overdue">🚨 Overdue</option>
              <option value="high-priority">🔥 High Priority</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="appearance-none pl-9 pr-8 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white cursor-pointer"
            >
              <option value="due_date">📅 Due Date</option>
              <option value="priority">🚩 Priority</option>
              <option value="alphabetical">🔤 Name</option>
              <option value="created">🕒 Created</option>
            </select>
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Todo List or Empty State */}
      {filteredAndSortedTodos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/30 dark:bg-gray-800/20 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700/50">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
            <Search className="h-10 w-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {searchTerm ? "No matches found" : "Your list is empty"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8">
            {searchTerm || filter !== 'all'
              ? 'Try adjusting your search terms or filters to find what you need.'
              : 'Stay organized and productive! Start by adding your first task using the button above or the AI assistant.'
            }
          </p>
          {!searchTerm && filter === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
            >
              Add First Todo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredAndSortedTodos.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onUpdate={handleUpdateTodo}
              onDelete={handleDeleteTodo}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}

      {/* Add Button Placeholder - Only shown if needed, but redundant with dashboard button */}

      {showAddModal && (
        <AddTodoModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTodo}
          loading={loading}
        />
      )}
    </div>
  )
}