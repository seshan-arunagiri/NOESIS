class CodeAnalyzer {
  /**
   * Analyze code and extract structure
   */
  static analyze(code) {
    const analysis = {
      functions: this.extractFunctions(code),
      classes: this.extractClasses(code),
      variables: this.extractVariables(code),
      language: this.detectLanguage(code)
    };
    
    return analysis;
  }

  /**
   * Extract function names
   */
  static extractFunctions(code) {
    const patterns = [
      /function\s+(\w+)/g,           // function name()
      /const\s+(\w+)\s*=\s*\(/g,     // const name = ()
      /let\s+(\w+)\s*=\s*\(/g,       // let name = ()
      /(\w+)\s*\(.*\)\s*{/g          // name() {
    ];
    
    const functions = new Set();
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        functions.add(match[1]);
      }
    });
    
    return Array.from(functions);
  }

  /**
   * Extract class names
   */
  static extractClasses(code) {
    const pattern = /class\s+(\w+)/g;
    const classes = [];
    let match;
    
    while ((match = pattern.exec(code)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }

  /**
   * Extract variable names
   */
  static extractVariables(code) {
    const patterns = [
      /const\s+(\w+)/g,
      /let\s+(\w+)/g,
      /var\s+(\w+)/g
    ];
    
    const variables = new Set();
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        variables.add(match[1]);
      }
    });
    
    return Array.from(variables);
  }

  /**
   * Detect programming language
   */
  static detectLanguage(code) {
    if (code.includes('function') || code.includes('const ')) return 'JavaScript';
    if (code.includes('def ')) return 'Python';
    if (code.includes('public class') || code.includes('class ')) return 'Java';
    if (code.includes('func ')) return 'Swift';
    if (code.includes('def ') && code.includes('self')) return 'Python';
    return 'Unknown';
  }
}

module.exports = CodeAnalyzer;
