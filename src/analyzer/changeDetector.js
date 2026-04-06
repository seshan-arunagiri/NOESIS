/**
 * NOESIS — ChangeDetector
 *
 * Compares the current code snapshot against the previous version and
 * returns a structured list of what changed: new/removed functions,
 * class changes, condition changes, loop changes, renames, and size shifts.
 */

'use strict';

/** @typedef {{ type: string, name?: string, delta?: number, detail: string }} Change */

/**
 * @typedef {Object} DetectionResult
 * @property {boolean}  isFirstSave
 * @property {Change[]} changes
 * @property {boolean}  isMajorChange
 */

class ChangeDetector {
  constructor() {
    /**
     * Stores the last seen snapshot per file path
     * @type {Map<string, { code: string, analysis: Object }>}
     */
    this._store = new Map();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Compare current state against stored state and return changes.
   * @param {string} filePath
   * @param {string} currentCode
   * @param {Object} currentAnalysis — from CodeAnalyzer.analyze()
   * @returns {DetectionResult}
   */
  detectChanges(filePath, currentCode, currentAnalysis) {
    const prev = this._store.get(filePath);

    // First time this file is analysed
    if (!prev) {
      this._storeSnapshot(filePath, currentCode, currentAnalysis);
      return { isFirstSave: true, changes: [], isMajorChange: false };
    }

    const changes = /** @type {Change[]} */ ([]);
    const pa = prev.analysis;
    const ca = currentAnalysis;

    // ── Functions ──────────────────────────────────────────────────────────
    this._added(pa.functions, ca.functions).forEach(name =>
      changes.push({ type: 'function_added',   name, detail: `Function "${name}" was added` })
    );
    this._removed(pa.functions, ca.functions).forEach(name =>
      changes.push({ type: 'function_removed', name, detail: `Function "${name}" was removed` })
    );

    // ── Classes ───────────────────────────────────────────────────────────
    this._added(pa.classes, ca.classes).forEach(name =>
      changes.push({ type: 'class_added',   name, detail: `Class "${name}" was added` })
    );
    this._removed(pa.classes, ca.classes).forEach(name =>
      changes.push({ type: 'class_removed', name, detail: `Class "${name}" was removed` })
    );

    // ── Conditions ─────────────────────────────────────────────────────────
    const prevCond = this._count(prev.code,    /\bif\s*\(/g);
    const currCond = this._count(currentCode,  /\bif\s*\(/g);
    if (currCond !== prevCond) {
      const delta = currCond - prevCond;
      changes.push({
        type: 'condition_change',
        delta,
        detail: delta > 0
          ? `${delta} new if-condition(s) added`
          : `${Math.abs(delta)} if-condition(s) removed`
      });
    }

    // ── Loops ──────────────────────────────────────────────────────────────
    const prevLoop = this._count(prev.code,   /\b(for|while|do)\s*[\({]/g);
    const currLoop = this._count(currentCode, /\b(for|while|do)\s*[\({]/g);
    if (currLoop !== prevLoop) {
      const delta = currLoop - prevLoop;
      changes.push({
        type: 'loop_change',
        delta,
        detail: delta > 0
          ? `${delta} new loop(s) added`
          : `${Math.abs(delta)} loop(s) removed`
      });
    }

    // ── Try/Catch blocks ───────────────────────────────────────────────────
    const prevTry = this._count(prev.code,   /\btry\s*\{/g);
    const currTry = this._count(currentCode, /\btry\s*\{/g);
    if (currTry !== prevTry) {
      const delta = currTry - prevTry;
      changes.push({
        type: 'error_handling_change',
        delta,
        detail: delta > 0
          ? `${delta} try/catch block(s) added — error handling improved`
          : `${Math.abs(delta)} try/catch block(s) removed`
      });
    }

    // ── Variable renames (heuristic) ──────────────────────────────────────
    const addedVars   = this._added(pa.variables, ca.variables);
    const removedVars = this._removed(pa.variables, ca.variables);

    if (addedVars.length > 0 && removedVars.length > 0 &&
        addedVars.length === removedVars.length) {
      // Equal counts added/removed → likely a rename
      for (let i = 0; i < Math.min(addedVars.length, 3); i++) {
        changes.push({
          type:   'variable_renamed',
          detail: `Variable possibly renamed: "${removedVars[i]}" → "${addedVars[i]}"`
        });
      }
    } else if (addedVars.length >= 3) {
      changes.push({
        type:   'variables_added',
        names:  addedVars,
        detail: `${addedVars.length} new variable(s): ${addedVars.slice(0, 3).join(', ')}`
      });
    }

    // ── Significant size change ────────────────────────────────────────────
    const prevLines = pa.lines || 1;
    const currLines = ca.lines;
    const pctChange = Math.abs(currLines - prevLines) / prevLines;
    if (pctChange >= 0.25 && Math.abs(currLines - prevLines) >= 10) {
      changes.push({
        type:   'significant_size_change',
        detail: `File changed by ~${Math.round(pctChange * 100)}% (${prevLines} → ${currLines} lines)`
      });
    }

    // ── Imports added ──────────────────────────────────────────────────────
    const addedImports = this._added(pa.imports || [], ca.imports || []);
    if (addedImports.length > 0) {
      changes.push({
        type:   'import_added',
        detail: `New import(s): ${addedImports.slice(0, 3).join(', ')}`
      });
    }

    // ── Commit snapshot ────────────────────────────────────────────────────
    this._storeSnapshot(filePath, currentCode, currentAnalysis);

    // A "major change" triggers analysis immediately (bypasses debounce gap)
    const MAJOR_TYPES = new Set([
      'function_added', 'class_added', 'significant_size_change'
    ]);
    const isMajorChange = changes.some(c => MAJOR_TYPES.has(c.type));

    return { isFirstSave: false, changes, isMajorChange };
  }

  /** Reset a file's stored version (forces fresh analysis next time) */
  reset(filePath) {
    this._store.delete(filePath);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _storeSnapshot(filePath, code, analysis) {
    this._store.set(filePath, { code, analysis });
  }

  _added(prev = [], curr = []) {
    const ps = new Set(prev);
    return curr.filter(x => !ps.has(x));
  }

  _removed(prev = [], curr = []) {
    const cs = new Set(curr);
    return prev.filter(x => !cs.has(x));
  }

  _count(code, pattern) {
    const m = code.match(new RegExp(pattern.source, 'g'));
    return m ? m.length : 0;
  }
}

module.exports = ChangeDetector;
