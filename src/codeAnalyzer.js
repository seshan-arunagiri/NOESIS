/**
 * NOESIS — Code Analyzer
 * Parses code structure: functions, classes, variables, complexity, language
 */

'use strict';

class CodeAnalyzer {
  /**
   * Analyze code and extract structure
   * @param {string} code - Source code
   * @param {string} langId - VS Code languageId (optional)
   */
  static analyze(code, langId = '') {
    return {
      functions:  this.extractFunctions(code, langId),
      classes:    this.extractClasses(code, langId),
      variables:  this.extractVariables(code, langId),
      imports:    this.extractImports(code, langId),
      language:   this.detectLanguage(code, langId),
      lines:      code.split('\n').length,
      complexity: this.estimateComplexity(code)
    };
  }

  // ── Functions ──────────────────────────────────────────────────────────────

  static extractFunctions(code, langId) {
    const found = new Set();

    const patterns = [];

    // JavaScript / TypeScript
    if (!langId || ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(langId)) {
      patterns.push(
        /function\s+(\w+)\s*\(/g,                   // function foo(
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g,  // const foo = (
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?function/g, // const foo = function
        /(\w+)\s*:\s*(?:async\s*)?function\s*\(/g,  // obj method: function(
        /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g,     // method() {
        /=>/ // arrow check — handled by const pattern above
      );
    }

    // Python
    if (!langId || langId === 'python') {
      patterns.push(
        /def\s+(\w+)\s*\(/g,
        /async\s+def\s+(\w+)\s*\(/g
      );
    }

    // Java / C# / C++ / Go / Rust
    if (!langId || ['java', 'csharp', 'cpp', 'c', 'go', 'rust'].includes(langId)) {
      patterns.push(
        /(?:public|private|protected|static|void|int|string|bool|func)\s+(\w+)\s*\(/g
      );
    }

    // Run all patterns
    for (const pattern of patterns) {
      let match;
      // Clone pattern to reset lastIndex
      const p = new RegExp(pattern.source, 'g');
      while ((match = p.exec(code)) !== null) {
        const name = match[1];
        // Filter out language keywords
        if (name && !this.isKeyword(name)) {
          found.add(name);
        }
      }
    }

    return Array.from(found).slice(0, 30); // cap at 30
  }

  static isKeyword(word) {
    const keywords = new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
      'continue', 'return', 'new', 'this', 'super', 'class', 'extends',
      'import', 'export', 'from', 'const', 'let', 'var', 'function',
      'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof',
      'instanceof', 'void', 'null', 'undefined', 'true', 'false',
      'static', 'public', 'private', 'protected', 'int', 'string',
      'bool', 'float', 'double', 'void', 'def', 'pass', 'with', 'in',
      'not', 'and', 'or', 'lambda', 'yield', 'global', 'nonlocal'
    ]);
    return keywords.has(word);
  }

  // ── Classes ────────────────────────────────────────────────────────────────

  static extractClasses(code, langId) {
    const found = [];
    const patterns = [
      /class\s+(\w+)/g,            // JS/TS/Java/Python
      /struct\s+(\w+)/g,           // C / Rust / Go
      /interface\s+(\w+)/g,        // TS / Java
      /enum\s+(\w+)/g              // All languages
    ];

    for (const pattern of patterns) {
      let match;
      const p = new RegExp(pattern.source, 'g');
      while ((match = p.exec(code)) !== null) {
        const name = match[1];
        if (name && !this.isKeyword(name) && !found.includes(name)) {
          found.push(name);
        }
      }
    }
    return found.slice(0, 20);
  }

  // ── Variables ──────────────────────────────────────────────────────────────

  static extractVariables(code, langId) {
    const found = new Set();
    const patterns = [
      /(?:const|let|var)\s+(\w+)/g,   // JS/TS
      /(\w+)\s*=\s*(?!>|=)/g,         // any assignment (broad catch)
    ];

    // Python
    if (!langId || langId === 'python') {
      patterns.push(/^(\w+)\s*=/gm);
    }

    for (const pattern of patterns) {
      let match;
      const p = new RegExp(pattern.source, pattern.flags || 'g');
      while ((match = p.exec(code)) !== null) {
        const name = match[1];
        if (name && !this.isKeyword(name) && name.length > 1) {
          found.add(name);
        }
      }
    }
    return Array.from(found).slice(0, 30);
  }

  // ── Imports ────────────────────────────────────────────────────────────────

  static extractImports(code, langId) {
    const found = [];
    const patterns = [
      /import\s+.*?from\s+['"](.+?)['"]/g,      // ES modules
      /require\(['"](.+?)['"]\)/g,                // CommonJS
      /import\s+['"](.+?)['"]/g,                  // side-effect imports
      /from\s+(\w[\w.]+)\s+import/g,              // Python
    ];

    for (const pattern of patterns) {
      let match;
      const p = new RegExp(pattern.source, 'g');
      while ((match = p.exec(code)) !== null) {
        if (!found.includes(match[1])) found.push(match[1]);
      }
    }
    return found.slice(0, 20);
  }

  // ── Language ───────────────────────────────────────────────────────────────

  static detectLanguage(code, langId) {
    const langMap = {
      javascript:       'JavaScript',
      javascriptreact:  'JavaScript (React)',
      typescript:       'TypeScript',
      typescriptreact:  'TypeScript (React)',
      python:           'Python',
      java:             'Java',
      cpp:              'C++',
      c:                'C',
      csharp:           'C#',
      go:               'Go',
      rust:             'Rust',
      ruby:             'Ruby',
      php:              'PHP'
    };

    if (langId && langMap[langId]) return langMap[langId];

    // Heuristic detection
    if (/import\s+\w+\s+from|export\s+(default|const|function)/.test(code)) return 'JavaScript (ESM)';
    if (/function\s+\w+|const\s+\w+\s*=/.test(code)) return 'JavaScript';
    if (/def\s+\w+\s*\(/.test(code)) return 'Python';
    if (/public\s+class\s+\w+/.test(code)) return 'Java';
    if (/#include\s*</.test(code)) return 'C/C++';
    if (/fn\s+\w+\s*\(/.test(code)) return 'Rust';
    if (/func\s+\w+\s*\(/.test(code)) return 'Go';
    return 'Unknown';
  }

  // ── Complexity ─────────────────────────────────────────────────────────────

  static estimateComplexity(code) {
    // Cyclomatic-style: count branching keywords
    const branchPatterns = [
      /\bif\b/g, /\belse\b/g, /\bfor\b/g, /\bwhile\b/g,
      /\bcase\b/g, /\bcatch\b/g, /\b&&\b/g, /\b\|\|\b/g,
      /\?\s*\w/g  // ternary
    ];
    let score = 1;
    for (const p of branchPatterns) {
      const matches = code.match(p);
      if (matches) score += matches.length;
    }
    if (score <= 5)  return 'Simple';
    if (score <= 15) return 'Moderate';
    if (score <= 30) return 'Complex';
    return 'Highly Complex';
  }
}

module.exports = CodeAnalyzer;
