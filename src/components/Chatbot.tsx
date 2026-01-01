import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { useTodos } from '../context/TodoContext';
import { sendMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import { Clock } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token, user, loading: authLoading } = useAuth();
  const { addTodoToState, notifyTodoAdded } = useTodos();
  const { showToast } = useToast();

  // Debug: Log token changes
  useEffect(() => {
    console.log('Chatbot - Token updated:', { token, user, authLoading });
  }, [token, user, authLoading]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat with default message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your AI Todo Assistant. Tell me what you'd like to do today — add a task, edit one, check your list, or anything else! 😊 (English/Urdu supported)",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    console.log('handleSendMessage called', { inputMessage, token, user, isLoading, authLoading }); // Debug log
    if (!inputMessage.trim()) {
      console.log('Send disabled - no input message'); // Debug log
      return;
    }

    if (!token) {
      console.log('Send disabled - no token'); // Debug log
      showToast('Please log in to use the chatbot', 'error');
      return;
    }

    if (isLoading) {
      console.log('Send disabled - already loading'); // Debug log
      return;
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the chat API
      console.log('Calling sendMessage API...'); // Debug log
      const response = await sendMessage(inputMessage, conversationId || undefined);
      console.log('API response:', response); // Debug log

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.response || response.data?.response || 'Sorry, I received an unexpected response format.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setConversationId(response.conversation_id || response.data?.conversation_id);
      // Update language if provided in response
      const languageFromResponse = response.language || response.data?.language;
      if (languageFromResponse) {
        setLanguage(languageFromResponse as 'en' | 'ur');
      }

      // Check if the AI response indicates a new todo was added
      // Look for specific patterns that indicate a successful todo creation
      const responseText = response.response || response.data?.response || '';
      const lowerResponse = responseText.toLowerCase();

      // Check for various patterns indicating a todo was added
      const todoAddedPatterns = [
        'todo added successfully',
        'todo was added',
        'added successfully',
        'task added',
        'added to your list',
        'created successfully'
      ];

      const isTodoAdded = todoAddedPatterns.some(pattern =>
        lowerResponse.includes(pattern.toLowerCase())
      );

      if (isTodoAdded) {
        // Notify the TodoContext that a new todo was added, triggering a refresh
        notifyTodoAdded();
      }

      // Show success toast
      showToast('Message sent successfully', 'success');
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });

      // Check if it's an authentication error
      if (error?.message?.includes('Unauthorized') || error?.message?.includes('session may have expired')) {
        showToast('Your session has expired. Please log in again.', 'error');
        // Optionally, you could redirect to login page here
        return;
      }

      // Show error toast
      const errorMessageText = error?.message || 'Sorry, I encountered an error. Please try again.';
      showToast(`Error: ${errorMessageText}`, 'error');

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorMessageText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-[90vw] sm:w-full sm:max-w-md h-[75vh] flex flex-col bg-white dark:bg-gray-950 rounded-3xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.3)] border border-indigo-100 dark:border-indigo-900/50 overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-pink-400 via-purple-800 to-indigo-600 p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl transform -rotate-3 hover:rotate-0 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tight uppercase leading-none">AI Agent</h3>
              <div className="flex items-center mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span>
                <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Secured & Ready</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white/10 transition-all active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 bg-gray-100 dark:bg-blue-950/50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
          >
            {message.id === 'welcome' ? (
              /* Enhanced Welcome Box */
              <div className="w-full py-10 px-6 flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 rounded-[3rem] border border-dashed border-indigo-200 dark:border-indigo-800/50 my-4 shadow-sm">
                <div className="w-20 h-20 rounded-3xl bg-pink-200 dark:bg-indigo-900/30 flex items-center justify-center shadow-xl border border-indigo-100 dark:border-indigo-800 transform -rotate-6">
                  <span className="text-4xl text-indigo-600">👋</span>
                </div>
                <div className="max-w-[280px]">
                  <h4 className="text-xl font-black text-indigo-950 dark:text-white leading-tight mb-3">Your Productivity Partner</h4>
                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400 leading-relaxed italic">
                    "{message.content}"
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">English</span>
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">اردو</span>
                </div>
              </div>
            ) : (
              <div
                className={`max-w-[85%] px-5 py-4 shadow-xl transition-all hover:scale-[1.02] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-3xl rounded-tr-none shadow-indigo-500/20'
                    : 'bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded-3xl rounded-tl-none border border-indigo-50 dark:border-indigo-900/30'
                }`}
              >
                <div className="text-sm md:text-md leading-relaxed font-medium whitespace-pre-wrap">{message.content}</div>
                <div className={`text-[9px] mt-3 flex items-center justify-end font-bold uppercase tracking-widest ${message.role === 'user' ? 'text-indigo-200' : 'text-slate-400 dark:text-indigo-500'}`}>
                  <Clock className="h-3 w-3 mr-1 opacity-70" />
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 border border-indigo-50 dark:border-indigo-900/30 rounded-[2rem] rounded-tl-none px-6 py-4 shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white dark:bg-gray-950 border-t border-indigo-100 dark:border-indigo-900/30">
        <div className="flex items-center bg-slate-50 dark:bg-gray-900 rounded-[2rem] px-5 py-3 border-2 border-transparent focus-within:border-indigo-500/30 focus-within:bg-white dark:focus-within:bg-gray-900 transition-all shadow-inner">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Command your agent..."
            className="flex-1 bg-transparent border-none text-sm md:text-md py-1.5 px-0 text-slate-900 dark:text-gray-100 placeholder-indigo-300 dark:placeholder-indigo-900/50 focus:ring-0 resize-none font-medium"
            rows={1}
            style={{ maxHeight: '100px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim() || !token}
            className={`ml-3 p-3 rounded-[1.25rem] transition-all shadow-xl active:scale-[0.85] ${
              isLoading || !inputMessage.trim()
                ? 'bg-slate-200 dark:bg-gray-800 text-slate-400 cursor-not-allowed shadow-none'
                : !token
                ? 'bg-rose-50 text-rose-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white hover:shadow-indigo-500/40 transform'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-45 transform -translate-y-0.5 translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;