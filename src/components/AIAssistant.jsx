import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Loader2, KeyRound, AlertCircle, TrendingUp, Shield, BarChart3, Lightbulb, RefreshCw, LogIn, Key, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrency } from '../contexts/CurrencyContext';
import './AIAssistant.css';

const PRESET_PROMPTS = [
    { icon: <TrendingUp size={16} />, label: 'Portfolio Summary', prompt: 'Give me a detailed summary of my portfolio performance, including which positions are performing best and worst.' },
    { icon: <Shield size={16} />, label: 'Risk Analysis', prompt: 'Analyze the risk level of my portfolio. Is it well-diversified? What concentration risks do I have?' },
    { icon: <Lightbulb size={16} />, label: 'Recommendations', prompt: 'Based on my current portfolio, what investment recommendations would you make? Consider diversification, sector exposure, and current market conditions.' },
    { icon: <BarChart3 size={16} />, label: 'Sector Breakdown', prompt: 'Give me a breakdown of my portfolio by sector and geography, and suggest how to improve diversification.' },
];

const MarkdownRenderer = ({ text }) => {
    const lines = text.split('\n');
    return (
        <div className="ai-markdown">
            {lines.map((line, i) => {
                if (line.startsWith('### ')) return <h4 key={i}>{line.slice(4)}</h4>;
                if (line.startsWith('## ')) return <h3 key={i}>{line.slice(3)}</h3>;
                if (line.startsWith('# ')) return <h2 key={i}>{line.slice(2)}</h2>;
                if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i}>{renderBold(line.slice(2))}</li>;
                if (/^\d+\.\s/.test(line)) return <li key={i}>{renderBold(line.replace(/^\d+\.\s/, ''))}</li>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i}>{renderBold(line)}</p>;
            })}
        </div>
    );
};

const renderBold = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
};

