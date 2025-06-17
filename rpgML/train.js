const tf = require('@tensorflow/tfjs'); // Use tfjs-node for faster training
const fs = require('fs');
const TrainingData = require('../models/trainingData');
const cliProgress = require('cli-progress');
const {
  extractFeatures,
  tokenizer,
  getVocabularyIndexMap,
  vocabulary
} = require('./features');

const STAT_MAP = {
  Con: 0, Str: 1, Dex: 2, Wis: 3, Int: 4, Cha: 5
};
const STAT_KEYS = Object.keys(STAT_MAP);

// Utility to pad/truncate feature vectors
function padOrTrim(vector, targetLength) {
  if (vector.length > targetLength) return vector.slice(0, targetLength);
  while (vector.length < targetLength) vector.push(0);
  return vector;
}

async function train() {
  console.log('📦 Loading training data...');
  const rawData = await TrainingData.find();
  if (!rawData.length) {
    console.error('❌ No training data found.');
    return;
  }

  const inputs = [];
  const outputs = [];

  console.log('🔤 Building vocabulary...');
  for (const { label } of rawData) tokenizer(label);

  const vocabMap = getVocabularyIndexMap();
  const vocabSize = vocabulary.size;

  console.log('🧠 Extracting features and preparing tensors...');
  for (const { type, label, value, stat } of rawData) {
    const { vector } = await extractFeatures(type, label, vocabMap, vocabSize);
    const paddedVector = padOrTrim(vector, vocabSize);
    inputs.push(paddedVector);

    const normalizedValue = value / 1000; // Assumes values range from 0 to 1000
    const statIndex = STAT_MAP[stat] ?? 0;
    outputs.push([normalizedValue, statIndex / 5]);
  }

  const inputShape = inputs[0].length;
  const outputShape = outputs[0].length;

  console.log(`📐 Input shape: [${inputs.length}, ${inputShape}]`);
  console.log(`📐 Output shape: [${outputs.length}, ${outputShape}]`);

  const inputTensor = tf.tensor2d(inputs, [inputs.length, inputShape]);
  const outputTensor = tf.tensor2d(outputs, [outputs.length, outputShape]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [inputShape], units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: outputShape, activation: 'sigmoid' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mse']
  });

  const EPOCHS = 103;
  const BATCH_SIZE = 64;

  console.log('🚀 Starting training...');

  const bar = new cliProgress.SingleBar({
    format: 'Training |{bar}| {percentage}% || Epoch: {value}/{total} || Loss: {loss}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  bar.start(EPOCHS, 0, { loss: '---' });

  await model.fit(inputTensor, outputTensor, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    shuffle: true,
    validationSplit: 0.1,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        bar.update(epoch + 1, { loss: logs.loss.toFixed(5) });
        if (logs.loss < 0.001) model.stopTraining = true;
      }
    }
  });

  bar.stop();

  console.log('💾 Saving model and assets...');

  await model.save(tf.io.withSaveHandler(async (artifacts) => {
    const modelJson = {
      modelTopology: artifacts.modelTopology,
      weightsManifest: [{
        paths: ['weights.bin'],
        weights: artifacts.weightSpecs
      }]
    };

    fs.writeFileSync('./assets/model.json', JSON.stringify(modelJson));
    fs.writeFileSync('./assets/weights.bin', Buffer.from(artifacts.weightData));

    return {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: 'JSON',
        weightDataBytes: artifacts.weightData.byteLength
      }
    };
  }));

  fs.writeFileSync('./assets/vocab.json', JSON.stringify([...vocabulary]));
  fs.writeFileSync('./assets/stats.json', JSON.stringify(STAT_KEYS));

  console.log('✅ Model and assets saved successfully.');
}

module.exports = { train };
