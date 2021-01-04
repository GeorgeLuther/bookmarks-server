require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const winston = require('winston');
const { NODE_ENV } = require('./config')
const { v4: uuid } = require('uuid');

const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption))
app.use(express.json())
app.use(helmet())
app.use(cors())

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'info.log' })
    ]
});
  
if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));
}

app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN
    const authToken = req.get('Authorization')
  
    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`)
        return res.status(401).json({ error: 'Unauthorized request' })
    }
    next()
  })


const bookmarks = [{
    id: 1,
    title: 'Google',
    url: 'www.google.com',
    desc: 'The worlds search engine',
    rating: '4'
  }];

app.use('/bookmarks',(req,res)=>{
    res
        .json(bookmarks)
})
app.get('/bookmark/:id', (req, res) => {
    const { id } = req.params;
    const bookmark = bookmarks.find(b => b.id == id);
  
    // make sure we found a bookmark
    if (!bookmark) {
      logger.error(`Bookmark with id ${id} not found.`);
      return res
        .status(404)
        .send('Bookmark Not Found');
    }
  
    res.json(bookmark);
});
app.post('/bookmark',(req,res)=>{
  console.log(req.body)
    const { title, url, desc, rating } = req.body;
    if (!title) {
        logger.error(`Title is required`);
        return res
          .status(400)
          .send('Invalid data');
     }
      
    if (!url) {
        logger.error(`URL is required`);
        return res
          .status(400)
          .send('Invalid data');
    }
    
    let isValidURL =()=> {
      if (url.toLowerCase().includes('https://')) {
      return true
    } if (url.toLowerCase().includes('http://')) {
      return true
    }
    false 
    }

    if (!isValidURL) {
        logger.error(`URL is invalid, must include http(s)://`);
        return res
          .status(400)
          .send('Invalid data');
      }

    const id = uuid();

    const bookmark = {
        id,
        title,
        url,
        desc,
        rating
    };

    bookmarks.push(bookmark);
    logger.info(`Bookmark with id ${id} created`);

    res
    .status(201)
    .location(`http://localhost:8000/bookmark/${id}`)
    .json(bookmark);
})

app.delete('/bookmark/:id', (req, res)=>{
  const {id}=req.params
  const idx = bookmarks.findIndex(bkmk=> bkmk.id == id)

  if (idx == -1) {
    logger.error(`Bookmark with id ${id} not found`)
    return res
      .status(404)
      .send('Not Found')
  }
  bookmarks.splice(idx, 1)

  logger.info(`Bookmark with id ${id} deleted.`)
  res
    .status(204)
    .end()
})

app.use(function errorHandler(error, req, res, next){
    let response
    if (NODE_ENV === 'production') {
        response = {error: {message: 'server error'}}
    } else {
        console.error(error)
        response = {message: error.message, error}
    }
    res.status(500).json(response)
})
module.exports = app