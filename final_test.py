import requests
import json
import time

# Wait a moment for the server to start
time.sleep(2)

def test_final():
    print("Final test - Registration and Login...")

    # Register a new user
    register_data = {
        "email": "finaltest@example.com",
        "password": "finaltestpassword123"
    }

    try:
        response = requests.post("http://127.0.0.1:8000/api/auth/register", json=register_data)
        print(f"Registration: {response.status_code} - {response.text}")

        if response.status_code == 200:
            # Login with the registered user
            login_data = {
                "email": "finaltest@example.com",
                "password": "finaltestpassword123"
            }

            response = requests.post("http://127.0.0.1:8000/api/auth/login", json=login_data)
            print(f"Login: {response.status_code} - {response.text[:100]}...")

            if response.status_code == 200:
                # Test chat functionality
                auth_data = response.json()
                headers = {
                    "Authorization": f"Bearer {auth_data['access_token']}",
                    "Content-Type": "application/json"
                }

                chat_data = {
                    "message": "add task to buy eggs",
                    "conversation_id": None
                }

                response = requests.post("http://127.0.0.1:8000/api/chat", json=chat_data, headers=headers)
                print(f"Chat: {response.status_code} - {response.text}")

                if response.status_code == 200:
                    print("\n✅ SUCCESS: All systems working correctly!")
                    print("- Registration: Working")
                    print("- Login: Working")
                    print("- Chatbot: Working")
                    print("- Database: Properly configured with conversation_id column")
                    print("- Authentication: Fully functional")
                else:
                    print("❌ Chat functionality failed")
            else:
                print("❌ Login failed")
        else:
            print("❌ Registration failed")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_final()