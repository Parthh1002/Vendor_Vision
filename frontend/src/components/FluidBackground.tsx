import React, { useEffect, useRef } from "react";
import WebGLFluid from "webgl-fluid";

interface FluidBackgroundProps {
  theme: string;
}

export const FluidBackground: React.FC<FluidBackgroundProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Initialize WebGLFluid with high-fidelity but highly optimized settings
    WebGLFluid(canvas, {
      TRIGGER: "hover",
      IMMEDIATE: false,
      AUTO: false,
      SIM_RESOLUTION: 64, // Reduced from 128 for smoother physics computation
      DYE_RESOLUTION: 512, // Reduced from 1024 for faster texture rendering
      CURL: 30, // High swirly effect
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLORFUL: true,
      COLOR_UPDATE_SPEED: 8,
      PAUSED: false,
      TRANSPARENT: true, // Transparent so the page's grid background shows through
      BLOOM: false, // Disabled to eliminate heavy post-processing passes
      SUNRAYS: false, // Disabled to eliminate expensive raymarching rendering
    });

    // Resize handler
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    // Event forwarder from window to canvas
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      if (!e.isTrusted) return; // Fix infinite recursion
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      // Dispatch simulated event to canvas
      const simEvent = new MouseEvent("mousemove", {
        clientX: clientX,
        clientY: clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        bubbles: true,
        cancelable: true,
      });

      // Attach offsets directly so webgl-fluid can read coordinates
      Object.defineProperties(simEvent, {
        offsetX: { value: canvasX, writable: true },
        offsetY: { value: canvasY, writable: true },
      });

      canvas.dispatchEvent(simEvent);
    };

    const handleWindowMouseDown = (e: MouseEvent) => {
      if (!canvas) return;
      if (!e.isTrusted) return; // Fix infinite recursion
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const simEvent = new MouseEvent("mousedown", {
        clientX: clientX,
        clientY: clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperties(simEvent, {
        offsetX: { value: canvasX, writable: true },
        offsetY: { value: canvasY, writable: true },
      });

      canvas.dispatchEvent(simEvent);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mousedown", handleWindowMouseDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mousedown", handleWindowMouseDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default FluidBackground;
