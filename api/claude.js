require('dotenv').config();

// Fake Claude API function
function callClaudeAPI(rawQuestion) {
    // Simulate a refined prompt response
    return {
        refinedPrompt: `Refined version of: ${rawQuestion}`
    };
}

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Route to refine a question
router.post('/refine', (req, res) => {
    const { rawQuestion } = req.body;
    if (!rawQuestion) {
        return res.status(400).json({ error: 'rawQuestion is required' });
    }

    const response = callClaudeAPI(rawQuestion);
    res.json(response);
});

// Function to render video using Creatomate API
async function renderVideo() {
    const url = 'https://api.creatomate.com/v2/renders';
    const apiKey = process.env.CREATOMATE_API_KEY; // API key from .env

    const data = {
        template_id: 'c74eca95-9575-45af-9b0e-302ebc90296a',
        modifications: {
            'Video.source': 'https://creatomate.com/files/assets/7347c3b7-e1a8-4439-96f1-f3dfc95c3d28',
            'Text-1.text': 'Your Text And Video Here',
            'Text-2.text': 'Create & Automate\n[size 150%]Video[/size]',
        },
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
        });
        console.log('Render Job Created:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating render job:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { callClaudeAPI, renderVideo };

renderVideo().then(console.log).catch(console.error);