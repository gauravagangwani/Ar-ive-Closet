import React from 'react';
import { createRoot } from 'react-dom/client';
import DitherVeil from './components/DitherVeil.jsx';
import './styles.css';

function App() {
  return (
    <main className="stage" aria-label="Interactive animated skull">
      <DitherVeil
        src="https://images.unsplash.com/photo-1737071371043-761e02b1ef95?q=80&w=1400&auto=format&fit=crop"
        pattern="floyd"
        pixelSize={2}
        inkColor="#120f17"
        paperColor="#f4f1ea"
        revealRadius={200}
        softness={0.6}
        linger={1}
        fit="contain"
        rimColor="#a78bfa"
        palette="duotone"
        levels={2}
        contrast={1.15}
        brightness={0}
        rim={0}
        reverse={false}
        wander={false}
        clickBurst
        className="skull-animation"
      />
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
