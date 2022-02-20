const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient } = require('mongodb');

const port = process.env.PORT || 5000;

// const serviceAccount ={
//     dev: {
//       type: process.env.TYPE,
//       project_id: process.env.PROJECT_ID,
//       private_key_id: process.env.PRIVATE_KEY_ID,
//       private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'), 
//       client_email: process.env.CLIENT_EMAIL,
//       client_id: process.env.CLIENT_ID,
//       auth_uri: process.env.AUTH_URI,
//       token_uri: process.env.TOKEN_URI,
//       auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
//       client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
//     },
//   };
// var serviceAccount = require("./service-account.json");

// var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

admin.initializeApp({
       credential: admin.credential.cert({
        type: process.env.FIREBASE_TYPE,
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER,
        client_x509_cert_url: process.env.FIREBASE_CLIENT
      })
     });


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5zsfm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];

      try {
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
      }
      catch {

      }

  }
  next();
}

async function run() {
  try {
      await client.connect();
      const database = client.db('doctors_portal');
      const appointmentsCollection = database.collection('appointments');
      const usersCollection = database.collection('users');

      app.get('/appointments', verifyToken, async (req, res) => {
          const email = req.query.email;
          const date = req.query.date;

          const query = { email: email, date: date }

          const cursor = appointmentsCollection.find(query);
          const appointments = await cursor.toArray();
          res.json(appointments);
      })

      app.post('/appointments', async (req, res) => {
          const appointment = req.body;
          const result = await appointmentsCollection.insertOne(appointment);
          res.json(result)
      });

      app.get('/users/:email', async (req, res) => {
          const email = req.params.email;
          const query = { email: email };
          const user = await usersCollection.findOne(query);
          let isAdmin = false;
          if (user?.role === 'admin') {
              isAdmin = true;
          }
          res.json({ admin: isAdmin });
      })

      app.post('/users', async (req, res) => {
          const user = req.body;
          const result = await usersCollection.insertOne(user);
          console.log(result);
          res.json(result);
      });

      app.put('/users', async (req, res) => {
          const user = req.body;
          const filter = { email: user.email };
          const options = { upsert: true };
          const updateDoc = { $set: user };
          const result = await usersCollection.updateOne(filter, updateDoc, options);
          res.json(result);
      });

      app.put('/users/admin', verifyToken, async (req, res) => {
          const user = req.body;
          const requester = req.decodedEmail;
          if (requester) {
              const requesterAccount = await usersCollection.findOne({ email: requester });
              if (requesterAccount.role === 'admin') {
                  const filter = { email: user.email };
                  const updateDoc = { $set: { role: 'admin' } };
                  const result = await usersCollection.updateOne(filter, updateDoc);
                  res.json(result);
              }
          }
          else {
              res.status(403).json({ message: 'you do not have access to make admin' })
          }

      })

  }
  finally {
      // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Doctors portal!')
})

app.listen(port, () => {
  console.log(`listening at ${port}`)
})

// app.get('/users')
// app.post('/users')
// app.get('/users/:id')
// app.put('/users/:id');
// app.delete('/users/:id')
// users: get
// users: post