
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initGlobalErrorLogger } from './lib/errorLogger';

initGlobalErrorLogger();

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
