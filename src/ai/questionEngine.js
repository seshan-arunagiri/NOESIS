'use strict';

/**
 * NOESIS — QuestionEngine v4 (OpenRouter Edition)
 *
 * Additions over v3:
 *  - questionType field on every question: 'conceptual'|'logic-based'|'edge-case'|'output-predict'
 *  - gradeResult() helper for partial evaluation (Task 10)
 *  - Difficulty is passed from PerformanceTracker → prompt adjusted accordingly (Task 5)
 *  - Fallback offline questions also carry questionType metadata
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL          = 'openrouter/auto';   // routes to best available free model
const TIMEOUT_MS     = 15_000;              // 15 s hard timeout

/** Maps change types → performance topic category */
const CHANGE_TOPIC_MAP = {
  function_added:          'functions',
  function_removed:        'functions',
  class_added:             'classes',
  class_removed:           'classes',
  condition_change:        'conditions',
  loop_change:             'loops',
  variable_renamed:        'variables',
  variables_added:         'variables',
  error_handling_change:   'logic',
  significant_size_change: 'logic',
  import_added:            'general',
  refactoring:             'refactoring',
};

/**
 * Task 2 — Question type weights (replicated here for convenience;
 *            PerformanceTracker is the single source of truth).
 */
const QUESTION_TYPE_WEIGHTS = {
  conceptual:        5,
  'logic-based':    10,
  'edge-case':      15,
  'output-predict': 20,
};

const VALID_TOPICS = new Set([
  'functions', 'conditions', 'loops', 'classes',
  'variables', 'logic', 'refactoring', 'general',
]);

const VALID_QTYPES = new Set(Object.keys(QUESTION_TYPE_WEIGHTS));

