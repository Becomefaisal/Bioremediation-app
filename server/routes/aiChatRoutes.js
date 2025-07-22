const express = require('express');
const router = express.Router();

// Dummy AI response for demonstration
router.post('/ask', async (req, res) => {
  const { question, sample } = req.body;
  // Here you would call your AI model/API with the question and sample context
  // For now, just echo the question and sample ID
  res.json({
    answer: `AI response to "${question}" for sample ${sample._id}`
  });
});

module.exports = router;
