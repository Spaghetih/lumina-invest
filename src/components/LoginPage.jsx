import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Shield, BarChart3, Globe, ArrowRight, Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';

const AnimatedCounter = ({ end, duration = 2000, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [end, duration]);
    return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

const MiniChart = () => {
    const points = [40, 35, 45, 38, 52, 48, 60, 55, 65, 58, 72, 68, 78, 75, 85, 80, 90, 88, 95];
    const width = 200;
    const height = 60;
    const maxVal = Math.max(...points);
    const minVal = Math.min(...points);
    const range = maxVal - minVal || 1;

    const pathData = points.map((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((p - minVal) / range) * height;
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    const areaData = pathData + ` L${width},${height} L0,${height} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="login-mini-chart">
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff9900" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaData} fill="url(#chartGrad)" />
            <path d={pathData} fill="none" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};

export default function LoginPage() {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isRegister && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            if (isRegister) {
                await register(username, password);
            } else {
                await login(username, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setError('');
        setConfirmPassword('');
    };

    const fillDemo = () => {
        setUsername('demo');
        setPassword('demo');
        setIsRegister(false);
        setError('');
    };

    return (
        <div className="login-page">
            {/* Left Panel - Hero */}
            <div className="login-hero">
                <div className="login-hero-content">
                    <div className="login-hero-badge">
                        <Globe size={14} />
                        <span>Real-time Market Data</span>
                    </div>

                    <h1 className="login-hero-title">
                        Track your investments
                        <span className="login-hero-highlight"> smarter.</span>
                    </h1>

                    <p className="login-hero-desc">
                        Professional portfolio analytics, real-time quotes, AI-powered insights, and multi-currency support — all in one place.
                    </p>

                    <div className="login-hero-stats">
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">
                                <AnimatedCounter end={15} suffix="+" />
                            </span>
                            <span className="login-hero-stat-label">Markets</span>
                        </div>
                        <div className="login-hero-stat-divider" />
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">
                                <AnimatedCounter end={50000} prefix="" suffix="+" />
                            </span>
                            <span className="login-hero-stat-label">Tickers</span>
                        </div>
                        <div className="login-hero-stat-divider" />
                        <div className="login-hero-stat">
                            <span className="login-hero-stat-value">24/7</span>
                            <span className="login-hero-stat-label">Monitoring</span>
                        </div>
                    </div>

                    <MiniChart />

                    <div className="login-hero-features">
                        <div className="login-hero-feature">
                            <div className="login-hero-feature-icon"><TrendingUp size={18} /></div>
                            <div>
                                <span className="login-hero-feature-title">Live Portfolio Tracking</span>
                                <span className="login-hero-feature-desc">Real-time prices from Yahoo Finance with automatic PNL calculation</span>
                            </div>
                        </div>
                        <div className="login-hero-feature">
                            <div className="login-hero-feature-icon"><BarChart3 size={18} /></div>
                            <div>
                                <span className="login-hero-feature-title">Advanced Analytics</span>
                                <span className="login-hero-feature-desc">Correlation matrix, heatmaps, diversification score, and more</span>
                            </div>
                        </div>
                        <div className="login-hero-feature">
                            <div className="login-hero-feature-icon"><Shield size={18} /></div>
                            <div>
                                <span className="login-hero-feature-title">Secure & Private</span>
                                <span className="login-hero-feature-desc">Your data is encrypted and isolated. Your API keys stay yours.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="login-hero-grid-bg" />
            </div>

            {/* Right Panel - Form */}
            <div className="login-form-panel">
                <div className="login-container">
                    <div className="login-header">
                        <div className="login-logo">
                            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                                <rect width="48" height="48" rx="12" fill="#ff9900" fillOpacity="0.15"/>
                                <path d="M14 34V20l10-10 10 10v14H14z" stroke="#ff9900" strokeWidth="2.5" fill="none"/>
                                <path d="M22 34v-8h4v8" stroke="#ff9900" strokeWidth="2.5"/>
                                <circle cx="24" cy="22" r="2" fill="#ff9900"/>
                            </svg>
                        </div>
                        <h2 className="login-title">
                            {isRegister ? 'Create your account' : 'Welcome back'}
                        </h2>
                        <p className="login-subtitle">
                            {isRegister ? 'Start tracking your portfolio today' : 'Sign in to your Lumina Invest dashboard'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="login-error">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"/>
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="login-field">
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={isRegister ? 'Choose a username' : 'Enter username'}
                                autoComplete="username"
                                autoFocus
                                required
                                minLength={3}
                            />
                        </div>

                        <div className="login-field">
                            <label htmlFor="password">Password</label>
                            <div className="login-password-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={isRegister ? 'Min. 8 characters' : 'Enter password'}
                                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                                    required
                                    minLength={isRegister ? 8 : undefined}
                                />
                                <button
                                    type="button"
                                    className="login-password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {isRegister && (
                            <div className="login-field">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                />
                            </div>
                        )}

                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? (
                                <span className="login-spinner"></span>
                            ) : (
                                <>
                                    {isRegister ? 'Create Account' : 'Sign In'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-demo-hint" onClick={fillDemo}>
                        <div className="login-demo-hint-left">
                            <span className="demo-hint-badge">DEMO</span>
                            <span>Try with <strong>demo</strong> / <strong>demo</strong></span>
                        </div>
                        <span className="demo-hint-tag">read-only</span>
                    </div>

                    <div className="login-footer">
                        <p>
                            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button className="login-toggle" onClick={toggleMode}>
                                {isRegister ? 'Sign In' : 'Register'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
