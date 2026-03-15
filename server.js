import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import yahooFinanceLib from 'yahoo-finance2';

const yahooFinance = new yahooFinanceLib({ validation: { logErrors: false } });
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const PORTFOLIOS_DIR = path.join(process.cwd(), 'portfolios');
const DB_FILE = path.join(process.cwd(), 'portfolio.json'); // legacy
const META_FILE = path.join(PORTFOLIOS_DIR, '_meta.json');

// Ensure portfolios directory exists
if (!fs.existsSync(PORTFOLIOS_DIR)) {
    fs.mkdirSync(PORTFOLIOS_DIR, { recursive: true });
}

// Migrate legacy single portfolio.json to multi-portfolio
if (fs.existsSync(DB_FILE) && !fs.existsSync(path.join(PORTFOLIOS_DIR, 'default.json'))) {
    fs.copyFileSync(DB_FILE, path.join(PORTFOLIOS_DIR, 'default.json'));
}

// Initialize meta if needed
const loadMeta = () => {
    if (fs.existsSync(META_FILE)) {
        return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    }
    const meta = { portfolios: [{ id: 'default', name: 'Main Portfolio' }] };
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
    return meta;
};

const saveMeta = (meta) => {
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
};

const getPortfolioPath = (id) => path.join(PORTFOLIOS_DIR, `${id}.json`);

// List all portfolios
app.get('/api/portfolios', (req, res) => {
    const meta = loadMeta();
    res.json(meta.portfolios);
});

// Create a new portfolio
app.post('/api/portfolios', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const meta = loadMeta();
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30) + '-' + Date.now().toString(36);
    meta.portfolios.push({ id, name });
    saveMeta(meta);
    fs.writeFileSync(getPortfolioPath(id), '[]');
    res.json({ id, name });
});

// Rename a portfolio
app.put('/api/portfolios/:id', (req, res) => {
    const { name } = req.body;
    const meta = loadMeta();
    const p = meta.portfolios.find(p => p.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    p.name = name;
    saveMeta(meta);
    res.json(p);
});

// Delete a portfolio
app.delete('/api/portfolios/:id', (req, res) => {
    const meta = loadMeta();
    if (meta.portfolios.length <= 1) return res.status(400).json({ error: 'Cannot delete last portfolio' });
    meta.portfolios = meta.portfolios.filter(p => p.id !== req.params.id);
    saveMeta(meta);
    const fp = getPortfolioPath(req.params.id);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true });
});

// Get saved portfolio (supports ?id= for multi-portfolio)
app.get('/api/portfolio', (req, res) => {
    const id = req.query.id || 'default';
    const fp = getPortfolioPath(id);
    if (fs.existsSync(fp)) {
        res.sendFile(fp);
    } else if (fs.existsSync(DB_FILE)) {
        res.sendFile(DB_FILE);
    } else {
        res.json([]);
    }
});

