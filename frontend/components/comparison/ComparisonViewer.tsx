"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Maximize2,
  Columns,
  Split,
  ArrowLeft,
  Volume2,
  VolumeX,
  Camera,
  Search,
  Sparkles,
  Zap,
  Palette
} from "lucide-react";
import { JobRecord } from "../../types";
import { getDownloadUrl, getOriginalDownloadUrl, getFullMediaUrl } from "../../lib/api";
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

  // Extraordinary Features State
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [loupeActive, setLoupeActive] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  const [loupePos, setLoupePos] = useState({ clientX: 0, clientY: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const videoOriginalRef = useRef<HTMLVideoElement>(null);
  const videoEnhancedRef = useRef<HTMLVideoElement>(null);
  const loupeOrigRef = useRef<HTMLVideoElement>(null);
  const loupeEnhRef = useRef<HTMLVideoElement>(null);

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

  // Trigger celebration confetti on mount
  useEffect(() => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
  }, []);

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Synchronized playback controls
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      videoOriginalRef.current?.pause();
      videoEnhancedRef.current?.pause();
      loupeOrigRef.current?.pause();
      loupeEnhRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (videoOriginalRef.current) {
        videoOriginalRef.current.muted = true;
        videoOriginalRef.current.play().catch((err) => console.warn("Original video play blocked:", err));
      }
      if (videoEnhancedRef.current) {
        videoEnhancedRef.current.play().catch((err) => console.warn("Enhanced video play blocked:", err));
      }
      loupeOrigRef.current?.play().catch(() => {});
      loupeEnhRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoOriginalRef.current) videoOriginalRef.current.muted = true; // prevent echo
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
      const cur = videoEnhancedRef.current.currentTime;
      setCurrentTime(cur);
      if (!duration && videoEnhancedRef.current.duration) {
        setDuration(videoEnhancedRef.current.duration);
      }
      // Keep original video tightly synchronized
      if (videoOriginalRef.current && Math.abs(videoOriginalRef.current.currentTime - cur) > 0.15) {
        videoOriginalRef.current.currentTime = cur;
      }
      // Sync loupe video currentTime if drifting
      if (loupeEnhRef.current && Math.abs(loupeEnhRef.current.currentTime - cur) > 0.1) {
        loupeEnhRef.current.currentTime = cur;
      }
      if (loupeOrigRef.current && Math.abs(loupeOrigRef.current.currentTime - cur) > 0.1) {
        loupeOrigRef.current.currentTime = cur;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoOriginalRef.current) videoOriginalRef.current.currentTime = time;
    if (videoEnhancedRef.current) videoEnhancedRef.current.currentTime = time;
    if (loupeOrigRef.current) loupeOrigRef.current.currentTime = time;
    if (loupeEnhRef.current) loupeEnhRef.current.currentTime = time;
  };

  const handleRestart = () => {
    if (videoOriginalRef.current) videoOriginalRef.current.currentTime = 0;
    if (videoEnhancedRef.current) videoEnhancedRef.current.currentTime = 0;
    if (loupeOrigRef.current) loupeOrigRef.current.currentTime = 0;
    if (loupeEnhRef.current) loupeEnhRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoOriginalRef.current) videoOriginalRef.current.playbackRate = speed;
    if (videoEnhancedRef.current) videoEnhancedRef.current.playbackRate = speed;
    if (loupeOrigRef.current) loupeOrigRef.current.playbackRate = speed;
    if (loupeEnhRef.current) loupeEnhRef.current.playbackRate = speed;
  };

  // 4K Frame Snapshot Grabber
  const captureSnapshot = () => {
    if (!videoEnhancedRef.current) return;
    const vid = videoEnhancedRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = vid.videoWidth || 1920;
    canvas.height = vid.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `pixelforge_${job.id}_frame_${Math.round(currentTime * 10) / 10}s.png`;
    link.click();
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "l" || e.key === "L") {
        setLoupeActive((prev) => !prev);
      } else if (e.key === "g" || e.key === "G") {
        setAmbientGlow((prev) => !prev);
      } else if (e.key === "s" || e.key === "S") {
        setViewMode((prev) => (prev === "split" ? "side-by-side" : "split"));
      } else if (e.code === "ArrowLeft") {
        if (videoEnhancedRef.current) {
          const t = Math.max(0, videoEnhancedRef.current.currentTime - 1);
          handleSeek({ target: { value: t.toString() } } as any);
        }
      } else if (e.code === "ArrowRight") {
        if (videoEnhancedRef.current) {
          const t = Math.min(duration || 100, videoEnhancedRef.current.currentTime + 1);
          handleSeek({ target: { value: t.toString() } } as any);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, duration]);

  // Drag divider & Loupe mouse tracking logic
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(pct);
    }

    if (loupeActive) {
      setLoupePos({ clientX: x, clientY: y });
    }
  };

  const origMeta = job.input_metadata;
  const enhMeta = job.output_metadata;

  // Calculate resolution gain multiplier
  const origPixels = origMeta ? origMeta.display_width * origMeta.display_height : 1;
  const enhPixels = enhMeta ? enhMeta.display_width * enhMeta.display_height : 1;
  const pixelMultiplier = Math.round((enhPixels / origPixels) * 10) / 10;
  const percentGain = Math.round(((enhPixels - origPixels) / origPixels) * 100);

  // Settings parsed
  const jobSettings = job.settings || ({} as any);
  const colorGradeName =
    jobSettings.color_grade === "cinematic_teal_orange"
      ? "Teal & Orange"
      : jobSettings.color_grade === "cyberpunk_vivid"
        ? "Cyberpunk Vivid"
        : jobSettings.color_grade === "golden_hour"
          ? "Golden Hour"
          : jobSettings.color_grade === "anime_radiance"
            ? "Anime Radiance"
            : jobSettings.color_grade === "film_noir"
              ? "Film Noir"
              : "Natural AI";

  return (
    <div className="space-y-6">
      {/* Top action bar & Pro feature toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Transformation highlights */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-[11px] font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>{enhMeta?.display_width}×{enhMeta?.display_height} UHD (+{percentGain > 0 ? percentGain : 300}% detail)</span>
            </span>
            {enhMeta && enhMeta.fps > (origMeta?.fps || 30) && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>{enhMeta.fps} FPS RIFE</span>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>{colorGradeName}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Ambient Glow Toggle */}
          <button
            onClick={() => setAmbientGlow(!ambientGlow)}
            title="Toggle Ambient Cinema Glow backlight (Hotkey: G)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              ambientGlow
                ? "border-violet-300 bg-violet-50 text-violet-800 shadow-sm"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>Ambient Glow</span>
          </button>

          {/* 4x Loupe Toggle */}
          <button
            onClick={() => setLoupeActive(!loupeActive)}
            title="Toggle 4x Pixel Inspection Loupe (Hotkey: L)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              loupeActive
                ? "border-indigo-400 bg-indigo-50 text-indigo-800 shadow-sm ring-1 ring-indigo-400"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-indigo-600" />
            <span>4× Loupe</span>
          </button>

          {/* Capture 4K Still */}
          <button
            onClick={captureSnapshot}
            title="Instant snapshot of current enhanced frame at native resolution"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all"
          >
            <Camera className="w-3.5 h-3.5 text-slate-600" />
            <span>4K Still</span>
          </button>

          {/* Mode switch */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "split"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode("side-by-side")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "side-by-side"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center gap-1.5">
            <a
              href={getDownloadUrl(job.id)}
              download
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              title="Download Enhanced 4K Video"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download 4K</span>
            </a>
            {job.input_path && (
              <a
                href={getOriginalDownloadUrl(job.id)}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition-all"
                title="Download Original Source Video"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Original</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Container with Ambient Glow */}
      <div className="relative">
        {/* Dynamic Ambient Glow Backlight */}
        {ambientGlow && (
          <div
            className="absolute -inset-3 rounded-3xl opacity-35 transition-opacity duration-500 pointer-events-none -z-10 bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400"
            style={{ filter: "blur(48px)" }}
          />
        )}

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-100">
          {viewMode === "split" ? (
            <div
              ref={containerRef}
              onMouseEnter={() => setIsHoveringVideo(true)}
              onMouseLeave={() => {
                setIsHoveringVideo(false);
                handleMouseUp();
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black select-none border border-slate-200/60 shadow-inner ${
                loupeActive ? "cursor-none" : "cursor-ew-resize"
              }`}
            >
              {/* Enhanced Video (Background Layer) */}
              {enhancedUrl ? (
                <video
                  ref={videoEnhancedRef}
                  src={enhancedUrl}
                  onTimeUpdate={handleTimeUpdate}
                  muted={isMuted}
                  playsInline
                  loop
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                  Enhanced video stream not yet available
                </div>
              )}

              {/* Original Video (Clipped Foreground Layer via clip-path) */}
              {originalUrl && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <video
                    ref={videoOriginalRef}
                    src={originalUrl}
                    muted
                    playsInline
                    loop
                    preload="auto"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                </div>
              )}

              {/* Vertical Slider Bar (hidden when loupe is actively hovering) */}
              {!loupeActive && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-10 flex items-center justify-center cursor-ew-resize"
                  style={{ left: `${sliderPos}%` }}
                  onMouseDown={handleMouseDown}
                >
                  <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center font-bold text-xs border border-slate-300">
                    ↔
                  </div>
                </div>
              )}

              {/* Interactive 4x Magnifier Loupe */}
              {loupeActive && isHoveringVideo && containerSize.width > 0 && (
                <div
                  className="absolute pointer-events-none rounded-full border-2 border-white/95 shadow-2xl overflow-hidden ring-4 ring-violet-500/40 z-30 transition-opacity duration-75"
                  style={{
                    width: 220,
                    height: 220,
                    left: loupePos.clientX - 110,
                    top: loupePos.clientY - 110
                  }}
                >
                  {/* Enhanced side (Right half / Full background) */}
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      width: containerSize.width,
                      height: containerSize.height,
                      left: -loupePos.clientX + 110,
                      top: -loupePos.clientY + 110,
                      transform: "scale(3.2)",
                      transformOrigin: `${loupePos.clientX}px ${loupePos.clientY}px`
                    }}
                  >
                    <video
                      ref={loupeEnhRef}
                      src={enhancedUrl || undefined}
                      muted
                      playsInline
                      loop
                      preload="auto"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Original side (Clipped left half) */}
                  <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        width: containerSize.width,
                        height: containerSize.height,
                        left: -loupePos.clientX + 110,
                        top: -loupePos.clientY + 110,
                        transform: "scale(3.2)",
                        transformOrigin: `${loupePos.clientX}px ${loupePos.clientY}px`
                      }}
                    >
                      <video
                        ref={loupeOrigRef}
                        src={originalUrl || undefined}
                        muted
                        playsInline
                        loop
                        preload="auto"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Vertical Hairline Divider & Crosshairs */}
                  <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white shadow-sm" />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/30 pointer-events-none" />
                  <div className="absolute top-2 left-3 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-slate-300">
                    ORIG 3.2×
                  </div>
                  <div className="absolute top-2 right-3 px-1.5 py-0.5 rounded bg-violet-600/90 text-[9px] font-bold text-white shadow">
                    AI 3.2×
                  </div>
                </div>
              )}

              {/* Floating Labels */}
              <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Original ({origMeta?.display_width}×{origMeta?.display_height})</span>
              </div>

              <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-xl bg-violet-600/85 backdrop-blur-md text-white text-xs font-bold border border-violet-400/30 flex items-center gap-1.5 pointer-events-none shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Enhanced ({enhMeta?.display_width}×{enhMeta?.display_height})</span>
              </div>
            </div>
          ) : (
            /* Side-by-Side Dual View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span>Original Footage</span>
                  <span className="text-slate-400">{origMeta?.display_width}×{origMeta?.display_height} • {origMeta?.fps} FPS</span>
                </div>
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-200 flex items-center justify-center">
                  {originalUrl ? (
                    <video
                      ref={videoOriginalRef}
                      src={originalUrl}
                      muted
                      playsInline
                      loop
                      preload="auto"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-500 text-xs">Original video not available</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-violet-700 px-1">
                  <span>AI Super-Resolution ({colorGradeName})</span>
                  <span className="text-violet-600 font-bold">{enhMeta?.display_width}×{enhMeta?.display_height} • {enhMeta?.fps || origMeta?.fps} FPS</span>
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

          {/* Synchronized Player Bar with Slow-Mo & Controls */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                title="Play/Pause (Space)"
                className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 active:scale-95 transition-all shadow-sm shadow-violet-500/20"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>
              <button
                onClick={handleRestart}
                title="Restart from beginning"
                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={toggleMute}
                title="Mute / Unmute"
                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
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
              <span className="text-xs font-medium text-slate-500 w-16 text-right tabular-nums">
                {Math.round(currentTime)}s / {Math.round(duration)}s
              </span>
            </div>

            {/* Cinematic Speed & Slow-Mo Selectors */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden md:inline">Speed:</span>
              {[0.25, 0.5, 1.0, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    playbackSpeed === s
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s === 0.25 ? "0.25× SloMo" : s === 0.5 ? "0.5×" : `${s}×`}
                </button>
              ))}
              <button
                onClick={toggleFullscreen}
                title="Fullscreen"
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all ml-1"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
