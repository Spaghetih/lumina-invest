import React, { useState } from 'react';
import { Rocket, Upload, Plus, BarChart3, Brain, PieChart, TrendingUp, ArrowRight, ArrowLeft, Sparkles, Shield, Globe } from 'lucide-react';
import './Onboarding.css';

const steps = [
    {
        icon: Rocket,
        title: 'Welcome to Lumina Invest',
        subtitle: 'Your professional portfolio tracker',
        desc: 'Track your investments in real-time with advanced analytics, AI insights, and multi-currency support.',
        visual: 'welcome',
    },
    {
        icon: Plus,
        title: 'Add Your First Position',
        subtitle: 'Start building your portfolio',
        desc: 'Click "Add Position" in the top-right corner to manually add a stock. Enter the ticker, number of shares, and average buy price.',
        visual: 'add',
        action: 'addPosition',
    },
    {
        icon: Upload,
        title: 'Import from Revolut',
        subtitle: 'Bulk import your positions',
        desc: 'Already have a Revolut portfolio? Click "Import" to upload your CSV export and import all positions at once. We auto-map European tickers.',
        visual: 'import',
        action: 'import',
    },
    {
        icon: BarChart3,
        title: 'Charts & Analysis',
        subtitle: 'Deep dive into any stock',
        desc: 'Use the Charts tab to view detailed price history, compare two tickers side by side, and read the latest news for any stock.',
        visual: 'charts',
    },
    {
        icon: PieChart,
        title: 'Insights & Correlation',
        subtitle: 'Understand your risk',
        desc: 'The Insights tab shows your portfolio health score, allocation breakdown, smart alerts, and a correlation matrix to measure diversification.',
        visual: 'insights',
    },
    {
        icon: Brain,
        title: 'AI Assistant',
        subtitle: 'Powered by GPT-4o & Claude',
        desc: 'Connect your OpenAI or Claude API key in the Lumina AI tab to get personalized portfolio analysis and investment advice.',
        visual: 'ai',
    },
];

const WelcomeVisual = () => (
    <div className="onb-visual onb-visual-welcome">
        <div className="onb-welcome-grid">
            <div className="onb-welcome-card">
                <TrendingUp size={20} />
                <span>Live Quotes</span>
            </div>
            <div className="onb-welcome-card">
                <PieChart size={20} />
                <span>Analytics</span>
            </div>
            <div className="onb-welcome-card">
                <Brain size={20} />
                <span>AI Insights</span>
            </div>
            <div className="onb-welcome-card">
                <Globe size={20} />
                <span>Multi-Currency</span>
            </div>
            <div className="onb-welcome-card">
                <Shield size={20} />
                <span>Secure</span>
            </div>
            <div className="onb-welcome-card">
                <Sparkles size={20} />
                <span>Free</span>
            </div>
        </div>
    </div>
);

const AddVisual = () => (
    <div className="onb-visual onb-visual-demo">
        <div className="onb-mock-btn"><Plus size={16} /> Add Position</div>
        <div className="onb-mock-form">
            <div className="onb-mock-field"><span>AAPL</span><span className="onb-mock-label">Ticker</span></div>
            <div className="onb-mock-field"><span>10</span><span className="onb-mock-label">Shares</span></div>
            <div className="onb-mock-field"><span>$185.50</span><span className="onb-mock-label">Avg Price</span></div>
        </div>
    </div>
);

const ImportVisual = () => (
    <div className="onb-visual onb-visual-demo">
        <div className="onb-mock-upload">
            <Upload size={24} />
            <span>portfolio.csv</span>
        </div>
        <div className="onb-mock-tickers">
            <span className="onb-mock-ticker ok">AAPL</span>
            <span className="onb-mock-ticker ok">MSFT</span>
            <span className="onb-mock-ticker ok">NVDA</span>
            <span className="onb-mock-ticker ok">TTE</span>
            <span className="onb-mock-ticker ok">AI.PA</span>
        </div>
    </div>
);

