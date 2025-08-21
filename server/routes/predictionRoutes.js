const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log('OPENAI_API_KEY loaded:', !!OPENAI_API_KEY);
async function queryOpenAI(input) {
    const prompt = `You are an expert in bioremediation. Given the following scenario, provide ONLY the most likely final outcome (in 4-5 sentences ) of the bioremediation process, based on the parameters. Do NOT include your reasoning, thinking, or bullet points. Be concise and direct.\n\nScenario Details:\n- Pollutant Type: ${input.pollutantType}\n- Concentration: ${input.concentration} mg/L\n- Temperature: ${input.temperature} °C\n- pH: ${input.ph}\n- Remediation Method: ${input.remediationMethod}\n- Duration: ${input.duration} days\n- Microbes: ${input.microbes}\n- Site Description: ${input.siteDescription}\n\nFinal Likely Outcome:`;
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'user', content: prompt }
            ]
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );
    const aiMessage = response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content
        ? response.data.choices[0].message.content.trim()
        : 'No prediction returned.';
    return aiMessage;
}

const express = require('express');
const router = express.Router();

// Session store for last prediction context
const { setLastPrediction } = require('../utils/sessionStore');
// POST /api/predict
router.post('/', async (req, res) => {
    const input = req.body;
    if (!input || typeof input !== 'object') {
        return res.status(400).json({ error: 'Invalid input' });
    }
    // Use a sessionId from header/cookie, or fallback to IP for demo
    const sessionId = req.headers['x-session-id'] || req.ip;
    try {
        const aiResult = await queryOpenAI(input);
        let cleaned = aiResult
            .replace(/([<◁][t]?hink[▷>][\s\S]*?[<◁]\/?.*?[▷>])/gi, '')
            .replace(/^(te|Te)\b[ ]*/i, 'The ')
            .replace(/undefined/gi, '')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ')
            .trim();
        cleaned = cleaned.replace(/^(te|Te)\b[ ]*/i, 'The ').replace(/undefined$/gi, '').trim();
        if (!cleaned || cleaned === 'No prediction returned.') {
            cleaned = 'No prediction could be generated for the provided input.';
        }
        // Store the last prediction context for this session
        setLastPrediction(sessionId, input);
        res.json({ prediction: cleaned });
    } catch (err) {
        console.error('OpenAI API error:', err.message);
        res.status(500).json({ error: 'AI prediction failed' });
    }
});

module.exports = router;
