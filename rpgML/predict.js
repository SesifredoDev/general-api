const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const { extractFeatures } = require('./features');

const STAT_MAP = {
  Con: 0,
  Str: 1,
  Dex: 2,
  Wis: 3,
  Int: 4,
  Cha: 5
};
const STAT_KEYS = Object.keys(STAT_MAP);

const MODEL_DIR = 'assets';

async function loadModel() {
  const modelJson = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'model.json'), 'utf8'));
  const weightData = fs.readFileSync(path.join(MODEL_DIR, 'weights.bin'));

  const artifacts = {
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData
  };

  return await tf.loadLayersModel(tf.io.fromMemory(artifacts));
}

async function predict(type, label) {
    const vocabArray = JSON.parse(fs.readFileSync(path.join(MODEL_DIR,"vocab.json"), 'utf8'));
    const statKeys = JSON.parse(fs.readFileSync(path.join(MODEL_DIR,"stats.json"), 'utf8'));

    const vocabMap = vocabArray.reduce((map, token, index) => {
        map[token] = index;
        return map;
    }, {});
    const vocabSize = vocabArray.length;

    const { vector, details } = await extractFeatures(type, label, vocabMap, vocabSize);
    console.log('🔍 Extracted Features:', vector);

    const inputTensor = tf.tensor2d([vector]);
    const model = await loadModel();
    const prediction = model.predict(inputTensor);
    const [difficultyScore, statScore] = prediction.dataSync();

    const predictedDifficulty = difficultyScore * 1000;
    const predictedStatIndex = Math.round(statScore * (statKeys.length - 1));
    const predictedStat = statKeys[predictedStatIndex];

    console.log(`🧠 Predicted difficulty for "${label}" → ${predictedDifficulty.toFixed(2)}`);
    console.log(`📊 Predicted stat → ${predictedStat}`);

    return {predictedDifficulty, predictedStat}
}

// Example usage
const type = 3;
const label = "wrote a reflective journal entry about recent experiences";




module.exports = {loadModel, predict}
