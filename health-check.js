#!/usr/bin/env node
/**
 * Extension Health Check
 * Run this before launching the extension to ensure everything is configured correctly
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

console.log("\n🏥 Code Learning Extension - Health Check\n");
console.log("=" .repeat(50) + "\n");

let issues = [];
let warnings = [];

// Check 1: .env file
console.log("📋 Checking .env file...");
if (fs.existsSync(path.join(__dirname, ".env"))) {
  console.log("   ✅ .env file exists");
} else {
  issues.push("❌ .env file not found. Copy .env.example to .env");
  console.log("   ❌ .env file not found");
}

// Check 2: API Key
console.log("\n📋 Checking GOOGLE_API_KEY...");
if (process.env.GOOGLE_API_KEY) {
  const key = process.env.GOOGLE_API_KEY;
  if (key.includes("YOUR_API_KEY")) {
    issues.push("❌ GOOGLE_API_KEY placeholder detected. Update with your actual key");
    console.log("   ❌ Placeholder key detected - update with real key");
  } else if (key.startsWith("AIzaSy")) {
    console.log("   ✅ Valid-looking API key configured");
  } else {
    warnings.push("⚠️  API key format unexpected. Verify it's correct");
    console.log("   ⚠️  API key format looks unusual");
  }
} else {
  issues.push("❌ GOOGLE_API_KEY not set. Add to .env file");
  console.log("   ❌ GOOGLE_API_KEY not found");
}

// Check 3: Dependencies
console.log("\n📋 Checking dependencies...");
const packageJsonPath = path.join(__dirname, "package.json");
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const requiredDeps = ["axios", "dotenv", "@google/generative-ai"];
  const allInstalled = requiredDeps.every(dep => pkg.dependencies[dep]);
  
  if (allInstalled) {
    console.log("   ✅ All dependencies declared in package.json");
    // Check if node_modules exists
    if (fs.existsSync(path.join(__dirname, "node_modules"))) {
      console.log("   ✅ node_modules installed");
    } else {
      issues.push("📦 Run 'npm install' to install dependencies");
      console.log("   ⚠️  node_modules not found");
    }
  } else {
    const missing = requiredDeps.filter(dep => !pkg.dependencies[dep]);
    issues.push(`❌ Missing dependencies: ${missing.join(", ")}`);
    console.log(`   ❌ Missing: ${missing.join(", ")}`);
  }
} else {
  issues.push("❌ package.json not found");
  console.log("   ❌ package.json not found");
}

// Check 4: Core files
console.log("\n📋 Checking core files...");
const coreFiles = [
  "src/extension.js",
  "src/questionGenerator.js",
  "src/codeAnalyzer.js",
  "src/storage.js"
];
let allFilesExist = true;
coreFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file}`);
    allFilesExist = false;
  }
});
if (!allFilesExist) {
  issues.push("❌ Some core files are missing");
}

// Check 5: VS Code configuration
console.log("\n📋 Checking VS Code extension config...");
const launchPath = path.join(__dirname, ".vscode/launch.json");
if (fs.existsSync(launchPath)) {
  console.log("   ✅ Launch configuration exists");
} else {
  warnings.push("⚠️  .vscode/launch.json not found (F5 might not work)");
  console.log("   ⚠️  No launch.json found");
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("\n📊 Health Check Summary:\n");

if (issues.length === 0 && warnings.length === 0) {
  console.log("✅ ALL CHECKS PASSED! You're ready to go.\n");
  console.log("Next step: Press F5 in VS Code to launch the extension\n");
} else {
  if (issues.length > 0) {
    console.log("🔴 Issues to fix:\n");
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log("🟡 Warnings:\n");
    warnings.forEach(warning => console.log(`  ${warning}`));
    console.log();
  }
  
  if (issues.length > 0) {
    console.log("After fixing the issues above, run this script again.\n");
  }
}

// Exit with appropriate code
process.exit(issues.length > 0 ? 1 : 0);
