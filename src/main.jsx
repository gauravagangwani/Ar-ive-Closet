import React from 'react';
import { createRoot } from 'react-dom/client';
import DitherVeil from './components/DitherVeil.jsx';
import './styles.css';

function App() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Dither Veil home">
          <span className="mark" aria-hidden="true">DV</span>
          <span>Dither Veil</span>
        </a>
        <span className="top-note">AN INTERACTIVE IMAGE STUDY</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> MOVE TO REVEAL</p>
          <h1>Look closer.<br /><em>See through.</em></h1>
          <p className="intro">A photograph, hidden in plain sight. Move your cursor or touch the image to uncover what’s underneath.</p>
          <div className="hero-meta">
            <span>01 / INTERACTIVE CANVAS</span>
            <span className="meta-rule" />
            <span>MADE TO BE EXPLORED</span>
          </div>
        </div>

        <div className="art-frame" aria-label="Interactive dithered photograph. Move your pointer to reveal it.">
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
            className="veil-canvas"
          />
          <span className="frame-index">FIG. 01</span>
          <span className="frame-hint">MOVE YOUR POINTER ↗</span>
        </div>
      </section>

      <footer className="footer">
        <span>AN EXPERIMENT IN LIGHT &amp; PIXELS</span>
        <span className="footer-dot" />
        <span>SCROLL LESS. LOOK MORE.</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
