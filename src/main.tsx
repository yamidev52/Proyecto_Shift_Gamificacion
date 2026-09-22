/**
 * Punto de entrada del cliente. Las fuentes se empaquetan localmente (sin CDN).
 * App inicia la sesión de demostración solo cuando la API responde 401.
 */
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';
import App from './App';
import './styles.css';
createRoot(document.getElementById('root')!).render(<App />);