// Save portfolio (supports ?id= for multi-portfolio)
app.post('/api/portfolio', (req, res) => {
    try {
        const id = req.query.id || 'default';
        fs.writeFileSync(getPortfolioPath(id), JSON.stringify(req.body, null, 2));
        // Also save to legacy file if default
        if (id === 'default') {
            fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Error saving portfolio:', e);
        res.status(500).json({ error: 'Failed to save portfolio.' });
    }
});

// Fetch current quotes for a list of symbols
app.get('/api/quotes', async (req, res) => {
    try {
        const symbols = req.query.symbols ? req.query.symbols.split(',') : ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL'];

        const quotes = await yahooFinance.quote(symbols);
        // Sometimes yahoo returns a single object instead of an array, ensure it's an array
        const quotesArray = Array.isArray(quotes) ? quotes : (quotes ? [quotes] : []);
        res.json(quotesArray);
    } catch (error) {
        console.error(`Error fetching quotes for ${req.query.symbols}:`, error.message);
        // If Yahoo finance throws an error (e.g., symbol not found), we return an empty array gracefully
        res.json([]);
    }
});

// Fetch dividend data for a list of symbols
app.get('/api/dividends', async (req, res) => {
    try {
        const symbols = req.query.symbols ? req.query.symbols.split(',') : [];
        if (symbols.length === 0) return res.json([]);

        // Ensure unique symbols
        const uniqueSymbols = [...new Set(symbols)];

        const results = [];
        // Sequential fetch to avoid hitting Yahoo ratelimits aggressively 
        for (const symbol of uniqueSymbols) {
            try {
                const data = await yahooFinance.quoteSummary(symbol, { modules: ['summaryDetail', 'calendarEvents'] });

                const summary = data.summaryDetail || {};
                const calendar = data.calendarEvents || {};

                // Only push if it actually pays a dividend
                if (summary.dividendRate) {
                    results.push({
                        symbol: symbol,
                        dividendRate: summary.dividendRate,
                        dividendYield: summary.dividendYield,
                        exDividendDate: summary.exDividendDate || calendar.exDividendDate || null,
                        dividendDate: calendar.dividendDate || null,
                    });
                }
            } catch (err) {
                console.error(`Error fetching dividends for ${symbol}:`, err.message);
                // Ignore missing tickers, keep fetching rest
            }
        }
        res.json(results);
    } catch (error) {
        console.error(`Error in /api/dividends:`, error.message);
        res.json([]);
    }
});

// Fetch historical data for chart
app.get('/api/historical/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const range = req.query.range || '1Y';
        const now = new Date();
        const rangeMap = {
            '1D': { days: 1, interval: '5m' },
            '1W': { days: 7, interval: '15m' },
            '1M': { days: 30, interval: '1d' },
            '3M': { days: 90, interval: '1d' },
            '6M': { days: 180, interval: '1d' },
            '1Y': { days: 365, interval: '1wk' },
            '5Y': { days: 1825, interval: '1mo' },
        };
        const config = rangeMap[range] || rangeMap['1Y'];
        const period1 = new Date(now.getTime() - config.days * 86400000);
        const interval = req.query.interval || config.interval;

        const result = await yahooFinance.chart(symbol, {
            period1: period1.toISOString().split('T')[0],
            interval,
        });
        // chart() returns { quotes: [...] } — normalize to flat array
        const quotes = (result.quotes || result).map(q => ({
            date: q.date,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume,
        }));
        res.json(quotes);
    } catch (error) {
        console.error(`Error fetching historical data for ${req.params.symbol}:`, error);
        res.status(500).json({ error: `Failed to fetch historical data for ${req.params.symbol}` });
    }
});

// Fetch EUR/USD exchange rate (cached 5 min)
let fxCache = { rate: null, timestamp: 0 };
app.get('/api/fx', async (req, res) => {
    try {
        const now = Date.now();
        if (fxCache.rate && (now - fxCache.timestamp) < 300000) {
            return res.json(fxCache);
        }
        const quote = await yahooFinance.quote('EURUSD=X');
        const rate = quote?.regularMarketPrice || 1.08;
        fxCache = { rate, timestamp: now };
        res.json(fxCache);
    } catch (error) {
        console.error('Error fetching FX rate:', error.message);
        res.json({ rate: fxCache.rate || 1.08, timestamp: Date.now() });
    }
});

// ─── Search / Autocomplete ───
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q) return res.json({ quotes: [], news: [] });
        const result = await yahooFinance.search(q);
        res.json({ quotes: result.quotes || [], news: result.news || [] });
    } catch (error) {
        console.error('Search error:', error.message);
        res.json({ quotes: [], news: [] });
    }
});

// ─── Helper: safe screener call (handles Yahoo validation errors) ───
async function safeScreener(scrIds, count = 20) {
    try {
        return await yahooFinance.screener({ scrIds, count }, { validateResult: false });
    } catch (err) {
        if (err.result) return err.result;
        throw err;
    }
}

// ─── Stock Screener ───
app.get('/api/screener', async (req, res) => {
    try {
        const preset = req.query.preset || 'day_gainers';
        const presetMap = {
            gainers: 'day_gainers',
            losers: 'day_losers',
            most_actives: 'most_actives',
            trending: 'trending_tickers',
            undervalued_large_caps: 'undervalued_large_caps',
            growth_technology_stocks: 'growth_technology_stocks',
            small_cap_gainers: 'small_cap_gainers',
        };
        const screenerId = presetMap[preset] || preset;
        const result = await safeScreener(screenerId, 25);
        const quotes = result?.quotes || [];
        res.json(quotes);
    } catch (error) {
        console.error('Screener error:', error.message?.substring(0, 100));
        res.json([]);
    }
});

