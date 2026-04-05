# Scripts & One-Click Launch Guide

Complete setup and launch for Code Learning Extension with minimal clicks!

## 🚀 Quick Start (Choose Your Method)

### Option 1: Batch Files (Easiest - Windows)
**No PowerShell experience needed!**

1. **First Time Setup:**
   - Double-click: `setup-and-run.bat`
   - Update .env file when prompted
   - Press Enter to complete
   - VS Code will launch

2. **Subsequent Runs:**
   - Double-click: `run.bat`
   - Done!

### Option 2: PowerShell Scripts (Advanced)

1. **First Time - Enable Scripts:**
   - Right-click PowerShell → "Run as Administrator"
   - Run: `.\enable-scripts.ps1`
   - Close and reopen PowerShell

2. **Setup and Launch:**
   - Run: `.\setup-and-run.ps1`
   - Update .env when prompted
   - VS Code launches

3. **Subsequent Runs:**
   - Run: `.\run.ps1`

---

## 📁 Available Scripts

### Batch Scripts (.bat) - Windows Only
✅ **Easiest to use** - Just double-click
- `setup-and-run.bat` - Complete setup + launch
- `run.bat` - Quick launch
- `QUICK-START.bat` - Display this guide

### PowerShell Scripts (.ps1) - Advanced
- `setup-and-run.ps1` - Complete setup (parametrized)
- `run.ps1` - Quick launch
- `enable-scripts.ps1` - Fix execution policy

---

## 🎯 What Each Script Does

### setup-and-run.bat / setup-and-run.ps1
**Run this first to set up everything**

1. ✓ Checks if Node.js is installed
2. ✓ Verifies .env file exists
3. ✓ Prompts for API key if needed
4. ✓ Installs npm dependencies
5. ✓ Runs health check
6. ✓ Launches VS Code
7. ✓ Shows instructions

### run.bat / run.ps1
**Quick launch after initial setup**

1. ✓ Verifies setup is complete
2. ✓ Runs quick health check
3. ✓ Launches VS Code

### enable-scripts.ps1
**If you get PowerShell permission errors**

Used for: `.\setup-and-run.ps1: cannot be loaded because running scripts is disabled`

Solution:
```powershell
# Right-click PowerShell as Administrator
.\enable-scripts.ps1
```

---

## ⚠️ Troubleshooting Scripts

### Issue: "permission denied" or "cannot be loaded"
**Solution:**
```powershell
# Run as Administrator, then:
.\enable-scripts.ps1
```

### Issue: "Node.js not found"
**Solution:**
1. Install from https://nodejs.org/
2. Restart PowerShell/cmd
3. Run script again

### Issue: ".env not found"
**Solution:**
- Script auto-creates it from .env.example
- Update with your API key when prompted

### Issue: Script stops at "Press Enter after updating"
**Solution:**
1. Edit .env file with real API key
2. Save the file
3. Return to script and press Enter

### Issue: "npm install failed"
**Solution:**
```batch
REM Manual install:
npm install
REM Then try script again
```

---

## 🔧 Manual Setup (If Scripts Don't Work)

```powershell
# Step 1: Navigate to project
cd Z:\code-learning-extension

# Step 2: Copy .env template
copy .env.example .env

# Step 3: Edit .env with your API key
# (Use any text editor, replace YOUR_API_KEY)

# Step 4: Install dependencies
npm install

# Step 5: Run tests
node test.js
node health-check.js

# Step 6: Open in VS Code
code .

# Step 7: Press F5 to launch extension
```

---

## 📋 Real-Time Script Execution Examples

### Batch File Example:
```batch
Z:\code-learning-extension> setup-and-run.bat

============================================================
  Code Learning Extension - Setup and Launch
============================================================

Step 1: Checking Node.js Installation...
OK - Node.js found: v22.17.1
OK - npm found: 10.8.1

Step 2: Verifying .env Configuration...
OK - Created .env from .env.example

Step 3: Installing Dependencies...
OK - Dependencies already installed

Step 4: Running Health Check...

============================================================
   Setup Complete!
============================================================

Next steps:
   1. Open VS Code
   2. Press F5 to start extension
   3. Open any code file
   4. Right-click and select command
```

### PowerShell Example:
```powershell
PS Z:\code-learning-extension> .\setup-and-run.ps1

============================================================
  Code Learning Extension - Setup and Launch
============================================================

Step 1: Checking Node.js Installation...
OK - Node.js found: v22.17.1
OK - npm found: 10.8.1

Step 2: Verifying .env Configuration...
Update .env with key from: https://makersuite.google.com/app/apikey
Press Enter after updating: [User presses Enter]
OK - .env configured

Step 3: Installing Dependencies...
OK - Dependencies already installed

Step 4: Running Health Check...
[health check output]

Done: VS Code launched
```

---

## 🎯 Complete Workflow

```
User clicks script
       ↓
Script checks prerequisites
       ↓
Script installs dependencies (if needed)
       ↓
Script runs tests/health check
       ↓
Script launches VS Code
       ↓
Extension loads in debug mode
       ↓
User opens code file
       ↓
User right-clicks to generate questions
       ↓
Learn!
```

---

## 📱 Summary Table

| Task | Windows Batch | PowerShell | Manual |
|------|---------------|-----------|--------|
| **First Setup** | `setup-and-run.bat` | `.\setup-and-run.ps1` | npm install + code . |
| **Quick Launch** | `run.bat` | `.\run.ps1` | code . (then F5) |
| **Fix Permissions** | N/A | `.\enable-scripts.ps1` | N/A |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Prerequisites** | Windows | PowerShell | Node.js + VS Code |

---

## ✅ Verification Checklist

Before running scripts, ensure you have:

- [ ] Windows PowerShell or Command Prompt
- [ ] Node.js installed (test: `node --version`)
- [ ] VS Code installed (test: `code --version`)
- [ ] Project folder ready
- [ ] .env.example present (included in project)

---

## 🎓 Understanding Script Flow

```
setup-and-run.bat:
├─ Check Node.js/npm
├─ Setup .env file
├─ Prompt for API key
├─ Run: npm install
├─ Run: node health-check.js
└─ Launch: code . (VS Code)

run.bat:
├─ Check setup complete (.env exists)
├─ Check dependencies installed (node_modules)
├─ Run: node health-check.js
└─ Launch: code . (VS Code)
```

---

## 💡 Pro Tips

1. **Batch files ask for confirmation** - Just press Enter when prompted
2. **PowerShell scripts need permissions** - Run `enable-scripts.ps1` first if needed
3. **Health check is fast** - Verifies everything in seconds
4. **VS Code auto-opens** - No need to manually launch
5. **Can run scripts anytime** - Safe to re-run even after setup

---

## 🚀 You're Ready!

Choose your preferred method and run the script:

```batch
REM Batch (easiest):
setup-and-run.bat

REM PowerShell (advanced):
.\setup-and-run.ps1

REM Or do it manually:
npm install && code .
```

**Then press F5 in VS Code to launch the extension!** 🎉
