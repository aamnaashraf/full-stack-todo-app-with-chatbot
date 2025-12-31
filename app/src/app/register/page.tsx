'use client'

import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md transform transition-all duration-500 animate-in fade-in zoom-in-95">
        <div className="bg-indigo-50/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl shadow-2xl p-10 border border-white dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-indigo-900 dark:text-white mb-3 tracking-tight">Get Started</h1>
            <p className="text-sm font-medium text-indigo-600/60 dark:text-gray-400 uppercase tracking-widest">Create your productivity hub</p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  )
}