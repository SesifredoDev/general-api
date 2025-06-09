const tf = require('@tensorflow/tfjs');
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

async function train () {
  const rawData = await TrainingData.find();
  console.log(rawData)
  const inputs = [];
  const outputs = [];

  console.log('🧠 Building vocabulary...');
  for (const { label } of rawData) {
    tokenizer(label);
  }

  const vocabMap = getVocabularyIndexMap();
  const vocabSize = vocabulary.size;

  console.log('🧠 Extracting features...');
  for (const { type, label, value, stat } of rawData) {
    const { vector } = await extractFeatures(type, label, vocabMap, vocabSize);
    inputs.push(vector);

    const normalizedValue = value / 1000;
    const statIndex = STAT_MAP[stat] ?? 0;
    outputs.push([normalizedValue, statIndex / 5]);
  }

  const inputTensor = tf.tensor2d(inputs);
  const outputTensor = tf.tensor2d(outputs, [outputs.length, 2]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [inputs[0].length], units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 2, activation: 'sigmoid' }));

  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });

  const EPOCHS = 103;
  const BATCH_SIZE = 45;

  console.log('🧪 Training...');

  // Progress bar
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
      }
    }
  });

  bar.stop();

  console.log('💾 Saving model manually...');
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

  console.log('✅ Model and vocab saved successfully.');
}

module.exports = { train };
