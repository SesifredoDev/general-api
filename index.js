const express = require('express');

const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');


const authRoutes = require('./routes/auth');
const youTwoRoutes  = require('./routes/youTwo')


const trainingDataRoutes = require('./routes/trainingData');
const train = require("./rpgML/train");
const rpgUtil = require("./rpgML/utils");



require('dotenv').config();

// Express Setup
const port = process.env.PORT || 5006

const app = express()

app.use(cors({
  origin: '*', // Ionic dev server
  credentials: true
}));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

app.use(express.static(path.join(__dirname, 'public')))

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(express.json())


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));


app.use('/api/you2', youTwoRoutes);

app.use('/api/auth', authRoutes);


app.get('/', (req, res) => {
  console.log(`Rendering 'pages/index' for route '/'`)
  res.send("Hello World")
})

app.get('/train', (req,res)=>{
  train.train();
  res.send('training now..')
})

app.use('/api/trainData', trainingDataRoutes);

app.post('/predict', async (req, res)=>{
  const data = req.body;
  let input =  data.input;
  let type = Number(data.type);
  console.log(data)
  rpgUtil.predictParagraph(type, input)
    .then(result =>{
      res.send(result)
  })

  
  
})

const server = app.listen(port, () => {
  console.log(`Listening on ${port}`)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: gracefully shutting down')
  if (server) {
    server.close(() => {
      console.log('HTTP server closed')
    })
  }
})
