import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CurrencyProvider } from './contexts/CurrencyContext.jsx'
import { NotificationProvider } from './contexts/NotificationContext.jsx'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CurrencyProvider>
      <NotificationProvider>
        <App />
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: 'rgba(25, 25, 30, 0.9)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px'
          }
        }} />
      </NotificationProvider>
    </CurrencyProvider>
  </StrictMode>,
)
