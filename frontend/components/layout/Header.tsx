"use client";

import React from "react";
import { Activity, ShieldCheck, Zap } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  isBackendConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  isBackendConnected,
}) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-sm text-slate-500 font-normal mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/80 text-xs font-medium text-slate-700">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>NVENC Hardware Accel</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/80 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendConnected ? "bg-emerald-500" : "bg-rose-500 animate-ping"
            }`}
          />
          <span className="text-slate-700">
            {isBackendConnected ? "Local Engine Ready" : "Connecting..."}
          </span>
        </div>
      </div>
    </header>
  );
};

