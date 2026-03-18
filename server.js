import express from 'express';
import { setupAuthRoutes, authMiddleware, getUserDataDir } from './auth.js';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { URL, fileURLToPath } from 'url';
import yahooFinanceLib from 'yahoo-finance2';
import multer from 'multer';
import rateLimit from 'express-rate-limit';


const yahooFinance = new yahooFinanceLib({ validation: { logErrors: false } });

// --- Security: Path Traversal Protection ---
function sanitizeId(id) {
    if (!id || typeof id !== 'string') return null;
    // Only allow alphanumeric, hyphens, underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
    return id;
}

function safeResolvePath(baseDir, ...segments) {
    const resolved = path.resolve(baseDir, ...segments);
    if (!resolved.startsWith(path.resolve(baseDir))) return null;
    return resolved;
}

const app = express();
const PORT = 3001;

app.set('trust proxy', 1);

app.use(cors({
    origin: ['https://invest.unver.cloud', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));


// --- Security: Rate Limiting ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 1000, // 1000 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 10, // 10 AI requests per minute
    message: { error: 'Too many AI requests, slow down.' }
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 uploads per 15 min
    message: { error: 'Too many uploads, try again later.' }
});


// Auth routes (public)
setupAuthRoutes(app);

// Protect all /api/ routes except /api/auth/*
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    // Apply rate limit to authenticated routes only
    apiLimiter(req, res, (err) => {
        if (err) return;
        authMiddleware(req, res, next);
    });
});


// --- Demo account: block all write operations ---
function demoGuard(req, res, next) {
    if (req.user && req.user.username === 'demo') {
        return res.status(403).json({ error: 'Demo account is read-only. Create your own account to modify portfolios.' });
    }
    next();
}

// Per-user helper functions
function getUserPortfoliosDir(userId) {
    const dir = path.join(getUserDataDir(userId), 'portfolios');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function loadUserMeta(userId) {
    const metaFile = path.join(getUserPortfoliosDir(userId), '_meta.json');
    if (fs.existsSync(metaFile)) return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    const meta = { portfolios: [{ id: 'default', name: 'Main Portfolio' }] };
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    return meta;
}

function saveUserMeta(userId, meta) {
    const metaFile = path.join(getUserPortfoliosDir(userId), '_meta.json');
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
}

function getUserPortfolioPath(userId, portfolioId) {
    return path.join(getUserPortfoliosDir(userId), `${portfolioId}.json`);
}

// Portfolio Routes (per-user)
app.get('/api/portfolios', (req, res) => {
    res.json(loadUserMeta(req.user.id).portfolios);
});

app.post('/api/portfolios', demoGuard, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const meta = loadUserMeta(req.user.id);
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30) + '-' + Date.now().toString(36);
    meta.portfolios.push({ id, name });
    saveUserMeta(req.user.id, meta);
    fs.writeFileSync(getUserPortfolioPath(req.user.id, id), '[]');
    res.json({ id, name });
});

app.put('/api/portfolios/:id', demoGuard, (req, res) => {
    const { name } = req.body;
    const meta = loadUserMeta(req.user.id);
    const pId = sanitizeId(req.params.id);
    if (!pId) return res.status(400).json({ error: 'Invalid portfolio ID' });
    const p = meta.portfolios.find(p => p.id === pId);
    if (!p) return res.status(404).json({ error: 'Not found' });
    p.name = name;
    saveUserMeta(req.user.id, meta);
    res.json(p);
});

app.delete('/api/portfolios/:id', demoGuard, (req, res) => {
    const meta = loadUserMeta(req.user.id);
    if (meta.portfolios.length <= 1) return res.status(400).json({ error: 'Cannot delete last portfolio' });
    const delId = sanitizeId(req.params.id);
    if (!delId) return res.status(400).json({ error: 'Invalid portfolio ID' });
    meta.portfolios = meta.portfolios.filter(p => p.id !== delId);
    saveUserMeta(req.user.id, meta);
    const fp = getUserPortfolioPath(req.user.id, delId);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true });
});

app.get('/api/portfolio', (req, res) => {
    const id = sanitizeId(req.query.id || 'default');
    if (!id) return res.status(400).json({ error: 'Invalid portfolio ID' });
    const fp = getUserPortfolioPath(req.user.id, id);
    if (fs.existsSync(fp)) {
        res.sendFile(fp);
    } else {
        res.json([]);
    }
});

