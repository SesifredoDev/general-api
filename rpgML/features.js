// features.js
const fs = require('fs');
const { NlpManager } = require('node-nlp');

const manager = new NlpManager({ languages: ['en'], nlu: { useNoneFeature: false } });
manager.addLanguage('en');

// Training flag
let isTrained = false;

// Vocabulary set
const vocabulary = new Set();

// Train manager minimally
async function ensureTrained() {
  if (!isTrained) {
    await manager.train();
    isTrained = true;
  }
}

// Tokenizer and vocab builder
function tokenizer(input) {
  if (typeof input !== 'string') return [];

  const wordRegex = /\w+/g;
  const sentenceTokens = input.match(wordRegex) || [];

  sentenceTokens.forEach(token => {
    vocabulary.add(token.toLowerCase());
  });

  return sentenceTokens.map(t => t.toLowerCase());
}

// Create mapping: token → index
function getVocabularyIndexMap() {
  return [...vocabulary].reduce((map, token, index) => {
    map[token] = index;
    return map;
  }, {});
}

// Feature extractor
async function extractFeatures(type, sentence, vocabMap = null, vocabSize = 0) {
  await ensureTrained();
  const result = await manager.process('en', sentence);
  const sentenceTokens = tokenizer(sentence);

  // Bag-of-words vector
  const tokenVector = Array(vocabSize).fill(0);
  if (vocabMap) {
    for (const token of sentenceTokens) {
      if (vocabMap[token] !== undefined) {
        tokenVector[vocabMap[token]] = 1;
      }
    }
  }

  const nounCount = result.entities.filter(e => e.entity === 'noun').length;
  const verbCount = result.entities.filter(e => e.entity === 'verb').length;
  const numberCount = result.entities.filter(e => e.entity === 'number').length;
  const hasDuration = result.entities.some(e => e.entity === 'duration') ? 1 : 0;
  const sentimentScore = result.sentiment?.score || 0;
  const numWords = result.sentiment?.numWords || 0;
  const hasIntent = result.intent ? 1 : 0;
  const topIntentConfidence = result.classification?.[0]?.value || 0;

  const vector = [
    type,
    nounCount / 5,
    verbCount / 5,
    numberCount / 5,
    numWords,
    hasDuration,
    sentimentScore,
    hasIntent,
    topIntentConfidence,
    ...tokenVector
  ];

  const details = {
    type,
    nounCount,
    verbCount,
    numberCount,
    hasDuration,
    sentimentScore,
    hasIntent,
    topIntentConfidence,
    sentenceTokens
  };

  return { vector, details };
}

// Exported utilities
module.exports = {
  extractFeatures,
  tokenizer,
  getVocabularyIndexMap,
  vocabulary
};
