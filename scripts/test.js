const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

if (!GROQ_API_KEY) {
  throw new Error("Set GROQ_API_KEY before running this test.");
}

async function testGroq() {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: "Hello! Tell me in one sentence what you can do." }],
        temperature: 0.2
      })
    });

    if (!response.ok) throw new Error(`Groq request failed with status ${response.status}.`);
    const data = await response.json();
    console.log("Groq API key is working.");
    console.log("\nResponse:");
    console.log(data.choices?.[0]?.message?.content ?? "No response content.");
  } catch (error) {
    console.log("Groq API key test failed.");
    console.log("Error:", error.message);
  }
}

testGroq();