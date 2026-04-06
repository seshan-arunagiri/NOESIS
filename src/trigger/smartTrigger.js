/**
 * NOESIS — SmartTrigger
 *
 * Controls WHEN analysis fires. Rules:
 *  • 15 s debounce after the user stops typing
 *  • Minimum 30 s gap between sessions per file
 *  • Major code changes bypass both constraints and trigger immediately
 */

'use strict';

class SmartTrigger {
  /**
   * @param {(doc: import('vscode').TextDocument) => void} callback
   * @param {{ typingDebounce?: number, minGap?: number }} opts
   */
  constructor(callback, opts = {}) {
    this._callback = callback;
    this.DEBOUNCE  = opts.typingDebounce ?? 15_000; // 15 s
    this.MIN_GAP   = opts.minGap         ?? 30_000; // 30 s

    /** @type {Map<string, NodeJS.Timeout>} */
    this._debounceTimers   = new Map();
    /** @type {Map<string, number>} last trigger timestamp per uri */
    this._lastTriggerTimes = new Map();
  }

  // ── Called on every keystroke ────────────────────────────────────────────

  /**
   * Resets the debounce timer. Cheap — just clears + sets a timeout.
   * @param {import('vscode').TextDocument} document
   */
  onTextChange(document) {
    if (!document) return;
    const key = document.uri.toString();

    if (this._debounceTimers.has(key)) {
      clearTimeout(this._debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      this._debounceTimers.delete(key);
      this._tryTrigger(document, /* bypassGap */ false);
    }, this.DEBOUNCE);

    this._debounceTimers.set(key, timer);
  }

  // ── Called on document save ──────────────────────────────────────────────

  /**
   * @param {import('vscode').TextDocument} document
   * @param {boolean} isMajorChange  — from ChangeDetector result
   */
  onSave(document, isMajorChange) {
    if (!document) return;
    const key = document.uri.toString();

    if (isMajorChange) {
      // Cancel pending debounce, fire immediately
      if (this._debounceTimers.has(key)) {
        clearTimeout(this._debounceTimers.get(key));
        this._debounceTimers.delete(key);
      }
      this._tryTrigger(document, /* bypassGap */ true);
    }
    // Non-major saves: let the debounce timer already running do its job.
  }

  // ── Force a trigger (used by the manual command) ─────────────────────────

  forceNow(document) {
    if (!document) return;
    const key = document.uri.toString();
    if (this._debounceTimers.has(key)) {
      clearTimeout(this._debounceTimers.get(key));
      this._debounceTimers.delete(key);
    }
    this._tryTrigger(document, /* bypassGap */ true);
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  _tryTrigger(document, bypassGap) {
    const key  = document.uri.toString();
    const now  = Date.now();
    const last = this._lastTriggerTimes.get(key) ?? 0;
    const gap  = now - last;

    if (!bypassGap && gap < this.MIN_GAP) {
      console.log(
        `[SmartTrigger] Skipped – only ${Math.round(gap / 1000)}s since last ` +
        `(min ${this.MIN_GAP / 1000}s)`
      );
      return;
    }

    this._lastTriggerTimes.set(key, now);
    console.log(`[SmartTrigger] → Triggering analysis for ${document.fileName}`);
    this._callback(document);
  }

  /** Free all timers on extension deactivation */
  dispose() {
    for (const t of this._debounceTimers.values()) clearTimeout(t);
    this._debounceTimers.clear();
    this._lastTriggerTimes.clear();
  }
}

module.exports = SmartTrigger;
