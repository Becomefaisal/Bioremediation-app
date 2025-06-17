const axios = require('axios');
require('dotenv');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
console.log('OPENROUTER_API_KEY:', OPENROUTER_API_KEY ? 'Loaded' : 'NOT LOADED');
async function queryOpenRouter(input) {
    const prompt = `You are an expert in bioremediation. Given the following scenario, provide ONLY the most likely final outcome (in 4-5 sentences ) of the bioremediation process, based on the parameters. Do NOT include your reasoning, thinking, or bullet points. Be concise and direct.\n\nScenario Details:\n- Pollutant Type: ${input.pollutantType}\n- Concentration: ${input.concentration} mg/L\n- Temperature: ${input.temperature} °C\n- pH: ${input.ph}\n- Remediation Method: ${input.remediationMethod}\n- Duration: ${input.duration} days\n- Microbes: ${input.microbes}\n- Site Description: ${input.siteDescription}\n\nFinal Likely Outcome:`;
    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: 'moonshotai/kimi-dev-72b:free',
            messages: [
                { role: 'user', content: prompt }
            ],
            // Remove max_tokens to avoid token limit
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );
    // Return the full AI message without post-processing
    const aiMessage = response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content
        ? response.data.choices[0].message.content.trim()
        : 'No prediction returned.';
    return aiMessage;
}

const express = require('express');
const router = express.Router();

// POST /api/predict
router.post('/', async (req, res) => {
    const input = req.body;
    if (!input || typeof input !== 'object') {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const aiResult = await queryOpenRouter(input);
        let cleaned = aiResult
            .replace(/([<◁][t]?hink[▷>][\s\S]*?[<◁]\/?[t]?hink[▷>])/gi, '')
            .replace(/undefined\s*$/gi, '')
            .replace(/undefined/gi, '')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ')
            .trim();
        cleaned = cleaned.replace(/^(Te |te )/, 'The ');
        // If the cleaned result is empty or default, return a more user-friendly message
        if (!cleaned || cleaned === 'No prediction returned.') {
            cleaned = 'No prediction could be generated for the provided input.';
        }
        res.json({ prediction: cleaned });
    } catch (err) {
        console.error('OpenRouter API error:', err.message);
        res.status(500).json({ error: 'AI prediction failed' });
    }
});

module.exports = router;