const ChartsVisual = () => (
    <div className="onb-visual onb-visual-chart">
        <svg viewBox="0 0 200 60" className="onb-chart-svg">
            <defs>
                <linearGradient id="onbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff9900" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d="M0,50 L20,42 L40,45 L60,35 L80,38 L100,28 L120,30 L140,20 L160,22 L180,12 L200,15 L200,60 L0,60 Z" fill="url(#onbGrad)" />
            <path d="M0,50 L20,42 L40,45 L60,35 L80,38 L100,28 L120,30 L140,20 L160,22 L180,12 L200,15" fill="none" stroke="#ff9900" strokeWidth="2" />
        </svg>
        <div className="onb-chart-labels">
            <span>TSLA vs AAPL</span>
            <span className="onb-chart-pct">+24.5%</span>
        </div>
    </div>
);

const InsightsVisual = () => (
    <div className="onb-visual onb-visual-insights">
        <div className="onb-score-ring">
            <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1a1a1a" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#30D158" strokeWidth="6"
                    strokeDasharray="160 214" strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <span className="onb-score-num">75</span>
        </div>
        <span className="onb-score-label">Portfolio Health</span>
    </div>
);

const AIVisual = () => (
    <div className="onb-visual onb-visual-ai">
        <div className="onb-ai-bubble onb-ai-user">Analyze my portfolio risk</div>
        <div className="onb-ai-bubble onb-ai-bot">
            <Sparkles size={12} />
            Your portfolio has strong tech concentration at 65%. Consider adding defensive sectors...
        </div>
    </div>
);

const visuals = {
    welcome: WelcomeVisual,
    add: AddVisual,
    import: ImportVisual,
    charts: ChartsVisual,
    insights: InsightsVisual,
    ai: AIVisual,
};

const Onboarding = ({ onAddPosition, onImport, onDismiss }) => {
    const [step, setStep] = useState(0);
    const current = steps[step];
    const Visual = visuals[current.visual];
    const Icon = current.icon;
    const isLast = step === steps.length - 1;

    const handleAction = () => {
        if (current.action === 'addPosition' && onAddPosition) {
            onAddPosition();
        } else if (current.action === 'import' && onImport) {
            onImport();
        }
    };

    return (
        <div className="onboarding fade-in">
            <div className="onb-card">
                {/* Progress */}
                <div className="onb-progress">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`onb-progress-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
                            onClick={() => setStep(i)}
                        />
                    ))}
                </div>

                {/* Visual */}
                <div className="onb-visual-container">
                    <Visual />
                </div>

                {/* Content */}
                <div className="onb-content">
                    <div className="onb-icon-badge">
                        <Icon size={20} />
                    </div>
                    <h2 className="onb-title">{current.title}</h2>
                    <p className="onb-subtitle">{current.subtitle}</p>
                    <p className="onb-desc">{current.desc}</p>
                </div>

                {/* Actions */}
                <div className="onb-actions">
                    {step > 0 && (
                        <button className="onb-btn-back" onClick={() => setStep(step - 1)}>
                            <ArrowLeft size={16} /> Back
                        </button>
                    )}

                    <div className="onb-actions-right">
                        {current.action && (
                            <button className="onb-btn-action" onClick={handleAction}>
                                {current.action === 'addPosition' ? 'Add Position' : 'Import CSV'}
                            </button>
                        )}

                        {isLast ? (
                            <button className="onb-btn-next onb-btn-finish" onClick={onDismiss}>
                                Get Started <Sparkles size={16} />
                            </button>
                        ) : (
                            <button className="onb-btn-next" onClick={() => setStep(step + 1)}>
                                Next <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Skip */}
                <button className="onb-skip" onClick={onDismiss}>
                    Skip tutorial
                </button>
            </div>
        </div>
    );
};

export default Onboarding;
