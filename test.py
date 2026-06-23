from google import genai

import os

client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY")
)

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Hello"
)

print(response.text)