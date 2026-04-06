/**
 * NOESIS — Extension Entry Point (v5 — Evaluator + Retry Injection)
 *
 * Complete pipeline:
 *   onDidChangeTextDocument → SmartTrigger (15 s debounce)
 *   onDidSaveTextDocument   → ChangeDetector → SmartTrigger (major = immediate)
 *   SmartTrigger fires      → CodeAnalyzer → QuestionEngine → WebviewPanel
 *   User answers            → Evaluator.gradeAnswer() → PerformanceTracker → live stats
 *
 * New in v5 (over v4):
 *   - Routes all grading through evaluator.js (G2 — Task 10 proper)
 *   - Calls storage.saveWeakAreas() + storage.saveStreak() after every answer (G3 — Tasks 4,7)
 *   - After session complete, injects retry questions into the active webview (G5 — Task 9)
 *   - Sends updateDifficulty message when difficulty level changes (G4 — Task 5 UI)
 *   - Saves full stats snapshot to disk for cross-session continuity (Task 12)
 */

'use strict';

const path = require('path');
const vscode = require('vscode');

// Load .env BEFORE any module that reads process.env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ── Module imports ────────────────────────────────────────────────────────────
const CodeAnalyzer       = require('./codeAnalyzer');
const Storage            = require('./storage');
const SmartTrigger       = require('./trigger/smartTrigger');
const ChangeDetector     = require('./analyzer/changeDetector');
const PerformanceTracker = require('./evaluator/performanceTracker');
const Evaluator          = require('./evaluator/evaluator');       // v5: new
const QuestionEngine     = require('./ai/questionEngine');
const { getWebviewContent } = require('./webviewContent');

// ── Module-level singletons ───────────────────────────────────────────────────
/** @type {QuestionEngine|null}           */ let engine          = null;
/** @type {Storage}                       */ let storage;
/** @type {SmartTrigger}                  */ let smartTrigger;
/** @type {ChangeDetector}                */ let changeDetector;
/** @type {PerformanceTracker}            */ let perfTracker;
/** @type {vscode.WebviewPanel|undefined} */ let currentPanel;
/** @type {vscode.StatusBarItem}          */ let statusBar;

/**
 * Track the last-sent difficulty so we can detect level changes.
 * @type {'easy'|'medium'|'hard'|null}
 */
let lastDifficulty = null;

/**
 * Pending ChangeDetector results keyed by document URI string.
 * @type {Map<string, import('./analyzer/changeDetector').DetectionResult>}
 */
const pendingResult = new Map();

