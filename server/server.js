const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: function(origin, callback) {
    // Allow all Vercel preview/production domains and localhost
    if (!origin ||
        origin.endsWith('.vercel.app') ||
        origin === 'https://bioremediation-app.vercel.app' ||
        origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Mongo error:', err));

app.use('/api/samples', require('./routes/sampleRoutes'));
app.use('/api/predict', require('./routes/predictionRoutes'));
app.use('/api/ai-chat', require('./routes/aiChatRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));