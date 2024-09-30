const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.byauspy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const customersCollection = client.db("crmDb").collection("customers");
        // insert a customer
        app.post("/customers", async (req, res) => {
            const customers = req.body;
            const result = await customersCollection.insertOne(customers);
            res.send(result);
        })

        // get all customers
        app.get("/customers", async (req, res) => {
            const result = await customersCollection.find().toArray();
            res.send(result)
        });
        // update a medicine
        app.put('/customers/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedCustomer = {
                $set: {
                    name: item.name,
                    phone: item.phone,
                    email: item.email,
                    address: item.address,
                    status: item.status
                }
            }

            const result = await customersCollection.updateOne(filter, updatedCustomer)
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Kaka is running");
})

app.listen(port, () => {
    console.log(`Kaka is sitting on port ${port}`);
})