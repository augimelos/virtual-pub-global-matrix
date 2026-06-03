import { useRef, useEffect } from 'react';

export function WebGLCanvas({
  width,
  height,
  active,
}: {
  width: number;
  height: number;
  active: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    const c = ref.current;
    if (!c || !active) return;
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Animated grid
      const gridSize = 60;
      const offsetX = (t * 0.3) % gridSize;
      const offsetY = (t * 0.15) % gridSize;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.lineWidth = 0.5;
      for (let x = -gridSize + offsetX; x < width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -gridSize + offsetY; y < height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Subtle corner vignette
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        height * 0.3,
        width / 2,
        height / 2,
        height * 0.8,
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      t++;
      frame.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame.current);
  }, [width, height, active]);

  if (!active) return null;
  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.7 }}
    />
  );
}
