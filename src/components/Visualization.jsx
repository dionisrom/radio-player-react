import React, { useEffect, useRef, useState } from 'react'
import { isIOSSafari, hasWebAudioCORSRestrictions } from '../utils/deviceDetection'

export default function Visualization({ analyser, audioCtx, visBg, setVisBg }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const analyserRef = useRef(analyser)
  const lastDataRef = useRef(null)
  const fadeRef = useRef(0) // 0..1 fade between fallback (0) and live (1)
  const [corsBlocked, setCorsBlocked] = useState(false)
  const [fallbackAnimation, setFallbackAnimation] = useState(false)
  const corsCheckCountRef = useRef(0)
  const fallbackTimeRef = useRef(0)

  // Keep a ref up-to-date so the draw loop doesn't restart when analyser prop changes
  useEffect(() => { 
    analyserRef.current = analyser 
    // Reset CORS detection when analyser changes
    setCorsBlocked(false)
    corsCheckCountRef.current = 0
    
    // On iOS Safari, immediately start fallback animation as Web Audio is likely restricted
    if (hasWebAudioCORSRestrictions() && analyser) {
      setTimeout(() => {
        if (corsCheckCountRef.current > 5) {
          setCorsBlocked(true)
          setFallbackAnimation(true)
        }
      }, 2000) // Give it 2 seconds to get real data before assuming CORS blocking
    }
  }, [analyser]);

  // Function to check if frequency data is all zeros (indicates CORS blocking)
  const checkForCorsBlocking = (data) => {
    // Check if all values are zero or very close to zero
    const hasData = data.some(value => value > 5) // Allow for some noise threshold
    
    if (!hasData) {
      corsCheckCountRef.current++
      // After several consecutive zero checks, assume CORS blocking
      if (corsCheckCountRef.current > 10) {
        setCorsBlocked(true)
        setFallbackAnimation(true)
      }
    } else {
      corsCheckCountRef.current = 0
      setCorsBlocked(false)
      setFallbackAnimation(false)
    }
    
    return hasData
  }

  // Generate fake frequency data for fallback animation
  const generateFallbackData = (length, time) => {
    const data = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      // Create wave patterns that look like real audio data
      const frequency = i / length
      const wave1 = Math.sin(time * 0.001 + frequency * Math.PI * 4) * 0.5 + 0.5
      const wave2 = Math.sin(time * 0.0015 + frequency * Math.PI * 2) * 0.3 + 0.3
      const wave3 = Math.sin(time * 0.002 + frequency * Math.PI * 6) * 0.2 + 0.2
      
      // Combine waves and add some bass/treble characteristics
      let amplitude = (wave1 + wave2 + wave3) / 3
      
      // More energy in lower frequencies (like typical music)
      if (frequency < 0.1) amplitude *= 1.5
      else if (frequency < 0.3) amplitude *= 1.2
      else if (frequency > 0.8) amplitude *= 0.6
      
      data[i] = Math.floor(amplitude * 100)
    }
    return data
  }

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
      let hasValidData = false;
      
      if (node) {
        const bufferLength = node.frequencyBinCount;
        const data = new Uint8Array(bufferLength);
        node.getByteFrequencyData(data);
        
        // Check for CORS blocking (iOS Safari issue)
        hasValidData = checkForCorsBlocking(data);
        
        if (hasValidData) {
          lastDataRef.current = data;
          // fade in
          fadeRef.current = Math.min(1, (fadeRef.current || 0) + 0.08);
        } else if (!corsBlocked) {
          // Still checking, fade out slowly
          fadeRef.current = Math.max(0, (fadeRef.current || 0) - 0.02);
        }
      } else if (lastDataRef.current && !corsBlocked) {
        // fade out using last captured data
        fadeRef.current = Math.max(0, (fadeRef.current || 0) - 0.02);
      }

      // Use fallback animation if CORS blocked or no data available
      if (corsBlocked || (fallbackAnimation && !hasValidData)) {
        fallbackTimeRef.current += 16; // ~60fps
        const bufferLength = 256; // Standard size for fallback
        const fallbackData = generateFallbackData(bufferLength, fallbackTimeRef.current);
        lastDataRef.current = fallbackData;
        fadeRef.current = Math.min(1, (fadeRef.current || 0) + 0.05);
      }

      // If nothing to draw (fully faded out and no fallback), show waiting message
      if (!lastDataRef.current || (fadeRef.current <= 0 && !corsBlocked && !fallbackAnimation)) {
        ctx.save();
        ctx.font = visBg ? '24px sans-serif' : '18px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        
        let message = 'Waiting for audio...';
        if (corsBlocked || (isIOSSafari() && node)) {
          message = visBg ? 'Audio visualization (limited on iOS Safari)' : 'Visualization (limited on iOS)';
        }
        
        ctx.fillText(message, (width || 300) / 2, (height || 120) / 2);
        
        // Add a small subtitle for iOS users explaining the limitation
        if ((corsBlocked || isIOSSafari()) && visBg) {
          ctx.font = '16px sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText('Showing simulated visualization due to browser restrictions', (width || 300) / 2, (height || 120) / 2 + 30);
        }
        
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
        
        // Adjust colors based on whether this is real or fallback data
        let hue, saturation, lightness;
        if (corsBlocked || fallbackAnimation) {
          // Use more muted colors for fallback animation to indicate limitation
          hue = 200 - (100 * (i / (bufferLength / 2))); // Blue to cyan range
          saturation = 60; // Reduced saturation
          lightness = 45; // Slightly dimmer
        } else {
          // Normal vibrant colors for real audio data
          hue = 220 - (220 * (i / (bufferLength / 2)));
          saturation = 85;
          lightness = 55;
        }
        
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
