const express = require("express");
const cors = require("cors");
const jsonwebtoken = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

const verifyJWT = () => {

}


const run = async () => {
    try{
        await client.connect()
        const database = client.db('manufacturer-parts');
        const partsCollection = database.collection('partsCollection')

        
    }
    finally{

    }
};

app.get("/", (req, res) => {
  res.send(`Server running on ${port}`);
});

app.listen(port, () => {
  console.log("Server running");
});
