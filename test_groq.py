from groq import Groq

# Paste your Groq API key here
GROQ_API_KEY = "gsk_your_api_key_here"

try:
    client = Groq(api_key=GROQ_API_KEY)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": "Hello! Tell me in one sentence what you can do."
            }
        ],
        temperature=0.2,
    )

    print("✅ GROQ API KEY IS WORKING!")
    print("\nResponse:")
    print(response.choices[0].message.content)

except Exception as e:
    print("❌ GROQ API KEY TEST FAILED")
    print(f"Error: {e}")