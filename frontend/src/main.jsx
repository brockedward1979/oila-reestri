import { createRoot } from 'react-dom/client';
import '@fontsource-variable/nunito';
import App from './App.jsx';
import { applyTheme, getTheme } from './lib/theme.js';
import './styles.css';

applyTheme(getTheme());
createRoot(document.getElementById('root')).render(<App />);
