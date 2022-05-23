const express = require("express");
const cors = require("cors");
const jsonwebtoken = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'Unauthorized Access'})
  }
  const key = authHeader.split(' ')[1];
  jsonwebtoken.verify(key, process.env.SECRET_TOKEN, (error, decoded) => {
    if(error){
      return res.status(403).send({message: 'Access Forbidden'})
    }
    req.decoded = decoded;
    next()
  })

}


const run = async () => {
    try{
        await client.connect()
        const database = client.db('manufacturer-parts');
        const partsCollection = database.collection('partsCollection')
        const usersCollection = database.collection('users')

        // PARTS API
        app.get('/parts',async (req, res)=>{
          const query = {};
          const cursor = partsCollection.find(query);
          const parts = await cursor.toArray();
          res.send(parts)
        })
        app.post('/parts', verifyJWT, async (req, res)=>{
          const parts = req.body;
          const part = await partsCollection.insertOne(parts)
          res.send(part)
        })




        // USERS API
        app.put('/users/:email',async (req, res)=>{
          const email = req.params.email
          const user = req.body;
          const filter = {email: email};
          const options = {upsert: true};
          const updateDoc = {
            $set: user
          }
          const results = await usersCollection.updateOne(filter, updateDoc, options);
          const key = jsonwebtoken.sign({email: email}, process.env.SECRET_TOKEN)
          res.send({results, key})
        })






        console.log('DB Connected')
    }
    finally{

    }
};

run()

app.get("/", (req, res) => {
  res.send(`Server running on ${port}`);
});

app.listen(port, () => {
  console.log("Server running");
});
