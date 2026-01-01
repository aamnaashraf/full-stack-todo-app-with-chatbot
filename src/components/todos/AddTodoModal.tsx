'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'

interface AddTodoModalProps {
  onClose: () => void
  onAdd: (title: string, description?: string, due_date?: string, due_time?: string, priority?: 'low' | 'medium' | 'high', recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none') => void
  loading: boolean
}

export default function AddTodoModal({ onClose, onAdd, loading }: AddTodoModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [recurrenceRule, setRecurrenceRule] = useState<'daily' | 'weekly' | 'monthly' | 'none'>('none')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      alert('Title is required')
      return
    }

    onAdd(title, description, dueDate || undefined, dueTime || undefined, priority, recurrenceRule)
  }

  return (
    <div className="fixed inset-0 bg-indigo-900/40 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-indigo-50/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-md border border-white dark:border-gray-800 overflow-hidden transform transition-all animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2 w-full" />

        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-indigo-900 dark:text-white">New Task</h3>
              <p className="text-xs text-indigo-600/60 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">Plan your victory</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-indigo-400 hover:text-indigo-600 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-slate-400 mb-2 ml-1">
                Task Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl text-indigo-900 dark:text-white placeholder-indigo-300 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none"
                placeholder="What's the goal today?"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-slate-400 mb-2 ml-1">
                Details
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl text-indigo-900 dark:text-white placeholder-indigo-300 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none resize-none"
                placeholder="Break it down into details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dueDate" className="block text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-slate-400 mb-2 ml-1">
                  When
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="dueDate"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl text-sm text-indigo-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dueTime" className="block text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-slate-400 mb-2 ml-1">
                  Time
                </label>
                <input
                  type="time"
                  id="dueTime"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl text-sm text-indigo-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-slate-400 mb-2 ml-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl text-sm font-medium text-indigo-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none cursor-pointer"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              <div>
                <label htmlFor="recurrence" className="block text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-slate-400 mb-2 ml-1">
                  Repeat
                </label>
                <select
                  id="recurrence"
                  value={recurrenceRule}
                  onChange={(e) => setRecurrenceRule(e.target.value as 'daily' | 'weekly' | 'monthly' | 'none')}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl text-sm font-medium text-indigo-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none cursor-pointer"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-indigo-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-indigo-600 dark:text-slate-400 hover:bg-white dark:hover:bg-gray-800 transition-all font-bold tracking-wide"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center tracking-wide ${
                  loading
                    ? 'bg-indigo-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/20'
                }`}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Create Task'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}