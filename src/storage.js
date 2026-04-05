const fs = require('fs');
const path = require('path');

class Storage {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.ensureDataDir();
  }

  /**
   * Ensure data directory exists
   */
  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Save questions for a file
   */
  saveQuestions(filePath, questions) {
    const fileName = path.basename(filePath);
    const dataFile = path.join(this.dataDir, `${fileName}.json`);
    
    const data = {
      filePath,
      fileName,
      timestamp: new Date().toISOString(),
      questions,
      answers: {}
    };
    
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    return dataFile;
  }

  /**
   * Load questions for a file
   */
  loadQuestions(filePath) {
    const fileName = path.basename(filePath);
    const dataFile = path.join(this.dataDir, `${fileName}.json`);
    
    if (!fs.existsSync(dataFile)) {
      return null;
    }
    
    const data = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Save user answer
   */
  saveAnswer(filePath, questionIndex, answer) {
    const data = this.loadQuestions(filePath);
    
    if (!data) return false;
    
    if (!data.answers) {
      data.answers = {};
    }
    
    data.answers[questionIndex] = {
      answer,
      timestamp: new Date().toISOString(),
      correct: answer === data.questions[questionIndex].correct
    };
    
    const fileName = path.basename(filePath);
    const dataFile = path.join(this.dataDir, `${fileName}.json`);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    
    return true;
  }

  /**
   * Get progress stats
   */
  getStats(filePath) {
    const data = this.loadQuestions(filePath);
    
    if (!data) return null;
    
    const totalQuestions = data.questions.length;
    const answeredQuestions = Object.keys(data.answers).length;
    const correctAnswers = Object.values(data.answers)
      .filter(a => a.correct).length;
    
    return {
      total: totalQuestions,
      answered: answeredQuestions,
      correct: correctAnswers,
      percentage: answeredQuestions > 0 
        ? Math.round((correctAnswers / answeredQuestions) * 100) 
        : 0
    };
  }
}

module.exports = Storage;