// ── Activation ────────────────────────────────────────────────────────────────

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('🚀 NOESIS activated — v5 Edition (Evaluator + Retry)');

  // ── Initialize core modules ────────────────────────────────────────────────
  storage        = new Storage(context.globalStorageUri.fsPath);
  changeDetector = new ChangeDetector();
  perfTracker    = new PerformanceTracker(context);

  // SmartTrigger fires when timing conditions are met
  smartTrigger = new SmartTrigger(
    (document) => runAnalysis(document),
    { typingDebounce: 15_000, minGap: 30_000 }
  );
  context.subscriptions.push({ dispose: () => smartTrigger.dispose() });

  initEngine();

  // ── Status bar item ───────────────────────────────────────────────────────
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'extension.startAnalysis';
  statusBar.text    = '$(beaker) NOESIS';
  statusBar.tooltip = 'Click to run NOESIS analysis on this file';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // ── Register Commands ─────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.startAnalysis', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('❌ NOESIS: Open a supported file first.');
        return;
      }
      if (!isSupportedLanguage(editor.document.languageId)) {
        vscode.window.showWarningMessage(
          `❌ NOESIS: "${editor.document.languageId}" is not a supported language.`
        );
        return;
      }
      smartTrigger.forceNow(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('code-learning.analyzeCode', () => {
      vscode.commands.executeCommand('extension.startAnalysis');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('code-learning.showPanel', () => {
      if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Beside);
      } else {
        vscode.window.showInformationMessage(
          'No quiz is active. Save a JS/TS/Python file or press the NOESIS status-bar button.'
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('code-learning.resetStats', async () => {
      const choice = await vscode.window.showWarningMessage(
        '⚠️  Reset all NOESIS performance stats?', 'Yes, Reset', 'Cancel'
      );
      if (choice === 'Yes, Reset') {
        perfTracker.reset();
        lastDifficulty = null;
        vscode.window.showInformationMessage('✅ NOESIS: Performance stats reset.');
        if (currentPanel) sendStatsToPanel();
      }
    })
  );

  // ── Event: Text Changed → SmartTrigger debounce ───────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length === 0) return;
      if (!isSupportedLanguage(event.document.languageId)) return;
      smartTrigger.onTextChange(event.document);
    })
  );

  // ── Event: File Saved → ChangeDetector + SmartTrigger ────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (!isSupportedLanguage(document.languageId)) return;

      const code = document.getText();
      if (code.trim().length < 30) return;

      const config = vscode.workspace.getConfiguration('codeValidator');
      if (!config.get('analyzeOnSave', true)) return;

      const analysis = CodeAnalyzer.analyze(code, document.languageId);
      const result   = changeDetector.detectChanges(document.fileName, code, analysis);

      console.log(
        `[NOESIS] Save detected: ${path.basename(document.fileName)} | ` +
        `firstSave=${result.isFirstSave} | changes=${result.changes.length} | ` +
        `major=${result.isMajorChange}`
      );

      pendingResult.set(document.uri.toString(), result);
      smartTrigger.onSave(document, result.isMajorChange);
    })
  );

  // ── Event: Settings Changed → re-init engine ──────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('codeValidator.openrouterApiKey')) {
        initEngine();
        vscode.window.showInformationMessage('NOESIS: API key updated — engine restarted.');
      }
    })
  );

  // ── First-run welcome message ─────────────────────────────────────────────
  const welcomed = context.globalState.get('noesis.v3.welcomed', false);
  if (!welcomed) {
    vscode.window
      .showInformationMessage(
        'NOESIS activated! Save any JS/TS/Python file to start your adaptive quiz.',
        'Configure API Key', 'Got it'
      )
      .then((pick) => {
        if (pick === 'Configure API Key') {
          vscode.commands.executeCommand(
            'workbench.action.openSettings', 'codeValidator.openrouterApiKey'
          );
        }
      });
    context.globalState.update('noesis.v3.welcomed', true);
  }
}

// ── Core Analysis Pipeline ─────────────────────────────────────────────────────

async function runAnalysis(document) {
  const key      = document.uri.toString();
  const code     = document.getText();
  const filePath = document.fileName;

  if (code.trim().length < 30) {
    console.log('[NOESIS] Skipping — file too small.');
    return;
  }

  let detectionResult = pendingResult.get(key);
  if (!detectionResult) {
    const analysis = CodeAnalyzer.analyze(code, document.languageId);
    detectionResult = changeDetector.detectChanges(filePath, code, analysis);
    console.log('[NOESIS] Fresh detection (no prior save result found).');
  }
  pendingResult.delete(key);

  if (!engine) {
    initEngine();
    if (!engine) {
      const pick = await vscode.window.showErrorMessage(
        'NOESIS: API key not configured. Add OPENROUTER_API_KEY to your .env file or in Settings.',
        'Open Settings'
      );
      if (pick === 'Open Settings') {
        vscode.commands.executeCommand(
          'workbench.action.openSettings', 'codeValidator.openrouterApiKey'
        );
      }
      return;
    }
  }

  const config       = vscode.workspace.getConfiguration('codeValidator');
  const numQuestions = config.get('numQuestions', 3);
  const difficulty   = perfTracker.getDifficulty();
  const weakTopics   = perfTracker.getWeakTopics();
  const perfSummary  = perfTracker.getSummaryForWebview();

  // Snapshot initial difficulty for change detection during session
  lastDifficulty = difficulty;

  await vscode.window.withProgress(
    {
      location:    vscode.ProgressLocation.Notification,
      title:       '🤖 NOESIS is thinking…',
      cancellable: false
    },
    async (progress) => {
      try {
        progress.report({ message: 'Analysing code structure…', increment: 20 });
        const analysis = CodeAnalyzer.analyze(code, document.languageId);

        progress.report({ message: 'Generating adaptive questions…', increment: 40 });
        const questions = await engine.generateQuestions({
          analysis,
          code,
          changes:     detectionResult.changes,
          isFirstSave: detectionResult.isFirstSave,
          difficulty,
          weakTopics,
          numQuestions
        });

        if (!questions || questions.length === 0) {
          vscode.window.showWarningMessage(
            '⚠️  NOESIS: No questions generated. ' +
            'The file may be too small or your API key may be invalid.'
          );
          return;
        }

        progress.report({ message: 'Opening quiz panel…', increment: 40 });
        storage.saveQuestions(filePath, questions);
        showPanel(filePath, questions, analysis, detectionResult, perfSummary, difficulty);

        const changeMsg = detectionResult.isFirstSave
          ? 'First analysis!'
          : detectionResult.changes.length > 0
            ? `${detectionResult.changes.length} change(s) detected — questions tailored!`
            : 'Code refreshed — questions updated.';

        vscode.window.showInformationMessage(
          `✅ NOESIS: ${questions.length} questions ready (${difficulty} difficulty). ${changeMsg}`
        );
      } catch (err) {
        console.error('[NOESIS] Pipeline error:', err);
        vscode.window.showErrorMessage(`❌ NOESIS Error: ${err.message}`);
      }
    }
  );
}

