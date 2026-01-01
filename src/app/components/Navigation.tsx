'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, LogIn, User, Menu, X, Sun, Moon, Home } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }

    if (pathname && !pathname.includes('/login') && !pathname.includes('/register') && pathname !== '/') {
      setIsLoggedIn(true);
    } else if (pathname === '/') {
      setIsLoggedIn(false);
    }
  }, [pathname]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (!isClient) return null;

  return (
    <nav className="backdrop-blur-xl bg-gray-400 dark:bg-gray-900/80 border-b border-indigo-100 dark:border-white/5 sticky top-0 z-[100] transition-all duration-500 shadow-sm shadow-indigo-500/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="group flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-white text-xl font-black">T</span>
              </div>
              <div className="text-2xl font-black bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-900 bg-clip-text text-transparent dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 tracking-tighter">
                TodoApp
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              href="/"
              className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                pathname === '/'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-gray-800'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>

            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-gray-800 transition-all duration-300 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  href="/register"
                  className="ml-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  Join Now
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
                    pathname === '/dashboard'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-300"
                >
                  Logout
                </button>
              </>
            )}

            <div className="w-px h-6 bg-slate-200 dark:bg-gray-800 mx-4" />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-300"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
          </div>

          {/* Mobile UI */}
          <div className="md:hidden flex items-center space-x-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-white/5">
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>
            <button onClick={toggleMobileMenu} className="p-2.5 rounded-xl text-slate-600 dark:text-white bg-slate-50 dark:bg-gray-800">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-white/5 p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 font-bold text-slate-600 dark:text-white hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-2xl">
            <Home className="w-5 h-5" /> <span>Home</span>
          </Link>
          {!isLoggedIn ? (
            <>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 font-bold text-slate-600 dark:text-white hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-2xl">
                <LogIn className="w-5 h-5" /> <span>Login</span>
              </Link>
              <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center px-4 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-500/20">
                Join Now
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 font-bold text-slate-600 dark:text-white hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-2xl">
                Dashboard
              </Link>
              <button onClick={() => setIsLoggedIn(false)} className="w-full text-left px-4 py-3 font-bold text-rose-500 hover:bg-rose-50 rounded-2xl flex items-center space-x-3">
                <LogOut className="w-5 h-5" /> <span>Logout</span>
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}