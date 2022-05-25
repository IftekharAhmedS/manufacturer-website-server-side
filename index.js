const express = require("express");
const cors = require("cors");
const jsonwebtoken = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const key = authHeader.split(" ")[1];
  jsonwebtoken.verify(key, process.env.SECRET_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(403).send({ message: "Access Forbidden" });
    }
    req.decoded = decoded;
    next();
  });
};

const run = async () => {
  try {
    await client.connect();
    const database = client.db("manufacturer-parts");
    const partsCollection = database.collection("partsCollection");
    const usersCollection = database.collection("users");
    const purchaseCollection = database.collection("purchase");
    const paymentCollection = database.collection("payments");

    // PARTS API
    app.get("/parts", async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const parts = await cursor.toArray();
      res.send(parts);
    });
    app.get("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(query);
      res.send(part);
    });
    app.post("/parts", verifyJWT, async (req, res) => {
      const parts = req.body;
      const part = await partsCollection.insertOne(parts);
      res.send(part);
    });

    // PURCHASE API
    app.get("/purchase", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const userPurchases = await purchaseCollection.find(query).toArray();
      res.send(userPurchases);
    });
    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const purchase = await purchaseCollection.findOne(query);
      res.send(purchase);
    });
    app.post("/purchase/", verifyJWT, async (req, res) => {
      const purchaseData = req.body;
      const purchase = await purchaseCollection.insertOne(purchaseData);
      res.send(purchase);
    });

    app.patch('/purchase/:id', async (req, res) => {
      const id = req.params.id;
      const purchase = req.body;
      const query = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'pending',
          transactionId: purchase.transactionId
        }
      }
      const updatedPurchase = await purchaseCollection.updateOne(query, updatedDoc);
      const payment = await paymentCollection.insertOne(purchase)
      res.send(updatedDoc)
    })

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const purchase = req.body;
      const price = purchase.partPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // USERS API
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const results = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const key = jsonwebtoken.sign({ email: email }, process.env.SECRET_TOKEN);
      res.send({ results, key });
    });

    console.log("DB Connected");
  } finally {
  }
};

run();

app.get("/", (req, res) => {
  res.send(`Server running on ${port}`);
});

app.listen(port, () => {
  console.log("Server running");
});
