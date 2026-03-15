<div align="center">

# LUMINA INVEST

**Terminal-grade portfolio intelligence for the modern investor**

<img src="https://raw.githubusercontent.com/Spaghetih/lumina-invest/main/docs/lumina_dashboard_3m_final_demo_1772920833293.webp" alt="Lumina Invest" width="820">

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Yahoo Finance](https://img.shields.io/badge/Yahoo_Finance-API-7B0099?style=flat-square)](https://finance.yahoo.com)
[![License](https://img.shields.io/badge/License-MIT-ff9900?style=flat-square)]()

</div>

---

## Overview

Lumina Invest is a full-featured stock portfolio dashboard inspired by Bloomberg Terminal aesthetics. It combines real-time market data, portfolio analytics, AI-powered insights, and a clean dark interface built for speed and clarity.

> **Design philosophy:** JetBrains Mono, amber accent `#ff9900`, pitch-black `#000` background, 2px radius everywhere, zero clutter.

---

## Features

### Core

| Feature | Description |
|---------|-------------|
| **Live Portfolio Tracking** | Real-time quotes every 5s via Yahoo Finance. Price flash animations on tick. |
| **Multi-Portfolio** | Create, switch, rename, and delete portfolios (PEA, CTO, Crypto...). Dropdown selector in topbar. |
| **Performance Chart** | Interactive area chart with 1D / 1W / 1M / 3M / 1Y / ALL timeframes. Tooltip with balance on hover. |
| **Portfolio Heatmap** | Treemap visualization sized by market value, colored by daily performance (-5% red to +5% green). |
| **Summary Cards** | Total balance, invested, today's P&L, total P&L, ATH, ATL with percentage badges. |
| **Currency Toggle** | Switch display between EUR and USD. FX rate auto-fetched. All metrics normalized to EUR internally. |
| **Hide Balances** | One-click privacy mode to mask all monetary values. |
| **Dark / Light Mode** | Full theme support. 190+ CSS overrides for consistent light palette. Persisted in localStorage. |

### Market Intelligence

| Feature | Description |
|---------|-------------|
| **Stock Charts** | Per-ticker historical chart with range selector (1D to 5Y). Powered by Yahoo Finance `chart()`. |
| **Ticker Comparator** | Overlay two tickers on the same chart, normalized to % change for apples-to-apples comparison. |
| **Watchlist** | Track tickers without owning them. Add/remove, live quotes, 52-week range. Stored in localStorage. |
| **Stock Screener** | Pre-built screens: Top Gainers, Top Losers, Most Active, Trending, Undervalued Large Caps, Growth Tech, Small Cap Gainers. |
| **News Feed** | Per-ticker news with source, timestamp, and external links. Displayed under stock charts. |
| **Correlation Matrix** | Heatmap showing return correlations between all portfolio positions over 6 months of data. |

### Analytics & Tools

| Feature | Description |
|---------|-------------|
| **Portfolio Analysis** | Detailed position table with shares, avg price, current price, P&L, weight, target price. |
| **Target Prices** | Set per-position price targets. Inline edit with distance-to-target badge. |
| **Price Alerts** | Configure high/low thresholds per ticker. Toast notifications when breached. |
| **Backtesting** | "What if I invested X in Y on date Z?" Historical simulation with CAGR and max drawdown. |
| **Dividend Calendar** | Timeline of upcoming and past dividend payouts with annual income estimate. |
| **Transaction History** | Automatic BUY/SELL logging. Filterable by ticker, type, date range. |
| **CSV Export** | Native export of portfolio data (no external dependencies). Available in Settings and Portfolio. |
| **Insights** | Sector breakdown, top performers, risk metrics, analyst recommendations. |

### AI Assistant

| Feature | Description |
|---------|-------------|
| **Lumina AI** | Chat-based financial advisor powered by OpenAI. Analyzes your portfolio, suggests diversification. |
| **Context-Aware** | Sends your current holdings, sector weights, and performance data as context to each query. |
| **OAuth Support** | Optional OAuth flow for API key management. Keys stored server-side securely. |

---

## Architecture

```
lumina-invest/
  ├── src/
  │   ├── components/          # 21 React components + CSS modules
  │   │   ├── DashboardLayout  # Shell: sidebar, topbar, portfolio selector
  │   │   ├── PortfolioSummary # Summary cards (balance, PNL, ATH/ATL)
  │   │   ├── PerformanceChart # Recharts area chart with timeframes
  │   │   ├── LiveStockList    # Real-time positions table
  │   │   ├── Heatmap          # Treemap portfolio visualization
  │   │   ├── StockChart       # Per-ticker chart + comparator + news
  │   │   ├── Watchlist        # Non-portfolio ticker tracking
  │   │   ├── Screener         # Yahoo Finance screener presets
  │   │   ├── Backtesting      # Historical "what if" simulator
  │   │   ├── PortfolioAnalysis# Position details + targets + CSV
  │   │   ├── TransactionHistory# Buy/sell log
  │   │   ├── CorrelationMatrix# Return correlation heatmap
  │   │   ├── DividendCalendar # Payout timeline
  │   │   ├── Insights         # Sector/risk analytics
  │   │   ├── NewsFeed         # Per-ticker news
  │   │   ├── PriceAlerts      # Alert configuration
  │   │   ├── AIAssistant      # OpenAI chat interface
  │   │   ├── Settings         # App configuration + export
  │   │   └── ...modals        # AddStock, Import
  │   ├── contexts/
  │   │   ├── CurrencyContext   # EUR/USD, theme, hide balances
  │   │   └── NotificationContext
  │   ├── services/
  │   │   ├── mockData.js       # Portfolio CRUD, metrics, subscriptions
  │   │   └── exportService.js  # Native CSV generation
  │   ├── App.jsx               # State management, routing
  │   └── index.css             # Global styles + light theme
  ├── server.js                 # Express 5 API proxy
  ├── portfolios/               # Per-portfolio JSON storage
  │   ├── _meta.json            # Portfolio index
  │   └── default.json          # Default portfolio data
  └── package.json
```

---

## API Reference

### Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/portfolios` | List all portfolios |
| `POST` | `/api/portfolios` | Create portfolio `{ name }` |
| `PUT` | `/api/portfolios/:id` | Rename portfolio `{ name }` |
| `DELETE` | `/api/portfolios/:id` | Delete portfolio |
| `GET` | `/api/portfolio?id=` | Load portfolio positions |
| `POST` | `/api/portfolio?id=` | Save portfolio positions |

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/quotes?symbols=` | Batch quotes (comma-separated) |
| `GET` | `/api/historical/:symbol?range=` | OHLCV history (1d to 10y) |
| `GET` | `/api/summary/:symbol` | Full quote summary |
| `GET` | `/api/search?q=` | Ticker search / autocomplete |
| `GET` | `/api/dividends?symbols=` | Dividend data |
| `GET` | `/api/fx` | EUR/USD exchange rate |
| `GET` | `/api/news/:symbol` | Latest news articles |

### Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/screener?preset=` | Stock screener (gainers, losers, trending...) |
| `GET` | `/api/trending` | Trending tickers |
| `GET` | `/api/gainers` | Daily top gainers |
| `GET` | `/api/losers` | Daily top losers |
| `GET` | `/api/recommendations/:symbol` | Analyst recommendations |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/chat` | Send message with portfolio context |
| `POST` | `/api/ai/key` | Store OpenAI API key |
| `GET` | `/api/ai/key` | Check key status |

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** 9+

### Install & Run

```bash
# Clone
git clone https://github.com/Spaghetih/lumina-invest.git
cd lumina-invest

# Install dependencies
npm install

# Start backend (port 3001)
node server.js

# Start frontend (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

### Add Your First Position

1. Click **"Add Position"** or type a ticker in the search bar and press Enter
2. Search for a stock (e.g. `AAPL`, `MSFT`, `TTE.PA`)
3. Enter shares, average price, and purchase date
4. The position appears in your dashboard with live pricing

### Import from Broker

Click **"Import"** to upload a CSV from Revolut or other brokers. The parser auto-detects the format and imports all positions at once.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **UI Framework** | React | 19.2 |
| **Build Tool** | Vite | 7.3 |
| **Charts** | Recharts | 3.7 |
| **Icons** | Lucide React | 0.577 |
| **Server** | Express | 5.2 |
| **Market Data** | yahoo-finance2 | 3.13 |
| **AI** | OpenAI API | GPT-4 |
| **Notifications** | react-hot-toast | 2.6 |
| **Styling** | Vanilla CSS | Custom properties + themes |

---

## Navigation

| Tab | Icon | Description |
|-----|------|-------------|
| Dashboard | `Home` | Portfolio overview, chart, live list, heatmap |
| Markets | `Activity` | Full live stock table |
| Charts | `LineChart` | Per-ticker charts with comparator |
| Watchlist | `Eye` | Non-portfolio ticker tracking |
| Screener | `ListFilter` | Pre-built stock screens |
| Portfolio | `PieChart` | Position analysis + transactions |
| Backtest | `History` | Historical investment simulator |
| Dividends | `Calendar` | Payout calendar + income estimate |
| Insights | `Info` | Sector analytics + correlation matrix |
| Lumina AI | `Sparkles` | AI-powered portfolio advisor |
| Settings | `Settings` | Config, export, alerts, theme |

---

## Data Storage

| Data | Location | Persistence |
|------|----------|-------------|
| Portfolio positions | `portfolios/*.json` + localStorage | Server + client |
| Portfolio metadata | `portfolios/_meta.json` | Server |
| Watchlist | `localStorage:lumina_watchlist` | Client |
| Price alerts | `localStorage:lumina_alerts` | Client |
| Target prices | `localStorage:lumina_targets` | Client |
| Transactions | `localStorage:lumina_transactions` | Client |
| Theme preference | `localStorage:lumina_theme` | Client |
| Active portfolio | `localStorage:lumina_active_portfolio` | Client |
| Currency preference | `localStorage:lumina_currency` | Client |
| OpenAI key | `ai_key.json` (server) | Server |

---

<div align="center">

**Built for investors who appreciate both data and design.**

`#ff9900` amber | `#000000` background | `JetBrains Mono` | `2px` radius

</div>
