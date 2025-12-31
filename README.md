# Full Stack Todo Application

A production-ready, full-stack todo application built with Next.js and Python FastAPI, designed for deployment on Vercel.

## ✨ Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Todo Management**: Create, read, update, and delete todos
- **Recurring Tasks**: Support for daily, weekly, and monthly recurring tasks
- **Due Dates & Times**: Set due dates and times for todos
- **Priority Levels**: Low, medium, and high priority options
- **Reminder Support**: API endpoints for browser notifications
- **Responsive Design**: Works on all device sizes
- **Soft Pastel UI**: Beautiful gradient background with pastel colors
- **AI-Powered Chatbot**: Natural language interface for todo management with Groq API integration
- **Multilingual Support**: English and Urdu language support
- **Floating Chat Interface**: Professional UI with gradient buttons and chat bubbles

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Python FastAPI, SQLModel, PostgreSQL
- **Database**: PostgreSQL (compatible with Vercel Postgres)
- **Deployment**: Vercel (Frontend + Python Serverless Functions)

## 🚀 Deployment on Vercel

### Prerequisites

1. Vercel account
2. PostgreSQL database (Vercel Postgres recommended)
3. Environment variables configured

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL=your_postgres_connection_string
VERCEL_POSTGRES_URL=your_vercel_postgres_url

# JWT
SECRET_KEY=your_super_secret_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Groq API (for AI chatbot)
GROQ_API_KEY=your_groq_api_key_here
```

> **Note**: Get your Groq API key from [console.groq.com](https://console.groq.com) for the AI chatbot functionality.

### Deployment Steps

1. **Prepare your repository**:
   - Ensure your code is in a Git repository
   - Make sure all dependencies are properly listed in package.json and requirements.txt

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect the Next.js frontend and Python API routes
   - The `vercel.json` file is already configured for proper routing

3. **Configure Environment Variables**:
   - Add the environment variables in the Vercel dashboard under Settings > Environment Variables

4. **Build and Deploy**:
   - Vercel will automatically build both the frontend and backend
   - The API routes will be deployed as serverless functions

## 🔧 Local Development

### Backend (Python API)

```bash
cd api
pip install -r requirements.txt
uvicorn index:app --reload
```

### Frontend (Next.js)

```bash
cd app
npm install
npm run dev
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user and get JWT token
- `POST /api/auth/logout` - Logout user

### Todo Management
- `GET /api/todos` - Get all todos for current user
- `POST /api/todos` - Create a new todo
- `GET /api/todos/{id}` - Get a specific todo
- `PUT /api/todos/{id}` - Update a specific todo
- `PATCH /api/todos/{id}/complete` - Mark todo as complete (with recurring task handling)
- `DELETE /api/todos/{id}` - Delete a specific todo
- `GET /api/todos/reminders` - Get todos with due dates for reminders

### Conversation Management
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations` - Get all conversations for current user
- `GET /api/conversations/{id}` - Get a specific conversation with messages
- `POST /api/conversations/{id}/messages` - Add a message to a conversation
- `GET /api/conversations/{id}/messages` - Get all messages in a conversation

### AI Chat
- `POST /api/chat` - Chat with the AI assistant using natural language for todo management

## 🎨 UI Features

- Soft pastel gradient background (pink to purple to blue)
- Responsive design with Tailwind CSS
- Dark mode support
- Smooth transitions and animations
- Accessible components

## 🔄 Recurring Tasks

The application supports recurring tasks with the following recurrence rules:
- Daily
- Weekly
- Monthly
- None (single occurrence)

When a recurring task is marked as complete, the system automatically creates the next instance based on the recurrence rule.

## 📅 Due Dates & Times

Todos support:
- Due dates (YYYY-MM-DD)
- Due times (HH:MM or HH:MM:SS)
- Both date and time combinations

## 🛡️ Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- SQL injection prevention through SQLModel
- Input validation with Pydantic

## 🚀 Performance

- Optimized for Vercel serverless deployment
- Database connection pooling for serverless environments
- Efficient database queries with SQLModel
- Client-side caching in the frontend

## 🏗️ Project Structure

```
.
├── api/                    # Python FastAPI backend (Vercel serverless)
│   ├── index.py           # Main API file with all functionality
│   └── requirements.txt   # Python dependencies
├── app/                   # Next.js frontend
│   ├── src/
│   │   ├── app/          # Next.js 14 App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utility functions
│   │   └── styles/       # Global styles
│   ├── package.json
│   └── next.config.js
├── vercel.json           # Vercel configuration
└── requirements.txt      # Root Python dependencies
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Ensure your DATABASE_URL is properly set and accessible
2. **CORS Issues**: The API allows all origins in development; restrict in production
3. **JWT Expiration**: Tokens expire after 30 minutes by default

## 🤖 AI Chatbot Features

The AI chatbot provides natural language processing for todo management with the following capabilities:

- **Add Tasks**: "Add a task to buy groceries" → creates a new todo
- **Show All Tasks**: "Show me all my tasks" → displays all todos
- **Show Pending Tasks**: "What's pending?" → shows only incomplete todos
- **Mark Complete**: "Mark task 3 as complete" → updates todo status
- **Delete Tasks**: "Delete the meeting task" → removes specified todo
- **Update Tasks**: "Change task 1 to 'Call mom tonight'" → modifies todo title
- **Show Completed**: "What have I completed?" → shows completed todos
- **Multilingual Support**: Works in both English and Urdu

The chatbot uses Groq API for fast, efficient natural language processing and integrates seamlessly with the existing todo management system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.