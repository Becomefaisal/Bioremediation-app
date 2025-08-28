const express = require('express');
const router = express.Router();



// Session store for last prediction context
const { getLastPrediction } = require('../utils/sessionStore');
const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
async function queryOpenRouterFollowup(sample, question) {
  // Compose a prompt that includes the entire sample as context
  const sampleDetails = JSON.stringify(sample, null, 2);
  const prompt = `You are an expert in bioremediation. Given the following sample data, answer the user's question in 3-5 sentences. Be concise, direct, and use the data provided.\n\nSample Data (JSON):\n${sampleDetails}\n\nUser's Question: ${question}\n\nAnswer:`;
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
  model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const aiMessage = response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content
    ? response.data.choices[0].message.content.trim()
    : 'No answer returned.';
  return aiMessage;
}

router.post('/ask', async (req, res) => {
  let { question, sample } = req.body;
  const sessionId = req.headers['x-session-id'] || req.ip;
  if (!sample) {
    sample = getLastPrediction(sessionId);
  }
  if (!sample) {
    return res.json({ answer: 'No prediction context found. Please make a prediction first.' });
  }
  try {
    const aiResult = await queryOpenRouterFollowup(sample, question);
    let cleaned = aiResult
      .replace(/([<◁][t]?hink[▷>][\s\S]*?[<◁]\/?.*?[▷>])/gi, '')
      .replace(/^(te|Te)\b[ ]*/i, 'The ')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ')
      .replace(/undefined/gi, '') // Remove all 'undefined' tokens, anywhere
      .replace(/\s{2,}/g, ' ') // Remove extra spaces
      .trim();
    cleaned = cleaned.replace(/^(te|Te)\b[ ]*/i, 'The ').trim();
    if (!cleaned || cleaned === 'No answer returned.') {
      cleaned = 'No answer could be generated for the provided question.';
    }
    res.json({ answer: cleaned });
  } catch (err) {
    console.error('OpenRouter API error (follow-up):', err.message);
    // Fallback: return a context-aware answer if AI is down
    const fallback = `Based on your scenario (pollutant: ${sample.pollutantType}, concentration: ${sample.concentration} mg/L, method: ${sample.remediationMethod}, duration: ${sample.duration} days, microbes: ${sample.microbes}), a likely answer to your question \"${question}\" is: optimal bioremediation depends on maintaining proper conditions and using effective microbes. For more details, consult a bioremediation expert.`;
    res.json({ answer: 'AI prediction failed due to some internal error.' });
  }
});

module.exports = router;
