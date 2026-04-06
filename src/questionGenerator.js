'use strict';

/**
 * NOESIS — QuestionGenerator v2
 *
 * Proper facade over the AI engine layer.
 * Exposes constants and a factory so consumers never import
 * internal paths (src/ai/questionEngine) directly.
 *
 * Task 12 — Code Structure:
 *   - QuestionEngine class re-exported as default
 *   - QUESTION_TYPE_WEIGHTS exposed at top level
 *   - VALID_TOPICS exposed at top level
 *   - createEngine(apiKey) factory function
 *   - DIFFICULTY_LEVELS constant for prompt adjustment
 */

const QuestionEngine = require('./ai/questionEngine');

// ── Constants ──────────────────────────────────────────────────────────────────

/**
 * Task 2 — Weights per question type.
 * These determine how many points the type contributes to the final score.
 * Single source of truth: mirrored from QuestionEngine static getter.
 * @type {Record<string, number>}
 */
const QUESTION_TYPE_WEIGHTS = Object.freeze({
  conceptual:        5,
  'logic-based':    10,
  'edge-case':      15,
  'output-predict': 20,
});

/**
 * All valid topic keys supported by the question engine.
 * @type {string[]}
 */
const VALID_TOPICS = Object.freeze([
  'functions', 'conditions', 'loops', 'classes',
  'variables', 'logic', 'refactoring', 'general',
]);

/**
 * Task 5 — Difficulty levels and their accuracy thresholds.
 * @type {{ level: string, minAccuracy: number, maxAccuracy: number }[]}
 */
const DIFFICULTY_LEVELS = Object.freeze([
  { level: 'easy',   minAccuracy:   0, maxAccuracy:  39 },
  { level: 'medium', minAccuracy:  40, maxAccuracy:  80 },
  { level: 'hard',   minAccuracy:  81, maxAccuracy: 100 },
]);

/**
 * Task 2 — Valid question types (ordered by weight ascending).
 * @type {string[]}
 */
const QUESTION_TYPES = Object.freeze(
  Object.keys(QUESTION_TYPE_WEIGHTS)
);

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Create and return a configured QuestionEngine instance.
 * Throws if the API key is missing or empty.
 *
 * @param {string} apiKey — OpenRouter API key (sk-or-v1-...)
 * @returns {QuestionEngine}
 */
function createEngine(apiKey) {
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error(
      'QuestionGenerator.createEngine() requires a valid OPENROUTER_API_KEY. ' +
      'Add it to your .env file or VS Code settings (codeValidator.openrouterApiKey).'
    );
  }
  return new QuestionEngine(apiKey.trim());
}

/**
 * Resolve the difficulty label for a given accuracy percentage.
 * @param {number|null} accuracy — 0-100 or null if no data
 * @returns {'easy'|'medium'|'hard'}
 */
function difficultyForAccuracy(accuracy) {
  if (accuracy === null || accuracy === undefined) return 'medium';
  if (accuracy > 80) return 'hard';
  if (accuracy >= 40) return 'medium';
  return 'easy';
}

// ── Module Exports ─────────────────────────────────────────────────────────────

module.exports = {
  // Primary class
  QuestionEngine,

  // Factory
  createEngine,

  // Helpers
  difficultyForAccuracy,

  // Constants
  QUESTION_TYPE_WEIGHTS,
  VALID_TOPICS,
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
};

// Default export: the class (backward-compatible with old `require('./questionGenerator')`)
module.exports.default = QuestionEngine;