const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const { extractFeatures } = require('./features');

const MODEL_DIR = path.join(__dirname, '..', 'assets');

// Pad or truncate vector to match expected size
function padOrTrim(vector, targetLength) {
  if (vector.length > targetLength) return vector.slice(0, targetLength);
  while (vector.length < targetLength) vector.push(0);
  return vector;
}

async function loadModel() {
  const modelJson = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'model.json'), 'utf8'));
  const weightData = fs.readFileSync(path.join(MODEL_DIR, 'weights.bin'));

  const artifacts = {
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData,
  };

  return await tf.loadLayersModel(tf.io.fromMemory(artifacts));
}

async function predict(type, label) {
  // Load saved vocabulary and stats
  const vocabArray = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'vocab.json'), 'utf8'));
  const statKeys = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'stats.json'), 'utf8'));

  const vocabMap = Object.fromEntries(vocabArray.map((token, i) => [token, i]));
  const vocabSize = vocabArray.length;

  // Extract features and pad/truncate
  const { vector } = await extractFeatures(type, label, vocabMap, vocabSize);
  const paddedVector = padOrTrim(vector, vocabSize);

  // Create input tensor
  const inputTensor = tf.tensor2d([paddedVector], [1, vocabSize]);

  // Load model and predict
  const model = await loadModel();
  const prediction = model.predict(inputTensor);

  const [difficultyScore, statScore] = await prediction.array().then(res => res[0]);

  // Clean up
  tf.dispose([inputTensor, prediction]);

  // Format result
  const predictedDifficulty = Math.round(difficultyScore * 1000);
  const predictedStatIndex = Math.round(statScore * (statKeys.length - 1));
  const predictedStat = statKeys[predictedStatIndex];

  console.log(`🧠 Predicted difficulty for "${label}" → ${predictedDifficulty}`);
  console.log(`📊 Predicted stat → ${predictedStat}`);

  return { predictedDifficulty, predictedStat };
}

// Optional: test predict directly
if (require.main === module) {
  predict(3, "wrote a reflective journal entry about recent experiences")
    .then(console.log)
    .catch(console.error);
}

module.exports = { loadModel, predict };