// ── Webview Panel ──────────────────────────────────────────────────────────────

function showPanel(filePath, questions, analysis, detectionResult, perfSummary, difficulty) {
  if (currentPanel) currentPanel.dispose();

  const viewColumn = vscode.window.activeTextEditor
    ? vscode.ViewColumn.Beside
    : vscode.ViewColumn.One;

  currentPanel = vscode.window.createWebviewPanel(
    'noesisQuiz',
    '🎓 NOESIS Quiz',
    { viewColumn, preserveFocus: true },
    {
      enableScripts:           true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(path.join(__dirname, '..'))],
    }
  );

  currentPanel.webview.html = getWebviewContent(filePath, analysis);

  // ── Handle messages FROM the webview ──────────────────────────────────────
  currentPanel.webview.onDidReceiveMessage(async (msg) => {
    switch (msg.command) {

      // Webview finished loading — send all data
      case 'webviewReady': {
        currentPanel.webview.postMessage({
          command:     'init',
          questions,
          fileName:    path.basename(filePath),
          difficulty,
          changes:     detectionResult.changes,
          isFirstSave: detectionResult.isFirstSave,
          analysis: {
            language:   analysis.language,
            lines:      analysis.lines,
            complexity: analysis.complexity,
            functions:  analysis.functions.length,
            classes:    analysis.classes.length,
          },
          perfSummary,
        });
        console.log('[NOESIS] init message sent to webview.');
        break;
      }

      // ── v5: Grade answer through Evaluator (G2 fix) ────────────────────────
      case 'answerQuestion': {
        const { questionIndex, answer, responseMs, confidence, questionType } = msg;
        const question = questions[questionIndex];
        if (!question) break;

        // Task 10 — route through evaluator for proper grading
        const grade     = Evaluator.gradeAnswer(question, answer);
        const isCorrect = grade === 'full' || grade === 'partial';
        const topic     = question.topic || 'general';

        // Persist answer to disk
        storage.saveAnswer(filePath, questionIndex, answer);

        // Tasks 1–10: full scoring pipeline through evaluator
        const scoreResult = Evaluator.applyScore(perfTracker, {
          topic,
          grade,
          responseMs:   responseMs   || 0,
          confidence:   confidence   || 'medium',
          questionType: questionType || question.questionType || 'conceptual',
          questionObj:  question,
        });

        // v5: Persist weak areas + streak after every answer (G3 — Tasks 4, 7)
        const stats = perfTracker.getStats();
        storage.saveSessionScore(perfTracker.getSessionScore());
        storage.saveWeakAreas(stats.weakAreas);
        storage.saveStreak(stats.streak, stats.maxStreak);
        storage.saveFullStats(stats);

        console.log(
          `[NOESIS] Q${questionIndex + 1} answered: ` +
          `${isCorrect ? '✅' : '❌'} grade:${grade} ` +
          `(topic:${topic} conf:${confidence} type:${questionType} ` +
          `delta:${scoreResult.delta >= 0 ? '+' : ''}${scoreResult.delta})`
        );

        // Push updated stats + score result back to webview immediately
        sendStatsToPanel(questionIndex, scoreResult, grade);

        // v5: Detect difficulty level change → notify webview (G4)
        const newDifficulty = perfTracker.getDifficulty();
        if (newDifficulty !== lastDifficulty) {
          lastDifficulty = newDifficulty;
          currentPanel.webview.postMessage({
            command:    'updateDifficulty',
            difficulty: newDifficulty,
          });
          console.log(`[NOESIS] Difficulty changed → ${newDifficulty}`);
        }
        break;
      }

      // All questions in this session answered — check for retry injection (G5)
      case 'sessionComplete': {
        const { correct, total } = msg;
        perfTracker.recordSession({ correct, total, file: path.basename(filePath) });

        // Persist retry queue to disk
        const retryQueue = perfTracker.getRetryQueue();
        storage.saveRetryQueue(retryQueue);
        storage.saveFullStats(perfTracker.getStats());

        sendStatsToPanel();

        // v5: Task 9 — inject up to 2 retry questions in-session (G5)
        if (retryQueue.length > 0) {
          const retryBatch = retryQueue
            .slice(0, 2)
            .map(q => ({ ...q, _isRetry: true }));

          console.log(`[NOESIS] Injecting ${retryBatch.length} retry question(s) into session.`);

          currentPanel.webview.postMessage({
            command:        'injectRetry',
            retryQuestions: retryBatch,
          });

          // Pop injected questions from the tracker's queue
          retryBatch.forEach(() => perfTracker.popRetryQuestion());
          storage.saveRetryQueue(perfTracker.getRetryQueue());
        }

        console.log(
          `[NOESIS] Session complete: ${correct}/${total} | ` +
          `Score: ${perfTracker.getSessionScore()} | ` +
          `RetryQueue: ${retryQueue.length}`
        );
        break;
      }

      case 'openSettings':
        vscode.commands.executeCommand(
          'workbench.action.openSettings', 'codeValidator.openrouterApiKey'
        );
        break;

      case 'resetStats':
        vscode.commands.executeCommand('code-learning.resetStats');
        break;
    }
  });

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
    console.log('[NOESIS] Webview panel disposed.');
  });
}