// ─── Quote Summary (detailed) ───
app.get('/api/summary/:symbol', async (req, res) => {
    try {
        const data = await yahooFinance.quoteSummary(req.params.symbol, {
            modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'calendarEvents']
        });
        res.json(data);
    } catch (error) {
        console.error('Summary error:', error.message);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// ─── Trending Symbols ───
app.get('/api/trending', async (req, res) => {
    try {
        const result = await yahooFinance.trendingSymbols('US');
        res.json(result?.quotes || []);
    } catch (error) {
        console.error('Trending error:', error.message);
        res.json([]);
    }
});

// ─── Daily Gainers ───
app.get('/api/gainers', async (req, res) => {
    try {
        const result = await safeScreener('day_gainers');
        res.json(result?.quotes || []);
    } catch (error) {
        console.error('Gainers error:', error.message?.substring(0, 100));
        res.json([]);
    }
});

// ─── Daily Losers ───
app.get('/api/losers', async (req, res) => {
    try {
        const result = await safeScreener('day_losers');
        res.json(result?.quotes || []);
    } catch (error) {
        console.error('Losers error:', error.message?.substring(0, 100));
        res.json([]);
    }
});

// ─── Recommendations ───
app.get('/api/recommendations/:symbol', async (req, res) => {
    try {
        const result = await yahooFinance.recommendationsBySymbol(req.params.symbol);
        res.json(result?.recommendedSymbols || []);
    } catch (error) {
        console.error('Recommendations error:', error.message);
        res.json([]);
    }
});

// ─── News for a symbol ───
app.get('/api/news/:symbol', async (req, res) => {
    try {
        const result = await yahooFinance.search(req.params.symbol);
        res.json(result?.news || []);
    } catch (error) {
        console.error('News error:', error.message);
        res.json([]);
    }
});

// ─── AI / OpenAI Authentication ───
import crypto from 'crypto';
import http from 'http';
import { URL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const OPENAI_AUTH_URL = 'https://auth.openai.com/oauth/authorize';
const OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token';
const CALLBACK_PORT = 1455;
const CALLBACK_URI = `http://localhost:${CALLBACK_PORT}/auth/callback`;

let openaiKey = process.env.OPENAI_API_KEY || '';
let oauthToken = null; // { access_token, refresh_token, expires_at }
let oauthAccountId = null; // Stored from JWT payload
let oauthState = null; // { state, codeVerifier }

const TOKEN_PATH = path.join(__dirname, '.codex_token.json');

// Load token from disk on startup
function loadTokenFromDisk() {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            const data = fs.readFileSync(TOKEN_PATH, 'utf-8');
            const parsed = JSON.parse(data);
            if (parsed.oauthToken && parsed.oauthAccountId) {
                oauthToken = parsed.oauthToken;
                oauthAccountId = parsed.oauthAccountId;
                console.log('Loaded saved ChatGPT OAuth token from disk.');
            }
        }
    } catch (err) {
        console.error('Error loading token from disk:', err.message);
    }
}

// Save token to disk
function saveTokenToDisk() {
    try {
        if (oauthToken && oauthAccountId) {
            fs.writeFileSync(TOKEN_PATH, JSON.stringify({ oauthToken, oauthAccountId }, null, 2), 'utf-8');
        } else if (!oauthToken) {
            if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
        }
    } catch (err) {
        console.error('Error saving token to disk:', err.message);
    }
}

// Load token initially
loadTokenFromDisk();

// Decode JWT to extract account ID
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
        const decoded = Buffer.from(padded, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch (err) {
        return null;
    }
}

// PKCE helpers
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Set API key at runtime
app.post('/api/ai/key', (req, res) => {
    const { key } = req.body;
    if (key) {
        openaiKey = key;
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'No key provided' });
    }
});

// Check auth status
app.get('/api/ai/key', (req, res) => {
    const hasApiKey = !!openaiKey;
    const hasOAuth = !!(oauthToken?.access_token && Date.now() < (oauthToken.expires_at || 0));
    res.json({ hasKey: hasApiKey || hasOAuth, method: hasOAuth ? 'chatgpt' : hasApiKey ? 'apikey' : null });
});

