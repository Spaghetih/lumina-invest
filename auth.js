import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';

function sanitizeId(id) {
    if (!id || typeof id !== 'string') return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
    return id;
}

function safeResolvePath(baseDir, ...segments) {
    const resolved = path.resolve(baseDir, ...segments);
    if (!resolved.startsWith(path.resolve(baseDir))) return null;
    return resolved;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const AUTH_DIR = path.join(process.cwd(), 'auth');
const JWT_SECRET_FILE = path.join(AUTH_DIR, '.jwt_secret');
const DB_PATH = path.join(AUTH_DIR, 'lumina.db');

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Database Setup ───
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login TEXT
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
        ip TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

// ─── JWT Secret ───
function getJwtSecret() {
    if (fs.existsSync(JWT_SECRET_FILE)) return fs.readFileSync(JWT_SECRET_FILE, 'utf-8').trim();
    const secret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(JWT_SECRET_FILE, secret, { mode: 0o600 });
    return secret;
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

// ─── Lockout ───
function isLockedOut(ip) {
    const row = db.prepare('SELECT locked_until FROM login_attempts WHERE ip = ?').get(ip);
    if (!row || !row.locked_until) return false;
    if (Date.now() < row.locked_until) return true;
    db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
    return false;
}

function recordFailedAttempt(ip) {
    const row = db.prepare('SELECT attempts FROM login_attempts WHERE ip = ?').get(ip);
    const attempts = (row?.attempts || 0) + 1;
    const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null;
    db.prepare('INSERT INTO login_attempts (ip, attempts, locked_until) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET attempts = ?, locked_until = ?')
        .run(ip, attempts, lockedUntil, attempts, lockedUntil);
    return { attempts, lockedUntil };
}

function clearAttempts(ip) {
    db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
}

// ─── User Data Dir ───
export function getUserDataDir(userId) {
    const dir = path.resolve(DATA_DIR, userId);
    if (!dir.startsWith(path.resolve(DATA_DIR) + path.sep)) throw new Error('Invalid user ID path');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// ─── Init user portfolio on registration ───
function initUserData(userId) {
    const userDir = getUserDataDir(userId);
    const portfoliosDir = path.join(userDir, 'portfolios');
    fs.mkdirSync(portfoliosDir, { recursive: true });
    fs.writeFileSync(path.join(portfoliosDir, '_meta.json'), JSON.stringify({ portfolios: [{ id: 'default', name: 'Main Portfolio' }] }, null, 2));
    fs.writeFileSync(path.join(portfoliosDir, 'default.json'), '[]');
}

// ─── Auth Routes ───
export function setupAuthRoutes(app) {
    const registerLimiter = rateLimit({
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        max: 2, // 2 registrations per 24h per IP
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many accounts created. Try again in 24 hours.' }
    });

    // Register (public)
    app.post('/api/auth/register', registerLimiter, async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        if (username.trim().length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
        if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
        if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) return res.status(400).json({ error: 'Username: letters, numbers, _ and - only' });

        const normalized = username.trim().toLowerCase();
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(normalized);
        if (existing) return res.status(200).json({ error: 'Registration processed. If the username is available, check your account.' });

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const id = crypto.randomUUID();

        // First user ever = admin
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const role = userCount === 0 ? 'admin' : 'user';

        db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(id, normalized, hashedPassword, role);
        initUserData(id);

        const token = jwt.sign({ id, username: normalized, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        res.json({ token, user: { id, username: normalized, role } });
    });

    // Login
    app.post('/api/auth/login', async (req, res) => {
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        if (isLockedOut(ip)) return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });

        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
        if (!user) { recordFailedAttempt(ip); return res.status(401).json({ error: 'Invalid credentials' }); }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            const lockout = recordFailedAttempt(ip);
            const remaining = MAX_LOGIN_ATTEMPTS - lockout.attempts;
            return res.status(401).json({
                error: remaining > 0 ? `Invalid credentials. ${remaining} attempts remaining.` : 'Account locked for 15 minutes.'
            });
        }

        clearAttempts(ip);
        db.prepare('UPDATE users SET last_login = datetime(?) WHERE id = ?').run(new Date().toISOString(), user.id);

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });

    // Me
    app.get('/api/auth/me', authMiddleware, (req, res) => {
        res.json({ user: req.user });
    });

    // Status
    app.get('/api/auth/status', (req, res) => {
        res.json({ registrationOpen: true });
    });

    // ─── Admin Routes ───

    // List all users (admin only)
    app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
        const users = db.prepare('SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at DESC').all();
        res.json(users);
    });

    // Change user role (admin only)
    app.put('/api/admin/users/:id/role', authMiddleware, adminOnly, (req, res) => {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Role must be user or admin' });
        const targetId = sanitizeId(req.params.id);
        if (!targetId) return res.status(400).json({ error: 'Invalid user ID' });
        if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });

        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
        res.json({ success: true });
    });

    // Delete user (admin only)
    app.delete('/api/admin/users/:id', authMiddleware, adminOnly, (req, res) => {
        const delId = sanitizeId(req.params.id);
        if (!delId) return res.status(400).json({ error: 'Invalid user ID' });
        if (delId === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(delId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Delete user data
        const userDir = path.resolve(DATA_DIR, delId);
        if (!userDir.startsWith(path.resolve(DATA_DIR) + path.sep)) {
            return res.status(400).json({ error: 'Invalid path' });
        }
        if (fs.existsSync(userDir)) fs.rmSync(userDir, { recursive: true, force: true });

        db.prepare('DELETE FROM users WHERE id = ?').run(delId);
        res.json({ success: true });
    });

    // Admin stats
    app.get('/api/admin/stats', authMiddleware, adminOnly, (req, res) => {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const todayLogins = db.prepare("SELECT COUNT(*) as count FROM users WHERE last_login >= datetime('now', '-1 day')").get().count;
        const admins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
        res.json({ totalUsers, todayLogins, admins });
    });
}

// ─── Middlewares ───
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
