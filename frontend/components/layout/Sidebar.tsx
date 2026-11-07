"use client";

import React from "react";
import { Sparkles, Wand2, Image as ImageIcon, ListVideo, Film, Cpu, HardDrive, CheckCircle2 } from "lucide-react";
import { GPUSystemInfo } from "../../types";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  gpuInfo?: GPUSystemInfo | null;
  activeJobCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  gpuInfo,
  activeJobCount
}) => {
  const navItems = [
    { id: "enhance", label: "Enhance Video", icon: Wand2, badge: null },
    { id: "enhance-image", label: "Enhance Image", icon: ImageIcon, badge: "NEW" },
    { id: "queue", label: "Processing Queue", icon: ListVideo, badge: activeJobCount > 0 ? activeJobCount : null },
    { id: "library", label: "Library & History", icon: Film, badge: null },
    { id: "system", label: "System Status", icon: Cpu, badge: null },
  ];

  const vramPct = gpuInfo?.memory_used_pct ?? 0;
  const vramUsedMB = gpuInfo?.memory_used_mb ?? 0;
  const vramTotalMB = gpuInfo?.memory_total_mb ?? 8151;

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200/80 bg-white/95 backdrop-blur-md flex flex-col justify-between p-5 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-1.5">
              PIXELFORGE
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 tracking-wider">
                AI
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium tracking-tight">
              Local Vulkan Super-Res
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-violet-50 text-violet-700 shadow-sm shadow-violet-100/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-violet-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-600 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* GPU Status Mini-Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Cpu className="w-3.5 h-3.5 text-violet-600" />
            <span>NVIDIA RTX 5050</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Vulkan
          </span>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>VRAM Usage</span>
            <span className="font-medium text-slate-700">
              {Math.round(vramUsedMB)} / {Math.round(vramTotalMB)} MB
            </span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                vramPct > 85 ? "bg-rose-500" : vramPct > 60 ? "bg-amber-500" : "bg-violet-600"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, vramPct))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
          <span>GPU Load</span>
          <span className="font-semibold text-slate-800">
            {gpuInfo?.gpu_utilization_pct ?? 0}%
          </span>
        </div>
      </div>
    </aside>
  );
};

