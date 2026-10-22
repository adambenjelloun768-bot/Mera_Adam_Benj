const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const connectDB = require('./config/db');
const Item = require('./models/item');

const app = express();
const port = process.env.PORT;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find();
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || typeof price !== 'number') {
      return res.status(400).json({ error: 'name et price sont obligatoires' });
    }
    const item = await Item.create({ name, price });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

connectDB();
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});