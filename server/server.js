const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: [
    'https://bioremediation-flu8kxc2m-becomefaisals-projects.vercel.app',
    'https://bioremediation.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Mongo error:', err));

app.use('/api/samples', require('./routes/sampleRoutes'));
app.use('/api/predict', require('./routes/predictionRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));