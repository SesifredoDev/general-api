const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load data
const dataPath = path.join(__dirname, 'trainingData.json');
const trainData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// POST URL
const API_URL = 'http://localhost:5006/api/trainData/add';

async function sendData() {
  for (let i = 0; i < trainData.length; i++) {
    try {
      const response = await axios.post(API_URL, trainData[i]);
      console.log(`✅ Sent item ${i + 1}/${trainData.length}: ${response.data.message}`);
    } catch (error) {
      console.error(`❌ Error sending item ${i + 1}:`, error.response?.data || error.message);
    }
  }
  console.log('🚀 All data processed.');
}

sendData();