class QuestionEngine {
  /**
   * @param {string} apiKey — OpenRouter API key (sk-or-v1-...)
   */
  constructor(apiKey) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('QuestionEngine requires OPENROUTER_API_KEY');
    }
    this._apiKey = apiKey.trim();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate adaptive questions for the current code state.
   *
   * @param {Object}   opts
   * @param {Object}   opts.analysis      — CodeAnalyzer output
   * @param {string}   opts.code          — full source code
   * @param {Array}    opts.changes       — ChangeDetector output
   * @param {boolean}  opts.isFirstSave
   * @param {string}   opts.difficulty    — 'easy' | 'medium' | 'hard'
   * @param {string[]} opts.weakTopics    — from PerformanceTracker
   * @param {number}   opts.numQuestions
   * @returns {Promise<Object[]>}           — each item includes questionType field
   */
  async generateQuestions({
    analysis, code, changes = [], isFirstSave = true,
    difficulty = 'medium', weakTopics = [], numQuestions = 3
  }) {
    const prompt = this._buildPrompt({
      analysis, code, changes, isFirstSave, difficulty, weakTopics, numQuestions
    });

    console.log(
      `[QuestionEngine] Calling OpenRouter — model:${MODEL}` +
      ` difficulty:${difficulty} changes:${changes.length}` +
      ` weakTopics:[${weakTopics.join(',')}]`
    );

    try {
      const text = await this._callOpenRouter(prompt);
      console.log('[QuestionEngine] Raw response received, parsing...');

      const parsed = this._parseJSON(text);
      if (parsed && parsed.length > 0) {
        const validated = this._validate(parsed);
        if (validated.length > 0) {
          console.log(`[QuestionEngine] Success — ${validated.length} questions from OpenRouter`);
          return validated.slice(0, numQuestions);
        }
        console.warn('[QuestionEngine] Parsed but validation failed — using fallback');
      } else {
        console.warn('[QuestionEngine] Could not parse JSON from response — using fallback');
      }
    } catch (err) {
      console.error('[QuestionEngine] API error:', err.message);
    }

    console.log('[QuestionEngine] Falling back to offline demo questions');
    return this._demoQuestions({ analysis, changes, isFirstSave, difficulty, numQuestions });
  }

  /**
   * Task 10 — Partial evaluation helper.
   * Evaluates a free-text answer against the expected answer using simple
   * keyword overlap heuristic (used when the model returns open-ended questions).
   *
   * @param {string} userAnswer
   * @param {string} correctAnswer
   * @returns {'full'|'partial'|'wrong'}
   */
  static gradeResult(userAnswer, correctAnswer) {
    if (!userAnswer || !correctAnswer) return 'wrong';
    const u = userAnswer.toLowerCase().trim();
    const c = correctAnswer.toLowerCase().trim();
    if (u === c) return 'full';
    // Keyword overlap: split on spaces/punctuation
    const cWords = new Set(c.split(/\W+/).filter(w => w.length > 3));
    const uWords =         u.split(/\W+/).filter(w => w.length > 3);
    if (cWords.size === 0) return u.includes(c.slice(0, 8)) ? 'full' : 'wrong';
    const matchCount = uWords.filter(w => cWords.has(w)).length;
    const ratio      = matchCount / cWords.size;
    if (ratio >= 0.75) return 'full';
    if (ratio >= 0.35) return 'partial';
    return 'wrong';
  }

  // ── OpenRouter HTTP call ────────────────────────────────────────────────────

  async _callOpenRouter(prompt) {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, TIMEOUT_MS);

    let response;
    try {
      response = await fetch(OPENROUTER_URL, {
        method:  'POST',
        signal:  controller.signal,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this._apiKey}`,
          'HTTP-Referer':  'https://github.com/noesis/code-learning-extension',
          'X-Title':       'NOESIS Code Understanding Validator',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role:    'system',
              content: 'You are NOESIS, an expert code understanding mentor. Always respond with valid JSON only — no markdown, no explanation, no code fences.',
            },
            {
              role:    'user',
              content: prompt,
            },
          ],
          temperature:    0.4,
          max_tokens:     2048,
          response_format: { type: 'json_object' },
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenRouter HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    console.log('[QuestionEngine] OpenRouter usage:', JSON.stringify(data.usage ?? {}));

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenRouter returned an empty response');
    return content;
  }

  // ── Prompt Builder ──────────────────────────────────────────────────────────

  _buildPrompt({ analysis, code, changes, isFirstSave, difficulty, weakTopics, numQuestions }) {
    const { functions, classes, imports, language, lines, complexity } = analysis;

    const DIFFICULTY_RULES = {
      easy:   'Ask introductory conceptual questions: what does the code do? what is its basic purpose?',
      medium: 'Ask about logic flow, conditions, edge cases, and WHY decisions were made.',
      hard:   'Ask about trade-offs, optimisation opportunities, subtle bugs, and alternative approaches.',
    };

    // Task 5 — difficulty mix guidance
    const TYPE_MIX = {
      easy:   'Mix: mostly "conceptual" type (60%), some "logic-based" (40%).',
      medium: 'Mix: "conceptual" (20%), "logic-based" (40%), "edge-case" (40%).',
      hard:   'Mix: "logic-based" (20%), "edge-case" (40%), "output-predict" (40%).',
    };

    const fnList  = (functions || []).slice(0, 6).join(', ') || 'none';
    const clList  = (classes   || []).slice(0, 4).join(', ') || 'none';
    const impList = (imports   || []).slice(0, 5).join(', ') || 'none';
    const snippet = code.trim().substring(0, 2000);

    const weakLine = weakTopics.length
      ? `USER IS WEAK IN: ${weakTopics.join(', ')} — weight questions toward these topics.`
      : '';

    let changeSection = '';
    if (!isFirstSave && changes.length > 0) {
      const changeList = changes.map(c => `  - [${c.type}] ${c.detail}`).join('\n');
      const mandatory  = Math.min(changes.length, Math.ceil(numQuestions * 0.6));
      changeSection = `
DETECTED CODE CHANGES (the developer just made these edits):
${changeList}

MANDATORY: At least ${mandatory} of ${numQuestions} questions MUST address these specific changes.
Include questions such as:
  - "Why did you make this change?"
  - "What problem does this fix?"
  - "What could go wrong if this condition is incorrect?"`;
    }

    return `Generate EXACTLY ${numQuestions} multiple-choice quiz questions about the following ${language} code.

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
RULE: ${DIFFICULTY_RULES[difficulty] || DIFFICULTY_RULES.medium}
QUESTION TYPE MIX: ${TYPE_MIX[difficulty] || TYPE_MIX.medium}
${weakLine}
${changeSection}

CODE METADATA:
  Language:   ${language}
  Lines:      ${lines}
  Complexity: ${complexity}
  Functions:  ${fnList}
  Classes:    ${clList}
  Imports:    ${impList}

SOURCE CODE:
\`\`\`
${snippet}
\`\`\`

STRICT RULES:
1. Reference SPECIFIC function/variable names from the actual code above
2. Each question must have EXACTLY 4 answer options (plain text, no A/B/C/D prefix)
3. The "correct" field is the 0-based index (0, 1, 2, or 3) of the correct option
4. The "explanation" field must mention the specific code element being tested
5. The "topic" field must be exactly one of: functions, conditions, loops, classes, variables, logic, refactoring, general
6. The "questionType" field must be exactly one of: conceptual, logic-based, edge-case, output-predict
7. NO generic textbook questions ("What is a variable?", "What is a loop?")

Respond with ONLY a valid JSON array — no markdown, no code fences, no extra text:
[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correct": 0,
    "explanation": "...",
    "topic": "functions",
    "questionType": "logic-based"
  }
]`;
  }

  // ── JSON Parser (4 layers) ──────────────────────────────────────────────────

  _parseJSON(text) {
    if (!text || typeof text !== 'string') return null;

    // Layer 1: direct parse
    try {
      const t = text.trim();
      if (t.startsWith('[')) return JSON.parse(t);
    } catch (_) { /* fall through */ }

    // Layer 2: wrapper object
    try {
      const obj = JSON.parse(text.trim());
      if (obj && Array.isArray(obj.questions)) return obj.questions;
      if (obj && Array.isArray(obj.quiz))      return obj.quiz;
      if (obj && Array.isArray(obj.items))     return obj.items;
    } catch (_) { /* fall through */ }

    // Layer 3: extract first JSON array
    try {
      const m = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (m) return JSON.parse(m[0]);
    } catch (_) { /* fall through */ }

    // Layer 4: strip markdown fences then retry
    try {
      const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const m = stripped.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (m) return JSON.parse(m[0]);
    } catch (_) { /* fall through */ }

    return null;
  }

  _validate(raw) {
    return raw
      .filter(q =>
        q &&
        typeof q.question === 'string' && q.question.trim().length > 0 &&
        Array.isArray(q.options) && q.options.length >= 2 &&
        typeof q.correct === 'number'
      )
      .map(q => ({
        question:     String(q.question).trim(),
        options:      q.options.map(o => String(o).trim()).slice(0, 4),
        correct:      Math.min(Math.max(0, Math.floor(Number(q.correct) || 0)), (q.options.length || 1) - 1),
        explanation:  String(q.explanation || 'No explanation provided.').trim(),
        topic:        VALID_TOPICS.has(q.topic) ? q.topic : 'general',
        // Task 2 — preserve questionType from AI or default to 'conceptual'
        questionType: VALID_QTYPES.has(q.questionType) ? q.questionType : 'conceptual',
      }));
  }

  // ── Offline Demo Questions (fallback) ───────────────────────────────────────

  _demoQuestions({ analysis, changes, isFirstSave, difficulty, numQuestions }) {
    const qs = [];

    if (!isFirstSave && changes.length > 0) {
      for (const change of changes) {
        if (qs.length >= numQuestions) break;
        const q = this._questionForChange(change, analysis, difficulty);
        if (q) qs.push(q);
      }
    }

    for (const q of this._structureQuestions(analysis, difficulty)) {
      if (qs.length >= numQuestions) break;
      qs.push(q);
    }

    return qs.slice(0, numQuestions);
  }

  _questionForChange(change, analysis, difficulty) {
    const topic = CHANGE_TOPIC_MAP[change.type] || 'general';

    switch (change.type) {
      case 'function_added':
        return {
          topic,
          questionType: 'conceptual',
          question: difficulty === 'easy'
            ? `The function "${change.name}" was just added. What should you document about a new function?`
            : `"${change.name}" was extracted into its own function. What does this tell you about good software design?`,
          options: difficulty === 'easy'
            ? ['Its purpose, parameters, and return value', 'Only its name', 'The date it was written', 'The file it lives in']
            : ['The logic benefits from being reused or isolated for testability', 'All functions must be fewer than 5 lines', 'Functions always improve performance', 'This is required by the language specification'],
          correct:     0,
          explanation: `"${change.name}" is a new responsibility. Functions should be named clearly and documented with their contract (inputs, outputs, side effects).`,
        };

      case 'function_removed':
        return {
          topic,
          questionType: 'logic-based',
          question: `"${change.name}" was removed. What is the most important check before deleting a function?`,
          options: ['Search all call sites to ensure nothing still depends on it', 'Make sure it was shorter than 20 lines', 'Ensure the file still compiles', 'Back up the file first'],
          correct:     0,
          explanation: `Removing "${change.name}" without checking all call sites will cause runtime errors wherever it was previously called.`,
        };

      case 'condition_change':
        return {
          topic,
          questionType: 'edge-case',
          question: change.delta > 0
            ? `You added ${change.delta} new condition(s). Why must you test every branch of a conditional?`
            : `You removed ${Math.abs(change.delta)} condition(s). What risk does that introduce?`,
          options: change.delta > 0
            ? ['Untested branches may contain hidden bugs for edge cases', 'More conditions always mean more security', 'Branches improve performance automatically', 'The compiler tests them for you']
            : ['Logic that handled certain inputs may now be skipped entirely', 'The code runs faster with fewer conditions', 'Fewer conditions are always safer', 'No risk — simplification is always good'],
          correct:     0,
          explanation: `${change.detail}. Every conditional branch represents a separate code path requiring its own test.`,
        };

      case 'loop_change':
        return {
          topic,
          questionType: 'edge-case',
          question: change.delta > 0
            ? 'A loop was added. Which common loop bug must you test for?'
            : 'A loop was removed. What could break if that loop was processing data?',
          options: change.delta > 0
            ? ['Off-by-one errors — wrong start or end index causes missed or duplicate processing', 'Loops always run infinitely by default', 'Loops cannot access outer variables', 'Loops slow down garbage collection']
            : ['Data that relied on the loop is now never processed', 'Performance improves automatically', 'The removal has no functional impact', 'Other loops compensate automatically'],
          correct:     0,
          explanation: `${change.detail}. Off-by-one errors and unprocessed data are the two most common loop-related bugs.`,
        };

      case 'variable_renamed':
        return {
          topic,
          questionType: 'conceptual',
          question: `${change.detail}. Why does the name of a variable matter in professional code?`,
          options: ['Good names make code self-documenting and communicate intent without comments', 'Variable names affect runtime performance', 'The compiler requires descriptive names', 'Longer names always produce fewer bugs'],
          correct:     0,
          explanation: `${change.detail}. Self-documenting names eliminate the need to read an entire function to understand a variable's purpose.`,
        };

      case 'error_handling_change':
        return {
          topic,
          questionType: 'logic-based',
          question: change.delta > 0
            ? 'A try/catch block was added. What types of errors should a catch block handle?'
            : 'A try/catch block was removed. What could happen to unhandled exceptions?',
          options: change.delta > 0
            ? ['Only expected, recoverable errors — not every function needs error handling', 'All errors — try/catch should surround all code', 'Only syntax errors', 'Errors are handled by the OS automatically']
            : ['They crash the program or propagate up the call stack unexpectedly', 'They are silently ignored', 'They become warnings instead', 'They are handled by the language runtime automatically'],
          correct:     0,
          explanation: `${change.detail}. Proper error handling prevents cascading failures and gives useful feedback to users.`,
        };

      case 'significant_size_change':
        return {
          topic,
          questionType: 'logic-based',
          question: `The file changed significantly (${change.detail}). What principle helps prevent files from growing too large?`,
          options: ['Single Responsibility Principle — each module should have one clear purpose', 'Files should always grow as features are added', 'Large files are faster to load than many small files', 'File size does not affect code quality'],
          correct:     0,
          explanation: `${change.detail}. Very large files typically violate the Single Responsibility Principle and become hard to maintain and test.`,
        };

      default:
        return null;
    }
  }

  _structureQuestions(analysis, difficulty) {
    const { functions, classes, language, complexity, imports } = analysis;
    const fn0 = functions?.[0] || 'main';
    const fn1 = functions?.[1] || fn0;
    const cl0 = classes?.[0]  || 'MyClass';

    const pool = [
      {
        topic:        'functions',
        questionType: 'conceptual',
        question:     `"${fn0}" is defined in this ${language} file. What makes a function well-designed?`,
        options:      ['It does one thing, has a descriptive name, and is independently testable', 'It is as long as possible to reduce function call overhead', 'It uses global variables for easy access across the codebase', 'It has no parameters to maximise flexibility'],
        correct:      0,
        explanation:  `"${fn0}" should follow the Single Responsibility Principle — one clear task, predictable inputs, explicit outputs.`,
      },
      {
        topic:        'logic',
        questionType: 'logic-based',
        question:     `This file has "${complexity}" complexity. What does high cyclomatic complexity indicate about testability?`,
        options:      ['More test cases are needed — one per branch path', 'The code is optimised for speed', 'High complexity is always intentional', 'Complexity can be ignored if the code works'],
        correct:      0,
        explanation:  `Cyclomatic complexity counts decision points (if/for/while). Each adds a branch requiring its own test case.`,
      },
      {
        topic:        'general',
        questionType: 'conceptual',
        question:     `In ${language}, you have ${(imports || []).length} import(s) in this file. What risk does having many dependencies introduce?`,
        options:      ['More surface area for breaking changes when dependencies update', 'Imports make the code run slower', 'Imports always introduce security vulnerabilities', 'More imports mean the code uses more RAM at compile time'],
        correct:      0,
        explanation:  `Each dependency is a potential source of breaking changes, security vulnerabilities, and licence conflicts.`,
      },
    ];

    if (difficulty === 'hard') {
      pool.push({
        topic:        'refactoring',
        questionType: 'output-predict',
        question:     `If "${fn0}" and "${fn1}" share similar logic, what refactoring would you apply?`,
        options:      ['Extract the shared logic into a third, shared utility function', 'Copy the code into both functions for clarity', 'Combine them into one very large function', 'No refactoring — duplication is fine'],
        correct:      0,
        explanation:  `The DRY principle says shared logic should live in one place — a utility function both can call.`,
      });

      if ((classes || []).length > 0) {
        pool.push({
          topic:        'classes',
          questionType: 'output-predict',
          question:     `"${cl0}" is a class in this file. What is the difference between class properties and local variables inside a method?`,
          options:      ['Class properties persist across method calls; local variables are destroyed when the method returns', 'There is no difference — they work the same way', 'Local variables are faster than class properties', 'Class properties can only be strings'],
          correct:      0,
          explanation:  `Class properties (instance variables) form the object's state. Local variables are stack-allocated and destroyed after the method exits.`,
        });
      }
    }

    return pool;
  }

  /** Expose constants for external use */
  static get TOPIC_MAP()             { return CHANGE_TOPIC_MAP; }
  static get QUESTION_TYPE_WEIGHTS() { return QUESTION_TYPE_WEIGHTS; }
}

module.exports = QuestionEngine;
