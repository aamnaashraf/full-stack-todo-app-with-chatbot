import requests
import json
import time

# Wait a moment for the server to start
time.sleep(2)

def test_auth():
    # Test registration
    print("Testing registration...")
    register_data = {
        "email": "testuser@example.com",
        "password": "testpassword123"
    }

    try:
        response = requests.post("http://127.0.0.1:8001/api/auth/register", json=register_data)
        print(f"Registration response: {response.status_code}")
        print(f"Registration response body: {response.text}")

        if response.status_code == 200:
            print("Registration successful!")
            user_data = response.json()
            print(f"Registered user: {user_data}")
        else:
            print("Registration failed!")
            return

        # Test login with the same credentials
        print("\nTesting login...")
        login_data = {
            "email": "testuser@example.com",
            "password": "testpassword123"
        }

        response = requests.post("http://127.0.0.1:8001/api/auth/login", json=login_data)
        print(f"Login response: {response.status_code}")
        print(f"Login response body: {response.text}")

        if response.status_code == 200:
            print("Login successful!")
            auth_data = response.json()
            print(f"Access token received: {auth_data.get('access_token', 'No token')[:20]}...")
        else:
            print("Login failed!")
            return

        # Test chat endpoint with the token
        print("\nTesting chat endpoint...")
        headers = {
            "Authorization": f"Bearer {auth_data['access_token']}",
            "Content-Type": "application/json"
        }

        chat_data = {
            "message": "add task to buy bread",
            "conversation_id": None
        }

        response = requests.post("http://127.0.0.1:8001/api/chat", json=chat_data, headers=headers)
        print(f"Chat response: {response.status_code}")
        print(f"Chat response body: {response.text}")

        if response.status_code == 200:
            print("Chat endpoint working!")
        else:
            print("Chat endpoint failed!")

    except requests.exceptions.ConnectionError:
        print("Could not connect to server. Make sure it's running on http://127.0.0.1:8001")
    except Exception as e:
        print(f"Error during test: {str(e)}")

if __name__ == "__main__":
    test_auth()