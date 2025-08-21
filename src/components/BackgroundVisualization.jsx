import React, { useEffect, useRef, useState } from 'react'

export default function BackgroundVisualization({ analyser, showVisualization = true, visBg, setVisBg }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const DPR = window.devicePixelRatio || 1
    let width = canvas.clientWidth
    let height = 120
    canvas.width = width * DPR
    canvas.height = height * DPR
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(DPR, DPR)

    const draw = () => {
      if (!analyser || !analyser.current) {
        ctx.clearRect(0, 0, width, height)
        rafRef.current = requestAnimationFrame(draw)
        return
      }
      const node = analyser.current
      const bufferLength = node.frequencyBinCount
      const data = new Uint8Array(bufferLength)
      node.getByteFrequencyData(data)
      ctx.clearRect(0, 0, width, height)
      const barWidth = Math.max(2, width / (bufferLength / 2))
      let x = 0
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
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [analyser])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none select-none" style={{ opacity: 0.25 }}>
      <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />
      <div className="absolute top-2 right-4 z-10">
        <label className="flex items-center gap-2 text-xs bg-white/60 dark:bg-black/40 px-2 py-1 rounded-sm">
          <input type="checkbox" checked={!!visBg} onChange={e => setVisBg(e.target.checked)} />
          Visualization as background
        </label>
      </div>
    </div>
  )
}
