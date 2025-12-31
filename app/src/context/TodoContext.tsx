'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getTodos } from '@/lib/api';

// Define the Todo interface to match the API response
interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  due_time?: string;
  priority?: 'low' | 'medium' | 'high';
  recurrence_rule?: 'daily' | 'weekly' | 'monthly' | 'none';
  parent_todo_id?: string | null;
}

interface TodoContextType {
  todos: Todo[];
  loadingTodos: boolean;
  refreshTodos: () => Promise<void>;
  addTodoToState: (todo: Todo) => void;
  updateTodoInState: (todo: Todo) => void;
  removeTodoFromState: (id: string) => void;
  notifyTodoAdded: () => void; // For chatbot notifications
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export function TodoProvider({ children }: { children: ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const { isAuthenticated } = useAuth();

  const refreshTodos = async () => {
    try {
      setLoadingTodos(true);
      const data = await getTodos();
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoadingTodos(false);
    }
  };

  // Add a todo to the local state (optimistic update)
  const addTodoToState = (todo: Todo) => {
    setTodos(prev => [...prev, todo]);
  };

  // Update a todo in the local state
  const updateTodoInState = (updatedTodo: Todo) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === updatedTodo.id ? updatedTodo : todo
      )
    );
  };

  // Remove a todo from the local state
  const removeTodoFromState = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  // Notify that a todo was added via chatbot and refresh the list
  const notifyTodoAdded = () => {
    // Refresh the todos to get the latest list from the backend
    refreshTodos();
  };

  // Refresh todos when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshTodos();
    } else {
      setTodos([]);
    }
  }, [isAuthenticated]);

  return (
    <TodoContext.Provider
      value={{
        todos,
        loadingTodos,
        refreshTodos,
        addTodoToState,
        updateTodoInState,
        removeTodoFromState,
        notifyTodoAdded,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodos() {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return context;
}