// Start ChatGPT OAuth flow
app.get('/api/ai/oauth/start', (req, res) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    oauthState = { state, codeVerifier };

    const authUrl = new URL(OPENAI_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', OPENAI_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', CALLBACK_URI);
    authUrl.searchParams.set('scope', 'openid profile email offline_access');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('id_token_add_organizations', 'true');
    authUrl.searchParams.set('codex_cli_simplified_flow', 'true');
    authUrl.searchParams.set('originator', 'codex_cli_rs');

    // Start callback server to receive the redirect
    startCallbackServer();

    console.log('OAuth flow started. Redirecting to OpenAI...');
    res.json({ url: authUrl.toString() });
});

// OAuth status endpoint
app.get('/api/ai/oauth/status', (req, res) => {
    if (oauthToken?.access_token) {
        res.json({ authenticated: true, expires_at: oauthToken.expires_at });
    } else {
        res.json({ authenticated: false });
    }
});

// Logout
app.post('/api/ai/logout', (req, res) => {
    openaiKey = '';
    oauthToken = null;
    oauthAccountId = null;

    saveTokenToDisk();
    res.json({ success: true });
});

// Callback server for OAuth redirect
let callbackServer = null;

function startCallbackServer() {
    // Close previous if exists
    if (callbackServer) {
        try { callbackServer.close(); } catch { }
    }

    callbackServer = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://127.0.0.1:${CALLBACK_PORT}`);

        if (url.pathname === '/auth/callback') {
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            if (error) {
                console.error('OAuth error:', error);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<html><body style="background:#0d1117;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:#ff453a">❌ Authentication Failed</h2><p>${error}</p><p>You can close this window.</p></div></body></html>`);
                closeCallbackServer();
                return;
            }

            if (!code || !state || state !== oauthState?.state) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`<html><body style="background:#0d1117;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:#ff453a">❌ Invalid callback</h2><p>State mismatch or missing code.</p></div></body></html>`);
                closeCallbackServer();
                return;
            }

            try {
                // Exchange code for token
                const tokenRes = await fetch(OPENAI_TOKEN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        client_id: OPENAI_CLIENT_ID,
                        code,
                        redirect_uri: CALLBACK_URI,
                        code_verifier: oauthState.codeVerifier,
                    }).toString()
                });

                const tokenData = await tokenRes.json();

                if (tokenData.access_token) {
                    const jwtPayload = decodeJWT(tokenData.access_token);
                    const accountId = jwtPayload?.['https://api.openai.com/auth']?.chatgpt_account_id || '';

                    oauthToken = {
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token || null,
                        expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
                    };
                    oauthAccountId = accountId;

                    saveTokenToDisk();
                    console.log('✅ ChatGPT OAuth successful! Token stored. Account ID:', accountId);

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<html><body style="background:#0d1117;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:#30d158">✅ Connected to ChatGPT!</h2><p>You can close this window and return to Lumina Invest.</p><script>setTimeout(()=>window.close(),2000)</script></div></body></html>`);
                } else {
                    console.error('Token exchange failed:', tokenData);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<html><body style="background:#0d1117;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:#ff453a">❌ Token exchange failed</h2><p>${tokenData.error_description || 'Unknown error'}</p></div></body></html>`);
                }
            } catch (err) {
                console.error('Token exchange error:', err.message);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`<html><body style="background:#0d1117;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:#ff453a">❌ Error</h2><p>${err.message}</p></div></body></html>`);
            }

            oauthState = null;
            closeCallbackServer();
        }
    });

    callbackServer.listen(CALLBACK_PORT, 'localhost', () => {
        console.log(`OAuth callback server listening on http://localhost:${CALLBACK_PORT}`);
    });

    callbackServer.on('error', (err) => {
        console.error('Callback server error:', err.message);
    });
}

function closeCallbackServer() {
    setTimeout(() => {
        if (callbackServer) {
            callbackServer.close();
            callbackServer = null;
            console.log('OAuth callback server closed.');
        }
    }, 3000);
}

// Refresh token if needed
async function getActiveToken() {
    if (openaiKey) return openaiKey;

    if (oauthToken?.access_token) {
        // Check if token is expired and needs refresh
        if (Date.now() >= (oauthToken.expires_at || 0) && oauthToken.refresh_token) {
            try {
                const res = await fetch(OPENAI_TOKEN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        client_id: OPENAI_CLIENT_ID,
                        refresh_token: oauthToken.refresh_token,
                    }).toString()
                });
                const data = await res.json();
                if (data.access_token) {
                    oauthToken.access_token = data.access_token;
                    oauthToken.expires_at = Date.now() + (data.expires_in || 3600) * 1000;
                    if (data.refresh_token) oauthToken.refresh_token = data.refresh_token;

                    saveTokenToDisk();
                    console.log('Token refreshed successfully.');
                }
            } catch (err) {
                console.error('Token refresh failed:', err.message);
            }
        }
        return oauthToken.access_token;
    }

    return null;
}

