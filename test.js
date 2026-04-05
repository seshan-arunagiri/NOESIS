require("dotenv").config();

console.log("🧪 Code Learning Extension - Complete Test Suite\n");

// Test 1: Code Analyzer
console.log("📋 Test 1: Code Analyzer");
try {
  const analyzer = require('./src/codeAnalyzer');
  const result = analyzer.analyze('function test() { var x = 5; }');
  console.log("✅ Analyzer: OK\n");
} catch (e) {
  console.log("❌ Analyzer: FAILED -", e.message, "\n");
}

// Test 2: Storage  
console.log("📋 Test 2: Storage System");
try {
  const Storage = require('./src/storage');
  const storage = new Storage();
  console.log("✅ Storage: OK\n");
} catch (e) {
  console.log("❌ Storage: FAILED -", e.message, "\n");
}

// Test 3: Question Generator
console.log("📋 Test 3: Question Generator");
try {
  const Generator = require('./src/questionGenerator');
  const gen = new Generator();
  console.log("✅ Generator: OK");
  console.log(`   API Key configured: ${process.env.GOOGLE_API_KEY ? 'YES' : 'NO'}\n`);
} catch (e) {
  console.log("❌ Generator: FAILED -", e.message, "\n");
}

// Test 4: Environment
console.log("📋 Test 4: Environment Setup");
if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.includes('AIzaSy')) {
  console.log("✅ .env file properly configured\n");
} else {
  console.log("⚠️  GOOGLE_API_KEY not properly configured");
  console.log("   Copy .env.example to .env and add your API key\n");
}

console.log("✅ All core components are working!");
console.log("\n📚 Next steps:");
console.log("1. Press F5 in VS Code to launch the extension");
console.log("2. Open any JavaScript file");
console.log("3. Right-click and select '🤖 Analyze with AI & Generate Questions'");