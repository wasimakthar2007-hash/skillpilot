/**
 * Parse aptitude/DSA MCQs from jsdsa_100000_questions_answers_compact.pdf using PDF.js.
 * Supports common compact Q&A layouts; batches results into IndexedDB via QuestionStore.
 */
const PdfParser = (function () {
    const PDF_URL = 'jsdsa_100000_questions_answers_compact.pdf';
    const PARSER_VERSION = '2';
    const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function loadPdfJs() {
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
            return Promise.resolve(window.pdfjsLib);
        }

        return new Promise(function (resolve, reject) {
            const script = document.createElement('script');
            script.src = PDFJS_CDN;
            script.onload = function () {
                if (!window.pdfjsLib) {
                    reject(new Error('PDF.js failed to load'));
                    return;
                }
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
                resolve(window.pdfjsLib);
            };
            script.onerror = function () {
                reject(new Error('Could not load PDF.js from CDN'));
            };
            document.head.appendChild(script);
        });
    }

    function normalizeText(raw) {
        return raw
            .replace(/\r\n/g, '\n')
            .replace(/\u00a0/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Parse MCQ blocks from extracted PDF text.
     * Patterns tried (in order):
     * 1) Q1. / 1. question ... A) B) C) D) Answer: ... Explanation: ...
     * 2) question | option1 | option2 | option3 | option4 | answer | explanation (pipe/CSV-like)
     * 3) Numbered blocks with (a)(b)(c)(d) and Answer:
     */
    function parseQuestionsFromText(text) {
        const cleaned = normalizeText(text);
        let questions = parseLabeledBlocks(cleaned);
        if (questions.length < 5) {
            questions = parsePipeRows(cleaned);
        }
        if (questions.length < 5) {
            questions = parseParenOptions(cleaned);
        }
        return questions;
    }

    function findAnswerIndex(options, answerRaw) {
        if (!answerRaw) return 0;
        const a = String(answerRaw).trim();

        // Letter form: A / B / C / D or A) / (a)
        const letter = a.match(/^[(\[]?\s*([A-Da-d])\s*[)\].:]?$/);
        if (letter) {
            return letter[1].toUpperCase().charCodeAt(0) - 65;
        }

        // Option text match
        const idx = options.findIndex(function (opt) {
            return opt && opt.trim().toLowerCase() === a.toLowerCase();
        });
        if (idx !== -1) return idx;

        // Partial match
        const partial = options.findIndex(function (opt) {
            return opt && (opt.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(opt.toLowerCase()));
        });
        return partial !== -1 ? partial : 0;
    }

    function parseLabeledBlocks(text) {
        const results = [];
        // Split on Q1. / Question 1: / 1.
        const parts = text.split(/(?=(?:^|\n)\s*(?:Q(?:uestion)?\s*)?\d+[.)]\s+)/i);

        parts.forEach(function (block) {
            const b = block.trim();
            if (b.length < 20) return;

            const qMatch = b.match(/^(?:Q(?:uestion)?\s*)?\d+[.)]\s*([\s\S]+?)(?=\n\s*[A-Da-d][).\]:]|\n\s*\([A-Da-d]\))/i);
            if (!qMatch) return;

            const question = qMatch[1].replace(/\s+/g, ' ').trim();
            if (question.length < 8) return;

            const optRegex = /(?:^|\n)\s*(?:([A-Da-d])[).\]:]|\(([A-Da-d])\))\s*([^\n]+)/g;
            const options = [];
            let m;
            while ((m = optRegex.exec(b)) !== null && options.length < 4) {
                options.push(m[3].trim());
            }
            // Fallback: options on same line as "A) ... B) ... C) ... D) ..."
            if (options.length < 2) {
                const inline = b.match(/\b([A-Da-d])[).\]:]\s*([^A-D\n]+?)(?=\s+[A-Da-d][).\]:]|\s+(?:Answer|Ans)\b|$)/gi);
                if (inline) {
                    inline.forEach(function (piece) {
                        if (options.length >= 4) return;
                        const om = piece.match(/^[A-Da-d][).\]:]\s*(.+)$/i);
                        if (om) options.push(om[1].trim());
                    });
                }
            }
            if (options.length < 2) return;

            while (options.length < 4) options.push('');

            const ansMatch = b.match(/(?:Answer|Ans|Correct\s*Answer)\s*[:\-–]\s*([^\n]+)/i);
            const expMatch = b.match(/(?:Explanation|Solution|Reason)\s*[:\-–]\s*([\s\S]+?)(?=\n\s*(?:Q(?:uestion)?\s*)?\d+[.)]|$)/i);

            results.push({
                question: question,
                options: options.slice(0, 4),
                answer: findAnswerIndex(options, ansMatch ? ansMatch[1] : ''),
                explanation: expMatch ? expMatch[1].replace(/\s+/g, ' ').trim() : 'No explanation provided.'
            });
        });

        return results;
    }

    function parsePipeRows(text) {
        const results = [];
        const records = text.split(/(?=^\s*id=\d+\s*\|)/m);

        records.forEach(function (record) {
            const fields = {};
            record.split(/\s*\|\s*(?=[a-z_]+=[^|]*)/i).forEach(function (part) {
                const match = part.match(/^\s*([a-z_]+)=(.*)$/is);
                if (match) fields[match[1].toLowerCase()] = match[2].trim();
            });

            if (!fields.question || !fields.option_a || !fields.option_b ||
                !fields.option_c || !fields.option_d) return;

            const options = [fields.option_a, fields.option_b, fields.option_c, fields.option_d];
            results.push({
                question: fields.question.replace(/\s+/g, ' ').trim(),
                options: options,
                answer: findAnswerIndex(options, fields.answer),
                explanation: (fields.explanation || 'No explanation provided.').replace(/\s+/g, ' ').trim()
            });
        });

        if (results.length) return results;

        const lines = text.split('\n');

        lines.forEach(function (line) {
            if (line.indexOf('|') === -1) return;
            const cols = line.split('|').map(function (c) {
                return c.trim();
            });
            // question, o1, o2, o3, o4, answer [, explanation]
            if (cols.length < 6) return;
            if (/^question$/i.test(cols[0])) return;

            const options = [cols[1], cols[2], cols[3], cols[4]];
            results.push({
                question: cols[0],
                options: options,
                answer: findAnswerIndex(options, cols[5]),
                explanation: cols[6] || 'No explanation provided.'
            });
        });

        return results;
    }

    function parseParenOptions(text) {
        const results = [];
        const parts = text.split(/(?=(?:^|\n)\s*\d+[.)]\s+)/);

        parts.forEach(function (block) {
            const b = block.trim();
            const qMatch = b.match(/^\d+[.)]\s*([\s\S]+?)(?=\([a-dA-D]\))/);
            if (!qMatch) return;

            const question = qMatch[1].replace(/\s+/g, ' ').trim();
            const optRegex = /\(([a-dA-D])\)\s*([^(\n]+)/g;
            const options = [];
            let m;
            while ((m = optRegex.exec(b)) !== null && options.length < 4) {
                options.push(m[2].trim());
            }
            if (options.length < 2) return;
            while (options.length < 4) options.push('');

            const ansMatch = b.match(/(?:Answer|Ans)\s*[:\-–]\s*([^\n]+)/i);
            const expMatch = b.match(/(?:Explanation|Solution)\s*[:\-–]\s*([\s\S]+)$/i);

            results.push({
                question: question,
                options: options.slice(0, 4),
                answer: findAnswerIndex(options, ansMatch ? ansMatch[1] : ''),
                explanation: expMatch ? expMatch[1].replace(/\s+/g, ' ').trim() : 'No explanation provided.'
            });
        });

        return results;
    }

    /**
     * @param {function({phase:string, percent:number, message:string})} onProgress
     * @returns {Promise<{total:number, lastParsed:string}>}
     */
    async function extractAndParse(onProgress) {
        const report = function (phase, percent, message) {
            if (typeof onProgress === 'function') {
                onProgress({ phase: phase, percent: percent, message: message });
            }
        };

        report('load', 0, 'Loading PDF.js...');
        const pdfjsLib = await loadPdfJs();

        report('fetch', 5, 'Fetching PDF...');
        let pdf;
        try {
            pdf = await pdfjsLib.getDocument(PDF_URL).promise;
        } catch (err) {
            throw new Error(
                'Could not load ' +
                    PDF_URL +
                    '. Place the file in the project folder and run a local server (e.g. python -m http.server 8080). ' +
                    (err && err.message ? err.message : '')
            );
        }

        const numPages = pdf.numPages;
        const textChunks = [];
        const allQuestions = [];
        const FLUSH_EVERY = 50; // pages before parse+save batch

        report('extract', 8, 'Extracting text from ' + numPages + ' pages...');

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            // Preserve line breaks using Y positions (critical for option parsing)
            let pageText = '';
            let lastY = null;
            content.items.forEach(function (item) {
                const y = item.transform && item.transform[5];
                if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
                    pageText += '\n';
                } else if (pageText.length && !/\s$/.test(pageText) && item.str && !/^\s/.test(item.str)) {
                    pageText += ' ';
                }
                pageText += item.str || '';
                if (y !== undefined) lastY = y;
            });
            textChunks.push(pageText);

            const extractPct = 8 + Math.floor((pageNum / numPages) * 70);
            if (pageNum % 5 === 0 || pageNum === numPages) {
                report('extract', extractPct, 'Extracted page ' + pageNum + ' / ' + numPages);
            }

            // Periodically parse and flush to keep memory down
            if (pageNum % FLUSH_EVERY === 0 || pageNum === numPages) {
                const chunkText = textChunks.join('\n');
                textChunks.length = 0;
                const parsed = parseQuestionsFromText(chunkText);
                Array.prototype.push.apply(allQuestions, parsed);
                report(
                    'parse',
                    extractPct,
                    'Parsed so far: ' + allQuestions.length + ' questions (page ' + pageNum + ')'
                );
            }
        }

        // Deduplicate by question text
        const seen = Object.create(null);
        const unique = [];
        allQuestions.forEach(function (q) {
            const key = q.question.slice(0, 120).toLowerCase();
            if (!seen[key]) {
                seen[key] = true;
                unique.push(q);
            }
        });

        if (unique.length === 0) {
            throw new Error(
                'No questions could be parsed from the PDF. The layout may differ from expected patterns. ' +
                    'Try converting the PDF to CSV/JSON, or share a sample page so the parser can be tuned.'
            );
        }

        report('save', 92, 'Saving ' + unique.length + ' questions to IndexedDB...');
        await QuestionStore.clearQuestions();
        const meta = await QuestionStore.saveQuestions(unique, {
            pages: numPages,
            source: PDF_URL,
            parserVersion: PARSER_VERSION
        });

        report('done', 100, 'Done! Cached ' + meta.total + ' questions.');
        return meta;
    }

    return {
        PDF_URL: PDF_URL,
        PARSER_VERSION: PARSER_VERSION,
        extractAndParse: extractAndParse,
        parseQuestionsFromText: parseQuestionsFromText
    };
})();
