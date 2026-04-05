# 🚀 PowerShell Scripts Guide

Quick one-command setup and launch for the Code Learning Extension!

## 📋 Scripts Overview

### 1. **setup-and-run.ps1** ⭐ Main Script
Complete setup and launch in one command.

**Does:**
- ✅ Checks Node.js installation
- ✅ Creates .env file if missing
- ✅ Gets API key from you
- ✅ Installs npm dependencies
- ✅ Runs all tests
- ✅ Launches VS Code with extension

**When to use:** First time setup

```powershell
.\setup-and-run.ps1
```

### 2. **run.ps1** Quick Launch
Fast launch when everything is already set up.

**Does:**
- ✅ Verifies setup is complete
- ✅ Runs quick health check
- ✅ Launches VS Code extension

**When to use:** Subsequent runs

```powershell
.\run.ps1
```

### 3. **enable-scripts.ps1** Permission Helper
Fixes PowerShell execution policy errors.

**When to use:** If you get "cannot be loaded because running scripts is disabled"

```powershell
.\enable-scripts.ps1
```

---

## 🎯 Quick Start

### First Time Setup (3 steps)

#### Step 1: Fix PowerShell (if needed)
If you get a permission error, run:
```powershell
# Right-click PowerShell → Run as Administrator
.\enable-scripts.ps1
```

#### Step 2: Run Setup
```powershell
.\setup-and-run.ps1
```

This script will:
1. Check if Node.js is installed
2. Ask you to create/update .env with API key
3. Install dependencies
4. Run tests
5. Launch VS Code

#### Step 3: Done! 🎉
VS Code extension is running. Open any code file and right-click to use it.

---

## 🔄 Subsequent Runs

After first setup, just run:
```powershell
.\run.ps1
```

This quickly launches the extension without re-running all setup steps.

---

## 🚨 Troubleshooting

### Issue: "cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
# Run as Administrator:
.\enable-scripts.ps1

# Then try again:
.\setup-and-run.ps1
```

### Issue: "Node.js is not installed"

**Solution:**
1. Download from: https://nodejs.org/
2. Install LTS version (v18 or v20)
3. Restart PowerShell
4. Run script again

### Issue: Script stops at .env configuration

**Solution:**
1. Go to: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy it
4. When script asks, paste it
5. Restart script

### Issue: VS Code doesn't launch

**Solution:**
```powershell
# Check VS Code is installed and in PATH:
code --version

# If not found, add to PATH or launch manually:
code Z:\code-learning-extension
```

---

## 📖 What Happens During Setup

```
setup-and-run.ps1
├── ✅ Check Node.js/npm
├── ✅ Verify/Create .env
├── ✅ Prompt for API key
├── ✅ npm install
├── ✅ Run health-check.js
├── ✅ Run test-analyzer.js
├── ✅ Run test-storage.js
└── 🚀 Launch VS Code
    └── F5 to debug extension
```

---

## 💡 Tips & Tricks

### Run Tests Manually
```powershell
node test.js                  # Full test suite
node health-check.js          # System check
node test-analyzer.js         # Analyzer test
node test-storage.js          # Storage test
```

### View Logs During Extension Run
In VS Code:
1. Press `Ctrl + Shift + P`
2. Type: Output
3. Select: "Output"
4. Choose: "Code Learning Extension" or "Log (Extension Host)"

### Reload Extension
While debugging in VS Code:
- Press `F5` to restart
- Press `Ctrl + Shift + D` to open debug panel
- Click stop button to stop debugging

### Check Extension Status
```powershell
# See what's installed:
npm list

# Check dependencies:
npm list @google/generative-ai
npm list axios
npm list dotenv
```

---

## 🔧 Advanced Usage

### Custom Installation Path
By default scripts use current directory. To use a different path:

```powershell
cd C:\path\to\code-learning-extension
.\setup-and-run.ps1
```

### Manual Setup (without scripts)
If scripts don't work:

```powershell
# 1. Install dependencies
npm install

# 2. Create .env
Copy-Item .env.example .env

# 3. Edit .env with your API key
# (Use any text editor)

# 4. Run tests
node test.js

# 5. Launch VS Code
code .

# Then press F5 in VS Code
```

---

## 📋 Prerequisites Checklist

Before running scripts, ensure you have:

- [ ] Windows PowerShell 5.1+ (built-in on Windows 10/11)
- [ ] Node.js 16+ installed (https://nodejs.org/)
- [ ] VS Code installed (https://code.visualstudio.com/)
- [ ] Project folder extracted/cloned

To check your versions:
```powershell
# Check PowerShell
$PSVersionTable.PSVersion

# Check Node.js
node --version

# Check npm
npm --version

# Check VS Code
code --version
```

---

## 🎓 Understanding the Flow

```
User runs script
           ↓
     Does setup
           ↓
     Runs tests
           ↓
     Launches VS Code
           ↓
   Extension loads
           ↓
   Open any .js/.py/.java file
           ↓
   Right-click → Select command
           ↓
   Questions appear
           ↓
   Learn and improve!
```

---

## 📞 Getting Help

If scripts fail:

1. **Check prerequisites** (see checklist above)
2. **Run health-check.js** manually:
   ```powershell
   node health-check.js
   ```
3. **Check error messages** - they usually tell you what's wrong
4. **Try manual setup** (see Advanced section above)

---

## ✨ What's Next?

After running the extension:

1. **Test it** - Open a code file and use the command
2. **Get API key** - Go to https://makersuite.google.com/app/apikey
3. **Configure .env** - Add your real API key
4. **Create questions** - Right-click and generate questions
5. **Enjoy learning!** 🚀

---

**Happy learning!** 🎉
