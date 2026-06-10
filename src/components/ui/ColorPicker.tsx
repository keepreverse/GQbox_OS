import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pipette, X } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

// Generate a nice default palette for dark UIs
const DEFAULT_PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#94A3B8',
  '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#F8FAFC',
];

const VIEWPORT_MARGIN = 8;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 3 && clean.length !== 6) return null;
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`;
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rN) h = ((gN - bN) / d + 6) % 6 * 60;
    else if (max === gN) h = ((bN - rN) / d + 2) * 60;
    else h = ((rN - gN) / d + 4) * 60;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hex, setHex] = useState(value || '#000000');
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef(hex);
  hexRef.current = hex;

  const rgb = hexToRgb(hex);
  const hsv = rgb ? rgbToHsv(rgb.r, rgb.g, rgb.b) : { h: 0, s: 0, v: 0 };

  const openPicker = useCallback(() => {
    setIsOpen(true);
  }, []);

  const commitColor = useCallback(() => {
    const current = hexRef.current;
    if (current !== value) {
      onChange(current);
    }
  }, [value, onChange]);

  const handleSatValChange = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    const rgb = hsvToRgb(hsv.h, s, v);
    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHex(newHex);
  }, [hsv.h]);

  const handleHueChange = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const h = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
    const rgb = hsvToRgb(h, hsv.s, hsv.v);
    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHex(newHex);
  }, [hsv.s, hsv.v]);

  const startDrag = useCallback(() => {
    setIsDragging(true);
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    commitColor();
  }, [commitColor]);

  useEffect(() => {
    if (!isDragging) return;
    const handleUp = () => endDrag();
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, endDrag]);

  useEffect(() => {
    if (value !== hex) setHex(value || '#000000');
  }, [value]);

  // Position picker smartly: prefer below, then above; prefer right, then left
  useLayoutEffect(() => {
    if (!isOpen || !pickerRef.current || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const pickerRect = pickerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pW = pickerRect.width;
    const pH = pickerRect.height;

    // Vertical: prefer below trigger, fallback to above
    let top: number;
    const below = triggerRect.bottom + VIEWPORT_MARGIN;
    if (below + pH <= vh - VIEWPORT_MARGIN) {
      top = below;
    } else {
      const above = triggerRect.top - pH - VIEWPORT_MARGIN;
      top = above >= VIEWPORT_MARGIN ? above : VIEWPORT_MARGIN;
    }

    // Horizontal: prefer right of trigger, fallback to left
    let left: number;
    const right = triggerRect.right + VIEWPORT_MARGIN;
    if (right + pW <= vw - VIEWPORT_MARGIN) {
      left = right;
    } else {
      const leftPos = triggerRect.left - pW - VIEWPORT_MARGIN;
      left = leftPos >= VIEWPORT_MARGIN ? leftPos : VIEWPORT_MARGIN;
    }

    setPickerPos({ x: left, y: top });
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (pickerRef.current && !pickerRef.current.contains(target) &&
          triggerRef.current && !triggerRef.current.contains(target)) {
        // Commit any pending drag color before closing
        if (isDragging) {
          commitColor();
        }
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isDragging, commitColor]);

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Trigger circle */}
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) setIsOpen(false);
          else openPicker();
        }}
        className="w-6 h-6 rounded-full cursor-pointer relative shrink-0 group overflow-hidden"
        style={{ background: hex }}
        title={label || hex}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-100 bg-black/30">
          <Pipette className="w-4 h-4 text-white drop-shadow" />
        </div>
      </div>

      {/* Inline input */}
      <input
        type="text"
        value={hex}
        onChange={(e) => {
          const v = e.target.value;
          setHex(v);
          if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
            onChange(v);
          }
        }}
        className="w-24 text-xs font-mono text-text-primary bg-bg-elevated border border-border-default rounded px-2 py-1 h-8"
      />

      {/* Popover */}
      {isOpen && createPortal(
        <div
          ref={pickerRef}
          className="fixed z-[1000] p-3 rounded-xl bg-bg-secondary border border-border-subtle shadow-2xl w-64"
          style={{ left: pickerPos.x, top: pickerPos.y }}
        >
          {/* Saturation/Value box */}
          <div
            className="w-full h-32 rounded-lg mb-3 cursor-crosshair relative overflow-hidden"
            style={{ background: `linear-gradient(to right, #fff, ${rgbToHex(...Object.values(hsvToRgb(hsv.h, 1, 1)) as [number, number, number])})` }}
            onMouseDown={(e) => { startDrag(); handleSatValChange(e); }}
            onMouseMove={(e) => { if (e.buttons === 1) handleSatValChange(e); }}
            onTouchStart={(e) => { startDrag(); handleSatValChange(e); }}
            onTouchMove={(e) => { handleSatValChange(e); }}
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} />
            {/* Thumb */}
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }}
            />
          </div>

          {/* Hue slider */}
          <div
            className="w-full h-3 rounded-full cursor-pointer relative mb-3"
            style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
            onMouseDown={(e) => { startDrag(); handleHueChange(e); }}
            onMouseMove={(e) => { if (e.buttons === 1) handleHueChange(e); }}
            onTouchStart={(e) => { startDrag(); handleHueChange(e); }}
            onTouchMove={(e) => { handleHueChange(e); }}
          >
            <div
              className="absolute w-3 h-4 rounded border-2 border-white shadow-md top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h}, 100%, 50%)` }}
            />
          </div>

          {/* Palette */}
          <div className="grid grid-cols-8 gap-1 mb-3">
            {DEFAULT_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setHex(c);
                  onChange(c);
                }}
                className="w-6 h-6 rounded-full border border-border-subtle/50 hover:border-accent hover:scale-110 transition-transform cursor-pointer"
                style={{ background: c }}
              />
            ))}
          </div>

          {/* Close */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (isDragging) commitColor();
                setIsOpen(false);
              }}
              className="text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Закрыть
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
