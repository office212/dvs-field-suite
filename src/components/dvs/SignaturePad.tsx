import { useEffect, useRef, type PointerEvent } from "react";

export function SignaturePad({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (value === last.current) return;
    last.current = value;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (src: string | null) => {
      if (drawing.current) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.clientWidth || 320;
      const height = canvas.clientHeight || 144;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const ink = getComputedStyle(document.documentElement).getPropertyValue("--color-paper-ink").trim();
      ctx.strokeStyle = ink || "#1a1f2b";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.clearRect(0, 0, width, height);
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        if (drawing.current) return;
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = src;
    };

    draw(value);
    const observer = new ResizeObserver(() => {
      last.current = null;
      draw(value);
      last.current = value;
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [value]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  return (
    <canvas
      ref={canvasRef}
      className="h-36 w-full touch-none rounded-lg border border-paper-line bg-paper"
      onPointerDown={(event) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        drawing.current = true;
        canvas.setPointerCapture(event.pointerId);
        const p = point(event);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      }}
      onPointerMove={(event) => {
        if (!drawing.current) return;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        const p = point(event);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }}
      onPointerUp={() => {
        if (!drawing.current) return;
        drawing.current = false;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        last.current = url;
        onChange(url);
      }}
      onPointerCancel={() => {
        drawing.current = false;
      }}
    />
  );
}
