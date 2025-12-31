# Testing the Chatbot Integration

## Setup Instructions

1. **Environment Variables**:
   - Copy `.env.example` to `.env` in both the root and api directories
   - Add your GROQ_API_KEY to both `.env` files
   - Set your database URL in the `.env` files
   - For local development, set `NEXT_PUBLIC_API_URL=http://localhost:8000`

2. **Install Dependencies**:
   - Backend: `cd api && pip install -r requirements.txt`
   - Frontend: `cd app && npm install`

## Running the Application Locally

1. **Start the Backend API**:
   ```bash
   cd api
   uvicorn index:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the Frontend**:
   ```bash
   cd app
   npm run dev
   ```

## Testing the Chatbot Flow

1. **Open the Application**:
   - Navigate to `http://localhost:3000` in your browser
   - Register and login to create an account

2. **Test the Chatbot**:
   - Click the floating chat button (speech bubble icon) in the bottom right
   - Type a message like "Add a task to buy milk" and press Enter or click the send button
   - The chatbot should respond and potentially create the task in your todo list

3. **Test Multi-language Support**:
   - Try typing messages in English and Urdu to test language detection
   - The chatbot should respond in the same language as your input

4. **Test Different Commands**:
   - "Add a task to buy milk" → Should create a new todo
   - "Show my todos" → Should list existing todos
   - "Mark task as complete" → Should update a todo's status
   - "Delete a task" → Should remove a todo

## Expected Behavior

- **Frontend**: Messages should appear in the chat window with proper styling
- **Backend**: API should receive the message, process it with Groq AI, call appropriate tools, and return a response
- **Database**: Conversations and messages should be saved to the database
- **Error Handling**: Proper error messages should appear in the chat and as toasts

## Debugging Steps

### Frontend Debugging:
1. Open browser developer tools (F12)
2. Go to Console tab to check for JavaScript errors
3. Go to Network tab to see API requests to `/api/chat`
4. Look for the debug logs in the console when clicking the send button
5. Check that the button is properly calling `handleSendMessage`

### Backend Debugging:
1. Check the terminal where the backend is running
2. Look for the debug print statements when the API is called
3. Verify that the GROQ_API_KEY is properly set
4. Check for any error messages in the terminal

## Troubleshooting

1. **No response from chatbot**:
   - Check that GROQ_API_KEY is set correctly
   - Verify that the backend is running on port 8000
   - Check browser console for errors
   - Check backend logs for errors
   - Ensure you're logged in and have a valid JWT token

2. **Connection errors**:
   - Verify NEXT_PUBLIC_API_URL is set correctly
   - Check that the backend is accessible from the frontend
   - Check that the API endpoint `/api/chat` is accessible

3. **Authentication errors**:
   - Ensure you're logged in before using the chatbot
   - Verify your JWT token is being sent with requests
   - Check that the token hasn't expired

4. **Button not responding**:
   - Check if the button is disabled (when input is empty, loading, or no token)
   - Verify that the onClick handler is properly attached
   - Look for any JavaScript errors that might prevent the function from executing

5. **Network request not being sent**:
   - Check the Network tab in browser dev tools
   - Verify that the API URL is correct
   - Ensure the sendMessage function is being called

6. **Token not updating in context after login**:
   - Make sure you're logging in fresh after implementing the fix
   - The auth context now properly updates the token state after login
   - Check that the AuthProvider is properly wrapping your app in layout.tsx
   - The token should now be reactive and update in the Chatbot component after login