/**
 * Push the latest performance stats (+ optional score result) to the panel.
 * @param {number}               [questionIndex]
 * @param {Object}               [scoreResult]   — { delta, events, performanceDrop }
 * @param {'full'|'partial'|'wrong'} [grade]
 */
function sendStatsToPanel(questionIndex, scoreResult, grade) {
  if (!currentPanel) return;
  currentPanel.webview.postMessage({
    command:       'updateStats',
    perfSummary:   perfTracker.getSummaryForWebview(),
    questionIndex,
    scoreResult,
    grade,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initEngine() {
  try {
    const config      = vscode.workspace.getConfiguration('codeValidator');
    const settingsKey = (config.get('openrouterApiKey', '') || '').trim();
    if (settingsKey) process.env.OPENROUTER_API_KEY = settingsKey;

    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
      engine = null;
      console.warn('[NOESIS] OPENROUTER_API_KEY not found — engine disabled.');
      return;
    }

    engine = new QuestionEngine(apiKey);
    console.log('[NOESIS] QuestionEngine (OpenRouter) initialised successfully.');
  } catch (err) {
    engine = null;
    console.warn('[NOESIS] QuestionEngine init failed:', err.message);
  }
}

function isSupportedLanguage(langId) {
  const config    = vscode.workspace.getConfiguration('codeValidator');
  const supported = config.get('supportedLanguages', [
    'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
    'python', 'java', 'cpp', 'c', 'go', 'rust',
  ]);
  return supported.includes(langId);
}

// ── Deactivation ──────────────────────────────────────────────────────────────

function deactivate() {
  if (currentPanel) currentPanel.dispose();
  if (statusBar)    statusBar.dispose();
  if (smartTrigger) smartTrigger.dispose();
  console.log('[NOESIS] Deactivated.');
}

module.exports = { activate, deactivate };
