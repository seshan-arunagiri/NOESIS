const Storage = require('./src/storage');

const storage = new Storage();

// Test save
const testQuestions = [
  {
    question: "What is 2+2?",
    options: ["3", "4", "5", "6"],
    correct: 1,
    explanation: "2+2 equals 4"
  }
];

storage.saveQuestions('test.js', testQuestions);
console.log('✅ Questions saved');

// Test load
const loaded = storage.loadQuestions('test.js');
console.log('✅ Questions loaded:', loaded.questions.length);

// Test answer
storage.saveAnswer('test.js', 0, 1);
const stats = storage.getStats('test.js');
console.log('✅ Stats:', stats);
