"use client";
import { useEffect, useRef, useState } from "react";
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
}: {
  code: JavaSource;
  step: DebugStep;
  status: string;
  breakpoints: readonly number[];
  onBreakpoint: (line: number) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const parent = viewport.current;
    const line = parent?.querySelector<HTMLElement>(
      `[data-line="${step.activeLines[0]}"]`,
    );
    if (parent && line)
      parent.scrollTop = Math.max(
        0,
        line.offsetTop - parent.clientHeight / 2 + 16,
      );
  }, [step.activeLines]);
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
    a.download = "Demo.java";
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
          <span>Demo.java</span>
          <span className="file-dot" />
        </div>
        <div>
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
            title="Download Demo.java"
            aria-label="Download Java code"
            onClick={download}
          >
            <Download size={15} />
          </Button>
          <span className="java-badge">JAVA 21</span>
        </div>
      </div>
      <div className="editor-breadcrumb">
        Demo <ChevronRight size={12} /> main(String[] args){" "}
        <span>read-only</span>
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
