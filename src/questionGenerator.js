const axios = require('axios');
require('dotenv').config();

class GeminiQuestionGenerator {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY not found in .env file');
    }
  }

  /**
   * Generate questions about code
   * @param {Object} analysis - Code analysis (functions, classes, etc)
   * @param {string} code - The actual source code
   * @param {number} numQuestions - How many questions to generate
   */
  async generateQuestions(analysis, code, numQuestions = 3) {
    try {
      console.log('🤖 Calling Google Gemini API...');
      
      // Build the prompt
      const prompt = this.buildPrompt(analysis, code, numQuestions);
      
      // Call Gemini API
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      // Extract the response text
      const responseText = response.data.candidates[0].content.parts[0].text;
      
      // Parse the JSON questions
      const questions = this.parseQuestions(responseText);
      
      console.log(`✅ Generated ${questions.length} questions`);
      return questions;
      
    } catch (error) {
      console.error('⚠️  Gemini API error:', error.message);
      console.log('📚 Switching to demo mode with sample questions...');
      return this.generateDemoQuestions(analysis, numQuestions);
    }
  }

  /**
   * Build the prompt for Gemini
   */
  buildPrompt(analysis, code, numQuestions) {
    return `You are a coding tutor. Generate exactly ${numQuestions} multiple-choice questions about this code to help someone learn programming.

CODE ANALYSIS:
- Functions: ${analysis.functions?.length || 0}
- Classes: ${analysis.classes?.length || 0}
- Variables: ${analysis.variables?.length || 0}
- Language: ${analysis.language || 'Unknown'}

SOURCE CODE:
\`\`\`
${code.substring(0, 1000)}
\`\`\`

REQUIREMENTS:
1. Generate ${numQuestions} questions
2. Each question should test understanding
3. Include 4 multiple choice options
4. Mark correct answer (0-3 index)
5. Include explanation

RESPONSE FORMAT - Return ONLY valid JSON, no other text:
[
  {
    "question": "What does this code do?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "The correct answer is A because..."
  }
]`;
  }

  /**
   * Generate demo questions (fallback when API fails)
   */
  generateDemoQuestions(analysis, numQuestions = 3) {
    const demoQuestions = [
      {
        question: "How many functions are in this code?",
        options: [
          `${analysis.functions?.length || 0} functions`,
          `${(analysis.functions?.length || 0) + 1} functions`,
          `${Math.max(0, (analysis.functions?.length || 0) - 1)} functions`,
          "No functions"
        ],
        correct: 0,
        explanation: `The code contains ${analysis.functions?.length || 0} function(s): ${(analysis.functions || []).join(', ') || 'none'}`
      },
      {
        question: "What programming language is this?",
        options: [analysis.language || 'JavaScript', "Python", "Java", "C++"],
        correct: 0,
        explanation: `This code is written in ${analysis.language || 'JavaScript'}.`
      },
      {
        question: "How many classes are defined?",
        options: [
          `${analysis.classes?.length || 0} classes`,
          `${(analysis.classes?.length || 0) + 1} classes`,
          `${Math.max(0, (analysis.classes?.length || 0) - 1)} classes`,
          "More than 5 classes"
        ],
        correct: 0,
        explanation: `The code defines ${analysis.classes?.length || 0} class(es): ${(analysis.classes || []).join(', ') || 'none'}`
      }
    ];
    
    return demoQuestions.slice(0, numQuestions);
  }

  /**
   * Parse the JSON response from Gemini
   */
  parseQuestions(responseText) {
    try {
      // Find JSON array in response
      const jsonMatch = responseText.match(/\[\s*{[\s\S]*}\s*\]/);
      
      if (!jsonMatch) {
        console.warn('⚠️  No JSON found in response');
        return [];
      }
      
      const questions = JSON.parse(jsonMatch[0]);
      return Array.isArray(questions) ? questions : [];
      
    } catch (error) {
      console.error('❌ Error parsing questions:', error.message);
      return [];
    }
  }

  /**
   * Test the API connection
   */
  async testConnection() {
    try {
      console.log('🧪 Testing Gemini API connection...');
      console.log('API Endpoint:', this.baseUrl);
      console.log('API Key present:', !!this.apiKey);
      
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: "Say 'Hello' in one word"
                }
              ]
            }
          ]
        },
        { 
          timeout: 10000,
          validateStatus: () => true  // Don't throw on any status
        }
      );
      
      if (response.status === 200) {
        console.log('✅ API Connection successful!');
        return true;
      } else {
        console.error('❌ API returned status:', response.status);
        console.error('Response data:', JSON.stringify(response.data, null, 2));
        return false;
      }
      
    } catch (error) {
      console.error('❌ API Connection failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  }
}

module.exports = GeminiQuestionGenerator;