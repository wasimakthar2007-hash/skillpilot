const path = require('path');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.GOOGLE_AI_MODEL || 'gemini-3.6-flash';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

app.use(express.json({ limit: '32kb' }));
app.use(express.static(__dirname));

async function askGoogle(prompt) {
    if (!process.env.GOOGLE_AI_API_KEY) throw new Error('GOOGLE_AI_API_KEY is not configured on the server.');
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(process.env.GOOGLE_AI_API_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const responseBody = await response.text();
    let data = {};
    if (responseBody.trim()) {
        try {
            data = JSON.parse(responseBody);
        } catch (error) {
            throw new Error('Google AI returned an invalid response (HTTP ' + response.status + ').');
        }
    }
    if (!response.ok) throw new Error(data.error && data.error.message ? data.error.message : 'Google AI request failed.');
    const text = data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
    if (!text) throw new Error('Google AI returned an empty response.');
    return text;
}

app.post('/api/mentor', aiLimiter, async function (req, res) {
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
    const context = typeof req.body.context === 'string' ? req.body.context.trim() : '';
    if (question.length < 5 || question.length > 4000) return res.status(400).json({ error: 'Ask a question between 5 and 4000 characters.' });
    try {
        const answer = await askGoogle('You are a patient placement-training mentor. Explain clearly, accurately, and step by step. Context: ' + context + '\nStudent doubt: ' + question);
        res.json({ answer: answer });
    } catch (error) {
        res.status(502).json({ error: error.message });
    }
});

async function extractResume(file) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension === '.pdf') return (await pdfParse(file.buffer)).text;
    if (extension === '.docx') return (await mammoth.extractRawText({ buffer: file.buffer })).value;
    if (extension === '.txt' || extension === '.doc') return file.buffer.toString('utf8');
    throw new Error('Only PDF, DOC, DOCX, and TXT files are supported.');
}

app.post('/api/resume/analyze', aiLimiter, upload.single('resume'), async function (req, res) {
    if (!req.file) return res.status(400).json({ error: 'Please upload a resume file.' });
    try {
        const text = (await extractResume(req.file)).trim();
        if (!text) return res.status(400).json({ error: 'The uploaded resume contains no readable text.' });
        if (text.length > 30000) return res.status(400).json({ error: 'Resume text is too long to analyze.' });
        const role = typeof req.body.targetRole === 'string' ? req.body.targetRole.trim() : '';
        const analysis = await askGoogle('Review this resume for a placement candidate targeting ' + (role || 'a suitable entry-level role') + '. Return sections: strengths, missing or weak content, ATS improvements, rewritten summary, and five prioritized actions. Do not invent experience.\nResume text:\n' + text);
        res.json({ analysis: analysis });
    } catch (error) {
        res.status(502).json({ error: error.message });
    }
});

app.use(function (error, req, res, next) {
    if (error instanceof SyntaxError && error.status === 400 && error.body) {
        return res.status(400).json({ error: 'The request body must contain valid JSON.' });
    }
    next(error);
});

app.listen(port, function () {
    console.log('Skill Pilot running at http://localhost:' + port);
});
