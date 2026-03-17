import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <rect width="48" height="48" rx="12" fill="#ff9900" fillOpacity="0.15"/>
                            <path d="M14 34V20l10-10 10 10v14H14z" stroke="#ff9900" strokeWidth="2.5" fill="none"/>
                            <path d="M22 34v-8h4v8" stroke="#ff9900" strokeWidth="2.5"/>
                            <circle cx="24" cy="22" r="2" fill="#ff9900"/>
                        </svg>
                    </div>
                    <h1>Lumina Invest</h1>
                    <p className="login-subtitle">
                        {isRegister ? 'Create your account' : 'Welcome back'}
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
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={isRegister ? 'Min. 8 characters' : 'Enter password'}
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                            required
                            minLength={isRegister ? 8 : undefined}
                        />
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
                        ) : isRegister ? (
                            'Create Account'
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="login-demo-hint">
                    <span className="demo-hint-icon">&#x1f512;</span>
                    <span>Try the demo account: <strong>demo</strong> / <strong>demo</strong> <em>(read-only)</em></span>
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
    );
}
