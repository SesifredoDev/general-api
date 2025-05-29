const express = require('express')
const train = require("./rpgML/train")
const predict = require("./rpgML/predict")
const path = require('path')

const port = process.env.PORT || 5006

const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  console.log(`Rendering 'pages/index' for route '/'`)
  res.send("Hello World")
})

app.get('/predict', async (req, res)=>{
  const data = req.query;
  let input =  data.input;
  let type = Number(data.type);


  predict.predict(type, input).then((result)=>{
    res.send(result)
  });

  
  
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


bootsequence = async () =>{
  console.log("=== 🔃 Bootsequence ===")
  // await train.train()
  await predict.loadModel();
  ;
}

bootsequence();