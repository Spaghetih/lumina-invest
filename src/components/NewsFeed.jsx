import React, { useState, useEffect, useCallback } from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';
import './NewsFeed.css';

const NewsFeed = ({ symbol }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchNews = useCallback(async () => {
        if (!symbol) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3001/api/news/${symbol}`);
            const data = await res.json();
            setNews(data.slice(0, 8));
        } catch {
            setNews([]);
        } finally {
            setLoading(false);
        }
    }, [symbol]);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    if (!symbol) return null;

    const timeAgo = (timestamp) => {
        if (!timestamp) return '';
        const ms = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
        if (isNaN(ms)) return '';
        const diff = Date.now() - ms;
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="news-feed">
            <div className="news-header">
                <h4 className="news-title"><Newspaper size={14} /> News — {symbol}</h4>
            </div>
            <div className="news-list">
                {loading && <div className="news-loading">Loading news...</div>}
                {!loading && news.length === 0 && <div className="news-empty">No news available</div>}
                {news.map((item, i) => (
                    <a
                        key={i}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-item"
                    >
                        <div className="news-item-content">
                            <p className="news-item-title">{item.title}</p>
                            <div className="news-item-meta">
                                <span className="news-source">{item.publisher}</span>
                                <span className="news-time"><Clock size={10} /> {timeAgo(item.providerPublishTime)}</span>
                            </div>
                        </div>
                        <ExternalLink size={12} className="news-link-icon" />
                    </a>
                ))}
            </div>
        </div>
    );
};

export default NewsFeed;
