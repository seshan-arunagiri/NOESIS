'use strict';

/**
 * NOESIS — Evaluator v1
 *
 * Single-responsibility module that owns ALL grading logic.
 * Wraps QuestionEngine.gradeResult() for text similarity grading
 * and delegates to PerformanceTracker.recordAnswerFull() for scoring.
 *
 * Task 10 — Partial Evaluation:
 *   Fully correct  → grade:'full'    → 10 base pts
 *   Partially right → grade:'partial' → 5  base pts
 *   Wrong           → grade:'wrong'   → 0  base pts (+ penalties applied by tracker)
 *
 * Task 2  — Type weights applied inside recordAnswerFull via tracker.
 * Task 3  — Confidence modifiers applied inside recordAnswerFull via tracker.
 * Task 6  — Time bonus/penalty applied inside recordAnswerFull via tracker.
 * Task 7  — Streak logic applied inside recordAnswerFull via tracker.
 * Task 8  — Drop detection applied inside recordAnswerFull via tracker.
 */

const QuestionEngine = require('../ai/questionEngine');

// ── Constants ──────────────────────────────────────────────────────────────────

/** Maps grade string → base points awarded before modifiers. */
const GRADE_POINTS = Object.freeze({
  full:    10,
  partial:  5,
  wrong:    0,
});

/** Alias to question-type weights (same source-of-truth as PerformanceTracker). */
const QUESTION_TYPE_WEIGHTS = Object.freeze({
  conceptual:        5,
  'logic-based':    10,
  'edge-case':      15,
  'output-predict': 20,
});

/** All valid topic keys accepted by PerformanceTracker. */
const VALID_TOPICS = Object.freeze([
  'functions', 'conditions', 'loops', 'classes',
  'variables', 'logic', 'refactoring', 'general',
]);

// ── Grading Helpers ────────────────────────────────────────────────────────────

/**
 * Grade a multiple-choice answer (MCQ).
 * A radio-button selection is binary — either correct or wrong.
 * Returns 'full' or 'wrong'.
 *
 * @param {number} selectedIndex — 0-based index of user's choice
 * @param {number} correctIndex  — 0-based index of correct option
 * @returns {'full'|'wrong'}
 */
function gradeMCQ(selectedIndex, correctIndex) {
  return selectedIndex === correctIndex ? 'full' : 'wrong';
}

/**
 * Grade a free-text answer using keyword-overlap heuristic.
 * Delegates to QuestionEngine.gradeResult() for consistency.
 *
 * @param {string} userAnswer
 * @param {string} correctAnswer
 * @returns {'full'|'partial'|'wrong'}
 */
function gradeText(userAnswer, correctAnswer) {
  return QuestionEngine.gradeResult(userAnswer, correctAnswer);
}

/**
 * Auto-detect question type and grade accordingly.
 * If the question has numeric options (MCQ), uses gradeMCQ.
 * Otherwise falls back to gradeText for open-ended questions.
 *
 * @param {Object} question   — full question object from QuestionEngine
 * @param {number|string} userAnswer — selectedIndex (MCQ) or text string
 * @returns {'full'|'partial'|'wrong'}
 */
function gradeAnswer(question, userAnswer) {
  if (!question) return 'wrong';

  // MCQ: question has numeric `correct` and `options` array
  if (Array.isArray(question.options) && typeof question.correct === 'number') {
    const idx = typeof userAnswer === 'number'
      ? userAnswer
      : parseInt(String(userAnswer), 10);
    return gradeMCQ(idx, question.correct);
  }

  // Free-text fallback
  const correctText = String(question.correctAnswer || question.correct || '');
  return gradeText(String(userAnswer || ''), correctText);
}

// ── Score Application ──────────────────────────────────────────────────────────

/**
 * Apply the full scoring pipeline for one answer.
 * Delegates to PerformanceTracker.recordAnswerFull() which handles
 * Tasks 1–9 atomically and persists the result.
 *
 * @param {import('../evaluator/performanceTracker')} tracker
 * @param {Object} opts
 * @param {string}  opts.topic        — topic key (e.g. 'loops')
 * @param {'full'|'partial'|'wrong'} opts.grade — from gradeAnswer()
 * @param {number}  [opts.responseMs] — time taken in milliseconds (Task 6)
 * @param {string}  [opts.confidence] — 'low'|'medium'|'high' (Task 3)
 * @param {string}  [opts.questionType] — question type key (Task 2)
 * @param {Object}  [opts.questionObj]  — full question object (Task 9 retry)
 * @returns {{ delta: number, events: string[], performanceDrop: boolean }}
 */
function applyScore(tracker, {
  topic,
  grade,
  responseMs   = 0,
  confidence   = 'medium',
  questionType = 'conceptual',
  questionObj  = null,
}) {
  const isCorrect = grade === 'full' || grade === 'partial';

  return tracker.recordAnswerFull({
    topic,
    isCorrect,
    grade,
    responseMs,
    confidence,
    questionType,
    questionObj: grade === 'wrong' ? questionObj : null, // only enqueue wrong answers
  });
}

/**
 * Compute a human-readable label for a grade result.
 * @param {'full'|'partial'|'wrong'} grade
 * @returns {string}
 */
function gradeLabel(grade) {
  switch (grade) {
    case 'full':    return '✓ Correct';
    case 'partial': return '◑ Partial';
    default:        return '✗ Incorrect';
  }
}

/**
 * Return a CSS class suffix for feedback badge styling.
 * @param {'full'|'partial'|'wrong'} grade
 * @returns {'ok'|'partial'|'fail'}
 */
function gradeBadgeClass(grade) {
  switch (grade) {
    case 'full':    return 'ok';
    case 'partial': return 'partial';
    default:        return 'fail';
  }
}

// ── Module Exports ─────────────────────────────────────────────────────────────

module.exports = {
  // Core grading functions
  gradeAnswer,
  gradeMCQ,
  gradeText,
  applyScore,

  // UI helpers
  gradeLabel,
  gradeBadgeClass,

  // Constants
  GRADE_POINTS,
  QUESTION_TYPE_WEIGHTS,
  VALID_TOPICS,
};
