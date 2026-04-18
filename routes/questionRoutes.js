const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { refinePrompt, getStructuredAnswer } = require('../services/geminiService');


router.post('/submit', protect, async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ message: 'Question is required' });
  }


  const grade = req.user.grade || 'Class 10';
  const sessionId = `session_${Date.now()}`;

  console.log(`\n── New Question ──`);
  console.log(`Student: ${req.user.name} | Grade: ${grade}`);
  console.log(`Question: ${question}`);

  try {

    
    console.log('\nStep 1: Refining question...');
    let refined;

    try {
      refined = await refinePrompt(question, grade);
      console.log('✅ Question refined');
    } catch (err) {
      console.error('Refine failed:', err.message);
      refined = `Explain "${question}" for a ${grade} student with definition, analogy, 4 key points and chart data.`;
      console.log('⚠️  Using fallback refined prompt');
    }

    
    console.log('\nStep 2: Getting structured answer...');
    let answerData;

    try {
      answerData = await getStructuredAnswer(refined, grade);
      console.log('✅ Structured answer received');
      console.log('Subject:', answerData.subjectTag);

    } catch (err) {
      console.error('Structured answer failed:', err.message);

      
      answerData = {
        explanation: `We couldn't generate a full answer for "${question}" right now. Please try again in a moment.`,
        keyPoints: [
          'Service is temporarily unavailable',
          'Please try again shortly',
          'Your question has been noted',
          'Contact support if this persists'
        ],
        chartData: {
          type: 'bar',
          title: 'Data unavailable',
          labels: ['A', 'B', 'C', 'D'],
          values: [1, 1, 1, 1]
        },
        subjectTag: 'general'
      };
      console.log('⚠️  Using fallback answer');
    }

    
    console.log('\n✅ Sending response to frontend');

    res.json({
      success: true,
      sessionId,
      rawQuestion: question,
      grade,
      refinedPrompt: refined,
      explanation: answerData.explanation,
      keyPoints: answerData.keyPoints,
      chartData: answerData.chartData,
      subjectTag: answerData.subjectTag,
      
      animationUrl: null,
      avatarVideoUrl: null
    });

  } catch (err) {
    console.error('Pipeline error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
      sessionId
    });
  }
});

module.exports = router;