require("dotenv").config();

const axios = require("axios");

async function run() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey || apiKey.includes("YOUR_API_KEY")) {
      throw new Error("❌ GOOGLE_API_KEY not configured in .env file\n\n📖 Instructions:\n1. Get API key: https://makersuite.google.com/app/apikey\n2. Update .env file with your actual key\n3. Run this test again");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    console.log("🤖 Testing Gemini API connection...");

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: "Explain JavaScript in 2 sentences"
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    const responseText = response.data.candidates[0].content.parts[0].text;

    console.log("\n✅ API Connection successful!");
    console.log("✅ Gemini Response:\n");
    console.log(responseText);

  } catch (error) {
    if (error.response?.status === 404) {
      console.error("❌ ERROR: API Key invalid or model not available");
      console.error("\n📖 To fix this:\n1. Generate new API key: https://makersuite.google.com/app/apikey\n2. Update .env file\n3. Try again");
    } else if (error.message.includes("GOOGLE_API_KEY not configured")) {
      console.error(error.message);
    } else {
      console.error("❌ ERROR:", error.message);
    }
  }
}

run();