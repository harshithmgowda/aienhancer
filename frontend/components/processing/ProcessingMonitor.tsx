"use client";

import React from "react";
import { Activity, Clock, Cpu, Film, Flame, AlertCircle, CheckCircle2, XCircle, ArrowRight, StopCircle } from "lucide-react";
import { JobRecord, GPUSystemInfo } from "../../types";
import { formatTimeSeconds } from "../../lib/utils";

interface ProcessingMonitorProps {
  job: JobRecord;
  gpuInfo?: GPUSystemInfo | null;
  onCancelJob: () => void;
  onViewComparison: () => void;
}

export const ProcessingMonitor: React.FC<ProcessingMonitorProps> = ({
  job,
  gpuInfo,
  onCancelJob,
  onViewComparison,
}) => {
  const isCompleted = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";
  const isCancelled = job.status === "CANCELLED";
  const isProcessing = ["INITIALIZING", "PROCESSING", "ENCODING", "QUEUED"].includes(job.status);
  const isImage = job.settings?.media_type === "image" || job.input_metadata?.media_type === "image";

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm shadow-slate-100 space-y-7">
      {/* Header status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isCompleted
                  ? "bg-emerald-500"
                  : isFailed
                  ? "bg-rose-500"
                  : isCancelled
                  ? "bg-amber-500"
                  : "bg-violet-600 animate-ping"
              }`}
            />
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {job.stage}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            File: <span className="font-semibold text-slate-700">{job.original_filename}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isProcessing && (
            <button
              onClick={onCancelJob}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              Cancel Job
            </button>
          )}

          {isCompleted && (
            <button
              onClick={onViewComparison}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:scale-[1.02] transition-all"
            >
              <span>{isImage ? "View & Compare Enhanced Image" : "View & Compare 4K Result"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline text-xs">
          <span className="font-semibold text-slate-700">
            {isCompleted
              ? "100% Enhancement Completed"
              : isFailed
              ? "Processing Failed"
              : `${job.progress}% Processed`}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {isImage ? (
              <span>GPU AI Image Upscale</span>
            ) : job.current_frame > 0 && job.total_frames > 0 ? (
              <>Frame {job.current_frame} of {job.total_frames}</>
            ) : null}
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : isFailed
                ? "bg-rose-500"
                : isCancelled
                ? "bg-amber-500"
                : "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(isProcessing ? 4 : 0, job.progress))}%` }}
          />
        </div>
      </div>

      {/* Real telemetry metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Elapsed Time</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {formatTimeSeconds(job.elapsed_seconds)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Remaining (ETA)</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {isCompleted
              ? "0s"
              : job.eta_seconds !== null && job.eta_seconds > 0
              ? formatTimeSeconds(job.eta_seconds)
              : "Estimating..."}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Inference Speed</span>
            <Film className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {job.fps > 0 ? `${job.fps} FPS` : "-- FPS"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>GPU Load / Temp</span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">
            {gpuInfo ? `${gpuInfo.gpu_utilization_pct}% · ${gpuInfo.temperature_c}°C` : "--"}
          </div>
        </div>
      </div>

      {/* GPU Memory Real Gauge Card */}
      {gpuInfo && (
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-violet-50/30 to-indigo-50/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                {gpuInfo.name}
              </div>
              <div className="text-[11px] text-slate-500">
                Driver {gpuInfo.driver_version} · Vulkan FP16/INT8 Acceleration Active
              </div>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-slate-500 font-medium">
              VRAM Allocation:{" "}
              <span className="font-bold text-slate-900">
                {Math.round(gpuInfo.memory_used_mb)} MB / {Math.round(gpuInfo.memory_total_mb)} MB
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {Math.round(gpuInfo.memory_free_mb)} MB Available
            </div>
          </div>
        </div>
      )}

      {/* Error message display if failed */}
      {job.error_message && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block">Engine Report:</span>
            {job.error_message}
          </div>
        </div>
      )}
    </div>
  );
};

