"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Highlight, themes } from "prism-react-renderer";
import Prism from "prismjs";
import "prismjs/components/prism-java";
import { Check, ChevronRight, Code2, Copy, Download } from "lucide-react";
import type { DebugStep, JavaSource } from "@/engine/types";
import { Button } from "./ui/button";
export function CodeEditor({
  code,
  step,
  status,
  breakpoints,
  onBreakpoint,
  viewKey,
  fileName = "Demo.java",
  methodName = "main(String[] args)",
  displayControls,
}: {
  code: JavaSource;
  step: Pick<DebugStep, "activeLines">;
  status: string;
  breakpoints: readonly number[];
  onBreakpoint: (line: number) => void;
  viewKey?: string;
  fileName?: string;
  methodName?: string;
  displayControls?: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const parent = viewport.current;
    const line = parent?.querySelector<HTMLElement>(
      `[data-line="${step.activeLines[0]}"]`,
    );
    if (!parent || !line) return;
    const align = () => {
      const top =
        line.getBoundingClientRect().top -
        parent.getBoundingClientRect().top +
        parent.scrollTop;
      parent.scrollTop = Math.max(
        0,
        top - Math.max(0, (parent.clientHeight - line.offsetHeight) / 2),
      );
    };
    align();
    const frame = requestAnimationFrame(align);
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(align) : null;
    observer?.observe(parent);
    const content = parent.querySelector("pre");
    if (content) observer?.observe(content);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [step.activeLines, code.text, viewKey]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([code.text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="code-panel" aria-label="Java Code Editor">
      <div className="code-topbar">
        <div>
          <span className="file-icon">
            <Code2 size={15} />
          </span>
          <span>{fileName}</span>
          <span className="file-dot" />
        </div>
        <div>
          {displayControls}
          <Button
            size="icon"
            variant="ghost"
            title={copied ? "Đã sao chép" : "Copy Java code"}
            aria-label="Copy Java code"
            onClick={copy}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={`Download ${fileName}`}
            aria-label="Download Java code"
            onClick={download}
          >
            <Download size={15} />
          </Button>
          <span className="java-badge">JAVA 21</span>
        </div>
      </div>
      <div className="editor-breadcrumb">
        {fileName.replace(/\.java$/, "")} <ChevronRight size={12} />{" "}
        {methodName} <span>read-only</span>
      </div>
      <div
        className="code-scroll"
        ref={viewport}
        tabIndex={0}
        aria-label="Java source, scroll để xem toàn bộ code"
      >
        <Highlight
          prism={Prism}
          theme={themes.nightOwl}
          code={code.text}
          language="java"
        >
          {({ tokens, getTokenProps }) => (
            <pre>
              <code>
                {tokens.map((line, i) => (
                  <div
                    key={`line-${i}`}
                    data-line={i + 1}
                    className={`code-line ${step.activeLines.includes(i + 1) ? "executing" : ""}`}
                  >
                    <button
                      className={`gutter ${breakpoints.includes(i + 1) ? "has-breakpoint" : ""}`}
                      aria-label={`Breakpoint dòng ${i + 1}`}
                      aria-pressed={breakpoints.includes(i + 1)}
                      onClick={() => onBreakpoint(i + 1)}
                    >
                      <span className="breakpoint" />
                      {step.activeLines.includes(i + 1) ? (
                        <ChevronRight size={13} />
                      ) : null}
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    </button>
                    <span className="source-line">
                      {line.map((token, key) => {
                        const props = getTokenProps({ token });
                        return (
                          <span
                            key={`token-${key}`}
                            className={props.className}
                            style={props.style}
                          >
                            {token.content}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
      <div className="code-status">
        <span>
          <i />
          {status.toUpperCase()} <b>LINE {step.activeLines.join(", ")}</b>
        </span>
        <span>
          UTF-8 <span>Java</span>
        </span>
      </div>
    </section>
  );
}
