/**
 * NOESIS — PerformanceTracker v4
 *
 * Implements all scoring, adaptive-learning, and session features:
 *   Task 1  — Global session score (score += base points)
 *   Task 2  — Weighted question types (Conceptual/Logic/Edge/Output)
 *   Task 3  — Confidence-based scoring (High/Medium/Low confidence modifiers)
 *   Task 4  — Weak area detection (per-topic incorrect tracking)
 *   Task 5  — Adaptive difficulty from accuracy (>80→Hard, 40-80→Medium, <40→Easy)
 *   Task 6  — Time-based bonuses/penalties (<10 s fast bonus, >30 s slow penalty)
 *   Task 7  — Streak system (3 correct in a row → +10 bonus, reset on wrong)
 *   Task 8  — Performance drop detection (3/5 wrong → -20 and warning flag)
 *   Task 9  — Retry queue for wrong answers
 *   Task 10 — Partial evaluation support (fully/partially/wrong→10/5/0)
 */

'use strict';

const STORAGE_KEY = 'noesis.performance.v4';

// ── Question type weights (Task 2) ─────────────────────────────────────────
const QUESTION_TYPE_WEIGHTS = {
  conceptual:        5,
  'logic-based':    10,
  'edge-case':      15,
  'output-predict': 20,
};

// ── Default persistent state ───────────────────────────────────────────────
const DEFAULT_STATS = {
  // Core accuracy tracking
  totalQuestions:  0,
  correctAnswers:  0,
  totalResponseMs: 0,
  answerCount:     0,

  // Task 1 — Global session score
  sessionScore: 0,

  // Task 7 — Streak
  streak:         0,
  maxStreak:      0,

  // Task 8 — Recent answer window (last 5)
  recentAnswers: [],   // boolean[]

  // Task 9 — Retry queue
  // Each entry: { question, options, correct, explanation, topic, questionType }
  retryQueue: [],

  // Task 4 — Weak areas: topic → incorrect count
  weakAreas: {
    functions:   0,
    conditions:  0,
    loops:       0,
    classes:     0,
    variables:   0,
    logic:       0,
    refactoring: 0,
    general:     0,
  },

  // Per-topic accuracy (unchanged from v3, kept for getDifficulty etc.)
  topicStats: {
    functions:   { asked: 0, correct: 0 },
    conditions:  { asked: 0, correct: 0 },
    loops:       { asked: 0, correct: 0 },
    classes:     { asked: 0, correct: 0 },
    variables:   { asked: 0, correct: 0 },
    logic:       { asked: 0, correct: 0 },
    refactoring: { asked: 0, correct: 0 },
    general:     { asked: 0, correct: 0 },
  },

  /** @type {Array<{date:string, correct:number, total:number, file:string}>} */
  sessionHistory: [],
  lastUpdated: null,
};

