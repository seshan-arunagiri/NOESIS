'use strict';

/**
 * NOESIS — Storage v3
 *
 * Persists questions, answers, session score, retry queue, weak areas,
 * and streaks using VS Code's globalStorageUri (or falls back to
 * os.homedir when context is unavailable).
 *
 * What's new in v3 (Tasks 1, 4, 7, 9, 12):
 *   saveSessionScore / getSessionScore     — score persistence (Task 1)
 *   saveRetryQueue  / loadRetryQueue       — persist retry queue (Task 9)
 *   saveWeakAreas   / loadWeakAreas        — persist wrong-topic map (Task 4)
 *   saveStreak      / loadStreak           — persist streak & maxStreak (Task 7)
 *   saveFullStats   / loadFullStats        — atomic snapshot of all tracker state
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

class Storage {
  /**
   * @param {string} storagePath — context.globalStorageUri.fsPath from VS Code
   */
  constructor(storagePath) {
    this.dataDir = storagePath
      ? path.join(storagePath, 'noesis-data')
      : path.join(os.homedir(), '.noesis', 'data');

    this._ensureDir(this.dataDir);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _ensureDir(dir) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.error('NOESIS Storage: could not create data dir:', err.message);
    }
  }

  /** Sanitize a file path into a safe filename */
  _safeKey(filePath) {
    return path
      .basename(filePath)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
  }

  _dataFile(filePath) {
    return path.join(this.dataDir, `${this._safeKey(filePath)}.json`);
  }

  _globalFile(name) {
    return path.join(this.dataDir, `_${name}.json`);
  }

  _readJSON(file, fallback = null) {
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (_) {
      return fallback;
    }
  }

  _writeJSON(file, data) {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('NOESIS Storage: write failed:', err.message);
      return false;
    }
  }

  // ── Questions ──────────────────────────────────────────────────────────────

  saveQuestions(filePath, questions) {
    const record = {
      filePath,
      fileName:  path.basename(filePath),
      timestamp: new Date().toISOString(),
      questions,
      answers:   {},
    };
    this._writeJSON(this._dataFile(filePath), record);
    return record;
  }

  loadQuestions(filePath) {
    return this._readJSON(this._dataFile(filePath));
  }

  // ── Answers ────────────────────────────────────────────────────────────────

  saveAnswer(filePath, questionIndex, answer) {
    const data = this.loadQuestions(filePath);
    if (!data) return false;

    const q = data.questions[questionIndex];
    if (!q) return false;

    data.answers[questionIndex] = {
      answer,
      correct:   answer === q.correct,
      timestamp: new Date().toISOString(),
    };

    return this._writeJSON(this._dataFile(filePath), data);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  getStats(filePath) {
    const data = this.loadQuestions(filePath);
    if (!data) return { total: 0, answered: 0, correct: 0, percentage: 0 };

    const total    = data.questions.length;
    const answered = Object.keys(data.answers).length;
    const correct  = Object.values(data.answers).filter(a => a.correct).length;

    return {
      total,
      answered,
      correct,
      incorrect:  answered - correct,
      percentage: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    };
  }

  // ── Session Score (Task 1) ─────────────────────────────────────────────────

  /**
   * Persist the global session score to disk.
   * @param {number} score
   */
  saveSessionScore(score) {
    this._writeJSON(this._globalFile('session_score'), {
      score,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Load the persisted session score.
   * @returns {number}
   */
  getSessionScore() {
    const d = this._readJSON(this._globalFile('session_score'), { score: 0 });
    return typeof d.score === 'number' ? d.score : 0;
  }

  // ── Retry Queue (Task 9) ───────────────────────────────────────────────────

  /**
   * Persist the current retry queue to disk so it survives VS Code restarts.
   * @param {Object[]} queue — array of question objects
   */
  saveRetryQueue(queue) {
    this._writeJSON(this._globalFile('retry_queue'), {
      queue:   Array.isArray(queue) ? queue : [],
      savedAt: new Date().toISOString(),
    });
  }

  /**
   * Load the persisted retry queue.
   * @returns {Object[]}
   */
  loadRetryQueue() {
    const d = this._readJSON(this._globalFile('retry_queue'), { queue: [] });
    return Array.isArray(d.queue) ? d.queue : [];
  }

  // ── Weak Areas (Task 4) ────────────────────────────────────────────────────

  /**
   * Persist the weak-area topic map to disk.
   * @param {Record<string, number>} weakAreas — e.g. { loops: 2, arrays: 1 }
   */
  saveWeakAreas(weakAreas) {
    if (!weakAreas || typeof weakAreas !== 'object') return false;
    return this._writeJSON(this._globalFile('weak_areas'), {
      weakAreas,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Load the persisted weak-area map.
   * Returns an empty object if nothing has been saved yet.
   * @returns {Record<string, number>}
   */
  loadWeakAreas() {
    const d = this._readJSON(this._globalFile('weak_areas'), { weakAreas: {} });
    return (d && typeof d.weakAreas === 'object') ? d.weakAreas : {};
  }

  /**
   * Get the weakest topic (highest incorrect count).
   * Returns null if no weak areas recorded.
   * @returns {string|null}
   */
  getWeakestTopic() {
    const wa = this.loadWeakAreas();
    const entries = Object.entries(wa).filter(([, v]) => v > 0);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Get all weak areas sorted by incorrect count (descending).
   * @returns {{ topic: string, count: number }[]}
   */
  getWeakAreasSorted() {
    const wa = this.loadWeakAreas();
    return Object.entries(wa)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count }));
  }

  // ── Streak (Task 7) ────────────────────────────────────────────────────────

  /**
   * Persist current streak and all-time max streak to disk.
   * @param {number} streak    — current consecutive-correct count
   * @param {number} maxStreak — all-time best streak
   */
  saveStreak(streak, maxStreak) {
    return this._writeJSON(this._globalFile('streak'), {
      streak:    typeof streak    === 'number' ? streak    : 0,
      maxStreak: typeof maxStreak === 'number' ? maxStreak : 0,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Load the persisted streak values.
   * @returns {{ streak: number, maxStreak: number }}
   */
  loadStreak() {
    const d = this._readJSON(this._globalFile('streak'), { streak: 0, maxStreak: 0 });
    return {
      streak:    typeof d.streak    === 'number' ? d.streak    : 0,
      maxStreak: typeof d.maxStreak === 'number' ? d.maxStreak : 0,
    };
  }

  // ── Full Stats Snapshot (Task 12 — cross-session continuity) ──────────────

  /**
   * Persist the entire PerformanceTracker stats object to disk.
   * This is a safety fallback for when VS Code globalState is unavailable
   * (e.g., running outside extension host or after a crash).
   *
   * @param {Object} stats — full stats object from PerformanceTracker.getStats()
   */
  saveFullStats(stats) {
    if (!stats || typeof stats !== 'object') return false;
    return this._writeJSON(this._globalFile('full_stats'), {
      stats,
      savedAt: new Date().toISOString(),
      version: 4,
    });
  }

  /**
   * Load the full stats snapshot.
   * Returns null if no snapshot exists.
   * @returns {Object|null}
   */
  loadFullStats() {
    const d = this._readJSON(this._globalFile('full_stats'), null);
    if (!d || !d.stats) return null;
    return d.stats;
  }

  // ── History ────────────────────────────────────────────────────────────────

  listFiles() {
    try {
      return fs.readdirSync(this.dataDir)
        .filter(f => f.endsWith('.json') && !f.startsWith('_'))
        .map(f => {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(this.dataDir, f), 'utf-8'));
            return {
              fileName:  data.fileName,
              timestamp: data.timestamp,
              stats:     this.getStats(data.filePath),
            };
          } catch (_) { return null; }
        })
        .filter(Boolean);
    } catch (_) { return []; }
  }
}

module.exports = Storage;
