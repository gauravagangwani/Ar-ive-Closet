import { useEffect, useRef, useCallback } from 'react';

/**
 * DitherVeil
 * ----------
 * Renders an image behind a dithered (halftone) "veil". Moving the pointer
 * over the component burns a soft, radius-controlled hole in the veil that
 * reveals the real photo underneath. When the pointer leaves, the hole
 * fades back out over `linger` seconds.
 *
 * Props:
 *   src            - image URL (required)
 *   pattern        - 'floyd' (Floyd–Steinberg error diffusion, default)
 *                     or 'bayer' (ordered 8x8 dithering)
 *   pixelSize      - size in px of each dither cell at native resolution (default 3)
 *   inkColor       - color of "on" dither cells (default '#111')
 *   paperColor     - color of "off" dither cells / background (default '#f4f1ea')
 *   revealRadius   - radius in px of the reveal circle around the pointer (default 160)
 *   softness       - 0..1, feather width of the reveal edge as a fraction of the radius (default 0.5)
 *   linger         - seconds for the reveal to fade out after the pointer leaves (default 0.8)
 *   className/style - passed through to the outer wrapper
 */
export default function DitherVeil({
  src,
  pattern = 'floyd',
  pixelSize = 3,
  inkColor = '#111111',
  paperColor = '#f4f1ea',
  revealRadius = 160,
  softness = 0.5,
  linger = 0.8,
  className,
  style,
}) {
  const wrapRef = useRef(null);
  const photoCanvasRef = useRef(null);
  const veilCanvasRef = useRef(null);
  const imgRef = useRef(null);

  // pointer/reveal animation state, kept in refs so it never re-renders React
  const state = useRef({
    targetX: -9999,
    targetY: -9999,
    curX: -9999,
    curY: -9999,
    targetR: 0,
    curR: 0,
    hovering: false,
    raf: null,
    lastT: null,
  });

  const draw = useCallback(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    const photoCanvas = photoCanvasRef.current;
    const veilCanvas = veilCanvasRef.current;
    if (!wrap || !img || !img.complete || !img.naturalWidth) return;

    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w === 0 || h === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // --- Photo layer: draw the source image "cover"-fit into the box ---
    photoCanvas.width = w * dpr;
    photoCanvas.height = h * dpr;
    const pctx = photoCanvas.getContext('2d');
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.clearRect(0, 0, w, h);

    const ir = img.naturalWidth / img.naturalHeight;
    const br = w / h;
    let dw, dh, dx, dy;
    if (ir > br) {
      dh = h;
      dw = h * ir;
      dx = (w - dw) / 2;
      dy = 0;
    } else {
      dw = w;
      dh = w / ir;
      dx = 0;
      dy = (h - dh) / 2;
    }
    pctx.drawImage(img, dx, dy, dw, dh);
    const coverX = dx, coverY = dy, coverW = dw, coverH = dh;

    // --- Veil layer: downsample the same crop, dither it, upscale as blocks ---
    const cell = Math.max(1, pixelSize);
    const cols = Math.max(1, Math.round(w / cell));
    const rows = Math.max(1, Math.round(h / cell));

    const small = document.createElement('canvas');
    small.width = cols;
    small.height = rows;
    const sctx = small.getContext('2d');
    // map the same "cover" crop into the small canvas
    const scaleX = cols / w, scaleY = rows / h;
    sctx.drawImage(
      img,
      0, 0, img.naturalWidth, img.naturalHeight,
      coverX * scaleX, coverY * scaleY, coverW * scaleX, coverH * scaleY
    );

    const { data } = sctx.getImageData(0, 0, cols, rows);
    const gray = new Float32Array(cols * rows);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const on = new Uint8Array(cols * rows); // 1 = ink, 0 = paper

    if (pattern === 'bayer') {
      const bayer8 = [
        0, 32, 8, 40, 2, 34, 10, 42,
        48, 16, 56, 24, 50, 18, 58, 26,
        12, 44, 4, 36, 14, 46, 6, 38,
        60, 28, 52, 20, 62, 30, 54, 22,
        3, 35, 11, 43, 1, 33, 9, 41,
        51, 19, 59, 27, 49, 17, 57, 25,
        15, 47, 7, 39, 13, 45, 5, 37,
        63, 31, 55, 23, 61, 29, 53, 21,
      ].map((v) => (v + 0.5) / 64);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const p = y * cols + x;
          const threshold = bayer8[(y % 8) * 8 + (x % 8)] * 255;
          on[p] = gray[p] < threshold ? 1 : 0;
        }
      }
    } else {
      // Floyd–Steinberg error diffusion
      const buf = Float32Array.from(gray);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const p = y * cols + x;
          const old = buf[p];
          const newVal = old < 128 ? 0 : 255;
          on[p] = newVal === 0 ? 1 : 0;
          const err = old - newVal;
          if (x + 1 < cols) buf[p + 1] += (err * 7) / 16;
          if (y + 1 < rows) {
            if (x - 1 >= 0) buf[p + cols - 1] += (err * 3) / 16;
            buf[p + cols] += (err * 5) / 16;
            if (x + 1 < cols) buf[p + cols + 1] += (err * 1) / 16;
          }
        }
      }
    }

    veilCanvas.width = w * dpr;
    veilCanvas.height = h * dpr;
    const vctx = veilCanvas.getContext('2d');
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctx.fillStyle = paperColor;
    vctx.fillRect(0, 0, w, h);
    vctx.fillStyle = inkColor;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (on[y * cols + x]) {
          vctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
        }
      }
    }
  }, [src, pattern, pixelSize, inkColor, paperColor]);

  // load image + redraw on resize
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = draw;
    img.src = src;
    imgRef.current = img;

    const wrap = wrapRef.current;
    const ro = new ResizeObserver(() => draw());
    if (wrap) ro.observe(wrap);

    return () => ro.disconnect();
  }, [src, draw]);

  useEffect(() => { draw(); }, [pattern, pixelSize, inkColor, paperColor, draw]);

  // pointer-driven reveal mask animation
  useEffect(() => {
    const wrap = wrapRef.current;
    const veil = veilCanvasRef.current;
    if (!wrap || !veil) return;
    const s = state.current;

    const setPointer = (clientX, clientY) => {
      const rect = wrap.getBoundingClientRect();
      s.targetX = clientX - rect.left;
      s.targetY = clientY - rect.top;
      s.targetR = revealRadius;
      s.hovering = true;
    };
    const onMove = (e) => setPointer(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onLeave = () => {
      s.targetR = 0;
      s.hovering = false;
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    wrap.addEventListener('touchmove', onTouchMove, { passive: true });
    wrap.addEventListener('touchend', onLeave);

    const tick = (t) => {
      if (s.lastT == null) s.lastT = t;
      const dt = Math.min(0.05, (t - s.lastT) / 1000);
      s.lastT = t;

      // position follows quickly; radius follows quickly on enter, lingers on exit
      const posTau = 0.06;
      const radiusTau = s.hovering ? 0.08 : Math.max(0.02, linger);

      const posK = 1 - Math.exp(-dt / posTau);
      const radK = 1 - Math.exp(-dt / radiusTau);

      s.curX += (s.targetX - s.curX) * posK;
      s.curY += (s.targetY - s.curY) * posK;
      s.curR += (s.targetR - s.curR) * radK;

      const r = Math.max(0, s.curR);
      const inner = Math.max(0, r * (1 - Math.min(1, Math.max(0, softness))));
      veil.style.maskImage =
        `radial-gradient(circle at ${s.curX}px ${s.curY}px, transparent 0px, transparent ${inner}px, black ${r}px)`;
      veil.style.webkitMaskImage = veil.style.maskImage;

      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);

    return () => {
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      wrap.removeEventListener('touchmove', onTouchMove);
      wrap.removeEventListener('touchend', onLeave);
      if (s.raf) cancelAnimationFrame(s.raf);
    };
  }, [revealRadius, softness, linger]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      <canvas
        ref={photoCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <canvas
        ref={veilCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
