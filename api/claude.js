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
const mongoose = require('mongoose');

// --- Person 4 (Minimal Setup for Person 3 to work) ---
const historySchema = new mongoose.Schema({
    userId: { type: String, default: 'anonymous' },
    rawQuestion: String,
    refinedPrompt: String,
    textAnswer: String,
    animationUrl: String,
    avatarVideoUrl: String,
    subjectTag: String,
    chartData: Object,
    createdAt: { type: Date, default: Date.now }
});

const History = mongoose.models.History || mongoose.model('History', historySchema);

// --- Person 3 Tasks (Phase 2) ---

// 1. Handle Claude JSON parsing + fallback logic
function parseType1Response(rawText) {
    try {
        // Try to find JSON in the text (in case Claude added conversational filler)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
        
        return {
            explanation: data.explanation || 'No explanation provided.',
            keyPoints: data.keyPoints || [],
            chartData: data.chartData || null,
            subjectTag: data.subjectTag || 'general' // 2. Add subjectTag extraction
        };
    } catch (error) {
        console.error("Claude JSON Parsing Error:", error);
        // Fallback logic: Treat raw string as the explanation
        return {
            explanation: rawText,
            keyPoints: [],
            chartData: null,
            subjectTag: 'uncategorized'
        };
    }
}

// 3. Implement MongoDB save after successful Type 1
async function saveToHistory(data) {
    try {
        const entry = new History({
            rawQuestion: data.rawQuestion,
            refinedPrompt: data.refinedPrompt,
            textAnswer: data.explanation,
            subjectTag: data.subjectTag,
            chartData: data.chartData
        });
        await entry.save();
        console.log("Successfully saved to MongoDB history with tag:", data.subjectTag);
        return entry;
    } catch (error) {
        console.error("Failed to save to MongoDB:", error);
    }
}

// Updated route to include Person 3 logic (Phase 2)
router.post('/refine', async (req, res) => {
    const { rawQuestion } = req.body;
    if (!rawQuestion) {
        return res.status(400).json({ error: 'rawQuestion is required' });
    }

    // Person 1 would get this, Person 3 processes it
    const fakeRawClaudeResponse = JSON.stringify({
        explanation: `Detailed explanation for: ${rawQuestion}`,
        keyPoints: ["Point 1", "Point 2"],
        chartData: { type: 'bar', labels: ['A', 'B'], values: [10, 20] },
        subjectTag: 'Education'
    });

    const processedData = parseType1Response(fakeRawClaudeResponse);
    
    // Save to history (Person 3 task)
    await saveToHistory({
        rawQuestion,
        refinedPrompt: `Refined: ${rawQuestion}`,
        ...processedData
    });

    res.json({
        refinedPrompt: `Refined: ${rawQuestion}`,
        ...processedData
    });
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