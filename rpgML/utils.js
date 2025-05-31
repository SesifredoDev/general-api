const nlp = require('compromise');
const { predict } = require("./predict")

function extractCompletedTaskClauses(paragraph) {
  const sentences = nlp(paragraph).sentences().out('array');
  const completedTasks = [];

  for (const sentence of sentences) {
    const sentenceDoc = nlp(sentence);
    const clauses = sentenceDoc.clauses().
    
    out('array');

    clauses.forEach(clause => {
      let clauseDoc = nlp(clause);
      clauseDoc = clauseDoc.verbs().toPastTense();
      

      if (clauseDoc.wordCount() >= 3) {
        completedTasks.push(clause.trim());
      }
    });
  }

  return [...new Set(completedTasks)];
}

 async function predictParagraph(type, paragraph){
    let taskList = extractCompletedTaskClauses(paragraph);
    let result = [];
    
    for (const statement of taskList) {
        console.log(statement);
        const statementPredictions = await predict(type, statement);
        statementPredictions.statement = statement
        result.push(statementPredictions);
    }

    
    return result;

}

// Test input
// const inputText = `
// I woke up at 7 AM, brushed my teeth, and had a quick breakfast. Then I went to the gym and worked out for an hour.
// After that, I met with my team. Later on, I went shopping and cleaned the house. Once I had dinner, I watched a show.
// `;

// const tasks = extractCompletedTaskClauses(inputText);

// console.log("📋 Completed Task Clauses:");
// tasks.forEach((task, i) => console.log(`${i + 1}. ${task}`));


module.exports = {predictParagraph }
