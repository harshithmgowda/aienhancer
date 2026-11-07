"use client";

import React, { useState } from "react";
import { Sparkles, Zap, Layers, Sliders, Cpu, Check, HelpCircle } from "lucide-react";
import { EnhancementSettings, VideoMetadata } from "../../types";

interface EnhancementSettingsPanelProps {
  inputMetadata: VideoMetadata;
  settings: EnhancementSettings;
  onChangeSettings: (settings: EnhancementSettings) => void;
  onStartEnhancement: () => void;
  disabled?: boolean;
}

export const EnhancementSettingsPanel: React.FC<EnhancementSettingsPanelProps> = ({
  inputMetadata,
  settings,
  onChangeSettings,
  onStartEnhancement,
  disabled = false,
}) => {
  const isPortrait = inputMetadata.display_height > inputMetadata.display_width;

  const resolutionOptions = [
    {
      id: "1080p",
      label: "1080p",
      sublabel: isPortrait ? "1080 × 1920" : "1920 × 1080",
      desc: "Full HD — Ideal for web and social"
    },
    {
      id: "1440p",
      label: "2K",
      sublabel: isPortrait ? "1440 × 2560" : "2560 × 1440",
      desc: "Quad HD — Crisp display on monitors"
    },
    {
      id: "2160p",
      label: "4K UHD",
      sublabel: isPortrait ? "2160 × 3840" : "3840 × 2160",
      desc: "Ultra HD — Maximum clarity & detail"
    },
    {
      id: "custom",
      label: "Custom",
      sublabel: "Custom dimensions",
      desc: "Specify exact pixel dimensions"
    }
  ];

  const modelOptions = [
    {
      id: "realesrgan-plus",
      name: "Realistic Video",
      badge: "Real-ESRGAN+ (4x)",
      desc: "Deep super-resolution optimized for real-world live video and cinema."
    },
    {
      id: "realesrgan-plus-anime",
      name: "Anime / Animation",
      badge: "Anime (4x)",
      desc: "Sharp outlines and flat color restoration tailored for animated frames."
    },
    {
      id: "realesr-animevideov3",
      name: "Fast Video",
      badge: "Fast v3 (2x-4x)",
      desc: "Ultra-fast video neural network with low VRAM usage and temporal stability."
    },
    {
      id: "auto",
      name: "Auto Detect",
      badge: "Recommended",
      desc: "Selects the optimal model pipeline for your video format."
    }
  ];

  const presetOptions = [
    { id: "fast", label: "Fast", desc: "Lower GPU load" },
    { id: "balanced", label: "Balanced", desc: "Optimal balance" },
    { id: "max", label: "Max Quality", desc: "Preserve fine detail" }
  ];

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm shadow-slate-100 space-y-7">
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-violet-600" />
          AI Enhancement Settings
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure local Vulkan neural network super-resolution and encoding parameters.
        </p>
      </div>

      {/* Target Resolution */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          Target Output Resolution
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {resolutionOptions.map((opt) => {
            const isSelected = settings.target_resolution === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onChangeSettings({ ...settings, target_resolution: opt.id as any })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all duration-150 ${
                  isSelected
                    ? "border-violet-600 bg-violet-50/70 shadow-sm shadow-violet-100"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-sm ${isSelected ? "text-violet-900" : "text-slate-900"}`}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="text-[11px] font-semibold text-violet-700">
                  {opt.sublabel}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom dimensions inputs if selected */}
        {settings.target_resolution === "custom" && (
          <div className="flex items-center gap-3 pt-2">
            <div>
              <label className="text-[11px] font-medium text-slate-500">Width</label>
              <input
                type="number"
                value={settings.custom_width || 1920}
                onChange={(e) =>
                  onChangeSettings({ ...settings, custom_width: parseInt(e.target.value) || 1920 })
                }
                className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
              />
            </div>
            <span className="text-slate-400 mt-4">×</span>
            <div>
              <label className="text-[11px] font-medium text-slate-500">Height</label>
              <input
                type="number"
                value={settings.custom_height || 1080}
                onChange={(e) =>
                  onChangeSettings({ ...settings, custom_height: parseInt(e.target.value) || 1080 })
                }
                className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          AI Neural Model
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modelOptions.map((opt) => {
            const isSelected = settings.model === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeSettings({ ...settings, model: opt.id })}
                className={`p-4 rounded-2xl border text-left transition-all duration-150 ${
                  isSelected
                    ? "border-violet-600 bg-violet-50/70 shadow-sm shadow-violet-100"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-bold text-sm ${isSelected ? "text-violet-900" : "text-slate-900"}`}>
                    {opt.name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality Presets & Codec */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
            Quality Preset
          </label>
          <div className="grid grid-cols-3 gap-2">
            {presetOptions.map((p) => {
              const isSelected = settings.quality_preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, quality_preset: p.id as any })}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? "border-violet-600 bg-violet-50 text-violet-800 font-bold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  } text-xs`}
                >
                  <div>{p.label}</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
            Output Encoding Codec
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, codec: "h264" })}
              className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                settings.codec === "h264"
                  ? "border-violet-600 bg-violet-50 text-violet-800 font-bold"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              }`}
            >
              <div>H.264 (NVENC)</div>
              <div className="text-[10px] text-slate-400 font-normal mt-0.5">Universal compatibility</div>
            </button>
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, codec: "hevc" })}
              className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                settings.codec === "hevc"
                  ? "border-violet-600 bg-violet-50 text-violet-800 font-bold"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              }`}
            >
              <div>H.265 / HEVC</div>
              <div className="text-[10px] text-slate-400 font-normal mt-0.5">Smaller file size</div>
            </button>
          </div>
        </div>
      </div>

      {/* RIFE Frame Interpolation & Audio Preservation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              RIFE AI Frame Interpolation (2× FPS)
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Doubles the video smoothness from {inputMetadata.fps} FPS to {inputMetadata.fps * 2} FPS using optical flow neural estimation.
            </div>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={settings.interpolate_fps}
            onChange={(e) =>
              onChangeSettings({ ...settings, interpolate_fps: e.target.checked })
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
        </label>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <button
          onClick={onStartEnhancement}
          disabled={disabled}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 text-white font-bold text-base shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.005] active:scale-[0.995] transition-all duration-150 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5 text-indigo-200" />
          <span>Enhance Video on RTX 5050 GPU</span>
        </button>
      </div>
    </div>
  );
};

