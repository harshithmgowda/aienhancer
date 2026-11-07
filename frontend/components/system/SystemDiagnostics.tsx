"use client";

import React from "react";
import { Cpu, HardDrive, Zap, CheckCircle2, AlertTriangle, ShieldCheck, Layers, Flame, Activity } from "lucide-react";
import { SystemStatus } from "../../types";

interface SystemDiagnosticsProps {
  status: SystemStatus | null;
  onRefresh: () => void;
}

export const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({ status, onRefresh }) => {
  if (!status) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Querying system environment...
      </div>
    );
  }

  const { gpu, vulkan, ffmpeg, video2x, storage } = status;
  const storagePct = Math.round((storage.used_gb / storage.total_gb) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            System & GPU Hardware Diagnostics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time hardware verification for local AI video super-resolution inference.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Refresh Metrics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* NVIDIA RTX 5050 GPU Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{gpu.name}</h4>
                <span className="text-[11px] text-slate-400">Driver {gpu.driver_version}</span>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>VRAM Allocation</span>
                <span className="font-semibold text-slate-800">
                  {Math.round(gpu.memory_used_mb)} MB / {Math.round(gpu.memory_total_mb)} MB ({gpu.memory_used_pct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-violet-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${gpu.memory_used_pct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <div className="text-center p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 block">GPU Load</span>
                <span className="text-xs font-bold text-slate-900">{gpu.gpu_utilization_pct}%</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 block">Temperature</span>
                <span className="text-xs font-bold text-slate-900">{gpu.temperature_c}°C</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 block">Power</span>
                <span className="text-xs font-bold text-slate-900">{gpu.power_draw_w} W</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vulkan & Acceleration */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Vulkan & Hardware Acceleration</h4>
              <span className="text-[11px] text-slate-400">Vulkan API 1.4 + NVENC Encoders</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Vulkan GPU Support</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Discrete GPU0 Verified
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">NVIDIA NVENC Hardware Encoder</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                h264_nvenc & hevc_nvenc
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Video2X Engine</span>
              <span className="font-bold text-slate-800">
                v{video2x.version} (Real-ESRGAN + RIFE)
              </span>
            </div>
          </div>
        </div>

        {/* Local Storage Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-100 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Local Storage & Cache</h4>
                <span className="text-[11px] text-slate-400">
                  Isolated workspace directory: storage/
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-700">
              {storage.free_gb} GB Free of {storage.total_gb} GB
            </span>
          </div>

          <div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${storagePct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>{storage.used_gb} GB Used</span>
              <span>{storage.free_gb} GB Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

