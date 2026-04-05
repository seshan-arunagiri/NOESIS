const vscode = require('vscode');
const GeminiQuestionGenerator = require('./questionGenerator');
const CodeAnalyzer = require('./codeAnalyzer');
const Storage = require('./storage');

let generator;
let storage;
let currentPanel = undefined;

/**
 * Activate the extension
 */
function activate(context) {
  console.log('🚀 Code Learning Extension activated!');
  
  try {
    generator = new GeminiQuestionGenerator();
    storage = new Storage();
  } catch (error) {
    vscode.window.showErrorMessage(
      `❌ Error initializing: ${error.message}\n\nMake sure GOOGLE_API_KEY is set in .env file`
    );
    return;
  }

  // Register the command
  let disposable = vscode.commands.registerCommand(
    'code-learning.analyzeCode',
    analyzeCurrentFile
  );

  context.subscriptions.push(disposable);
}

/**
 * Analyze the current open file
 */
async function analyzeCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  
  if (!editor) {
    vscode.window.showWarningMessage('❌ No file is open');
    return;
  }

  const code = editor.document.getText();
  const filePath = editor.document.fileName;

  // Show loading message
  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: '🤖 Analyzing code with Gemini...' },
    async (progress) => {
      try {
        // Analyze code structure
        progress.report({ message: 'Analyzing code structure...' });
        const analysis = CodeAnalyzer.analyze(code);

        // Generate questions
        progress.report({ message: 'Generating questions...' });
        const questions = await generator.generateQuestions(analysis, code, 3);

        if (questions.length === 0) {
          vscode.window.showWarningMessage(
            '❌ Could not generate questions. Check your API key and try again.'
          );
          return;
        }

        // Save questions
        storage.saveQuestions(filePath, questions);

        // Show in webview
        showQuestionsInWebview(filePath, questions, analysis);
        
        vscode.window.showInformationMessage(
          `✅ Generated ${questions.length} questions!`
        );

      } catch (error) {
        vscode.window.showErrorMessage(
          `❌ Error: ${error.message}`
        );
        console.error(error);
      }
    }
  );
}

/**
 * Display questions in a webview panel
 */
function showQuestionsInWebview(filePath, questions, analysis) {
  const column = vscode.ViewColumn.Two;

  if (currentPanel) {
    currentPanel.dispose();
  }

  currentPanel = vscode.window.createWebviewPanel(
    'codeQuestions',
    '📚 Learning Questions',
    column,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(__dirname)]
    }
  );

  const htmlContent = getWebviewContent(filePath, questions, analysis);
  currentPanel.webview.html = htmlContent;

  // Handle messages from webview
  currentPanel.webview.onDidReceiveMessage(
    (message) => {
      if (message.command === 'answerQuestion') {
        storage.saveAnswer(filePath, message.questionIndex, message.answer);
        
        const stats = storage.getStats(filePath);
        currentPanel.webview.postMessage({
          command: 'updateStats',
          stats
        });
      }
    }
  );

  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
    }
  );
}

/**
 * Get HTML content for webview
 */
function getWebviewContent(filePath, questions, analysis) {
  const fileName = require('path').basename(filePath);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Learning Questions</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      line-height: 1.6;
    }

    .container {
      max-width: 700px;
      margin: 0 auto;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      color: white;
    }

    .header h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }

    .file-info {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 10px;
    }

    .stats {
      display: flex;
      gap: 20px;
      font-size: 14px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      opacity: 0.8;
      font-size: 12px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: bold;
    }

    .question-container {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .question-number {
      color: #667eea;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 10px;
    }

    .question-text {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .option {
      padding: 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--vscode-editor-background);
    }

    .option:hover {
      background: var(--vscode-input-background);
      border-color: #667eea;
    }

    .option input[type="radio"] {
      margin-right: 10px;
    }

    .option label {
      display: flex;
      align-items: center;
      cursor: pointer;
      width: 100%;
    }

    .submit-btn {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      margin-top: 10px;
      transition: background 0.2s;
    }

    .submit-btn:hover {
      background: #764ba2;
    }

    .explanation {
      margin-top: 15px;
      padding: 15px;
      background: rgba(102, 126, 234, 0.1);
      border-left: 4px solid #667eea;
      border-radius: 4px;
      display: none;
    }

    .explanation.show {
      display: block;
    }

    .explanation-label {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .feedback {
      margin-top: 10px;
      font-size: 14px;
      font-weight: 600;
    }

    .feedback.correct {
      color: #4ade80;
    }

    .feedback.incorrect {
      color: #f87171;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 Code Learning Assistant</h1>
      <div class="file-info">File: <strong>${fileName}</strong></div>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-label">Functions</div>
          <div class="stat-value">${analysis.functions.length}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Classes</div>
          <div class="stat-value">${analysis.classes.length}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Language</div>
          <div class="stat-value">${analysis.language}</div>
        </div>
      </div>
    </div>

    ${questions.map((q, idx) => \`
      <div class="question-container">
        <div class="question-number">Question \${idx + 1} of \${questions.length}</div>
        <div class="question-text">\${q.question}</div>
        
        <div class="options" id="options-\${idx}">
          \${q.options.map((option, optIdx) => \`
            <div class="option">
              <label>
                <input 
                  type="radio" 
                  name="question-\${idx}" 
                  value="\${optIdx}"
                  onchange="handleAnswer(\${idx}, \${optIdx})"
                >
                \${option}
              </label>
            </div>
          \`).join('')}
        </div>

        <div class="explanation" id="explanation-\${idx}">
          <div class="explanation-label">Explanation:</div>
          <div>\${q.explanation}</div>
          <div class="feedback" id="feedback-\${idx}"></div>
        </div>
      </div>
    \`).join('')}
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function handleAnswer(questionIndex, selectedOption) {
      // Send answer to extension
      vscode.postMessage({
        command: 'answerQuestion',
        questionIndex,
        answer: selectedOption
      });

      // Show explanation
      const explanationEl = document.getElementById('explanation-' + questionIndex);
      explanationEl.classList.add('show');

      // Show if correct/incorrect
      const feedbackEl = document.getElementById('feedback-' + questionIndex);
      const questions = ${JSON.stringify(questions)};
      const isCorrect = selectedOption === questions[questionIndex].correct;
      
      feedbackEl.textContent = isCorrect ? '✅ Correct!' : '❌ Incorrect';
      feedbackEl.className = 'feedback ' + (isCorrect ? 'correct' : 'incorrect');
    }

    // Listen for updates from extension
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updateStats') {
        console.log('Stats updated:', message.stats);
      }
    });
  </script>
</body>
</html>
  `;
}

/**
 * Deactivate the extension
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate
};