app.post('/api/portfolio', demoGuard, (req, res) => {
    try {
        const id = sanitizeId(req.query.id || 'default');
        if (!id) return res.status(400).json({ error: 'Invalid portfolio ID' });
        if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Portfolio must be an array' });
        if (req.body.length > 500) return res.status(400).json({ error: 'Too many positions (max 500)' });
        fs.writeFileSync(getUserPortfolioPath(req.user.id, id), JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) {
        console.error('Error saving portfolio:', e);
        res.status(500).json({ error: 'Failed to save portfolio.' });
    }
});

// Market Data Routes (shared, read-only from Yahoo)
app.get('/api/quotes', async (req, res) => {
    try {
        const symbols = req.query.symbols ? req.query.symbols.split(',') : ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL'];
        const quotes = await yahooFinance.quote(symbols);
        const quotesArray = Array.isArray(quotes) ? quotes : (quotes ? [quotes] : []);
        res.json(quotesArray);
    } catch (error) {
        console.error('Quotes error:', error.message);
        res.json([]);
    }
});

app.get('/api/dividends', async (req, res) => {
    try {
        const symbols = req.query.symbols ? req.query.symbols.split(',') : [];
        if (symbols.length === 0) return res.json([]);
        const uniqueSymbols = [...new Set(symbols)];
        const results = [];
        for (const symbol of uniqueSymbols) {
            try {
                const data = await yahooFinance.quoteSummary(symbol, { modules: ['summaryDetail', 'calendarEvents'] });
                const summary = data.summaryDetail || {};
                const calendar = data.calendarEvents || {};
                if (summary.dividendRate) {
                    results.push({
                        symbol, dividendRate: summary.dividendRate, dividendYield: summary.dividendYield,
                        exDividendDate: summary.exDividendDate || calendar.exDividendDate || null,
                        dividendDate: calendar.dividendDate || null,
                    });
                }
            } catch (err) { }
        }
        res.json(results);
    } catch (error) { res.json([]); }
});

app.get('/api/historical/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const range = req.query.range || '1Y';
        const now = new Date();
        const rangeMap = {
            '1D': { days: 1, interval: '5m' }, '1W': { days: 7, interval: '15m' },
            '1M': { days: 30, interval: '1d' }, '3M': { days: 90, interval: '1d' },
            '6M': { days: 180, interval: '1d' }, '1Y': { days: 365, interval: '1wk' },
            '5Y': { days: 1825, interval: '1mo' },
        };
        const config = rangeMap[range] || rangeMap['1Y'];
        const period1 = new Date(now.getTime() - config.days * 86400000);
        const interval = req.query.interval || config.interval;
        const result = await yahooFinance.chart(symbol, { period1: period1.toISOString().split('T')[0], interval });
        const quotes = (result.quotes || result).filter(q => q.close != null).map(q => ({
            date: q.date, open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume,
        }));
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch historical data for ${req.params.symbol}` });
    }
});

let fxCache = { rate: null, timestamp: 0 };
app.get('/api/fx', async (req, res) => {
    try {
        const now = Date.now();
        if (fxCache.rate && (now - fxCache.timestamp) < 300000) return res.json(fxCache);
        const quote = await yahooFinance.quote('EURUSD=X');
        const rate = quote?.regularMarketPrice || 1.08;
        fxCache = { rate, timestamp: now };
        res.json(fxCache);
    } catch (error) { res.json({ rate: fxCache.rate || 1.08, timestamp: Date.now() }); }
});

app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q) return res.json({ quotes: [], news: [] });
        const result = await yahooFinance.search(q);
        res.json({ quotes: result.quotes || [], news: result.news || [] });
    } catch (error) { res.json({ quotes: [], news: [] }); }
});

async function safeScreener(scrIds, count = 20) {
    try { return await yahooFinance.screener({ scrIds, count }, { validateResult: false }); }
    catch (err) { if (err.result) return err.result; throw err; }
}

app.get('/api/screener', async (req, res) => {
    try {
        const preset = req.query.preset || 'day_gainers';
        const presetMap = { gainers: 'day_gainers', losers: 'day_losers', most_actives: 'most_actives',
            trending: 'trending_tickers', undervalued_large_caps: 'undervalued_large_caps',
            growth_technology_stocks: 'growth_technology_stocks', small_cap_gainers: 'small_cap_gainers' };
        const result = await safeScreener(presetMap[preset] || preset, 25);
        res.json(result?.quotes || []);
    } catch (error) { res.json([]); }
});

app.get('/api/summary/:symbol', async (req, res) => {
    try {
        const data = await yahooFinance.quoteSummary(req.params.symbol, {
            modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'calendarEvents']
        });
        res.json(data);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch summary' }); }
});

app.get('/api/trending', async (req, res) => {
    try { const result = await yahooFinance.trendingSymbols('US'); res.json(result?.quotes || []); }
    catch (error) { res.json([]); }
});

app.get('/api/gainers', async (req, res) => {
    try { res.json((await safeScreener('day_gainers'))?.quotes || []); } catch (error) { res.json([]); }
});

app.get('/api/losers', async (req, res) => {
    try { res.json((await safeScreener('day_losers'))?.quotes || []); } catch (error) { res.json([]); }
});

app.get('/api/recommendations/:symbol', async (req, res) => {
    try { const r = await yahooFinance.recommendationsBySymbol(req.params.symbol); res.json(r?.recommendedSymbols || []); }
    catch (error) { res.json([]); }
});

app.get('/api/news/:symbol', async (req, res) => {
    try { const r = await yahooFinance.search(req.params.symbol); res.json(r?.news || []); }
    catch (error) { res.json([]); }
});

// AI / OpenAI - Per-user API keys
function getUserAIKeyPath(userId) {
    return path.join(getUserDataDir(userId), 'ai_key.json');
}

function loadUserAIKey(userId) {
    const fp = getUserAIKeyPath(userId);
    if (fs.existsSync(fp)) {
        try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return {}; }
    }
    return {};
}

function saveUserAIKey(userId, data) {
    fs.writeFileSync(getUserAIKeyPath(userId), JSON.stringify(data, null, 2), { mode: 0o600 });
}

app.post('/api/ai/key', demoGuard, (req, res) => {
    const { key, provider } = req.body;
    if (!key) return res.status(400).json({ error: 'No key provided' });
    saveUserAIKey(req.user.id, { apiKey: key, provider: provider || 'openai' });
    res.json({ success: true });
});

app.get('/api/ai/key', (req, res) => {
    const data = loadUserAIKey(req.user.id);
    res.json({ hasKey: !!data.apiKey, method: data.provider || (data.apiKey ? 'openai' : null) });
});

app.post('/api/ai/logout', demoGuard, (req, res) => {
    saveUserAIKey(req.user.id, {});
    res.json({ success: true });
});

app.post('/api/ai/chat', aiLimiter, async (req, res) => {
    const data = loadUserAIKey(req.user.id);
    const token = data.apiKey;
    const provider = data.provider || 'openai';
    if (!token) return res.status(401).json({ error: 'No API key configured. Add one in Settings.' });

    try {
        const { messages, model } = req.body;

        if (provider === 'claude') {
            // Anthropic Claude API
            const systemMsg = messages.find(m => m.role === 'system');
            const chatMessages = messages.filter(m => m.role !== 'system');

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': token,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model || 'claude-sonnet-4-20250514',
                    max_tokens: 2048,
                    system: systemMsg?.content || '',
                    messages: chatMessages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                return res.status(response.status).json({ error: errData.error?.message || `Claude API error (${response.status})` });
            }

            const claudeData = await response.json();
            // Normalize to OpenAI format for frontend compatibility
            res.json({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: claudeData.content?.[0]?.text || ''
                    }
                }]
            });
        } else {
            // OpenAI API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ model: model || 'gpt-4o', messages, max_tokens: 2048, temperature: 0.7 })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                return res.status(response.status).json({ error: errData.error?.message || `OpenAI API error (${response.status})` });
            }
            res.json(await response.json());
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to connect to AI API' });
    }
});

// Avatar Upload
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUserDataDir(req.user.id);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, 'avatar' + ext);
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(ext) && allowedMimes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files allowed'));
    }
});

app.post('/api/avatar', demoGuard, uploadLimiter, avatarUpload.single('avatar'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Delete old avatars with different extensions
    const dir = getUserDataDir(req.user.id);
    ['.jpg', '.jpeg', '.png', '.gif', '.webp'].forEach(ext => {
        const old = path.join(dir, 'avatar' + ext);
        if (old !== req.file.path && fs.existsSync(old)) fs.unlinkSync(old);
    });
    res.json({ success: true, filename: req.file.filename });
});

app.get('/api/avatar/:userId', (req, res) => {
    const userId = sanitizeId(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid user ID' });
    const userDir = safeResolvePath(path.join(process.cwd(), 'data'), userId);
    if (!userDir || !fs.existsSync(userDir)) return res.status(404).json({ error: 'Not found' });
    const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of exts) {
        const fp = path.join(userDir, 'avatar' + ext);
        if (fs.existsSync(fp)) {
            res.setHeader('Cache-Control', 'public, max-age=300');
            return res.sendFile(fp);
        }
    }
    res.status(404).json({ error: 'No avatar' });
});

app.listen(PORT, () => {
    console.log(`Lumina Invest Server running on http://localhost:${PORT}`);
});