class PerformanceTracker {
  /**
   * @param {import('vscode').ExtensionContext} context
   */
  constructor(context) {
    this._ctx = context;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  /** Returns a deep-merged copy of stored stats + defaults */
  getStats() {
    const stored = this._ctx.globalState.get(STORAGE_KEY);
    if (!stored) return this._clone(DEFAULT_STATS);

    const stats = { ...this._clone(DEFAULT_STATS), ...stored };
    stats.topicStats = { ...this._clone(DEFAULT_STATS.topicStats), ...stored.topicStats };
    stats.weakAreas  = { ...this._clone(DEFAULT_STATS.weakAreas),  ...stored.weakAreas  };
    return stats;
  }

  /** Overall accuracy percentage (0-100), or null if not enough data. */
  getAccuracy() {
    const s = this.getStats();
    if (s.totalQuestions < 1) return null;
    return Math.round((s.correctAnswers / s.totalQuestions) * 100);
  }

  /**
   * Task 5 — Recommended difficulty based on running accuracy.
   * >80 → hard | 40-80 → medium | <40 → easy
   * @returns {'easy'|'medium'|'hard'}
   */
  getDifficulty() {
    const acc = this.getAccuracy();
    if (acc === null) return 'medium'; // not enough data yet
    if (acc >  80)   return 'hard';
    if (acc >= 40)   return 'medium';
    return 'easy';
  }

  /**
   * Task 4 — Topics where accuracy < 60 % (≥3 questions answered).
   * @returns {string[]}
   */
  getWeakTopics() {
    const topics = this.getStats().topicStats;
    return Object.entries(topics)
      .filter(([, d]) => d.asked >= 3 && (d.correct / d.asked) < 0.60)
      .map(([t]) => t);
  }

  /**
   * Task 4 — Sorted weak area map { topic: incorrectCount }.
   * @returns {{ topic: string, count: number }[]}
   */
  getWeakAreas() {
    const wa = this.getStats().weakAreas;
    return Object.entries(wa)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count }));
  }

  /** Task 1 — Current session score. */
  getSessionScore() {
    return this.getStats().sessionScore;
  }

  /** Task 7 — Current streak count. */
  getStreak() {
    return this.getStats().streak;
  }

  /** Average response time in seconds, or null. */
  getAvgResponseTime() {
    const s = this.getStats();
    if (s.answerCount === 0) return null;
    return Math.round(s.totalResponseMs / s.answerCount / 1000);
  }

  /**
   * Task 9 — Return current retry queue (cloned, does not remove items).
   * @returns {Object[]}
   */
  getRetryQueue() {
    return [...(this.getStats().retryQueue || [])];
  }

  /**
   * Task 9 — Pop one question from the retry queue (FIFO).
   * @returns {Object|null}
   */
  popRetryQuestion() {
    const s = this.getStats();
    if (!s.retryQueue || s.retryQueue.length === 0) return null;
    const [next, ...rest] = s.retryQueue;
    s.retryQueue = rest;
    this._save(s);
    return next;
  }

  /**
   * Task 8 — Check if performance is dropping.
   * Returns true if 3 or more of the last 5 answers are wrong.
   * @returns {boolean}
   */
  isPerformanceDropping() {
    const recent = this.getStats().recentAnswers || [];
    const wrong = recent.filter(v => !v).length;
    return recent.length >= 5 && wrong >= 3;
  }

  /**
   * Summary object for the webview — includes all new fields.
   */
  getSummaryForWebview() {
    const s    = this.getStats();
    const acc  = this.getAccuracy();
    const weak = this.getWeakTopics();
    const diff = this.getDifficulty();
    const avgT = this.getAvgResponseTime();
    const drop = this.isPerformanceDropping();

    return {
      totalQuestions:   s.totalQuestions,
      correctAnswers:   s.correctAnswers,
      accuracy:         acc,
      difficulty:       diff,
      weakTopics:       weak,
      weakAreas:        this.getWeakAreas(),
      avgResponseTime:  avgT,
      sessionHistory:   s.sessionHistory.slice(0, 5),
      topicStats:       s.topicStats,
      // New fields (Tasks 1, 7, 8, 9)
      sessionScore:      s.sessionScore,
      streak:            s.streak,
      maxStreak:         s.maxStreak,
      performanceDrop:   drop,
      retryQueueLength:  (s.retryQueue || []).length,
    };
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  /**
   * Task 10 — Partial evaluation: grade is 'full' | 'partial' | 'wrong'
   * Maps to points 10 | 5 | 0 before applying all modifiers.
   *
   * Master answer recording — applies ALL scoring rules (Tasks 1–9).
   *
   * @param {Object} opts
   * @param {string}  opts.topic        — one of the topicStats keys
   * @param {boolean} opts.isCorrect    — binary correct/wrong
   * @param {string}  [opts.grade]      — 'full'|'partial'|'wrong' (Task 10)
   * @param {number}  [opts.responseMs] — time taken in ms (Task 6)
   * @param {string}  [opts.confidence] — 'low'|'medium'|'high' (Task 3)
   * @param {string}  [opts.questionType] — 'conceptual'|'logic-based'|'edge-case'|'output-predict' (Task 2)
   * @param {Object}  [opts.questionObj] — full question obj for retry queue (Task 9)
   * @returns {{ delta: number, events: string[], performanceDrop: boolean }}
   */
  recordAnswerFull({
    topic,
    isCorrect,
    grade        = isCorrect ? 'full' : 'wrong',
    responseMs   = 0,
    confidence   = 'medium',
    questionType = 'conceptual',
    questionObj  = null,
  } = {}) {
    const s      = this.getStats();
    const events = [];
    let   delta  = 0;

    // ── Task 10: Partial evaluation base points ──────────────────────────────
    let basePoints = 0;
    if (grade === 'full')    basePoints = 10;
    else if (grade === 'partial') basePoints = 5;
    else                     basePoints = 0;  // wrong → 0 before penalties

    // ── Task 2: Weighted question type (weight × accuracy_ratio) ────────────
    const weight    = QUESTION_TYPE_WEIGHTS[questionType] ?? 5;
    const accuracy  = grade === 'full' ? 1 : grade === 'partial' ? 0.5 : 0;
    const typeBonus = Math.round(weight * accuracy);
    delta += typeBonus;
    if (typeBonus > 0) events.push(`+${typeBonus} (${questionType} weight)`);

    // ── Base wrong penalty (only when grade==='wrong') ──────────────────────
    if (grade === 'wrong') {
      const basePenalty = -5;
      delta += basePenalty;
      events.push(`${basePenalty} (wrong answer)`);
    }

    // ── Task 3: Confidence modifier ──────────────────────────────────────────
    const conf = (confidence || 'medium').toLowerCase();
    if (conf === 'high') {
      if (grade === 'full') {
        delta += 5;
        events.push('+5 (high confidence bonus)');
      } else if (grade === 'wrong') {
        delta += -10; // total -15 with base penalty
        events.push('-10 (high confidence + wrong)');
      }
    } else if (conf === 'low' && grade === 'wrong') {
      delta += 2;  // soften the -5 base → net -3
      events.push('+2 (low confidence leniency)');
    }

    // ── Task 6: Time-based bonus / penalty ──────────────────────────────────
    const secs = Math.round(responseMs / 1000);
    if (grade === 'full' && secs < 10) {
      delta += 5;
      events.push('+5 (fast answer <10 s)');
    } else if (grade === 'wrong' && secs > 30) {
      delta += -5;
      events.push('-5 (slow + wrong >30 s)');
    }

    // ── Task 7: Streak tracking ──────────────────────────────────────────────
    if (isCorrect) {
      s.streak++;
      if (s.streak > s.maxStreak) s.maxStreak = s.streak;
      if (s.streak > 0 && s.streak % 3 === 0) {
        delta += 10;
        events.push(`+10 (🔥 ${s.streak}-streak bonus!)`);
      }
    } else {
      s.streak = 0;
    }

    // ── Apply score delta ────────────────────────────────────────────────────
    s.sessionScore = (s.sessionScore || 0) + delta;
    events.push(delta >= 0 ? `Total Δ: +${delta}` : `Total Δ: ${delta}`);

    // ── Task 8: Performance drop detection ──────────────────────────────────
    s.recentAnswers = [...(s.recentAnswers || []), isCorrect].slice(-5);
    const wrongCount = s.recentAnswers.filter(v => !v).length;
    let performanceDrop = false;
    if (s.recentAnswers.length >= 5 && wrongCount >= 3) {
      s.sessionScore -= 20;
      performanceDrop = true;
      events.push('-20 (performance drop penalty)');
    }

    // ── Task 9: Retry queue — enqueue wrong answers ──────────────────────────
    if (grade === 'wrong' && questionObj) {
      s.retryQueue = [...(s.retryQueue || []), { ...questionObj }].slice(0, 20);
    }

    // ── Core accuracy tracking (unchanged from v3) ───────────────────────────
    s.totalQuestions++;
    if (isCorrect) s.correctAnswers++;
    s.totalResponseMs += Math.max(0, responseMs);
    s.answerCount++;

    const t = (topic && topic in s.topicStats) ? topic : 'general';
    s.topicStats[t].asked++;
    if (isCorrect) s.topicStats[t].correct++;

    // Task 4 — weak area tracking (increment incorrect count)
    if (!isCorrect) {
      s.weakAreas[t] = (s.weakAreas[t] || 0) + 1;
    }

    s.lastUpdated = new Date().toISOString();
    this._save(s);

    return { delta, events, performanceDrop };
  }

  /**
   * Legacy compatibility shim — used by older callers.
   * @param {string} topic
   * @param {boolean} isCorrect
   * @param {number} responseMs
   */
  recordAnswer(topic, isCorrect, responseMs = 0) {
    return this.recordAnswerFull({ topic, isCorrect, responseMs });
  }

  /**
   * Record a full session summary (unchanged from v3).
   * @param {{ correct: number, total: number, file: string }} session
   */
  recordSession(session) {
    const s = this.getStats();
    s.sessionHistory = [
      { date: new Date().toISOString(), ...session },
      ...s.sessionHistory.slice(0, 9),
    ];
    this._save(s);
  }

  /** Reset all performance data including score, streak, retry queue. */
  reset() {
    this._save(this._clone(DEFAULT_STATS));
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _save(stats) {
    this._ctx.globalState.update(STORAGE_KEY, stats);
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

// Export weights constant so questionEngine and webview can share it
PerformanceTracker.QUESTION_TYPE_WEIGHTS = QUESTION_TYPE_WEIGHTS;

module.exports = PerformanceTracker;
