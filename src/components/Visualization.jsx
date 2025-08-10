import React, { useEffect, useRef, useState } from 'react'

export default function Visualization({ analyser, audioCtx, visBg, setVisBg }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    let width, height;
    function resize() {
      if (visBg) {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * DPR;
        canvas.height = height * DPR;
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
      } else {
        width = canvas.clientWidth;
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
      ctx.clearRect(0, 0, width, height);
      if (!analyser || !analyser.current) {
        // Draw fallback message
        ctx.save();
        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for audio...', width/2, height/2);
        ctx.restore();
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const node = analyser.current;
      const bufferLength = node.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      node.getByteFrequencyData(data);
      const barWidth = Math.max(2, width / (bufferLength / 2));
      let x = 0;
      for (let i = 0; i < bufferLength / 2; i++) {
        const v = data[i] / 255;
        const barHeight = v * height;
        const hue = 220 - (220 * (i / (bufferLength / 2)));
        const color = `hsl(${hue}, 85%, 55%)`;
        const grad = ctx.createLinearGradient(0, height - barHeight, 0, height);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(255,255,255,0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (visBg) window.removeEventListener('resize', resize);
    };
  }, [analyser, audioCtx, visBg]);

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
