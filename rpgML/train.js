const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const {
  extractFeatures,
  tokenizer,
  getVocabularyIndexMap,
  vocabulary
} = require('./features');
const STAT_MAP = {
  Con: 0,
  Str: 1,
  Dex: 2,
  Wis: 3,
  Int: 4,
  Cha: 5
};
const STAT_KEYS = Object.keys(STAT_MAP);


async function train () {
  const rawData = JSON.parse(fs.readFileSync('./assets/data.json', 'utf8'));
  const inputs = [];
  const outputs = [];

  console.log('🧠 Building vocabulary...');
  for (const { label } of rawData) {
    tokenizer(label);
  }

  const vocabMap = getVocabularyIndexMap();
  const vocabSize = vocabulary.size;

  console.log('🧠 Extracting features...');
  for (const { label, value, stat } of rawData) {
    const { vector } = await extractFeatures(1, label, vocabMap, vocabSize);
    inputs.push(vector);
    
    
    const normalizedValue = value / 1000;
    const statIndex = STAT_MAP[stat] ?? 0;
    outputs.push([normalizedValue, statIndex / 5]); // Normalize stat index
  }

  const inputTensor = tf.tensor2d(inputs);
  const outputTensor = tf.tensor2d(outputs, [outputs.length, 2]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [inputs[0].length], units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  model.add(tf.layers.dense({ units: 2, activation: 'sigmoid' }));

  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });

  console.log('🧪 Training...');
  await model.fit(inputTensor, outputTensor, {
    epochs: 103,
    batchSize: 8,
    shuffle: true,
    verbose: 1
  });

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
};
// train();

module.exports = { train }