const AIAssistant = ({ stocks }) => {
    const { currency, format } = useCurrency();
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('lumina_chat_history');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasKey, setHasKey] = useState(null);
    const [authMethod, setAuthMethod] = useState(null); // 'chatgpt' or 'apikey'
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [keyError, setKeyError] = useState('');
    const [authTab, setAuthTab] = useState('chatgpt');
    const [oauthLoading, setOauthLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetch('http://localhost:3001/api/ai/key')
            .then(r => r.json())
            .then(data => {
                setHasKey(data.hasKey);
                setAuthMethod(data.method);
            })
            .catch(() => setHasKey(false));
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        try {
            localStorage.setItem('lumina_chat_history', JSON.stringify(messages));
        } catch {
            // ignore
        }
    }, [messages]);

    const buildPortfolioContext = () => {
        if (!stocks || stocks.length === 0) return 'No stocks in portfolio.';
        const lines = stocks.map(s => {
            const value = (s.price || 0) * (s.shares || 0);
            const pnl = value - (s.avgPrice || s.prevClose || 0) * (s.shares || 0);
            const pnlPct = ((s.avgPrice || s.prevClose) && s.shares) ? ((pnl / ((s.avgPrice || s.prevClose) * s.shares)) * 100).toFixed(2) : '0.00';
            const change = s.prevClose ? (((s.price - s.prevClose) / s.prevClose) * 100).toFixed(2) : '0.00';
            return `- ${s.id} (${s.name}): ${s.shares?.toFixed(4)} shares, price ${s.quoteCurrency || 'USD'} ${s.price?.toFixed(2)}, avg cost ${(s.avgPrice || s.prevClose)?.toFixed(2)}, PNL: ${pnlPct}%, today: ${change}%`;
        });
        const totalValue = stocks.reduce((sum, s) => sum + (s.price || 0) * (s.shares || 0), 0);
        return `Portfolio (${stocks.length} positions, display currency: ${currency}):\n${lines.join('\n')}\n\nTotal portfolio value: ~${totalValue.toFixed(2)} (mixed currencies)`;
    };

    const handleSubmit = async (promptText) => {
        const text = promptText || input.trim();
        if (!text || isLoading) return;

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const systemMsg = {
                role: 'system',
                content: `You are Lumina AI, a premium financial advisor assistant embedded in the Lumina Invest stock portfolio dashboard. You provide clear, actionable insights about the user's portfolio.

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${buildPortfolioContext()}

Guidelines:
- CRITICAL: You are strictly a financial advisor. You MUST refuse to answer any questions that are not related to finance, stock markets, or the user's portfolio.
- If the user asks for recipes, general knowledge, coding help, or any off-topic subject, politely decline and remind them you are Lumina AI, a financial assistant.
- Be concise and professional but friendly.
- Use bullet points and bold text for readability.
- Give specific insights about the user's actual holdings.
- Include relevant percentages and comparisons.
- Add emojis sparingly for visual appeal.
- Always provide actionable advice.
- Respond in the same language as the user's message.
- If the user writes in French, respond in French.`
            };

            const apiMessages = [systemMsg, ...messages.filter(m => m.role !== 'system'), userMsg];

            const res = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI request failed');

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.choices?.[0]?.message?.content || 'No response generated.'
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'error', content: error.message }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeySubmit = async () => {
        if (!apiKeyInput.trim()) return;
        setKeyError('');
        try {
            const res = await fetch('http://localhost:3001/api/ai/key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: apiKeyInput.trim() })
            });
            if (res.ok) {
                setHasKey(true);
                setAuthMethod('apikey');
                setApiKeyInput('');
                toast.success('OpenAI API Key connected successfully!');
            } else {
                setKeyError('Failed to save API key');
                toast.error('Failed to save API key');
            }
        } catch {
            setKeyError('Server connection failed');
            toast.error('Server connection failed');
        }
    };

    const handleChatGPTSignIn = async () => {
        setOauthLoading(true);
        setKeyError('');
        try {
            // Ask backend to generate the OAuth URL with PKCE
            const res = await fetch('http://localhost:3001/api/ai/oauth/start');
            const { url } = await res.json();

            // Open the OpenAI auth page in a popup
            const authWindow = window.open(url, 'ChatGPT Sign In', 'width=500,height=700,menubar=no,toolbar=no');

            // Poll for authentication completion
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch('http://localhost:3001/api/ai/key');
                    const statusData = await statusRes.json();
                    if (statusData.hasKey) {
                        clearInterval(pollInterval);
                        setHasKey(true);
                        setAuthMethod(statusData.method);
                        setOauthLoading(false);
                        toast.success('Successfully connected to ChatGPT!');
                        try { authWindow?.close(); } catch { }
                    }
                } catch { }

                // Stop polling if window was closed without auth
                if (authWindow?.closed) {
                    setTimeout(async () => {
                        const finalCheck = await fetch('http://localhost:3001/api/ai/key');
                        const finalData = await finalCheck.json();
                        if (!finalData.hasKey) {
                            clearInterval(pollInterval);
                            setKeyError('Sign-in window closed before authentication completed.');
                            setOauthLoading(false);
                        }
                    }, 2000);
                }
            }, 2000);

            // Timeout after 5 minutes
            setTimeout(() => { clearInterval(pollInterval); setOauthLoading(false); }, 300000);
        } catch (err) {
            setKeyError('Failed to start sign-in: ' + err.message);
            setOauthLoading(false);
        }
    };

    const handleNewChat = () => setMessages([]);

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:3001/api/ai/logout', { method: 'POST' });
            setHasKey(false);
            setAuthMethod(null);
            setMessages([]);
            toast.success('Disconnected from AI Assistant');
        } catch (err) {
            console.error('Logout failed:', err);
            toast.error('Failed to disconnect');
        }
    };

    // ─── Auth Setup Screen ───
    if (hasKey === false) {
        return (
            <div className="ai-page fade-in">
                <div className="ai-setup glass-panel">
                    <div className="ai-setup-icon">
                        <Sparkles size={48} />
                    </div>
                    <h2>Activate Lumina AI</h2>
                    <p>Choose how to connect to OpenAI's GPT models</p>

                    <div className="ai-auth-tabs">
                        <button className={`ai-auth-tab ${authTab === 'chatgpt' ? 'active' : ''}`} onClick={() => { setAuthTab('chatgpt'); setKeyError(''); }}>
                            <LogIn size={16} />
                            ChatGPT Sign-in
                        </button>
                        <button className={`ai-auth-tab ${authTab === 'apikey' ? 'active' : ''}`} onClick={() => { setAuthTab('apikey'); setKeyError(''); }}>
                            <Key size={16} />
                            API Key
                        </button>
                    </div>

                    {authTab === 'chatgpt' ? (
                        <div className="ai-auth-content">
                            <div className="ai-auth-info">
                                <h4>📱 Subscription Access</h4>
                                <p>Sign in with your ChatGPT account.<br />Uses your existing Plus / Pro subscription.</p>
                            </div>
                            <button className="ai-chatgpt-signin" onClick={handleChatGPTSignIn} disabled={oauthLoading}>
                                {oauthLoading ? (
                                    <><Loader2 size={18} className="spin" /> Waiting for sign-in...</>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.615 1.5v3.005l-2.602 1.5-2.615-1.5z" />
                                        </svg>
                                        Sign in with ChatGPT
                                    </>
                                )}
                            </button>
                            <p className="ai-setup-hint">No API key needed — uses OAuth to connect directly with your ChatGPT account.</p>
                        </div>
                    ) : (
                        <div className="ai-auth-content">
                            <div className="ai-auth-info">
                                <h4>🔑 Usage-Based Access</h4>
                                <p>Pay per use with your API key. Stored securely on the server.</p>
                            </div>
                            <div className="ai-key-form">
                                <div className="ai-key-input-wrapper">
                                    <KeyRound size={18} />
                                    <input type="password" placeholder="sk-..." value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()} />
                                </div>
                                <button className="ai-key-submit" onClick={handleKeySubmit}>
                                    Activate with API Key
                                </button>
                            </div>
                            <p className="ai-setup-hint">Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></p>
                        </div>
                    )}

                    {keyError && <p className="ai-key-error"><AlertCircle size={14} /> {keyError}</p>}
                </div>
            </div>
        );
    }

    // Loading
    if (hasKey === null) {
        return (
            <div className="ai-page fade-in">
                <div className="ai-loading">
                    <Loader2 size={32} className="spin" />
                    <p>Connecting to Lumina AI...</p>
                </div>
            </div>
        );
    }

    // ─── Chat Interface ───
    return (
        <div className="ai-page fade-in">
            <div className="ai-container">
                <div className="ai-header">
                    <div className="ai-header-info">
                        <Sparkles size={22} className="ai-header-icon" />
                        <div>
                            <h2>Lumina AI</h2>
                            <span className="ai-model-badge">{authMethod === 'chatgpt' ? 'GPT-5.2-Codex' : 'GPT-4o'}</span>
                        </div>
                    </div>
                    <div className="ai-header-actions">
                        <button className="ai-new-chat" onClick={handleNewChat} title="New conversation">
                            <RefreshCw size={16} />
                            New Chat
                        </button>
                        <button className="ai-logout" onClick={handleLogout} title="Disconnect AI">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>

                <div className="ai-messages">
                    {messages.length === 0 ? (
                        <div className="ai-welcome">
                            <div className="ai-welcome-icon"><Bot size={40} /></div>
                            <h3>How can I help with your portfolio?</h3>
                            <p>Ask me anything about your investments, or try one of these:</p>
                            <div className="ai-presets">
                                {PRESET_PROMPTS.map((preset, i) => (
                                    <button key={i} className="ai-preset-btn glass-panel" onClick={() => handleSubmit(preset.prompt)}>
                                        {preset.icon}
                                        <span>{preset.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`ai-message ai-message-${msg.role}`}>
                                <div className="ai-message-avatar">
                                    {msg.role === 'user' ? <User size={16} /> : msg.role === 'error' ? <AlertCircle size={16} /> : <Bot size={16} />}
                                </div>
                                <div className="ai-message-content">
                                    {msg.role === 'assistant' ? <MarkdownRenderer text={msg.content} /> : <p>{msg.content}</p>}
                                </div>
                            </div>
                        ))
                    )}

                    {isLoading && (
                        <div className="ai-message ai-message-assistant">
                            <div className="ai-message-avatar"><Bot size={16} /></div>
                            <div className="ai-message-content ai-typing">
                                <div className="typing-dots"><span></span><span></span><span></span></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="ai-input-area">
                    <div className="ai-input-wrapper glass-panel">
                        <input type="text" placeholder="Ask about your portfolio..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} disabled={isLoading} />
                        <button className="ai-send-btn" onClick={() => handleSubmit()} disabled={!input.trim() || isLoading}>
                            <Send size={18} />
                        </button>
                    </div>
                    <p className="ai-disclaimer">Lumina AI may make errors. Verify important financial decisions.</p>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