// Chat with GPT
app.post('/api/ai/chat', async (req, res) => {
    const token = await getActiveToken();
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated. Please sign in with ChatGPT or enter an API key.' });
    }

    try {
        const { messages, model } = req.body;
        const isOAuth = !!oauthToken?.access_token && token === oauthToken.access_token;

        let response;
        if (isOAuth) {
            // Use ChatGPT backend API to avoid billing when signed in with ChatGPT Plus
            // Format for /codex/responses (OpenHax format)
            // Extract system prompt to pass as instructions (required by Codex)
            const systemMsg = messages.find(m => m.role === 'system');
            const instructions = systemMsg ? systemMsg.content : '';

            // System messages are not allowed in the input array for Codex
            const codexInput = messages
                .filter(msg => msg.role !== 'system')
                .map(msg => ({
                    id: `msg_${crypto.randomUUID()}`,
                    type: 'message',
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content
                }));

            response = await fetch('https://chatgpt.com/backend-api/codex/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'chatgpt-account-id': oauthAccountId || '',
                    'OAI-Device-Id': crypto.randomUUID(),
                    'OAI-Language': 'en-US',
                    'OpenAI-Beta': 'responses=experimental',
                    'originator': 'codex_cli_rs',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    model: model || 'gpt-5.2-codex',
                    store: false,
                    stream: true,
                    instructions: instructions,
                    input: codexInput,
                    text: { verbosity: "medium" },
                    include: ["reasoning.encrypted_content"]
                })
            });

            if (!response.ok) {
                const errData = await response.text().catch(() => '');
                console.error('ChatGPT Backend error:', response.status, errData);
                return res.status(response.status).json({
                    error: `Service temporairement indisponible (Erreur ${response.status}). Veuillez réessayer plus tard.`
                });
            }

            // Stream parsing for SSE (/codex/responses outputs JSON chunks)
            const textResponse = await response.text();
            let finalOutput = "";
            let hasOutputs = false;

            const lines = textResponse.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        // The /codex/responses endpoint outputs stream chunks or full text
                        // Let's concatenate chunk text if it exists
                        if (parsed.output?.[0]?.content?.text) {
                            finalOutput += parsed.output[0].content.text;
                            hasOutputs = true;
                        } else if (parsed.text) {
                            finalOutput += parsed.text;
                            hasOutputs = true;
                        } else if (parsed.message?.content?.parts?.[0]) {
                            // Fallback for conversation endpoint format
                            finalOutput = parsed.message.content.parts[0];
                            hasOutputs = true;
                        }
                    } catch (e) { }
                }
            }

            // Fallback if the endpoint returned a single JSON object instead of SSE
            if (!hasOutputs && textResponse.startsWith('{')) {
                try {
                    const parsed = JSON.parse(textResponse);
                    if (parsed.output?.[0]?.content?.text) {
                        finalOutput = parsed.output[0].content.text;
                    } else if (parsed.message?.content?.parts?.[0]) {
                        finalOutput = parsed.message.content.parts[0];
                    }
                } catch (e) { }
            }

            return res.json({
                choices: [{
                    message: {
                        role: 'assistant',
                        content: finalOutput
                    }
                }]
            });

        } else {
            // Standard OpenAI API for API Key users
            response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o',
                    messages,
                    max_tokens: 2048,
                    temperature: 0.7,
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('OpenAI API error:', response.status, errData);
                return res.status(response.status).json({
                    error: errData.error?.message || `OpenAI API error (${response.status})`
                });
            }

            const data = await response.json();
            return res.json(data);
        }
    } catch (error) {
        console.error('AI chat error:', error.message);
        res.status(500).json({ error: 'Failed to connect to OpenAI API' });
    }
});

app.listen(PORT, () => {
    console.log(`Yahoo Finance Proxy Server running on http://localhost:${PORT}`);
});
