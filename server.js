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

const featuredJobs = [
    { title: 'Junior Frontend Developer', company: 'BrightLayer Technologies', location: 'Bengaluru', experience: '0-2 years', type: 'Full-time', skills: ['JavaScript', 'HTML/CSS', 'React'], description: 'Build accessible product experiences with a collaborative product team.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=junior%20frontend%20developer' },
    { title: 'Graduate Software Engineer', company: 'Northstar Labs', location: 'Hyderabad', experience: '0-1 years', type: 'Full-time', skills: ['Java', 'SQL', 'Git'], description: 'Join a graduate engineering programme working on reliable backend services.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=graduate%20software%20engineer' },
    { title: 'QA Automation Engineer', company: 'CloudForge', location: 'Remote', experience: '1-3 years', type: 'Full-time', skills: ['JavaScript', 'Playwright', 'CI/CD'], description: 'Create dependable automated tests for a fast-moving cloud platform.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=qa%20automation%20engineer' },
    { title: 'Data Analyst Intern', company: 'InsightWorks', location: 'Pune', experience: '0-1 years', type: 'Internship', skills: ['Python', 'SQL', 'Excel'], description: 'Turn product and business data into clear decisions for internal teams.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=data%20analyst%20intern' },
    { title: 'Backend Developer', company: 'Vertex Systems', location: 'Chennai', experience: '1-3 years', type: 'Full-time', skills: ['Node.js', 'Express', 'PostgreSQL'], description: 'Design APIs and services that power customer-facing applications.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=backend%20developer' },
    { title: 'Cloud Support Associate', company: 'AzureBridge', location: 'Noida', experience: '0-2 years', type: 'Full-time', skills: ['Azure', 'Linux', 'Networking'], description: 'Help teams troubleshoot cloud workloads and build reliable operations.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=cloud%20support%20associate' },
    { title: 'UI/UX Designer', company: 'PixelCraft Studio', location: 'Mumbai', experience: '1-3 years', type: 'Full-time', skills: ['Figma', 'Research', 'Prototyping'], description: 'Create thoughtful user experiences for learning and productivity products.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=ui%20ux%20designer' },
    { title: 'Product Management Intern', company: 'Launchpad Digital', location: 'Remote', experience: '0-1 years', type: 'Internship', skills: ['Research', 'Roadmaps', 'Communication'], description: 'Support product discovery, customer research, and roadmap planning.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=product%20management%20intern' },
    { title: 'DevOps Engineer', company: 'StackWorks', location: 'Bengaluru', experience: '2-5 years', type: 'Full-time', skills: ['Docker', 'Kubernetes', 'CI/CD'], description: 'Improve deployment automation and platform reliability for engineering teams.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=devops%20engineer' },
    { title: 'Business Analyst', company: 'GrowthPath Consulting', location: 'Gurugram', experience: '1-3 years', type: 'Full-time', skills: ['Excel', 'SQL', 'Communication'], description: 'Translate business needs into clear requirements and measurable outcomes.', applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=business%20analyst' }
];

const jobTemplates = [
    ['Software Engineer', 'Engineering', ['JavaScript', 'React', 'Git']],
    ['Frontend Developer', 'Product Engineering', ['HTML/CSS', 'React', 'TypeScript']],
    ['Backend Developer', 'Platform Engineering', ['Node.js', 'SQL', 'REST APIs']],
    ['Data Analyst', 'Analytics', ['Python', 'SQL', 'Excel']],
    ['QA Automation Engineer', 'Quality Engineering', ['Playwright', 'JavaScript', 'CI/CD']],
    ['Cloud Support Engineer', 'Cloud Operations', ['Azure', 'Linux', 'Networking']],
    ['UI/UX Designer', 'Design', ['Figma', 'Research', 'Prototyping']],
    ['Business Analyst', 'Business Operations', ['Excel', 'SQL', 'Communication']],
    ['DevOps Engineer', 'Platform', ['Docker', 'Kubernetes', 'CI/CD']],
    ['Product Associate', 'Product', ['Research', 'Roadmaps', 'Communication']]
];
const jobCompanies = ['NovaWorks', 'GreenGrid', 'Orbit Labs', 'SkillSpring', 'Elevate Systems', 'Mosaic Digital', 'BluePeak', 'Cedar Technologies', 'Flowline', 'NextBridge'];
const jobLocations = ['Remote', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai', 'Gurugram', 'Noida'];
const jobExperiences = ['0-1 years', '0-2 years', '1-3 years', '2-5 years'];

function getJobs() {
    const generated = [];
    for (let index = 0; index < 100 - featuredJobs.length; index += 1) {
        const template = jobTemplates[index % jobTemplates.length];
        const company = jobCompanies[index % jobCompanies.length];
        const location = jobLocations[index % jobLocations.length];
        const experience = jobExperiences[index % jobExperiences.length];
        const title = template[0] + (index % 3 === 0 ? ' — Graduate Programme' : '');
        generated.push({
            title,
            company: company + ' ' + (Math.floor(index / jobCompanies.length) + 1),
            location,
            experience,
            type: experience === '0-1 years' && index % 4 === 0 ? 'Internship' : 'Full-time',
            skills: template[2],
            description: 'Join the ' + template[1].toLowerCase() + ' team and build practical solutions with experienced mentors.',
            applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=' + encodeURIComponent(title)
        });
    }
    return featuredJobs.concat(generated);
}

app.get('/api/jobs', function (req, res) {
    res.json({ jobs: getJobs(), updatedAt: new Date().toISOString() });
});

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
