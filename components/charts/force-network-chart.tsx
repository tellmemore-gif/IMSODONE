"use client";

import { forceCenter, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { useEffect, useMemo, useRef, useState } from "react";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import type { NetworkLink, NetworkNode } from "@/lib/types";

type ForceNode = NetworkNode & { x?: number; y?: number };
type ForceLink = NetworkLink & { source: string | ForceNode; target: string | ForceNode };

const GROUP_COLOR: Record<NetworkNode["group"], string> = {
  donor: "#39ff88",
  aipac: "#ffc857",
  pac: "#34d399",
  spender: "#60a5fa",
  candidate: "#f97316"
};

export default function ForceNetworkChart({
  title,
  subtitle,
  nodes,
  links,
  indirect = true
}: {
  title: string;
  subtitle: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
  indirect?: boolean;
}) {
  const { openEvidence } = useEvidence();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [, setTick] = useState(0);
  const isMobile = containerWidth < 640;
  const width = Math.max(isMobile ? 680 : 900, containerWidth);
  const height = isMobile ? 340 : 420;

  const graph = useMemo(() => {
    const nodeLimit = isMobile ? 55 : 90;
    const linkLimit = isMobile ? 85 : 140;

    const limitedNodes = nodes.slice(0, nodeLimit).map((node) => ({ ...node })) as ForceNode[];
    const nodeIds = new Set(limitedNodes.map((node) => node.id));

    const limitedLinks = links
      .slice(0, linkLimit)
      .filter((link) => {
        if (!Number.isFinite(link.value)) return false;
        return nodeIds.has(link.source) && nodeIds.has(link.target);
      })
      .map((link) => ({ ...link })) as ForceLink[];

    return {
      nodes: limitedNodes,
      links: limitedLinks
    };
  }, [isMobile, links, nodes]);

  const hasData = graph.nodes.length > 0 && graph.links.length > 0;

  useEffect(() => {
    if (!containerRef.current) return;

    if (typeof ResizeObserver === "undefined") {
      const nextWidth = containerRef.current.getBoundingClientRect().width;
      if (nextWidth) setContainerWidth(nextWidth);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (!nextWidth) return;
      setContainerWidth(nextWidth);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (graph.nodes.length === 0 || graph.links.length === 0) return;

    try {
      const simulation = forceSimulation(graph.nodes)
        .force("link", forceLink(graph.links).id((d: any) => d.id).distance(isMobile ? 68 : 90).strength(0.3))
        .force("charge", forceManyBody().strength(isMobile ? -170 : -220))
        .force("center", forceCenter(width / 2, height / 2))
        .on("tick", () => setTick((value) => value + 1));

      return () => {
        simulation.stop();
      };
    } catch (error) {
      console.error("Force network simulation failed:", error);
      return;
    }
  }, [graph.links, graph.nodes, height, isMobile, width]);

  return (
    <ChartShell title={title} subtitle={subtitle} indirect={indirect}>
      {hasData ? (
        <div ref={containerRef} className="rounded border border-border bg-bg">
          {isMobile ? (
            <p className="px-3 pt-2 text-[10px] uppercase tracking-[0.1em] text-muted">Swipe horizontally to explore</p>
          ) : null}
          <div className="h-[340px] overflow-x-auto overflow-y-hidden sm:h-[420px]">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-w-[680px] w-full">
              {graph.links.map((link, index) => {
                const source = typeof link.source === "string" ? graph.nodes.find((node) => node.id === link.source) : link.source;
                const target = typeof link.target === "string" ? graph.nodes.find((node) => node.id === link.target) : link.target;

                if (!source || !target) return null;

                return (
                  <line
                    key={`${source.id}-${target.id}-${link.value}-${index}`}
                    x1={source.x ?? width / 2}
                    y1={source.y ?? height / 2}
                    x2={target.x ?? width / 2}
                    y2={target.y ?? height / 2}
                    stroke="#1f3f31"
                    strokeOpacity={0.8}
                    strokeWidth={Math.max(1, Math.min(4, link.value / 22000))}
                    className="cursor-pointer hover:stroke-neon"
                    onClick={() => openEvidence(link.evidence)}
                  />
                );
              })}

              {graph.nodes.map((node) => (
                <g
                  key={node.id}
                  transform={`translate(${node.x ?? width / 2}, ${node.y ?? height / 2})`}
                  className="cursor-pointer"
                  onClick={() => openEvidence(node.evidence)}
                >
                  <circle
                    r={Math.max(5, Math.min(isMobile ? 13 : 18, node.value / 25000))}
                    fill={GROUP_COLOR[node.group]}
                    fillOpacity={0.9}
                    stroke="#041108"
                    strokeWidth={1.5}
                  />
                  {!isMobile || node.group === "candidate" || node.group === "pac" ? (
                    <text x={8} y={3} className="fill-text text-[10px]" style={{ fontFamily: "monospace" }}>
                      {node.label.slice(0, isMobile ? 16 : 22)}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>
          </div>
        </div>
      ) : (
        <EmptyState />
      )}
    </ChartShell>
  );
}
