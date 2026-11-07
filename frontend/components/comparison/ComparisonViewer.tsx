"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Download, Maximize2, Columns, Split, ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { JobRecord } from "../../types";
import { getDownloadUrl, getFullMediaUrl } from "../../lib/api";
import confetti from "canvas-confetti";

interface ComparisonViewerProps {
  job: JobRecord;
  onBack: () => void;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({ job, onBack }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [viewMode, setViewMode] = useState<"split" | "side-by-side">("split");
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoOriginalRef = useRef<HTMLVideoElement>(null);
  const videoEnhancedRef = useRef<HTMLVideoElement>(null);

  const originalPath =
    job.video_url ||
    (job.input_path ? `/storage/uploads/${job.input_path.split(/[\\/]/).pop()}` : null);
  const originalUrl = getFullMediaUrl(originalPath);

  const enhancedPath =
    job.enhanced_video_url ||
    (job.output_path
      ? `/storage/outputs/${job.output_path.split(/[\\/]/).pop()}`
      : job.status === "COMPLETED"
        ? `/storage/outputs/${job.id}_enhanced.mp4`
        : null);
  const enhancedUrl = getFullMediaUrl(enhancedPath);

  // Trigger celebration on mount
  useEffect(() => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
  }, []);

  // Synchronized playback controls
  const togglePlay = () => {
    if (isPlaying) {
      videoOriginalRef.current?.pause();
      videoEnhancedRef.current?.pause();
      setIsPlaying(false);
    } else {
      videoOriginalRef.current?.play().catch(() => {});
      videoEnhancedRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoOriginalRef.current) videoOriginalRef.current.muted = true; // prevent audio echo
    if (videoEnhancedRef.current) videoEnhancedRef.current.muted = nextMuted;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoEnhancedRef.current) {
      setCurrentTime(videoEnhancedRef.current.currentTime);
      if (!duration && videoEnhancedRef.current.duration) {
        setDuration(videoEnhancedRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoOriginalRef.current) videoOriginalRef.current.currentTime = time;
    if (videoEnhancedRef.current) videoEnhancedRef.current.currentTime = time;
  };

  const handleRestart = () => {
    if (videoOriginalRef.current) videoOriginalRef.current.currentTime = 0;
    if (videoEnhancedRef.current) videoEnhancedRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  // Drag divider logic
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const origMeta = job.input_metadata;
  const enhMeta = job.output_metadata;

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Enhancement</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Mode switch */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${viewMode === "split"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split Slider</span>
            </button>
            <button
              onClick={() => setViewMode("side-by-side")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${viewMode === "side-by-side"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Download Button */}
          <a
            href={getDownloadUrl(job.id)}
            download
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:scale-[1.02] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download 4K Video</span>
          </a>
        </div>
      </div>

      {/* Comparison Container */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-100">
        {viewMode === "split" ? (
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black select-none cursor-ew-resize border border-slate-200/60 shadow-inner"
          >
            {/* Enhanced Video (Background Layer) */}
            {enhancedUrl ? (
              <video
                ref={videoEnhancedRef}
                src={enhancedUrl}
                onTimeUpdate={handleTimeUpdate}
                playsInline
                loop
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                Enhanced video stream not yet available
              </div>
            )}

            {/* Original Video (Clipped Foreground Layer) */}
            {originalUrl && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${sliderPos}%` }}
              >
                <video
                  ref={videoOriginalRef}
                  src={originalUrl}
                  playsInline
                  loop
                  className="absolute inset-0 w-full h-full object-contain max-w-none"
                  style={{
                    width: containerRef.current?.clientWidth || "100%",
                    height: containerRef.current?.clientHeight || "100%"
                  }}
                />
              </div>
            )}

            {/* Vertical Slider Bar */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-10 flex items-center justify-center cursor-ew-resize"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={handleMouseDown}
            >
              <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center font-bold text-xs border border-slate-300">
                ↔
              </div>
            </div>

            {/* Floating Labels */}
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Original ({origMeta?.display_width}×{origMeta?.display_height})</span>
            </div>

            <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-xl bg-violet-600/80 backdrop-blur-md text-white text-xs font-bold border border-violet-400/30 flex items-center gap-1.5 pointer-events-none shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Enhanced AI ({enhMeta?.display_width}×{enhMeta?.display_height})</span>
            </div>
          </div>
        ) : (
          /* Side-by-Side View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>Original Source</span>
                <span className="text-slate-400">{origMeta?.display_width}×{origMeta?.display_height}</span>
              </div>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-200 flex items-center justify-center">
                {originalUrl ? (
                  <video
                    ref={videoOriginalRef}
                    src={originalUrl}
                    playsInline
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-500 text-xs">Original video not available</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-violet-700 px-1">
                <span>Real-ESRGAN Enhanced</span>
                <span className="text-violet-600">{enhMeta?.display_width}×{enhMeta?.display_height} UHD</span>
              </div>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-violet-200 shadow-sm flex items-center justify-center">
                {enhancedUrl ? (
                  <video
                    ref={videoEnhancedRef}
                    src={enhancedUrl}
                    onTimeUpdate={handleTimeUpdate}
                    playsInline
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-500 text-xs">Enhanced video not available</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Synchronized Player Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors shadow-sm"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>
            <button
              onClick={handleRestart}
              className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Scrubber */}
          <div className="flex-1 w-full flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration || 10}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-violet-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-500 w-16 text-right">
              {Math.round(currentTime)}s / {Math.round(duration)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

