import requests
import json
import time
import os

# Wait a moment for the server to start
time.sleep(3)

def test_chatbot():
    # Test the chat endpoint
    try:
        # First, register a test user
        register_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }

        response = requests.post("http://127.0.0.1:8001/api/auth/register", json=register_data)
        print(f"Registration response: {response.status_code}")
        if response.status_code == 200:
            user_data = response.json()
            print(f"User registered: {user_data}")
        else:
            print(f"Registration failed: {response.text}")

        # Login to get token
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }

        response = requests.post("http://127.0.0.1:8001/api/auth/login", json=login_data)
        print(f"Login response: {response.status_code}")
        if response.status_code == 200:
            auth_data = response.json()
            access_token = auth_data["access_token"]
            print("Login successful, got access token")
        else:
            print(f"Login failed: {response.text}")
            return

        # Test the chat endpoint
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        chat_data = {
            "message": "add task to buy milk",
            "conversation_id": None
        }

        print("Sending chat request...")
        response = requests.post("http://127.0.0.1:8001/api/chat", json=chat_data, headers=headers)
        print(f"Chat response status: {response.status_code}")
        print(f"Chat response: {response.text}")

        if response.status_code == 200:
            print("Chatbot is working correctly!")
            response_data = response.json()
            print(f"Response: {response_data['response']}")
        else:
            print("Chatbot test failed")

    except requests.exceptions.ConnectionError:
        print("Could not connect to server. Make sure it's running on http://127.0.0.1:8001")
    except Exception as e:
        print(f"Error during test: {str(e)}")

if __name__ == "__main__":
    test_chatbot()