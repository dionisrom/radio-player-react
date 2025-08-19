import React, { useEffect, useRef, useState } from 'react'

export default function Visualization({ analyser, audioCtx, visBg, setVisBg }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const analyserRef = useRef(analyser)
  const lastDataRef = useRef(null)
  const fadeRef = useRef(0) // 0..1 fade between fallback (0) and live (1)

  // Keep a ref up-to-date so the draw loop doesn't restart when analyser prop changes
  useEffect(() => { analyserRef.current = analyser }, [analyser]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    let width = 0, height = 0;
    function resize() {
      if (visBg) {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * DPR;
        canvas.height = height * DPR;
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
      } else {
        width = canvas.clientWidth || 0;
        height = 120;
        canvas.width = width * DPR;
        canvas.height = height * DPR;
        canvas.style.width = '100%';
        canvas.style.height = '120px';
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    }
    resize();
    if (visBg) window.addEventListener('resize', resize);

    const draw = () => {
      // Don't fully clear here; we'll draw over previous frame to reduce flicker
      ctx.clearRect(0, 0, width, height);

      const node = analyserRef.current && analyserRef.current.current ? analyserRef.current.current : null;
      if (node) {
        const bufferLength = node.frequencyBinCount;
        const data = new Uint8Array(bufferLength);
        node.getByteFrequencyData(data);
        lastDataRef.current = data;
        // fade in
        fadeRef.current = Math.min(1, (fadeRef.current || 0) + 0.08);
      } else if (lastDataRef.current) {
        // fade out using last captured data
        fadeRef.current = Math.max(0, (fadeRef.current || 0) - 0.02);
      } else {
        fadeRef.current = 0;
      }

      // If nothing to draw (fully faded out), show fallback text
      if (!lastDataRef.current || fadeRef.current <= 0) {
        ctx.save();
        ctx.font = '20px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for audio...', (width || 300) / 2, (height || 120) / 2);
        ctx.restore();
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const data = lastDataRef.current;
      const bufferLength = data.length;
      const barWidth = Math.max(2, (width || 300) / (bufferLength / 2));
      let x = 0;
      for (let i = 0; i < bufferLength / 2; i++) {
        const v = (data[i] || 0) / 255;
        const barHeight = v * height;
        const hue = 220 - (220 * (i / (bufferLength / 2)));
        const color = `hsl(${hue}, 85%, 55%)`;
        const grad = ctx.createLinearGradient(0, height - barHeight, 0, height);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(255,255,255,0.15)');
        ctx.globalAlpha = fadeRef.current;
        ctx.fillStyle = grad;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
      ctx.globalAlpha = 1;

      // continue loop
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (visBg) window.removeEventListener('resize', resize);
    };
  }, [visBg]);

  if (visBg === false) {
    return (
      <div className="w-full rounded-lg overflow-hidden glass p-3 relative">
        <canvas ref={canvasRef} style={{ width: '100%', height: 120 }} />
      </div>
    )
  } else {
    return (
      <div className="fixed inset-0 z-1 overflow-hidden w-full pointer-events-none select-none" style={{ opacity: 1 }}>
        <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />
      </div>
    )
  }
}
