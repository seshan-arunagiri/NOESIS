const CodeAnalyzer = require('./src/codeAnalyzer');

const testCode = `
function greet(name) {
  return "Hello, " + name;
}

class User {
  constructor(name) {
    this.name = name;
  }
}

const user = new User("Alice");
const message = greet(user.name);
`;

const analysis = CodeAnalyzer.analyze(testCode);
console.log('Code Analysis:');
console.log(JSON.stringify(analysis, null, 2));
