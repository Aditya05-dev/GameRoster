import React, { useEffect, useRef } from "react";
export default function Atmosphere({ enabled }) {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current,
      media = matchMedia("(prefers-reduced-motion: reduce)");
    if (!enabled || media.matches) return;
    const ctx = canvas.getContext("2d");
    let w = 0,
      h = 0,
      frame = 0,
      last = 0;
    const mouse = { x: -1000, y: -1000 };
    let particles = [];
    function resize() {
      w = innerWidth;
      h = innerHeight;
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: w < 700 ? 20 : 42 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.4,
        v: Math.random() * 0.2 + 0.08,
      }));
    }
    function draw(t) {
      if (t - last > 30) {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
          p.y -= p.v;
          if (p.y < 0) p.y = h;
          const dx = p.x - mouse.x,
            dy = p.y - mouse.y,
            d = Math.hypot(dx, dy);
          if (d > 0 && d < 130) {
            p.x += (dx / d) * 0.55;
            p.y += (dy / d) * 0.55;
          }
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(154,190,239,0.32)";
          ctx.fill();
        }
        last = t;
      }
      frame = requestAnimationFrame(draw);
    }
    const move = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !media.matches)
        frame = requestAnimationFrame(draw);
    };
    const preference = () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
      if (!media.matches) frame = requestAnimationFrame(draw);
    };
    resize();
    frame = requestAnimationFrame(draw);
    addEventListener("resize", resize);
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", preference);
    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", preference);
    };
  }, [enabled]);
  return <canvas ref={ref} className="atmosphere" aria-hidden="true" />;
}
