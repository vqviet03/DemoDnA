"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Layers3 } from "lucide-react";
import type { TreeRun, TreeStep } from "@/problems/tree/types";
import { treeTopology, layoutTree } from "@/problems/tree/layout";
export function TreeBoard({
  run,
  step,
  duration,
  zoom,
  onNode,
}: {
  run: TreeRun;
  step: TreeStep;
  duration: number;
  zoom: number;
  onNode: (id: number) => void;
}) {
  const topology = useMemo(() => treeTopology(run.test), [run.test]),
    scene = step.scene;
  const ids = scene.nodes.map((n) => n.id),
    key = ids.join(",");
  const layout = useMemo(
    () => layoutTree(topology, key.split(",").map(Number)),
    [topology, key],
  );
  const fit =
    run.test.n <= 15 &&
    layout.width <= 900 &&
    layout.height <= 600 &&
    zoom === 1;
  const viewport = useRef<HTMLDivElement>(null);
  const point = scene.neighbor ?? scene.current ?? run.focusNode;
  useEffect(() => {
    const box = viewport.current,
      p = layout.points.get(point);
    if (!box || !p || fit) return;
    const x = p.x * zoom,
      y = p.y * zoom;
    if (x - 32 < box.scrollLeft || x + 32 > box.scrollLeft + box.clientWidth)
      box.scrollLeft = Math.max(0, x - box.clientWidth / 2);
    if (y - 35 < box.scrollTop || y + 35 > box.scrollTop + box.clientHeight)
      box.scrollTop = Math.max(0, y - box.clientHeight / 2);
  }, [point, layout, zoom, fit]);
  const cursor = scene.current ? layout.points.get(scene.current) : null;
  return (
    <div className="tl-tree-stage">
      <div className="pl-scene-heading">
        <span>
          <b>Cây gốc 1</b> · N = {run.test.n} · {scene.loadedEdges}/
          {run.test.n - 1} cạnh đã đọc
        </span>
        <span>
          {ids.length < run.test.n
            ? `Cửa sổ ${ids.length}/${run.test.n} nút`
            : "Cha → con"}
        </span>
      </div>
      <div className="tl-tree-viewport" ref={viewport}>
        <svg
          width={layout.width * zoom}
          height={layout.height * zoom}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-label="Cây cha con đang chạy"
          className={`tl-tree-svg ${fit ? "tl-tree-fit" : ""}`}
        >
          <defs>
            <marker
              id="tl-edge-arrow"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L6,3 L0,6" fill="context-stroke" />
            </marker>
          </defs>
          {run.test.edges.map(([u, v], i) => {
            const a = layout.points.get(u),
              b = layout.points.get(v);
            if (!a || !b) return null;
            const active =
                scene.activeEdge?.[0] === u && scene.activeEdge?.[1] === v,
              loaded = i < scene.loadedEdges;
            const d = `M${a.x},${a.y + 24} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y - 26}`;
            return (
              <g
                key={`${u}-${v}`}
                data-tree-edge={`${u}-${v}`}
                data-edge-loaded={loaded}
                data-edge-active={active}
              >
                <path d={d} className="tl-ghost-edge" />
                <motion.path
                  d={d}
                  initial={false}
                  animate={{ pathLength: loaded ? 1 : 0 }}
                  transition={{ duration }}
                  className={`tl-edge ${active ? "tl-edge-active" : ""}`}
                  markerEnd="url(#tl-edge-arrow)"
                />
              </g>
            );
          })}
          {scene.nodes.map((node) => {
            const p = layout.points.get(node.id)!;
            const current = node.id === scene.current,
              neighbor = node.id === scene.neighbor,
              target = node.id === scene.queryNode;
            const known =
              scene.phase !== "input" ||
              node.id === 1 ||
              topology.incident[node.id] < scene.loadedEdges;
            return (
              <g
                key={node.id}
                transform={`translate(${p.x},${p.y})`}
                className={`tl-node tl-node-${node.mark} ${current ? "tl-node-current" : ""} ${neighbor ? "tl-node-neighbor" : ""}`}
                data-tree-node={node.id}
                data-node-mark={node.mark}
                data-node-current={current}
                role="button"
                tabIndex={0}
                aria-label={`Phân tích nút ${node.id}`}
                onClick={() => onNode(node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.code === "Space") {
                    e.preventDefault();
                    e.stopPropagation();
                    onNode(node.id);
                  }
                }}
              >
                <motion.circle
                  r={24}
                  initial={false}
                  animate={{ opacity: known ? 1 : 0.4 }}
                  transition={{ duration: 0.2 }}
                  className="tl-node-body"
                />
                {target && <circle r="30" className="tl-query-ring" />}
                {node.id === 1 && (
                  <text textAnchor="middle" y="-32" className="tl-root-label">
                    ROOT
                  </text>
                )}
                <text
                  textAnchor="middle"
                  y="5"
                  className={`tl-node-text ${node.id > 999 ? "tl-node-small-text" : ""}`}
                >
                  {node.id}
                </text>
                {run.problem === "depth" && (
                  <text textAnchor="middle" y="43" className="tl-depth-label">
                    {node.depth < 0 ? "d = ?" : `d = ${node.depth}`}
                  </text>
                )}
                {run.problem === "leaves" && node.mark === "leaf" && (
                  <text textAnchor="middle" y="40" className="tl-leaf-label">
                    LEAF
                  </text>
                )}
              </g>
            );
          })}
          {cursor && (
            <motion.circle
              className="tl-current-ring"
              r={29}
              initial={false}
              animate={{ cx: cursor.x, cy: cursor.y }}
              transition={{ duration, ease: [0.4, 0, 0.2, 1] }}
            />
          )}
        </svg>
      </div>
      <div className="tl-legend">
        <span>
          <i className="tl-blue" />
          Current
        </span>
        <span>
          <i className="tl-purple" />
          Đang chờ
        </span>
        <span>
          <i className="tl-green" />
          Leaf / xong
        </span>
        <span>
          <i className="tl-amber" />
          Con / query
        </span>
        <small>
          Cạnh mờ: đề gốc, chưa lưu · vị trí hình không phải địa chỉ heap
        </small>
      </div>
    </div>
  );
}
export function TreeMemory({
  run,
  step,
  duration,
}: {
  run: TreeRun;
  step: TreeStep;
  duration: number;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    s = step.scene;
  const primary =
    run.method === "degree"
      ? "degree"
      : run.method === "parents-set"
        ? "parents"
        : run.method === "parent-walk" || run.method === "memo-depth"
          ? "parent"
          : "children";
  const tab = selected ?? (s.phase === "input" ? "edges" : primary);
  const tabs = [
    "edges",
    primary,
    ...(run.problem === "depth" && run.method !== "parent-walk"
      ? ["depth"]
      : []),
  ];
  return (
    <section className="gl-panel tl-memory">
      <div className="tl-memory-tabs">
        {tabs.map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setSelected(name)}
          >
            {name}
            {name === "children"
              ? "[][]"
              : name === "parents"
                ? " (Set)"
                : "[]"}
          </button>
        ))}
        <span>
          {s.phase === "output" ? "snapshot sau return" : "live memory"}
        </span>
      </div>
      <div className="tl-table-scroll">
        {tab === "edges" ? (
          <table className="tl-data-table" aria-label="Edge List trong Java">
            <thead>
              <tr>
                <th>i</th>
                <th>u · cha</th>
                <th>v · con</th>
              </tr>
            </thead>
            <tbody>
              {s.edgeRows.map((row, i) => (
                <tr
                  key={s.edgeWindowStart + i}
                  className={
                    s.edgeWindowStart + i === s.loadedEdges - 1
                      ? "tl-table-active"
                      : ""
                  }
                >
                  <th>{s.edgeWindowStart + i}</th>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "parents" ? (
          <div className="tl-parent-set">
            <strong>parents.size() = {s.parentSetSize}</strong>
            <div>
              {s.parentsPreview.map((id) => (
                <motion.span
                  key={id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration }}
                >
                  {id}
                </motion.span>
              ))}
            </div>
            <p>
              N − size = {run.test.n} − {s.parentSetSize}
              {step.marker === "setReturn" || s.phase === "output"
                ? ` = ${s.leafCount}`
                : " (chỉ kết luận khi đã đọc đủ cạnh)"}
            </p>
          </div>
        ) : (
          <table className="tl-data-table" aria-label={`Bộ nhớ ${tab}`}>
            <thead>
              <tr>
                <th>ID</th>
                <th>{tab}[ID]</th>
              </tr>
            </thead>
            <tbody>
              {s.nodes.map((node) => (
                <tr
                  key={node.id}
                  className={
                    node.id === s.current || node.id === s.neighbor
                      ? "tl-table-active"
                      : ""
                  }
                >
                  <th>{node.id}</th>
                  <td>
                    {tab === "children"
                      ? node.childCount < 0
                        ? "chưa cấp phát"
                        : `[${node.children.join(", ")}${node.childCount > node.children.length ? ", …" : ""}] · ${node.childCount} con`
                      : tab === "degree"
                        ? node.degree < 0
                          ? "chưa cấp phát"
                          : node.degree
                        : tab === "depth"
                          ? node.depth < 0
                            ? "−1 · chưa biết"
                            : node.depth
                          : node.parent < 0
                            ? "chưa cấp phát"
                            : node.parent === 0
                              ? node.id === 1
                                ? "0 · root"
                                : "0 · chưa lưu"
                              : node.parent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="tl-frontier">
        <div>
          <b>
            {s.frontierKind === "queue"
              ? "QUEUE · FRONT → REAR"
              : s.frontierKind === "path"
                ? "PATH STACK · TOP → BOTTOM"
                : s.frontierKind === "stack"
                  ? "STACK · TOP → BOTTOM"
                  : "Bộ nhớ chờ"}
          </b>
          <span>{s.frontierSize} nút</span>
        </div>
        <div
          className={`tl-frontier-items ${s.frontierKind === "queue" ? "tl-queue" : "tl-stack"}`}
          aria-label="Bộ nhớ chờ cây"
        >
          <AnimatePresence initial={false}>
            {s.frontier.map((id, i) => (
              <motion.span
                layout
                key={id}
                initial={{
                  opacity: 0,
                  x: s.frontierKind === "queue" ? 24 : 0,
                  y: s.frontierKind === "queue" ? 0 : -18,
                }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration }}
                data-frontier-node={id}
              >
                {i === 0 && (
                  <small>{s.frontierKind === "queue" ? "FRONT" : "TOP"}</small>
                )}
                {id}
              </motion.span>
            ))}
          </AnimatePresence>
          {s.frontierSize === 0 && (
            <small>
              Rỗng
              {!s.frontierKind ? " · cách giải này không dùng Queue/Stack" : ""}
            </small>
          )}
          {s.frontierSize > s.frontier.length && (
            <small>
              +{s.frontierSize - s.frontier.length} nút chưa hiển thị
            </small>
          )}
        </div>
      </div>
    </section>
  );
}
export function TreeQueryResults({
  run,
  step,
  expected,
  onQuery,
}: {
  run: TreeRun;
  step: TreeStep;
  expected: readonly number[];
  onQuery: (index: number) => void;
}) {
  const s = step.scene;
  return (
    <section className="gl-panel tl-query-panel">
      <div className="gl-panel-title">
        <Layers3 size={14} />
        <b>
          {run.problem === "leaves"
            ? "Leaf & kết quả"
            : "Query · Expected / Đã tính"}
        </b>
      </div>
      {run.problem === "leaves" ? (
        <div className="tl-leaf-counter">
          <small>Số leaf đã xác định</small>
          <strong data-testid="tree-leaf-count">{s.leafCount}</strong>
          <p>
            {s.nodes
              .filter((n) => n.mark === "leaf")
              .map((n) => n.id)
              .join(", ") || "Chưa kết luận nút lá"}
          </p>
          <small>
            {run.test.n > 63
              ? "ID trong cửa sổ đang xem"
              : "Cây một nút: root cũng là leaf"}
          </small>
        </div>
      ) : (
        <div className="tl-table-scroll">
          <table className="tl-data-table" aria-label="Kết quả truy vấn độ sâu">
            <thead>
              <tr>
                <th>Q / x</th>
                <th>Expected</th>
                <th>Đã tính</th>
              </tr>
            </thead>
            <tbody>
              {s.answers.map((value, j) => {
                const i = j + s.answersStart;
                return (
                  <tr
                    key={i}
                    className={i === s.queryIndex ? "tl-table-active" : ""}
                  >
                    <th>
                      <button onClick={() => onQuery(i)}>
                        #{i + 1} · {run.test.queries[i]}
                      </button>
                    </th>
                    <td>{expected[i]}</td>
                    <td
                      data-tree-query={i}
                      className={
                        value === null
                          ? ""
                          : value === expected[i]
                            ? "pl-pass"
                            : "pl-fail"
                      }
                    >
                      {value === null
                        ? "—"
                        : `${value} ${value === expected[i] ? "✓" : "≠"}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="pl-output-line">
        <small>
          {s.output ? "Console đã println" : "Đáp án tính được ≠ đã in"}
        </small>
        <code data-testid="tree-output" title={s.output ?? undefined}>
          {s.output ?? "Chưa println"}
        </code>
      </div>
    </section>
  );
}
