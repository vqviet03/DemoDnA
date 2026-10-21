"use client";
import { useEffect, useRef } from "react";
import { Monitor, Settings2 } from "lucide-react";
export interface GridDisplay {
  scale: number;
  codeOffset: number;
  memoryShare: number;
  gridZoom: number;
  presentation: boolean;
  wrapCode: boolean;
}
export const DEFAULT_DISPLAY: GridDisplay = {
  scale: 100,
  codeOffset: 0,
  memoryShare: 31,
  gridZoom: 100,
  presentation: false,
  wrapCode: false,
};
export const bound = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export function readDisplay(value: unknown): GridDisplay {
  const object =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const number = (key: string, fallback: number, min: number, max: number) =>
    typeof object[key] === "number" && Number.isFinite(object[key])
      ? bound(object[key] as number, min, max)
      : fallback;
  return {
    scale: number("scale", 100, 90, 160),
    codeOffset: number("codeOffset", 0, -20, 20),
    memoryShare: number("memoryShare", 31, 20, 45),
    gridZoom: number("gridZoom", 100, 100, 200),
    presentation: false,
    wrapCode: object.wrapCode === true,
  };
}
export function GridDisplayControls({
  display,
  onChange,
  onPreset,
}: {
  display: GridDisplay;
  onChange: (patch: Partial<GridDisplay>) => void;
  onPreset: (preset: "compact" | "classroom" | "projector") => void;
}) {
  const popover = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (popover.current?.open && !popover.current.contains(e.target as Node))
        popover.current.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && popover.current?.open) {
        e.stopPropagation();
        popover.current.open = false;
        popover.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <div className="gl-display-controls">
      <div className="gl-font-buttons" aria-label="Cỡ chữ toàn bộ lab">
        <button
          aria-label="Giảm cỡ chữ"
          title="Thu nhỏ chữ"
          disabled={display.scale <= 90}
          onClick={() =>
            onChange({ scale: bound(display.scale - 10, 90, 160) })
          }
        >
          A−
        </button>
        <output aria-label="Mức phóng chữ">{display.scale}%</output>
        <button
          aria-label="Tăng cỡ chữ"
          title="Phóng chữ"
          disabled={display.scale >= 160}
          onClick={() =>
            onChange({ scale: bound(display.scale + 10, 90, 160) })
          }
        >
          A+
        </button>
      </div>
      <details ref={popover} className="gl-display-popover">
        <summary>
          <Settings2 size={14} />
          <span>Kích cỡ</span>
        </summary>
        <div className="gl-display-options">
          <strong>Hiển thị khi giảng bài</strong>
          <div className="gl-display-presets">
            <button onClick={() => onPreset("compact")}>Gọn · 100%</button>
            <button onClick={() => onPreset("classroom")}>
              Giảng dạy · 125%
            </button>
            <button onClick={() => onPreset("projector")}>
              Trình chiếu · 140%
            </button>
          </div>
          <label>
            Cỡ chữ nội dung <b>{display.scale}%</b>
            <input
              aria-label="Cỡ chữ nội dung"
              type="range"
              min="90"
              max="160"
              step="5"
              value={display.scale}
              onChange={(e) => onChange({ scale: Number(e.target.value) })}
            />
          </label>
          <label>
            Bộ nhớ / chiều cao workspace <b>{display.memoryShare}%</b>
            <input
              aria-label="Chiều cao vùng bộ nhớ"
              type="range"
              min="20"
              max="45"
              step="1"
              value={display.memoryShare}
              onChange={(e) =>
                onChange({ memoryShare: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Phóng grid <b>{display.gridZoom}%</b>
            <input
              aria-label="Mức phóng grid"
              type="range"
              min="100"
              max="200"
              step="10"
              value={display.gridZoom}
              onChange={(e) => onChange({ gridZoom: Number(e.target.value) })}
            />
          </label>
          <p>
            Grid 100% vừa khung; khi phóng lớn có thể cuộn bên trong grid. Kéo
            vạch chia để đổi diện tích code; A−/A+ trong editor chỉ đổi chữ
            code. Tùy chỉnh được lưu trên trình duyệt.
          </p>
        </div>
      </details>
      <button
        className="gl-presentation-toggle"
        aria-label={
          display.presentation ? "Thoát trình chiếu Grid" : "Trình chiếu Grid"
        }
        aria-pressed={display.presentation}
        onClick={() => onPreset(display.presentation ? "compact" : "projector")}
      >
        <Monitor size={14} />
        <span>
          {display.presentation ? "Thoát trình chiếu" : "Trình chiếu"}
        </span>
      </button>
    </div>
  );
}
