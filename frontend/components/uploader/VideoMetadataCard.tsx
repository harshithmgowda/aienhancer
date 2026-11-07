"use client";

import React from "react";
import { Film, Image as ImageIcon, Clock, Monitor, Volume2, VolumeX, FileText, ArrowRight, RefreshCw, Palette } from "lucide-react";
import { UploadedVideo } from "../../types";
import { formatBytes, formatDuration } from "../../lib/utils";
import { getFullMediaUrl } from "../../lib/api";

interface VideoMetadataCardProps {
  video: UploadedVideo;
  onReset: () => void;
}

export const VideoMetadataCard: React.FC<VideoMetadataCardProps> = ({ video, onReset }) => {
  const meta = video.metadata;
  const thumbUrl = getFullMediaUrl(video.thumbnail_url);
  const isPortrait = meta.display_height > meta.display_width;
  const isImage = meta.media_type === "image" || meta.duration === 0;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-100">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Poster Frame */}
        <div className="relative w-full md:w-64 h-44 rounded-2xl overflow-hidden bg-slate-900 flex-shrink-0 flex items-center justify-center border border-slate-200/60 shadow-inner">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={video.original_filename}
              className="w-full h-full object-cover"
            />
          ) : isImage ? (
            <ImageIcon className="w-10 h-10 text-slate-500" />
          ) : (
            <Film className="w-10 h-10 text-slate-500" />
          )}
          {meta.duration > 0 && (
            <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-semibold text-white tracking-wide">
              {formatDuration(meta.duration)}
            </span>
          )}
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-violet-600/90 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
            {meta.video_codec.toUpperCase()}
          </span>
        </div>

        {/* Metadata Details */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight line-clamp-1">
                  {video.original_filename}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stream verified by FFprobe {isImage ? "· Static Image" : "· Motion Video"}
                </p>
              </div>

              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change {isImage ? "Image" : "Video"}
              </button>
            </div>

            {/* Grid of badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="text-[11px] text-slate-400 block font-medium">Resolution</span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Monitor className="w-3 h-3 text-violet-500" />
                  {meta.display_width} × {meta.display_height}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {meta.aspect_ratio} {isPortrait ? "(Portrait)" : ""}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {isImage ? "Frame Count" : "Frame Rate"}
                </span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  {isImage ? <ImageIcon className="w-3 h-3 text-indigo-500" /> : <Clock className="w-3 h-3 text-indigo-500" />}
                  {isImage ? "1 Still Frame" : `${meta.fps} FPS`}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {isImage ? "Single high-res image" : `${meta.total_frames} total frames`}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {isImage ? "Color Profile" : "Audio Track"}
                </span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  {isImage ? (
                    <>
                      <Palette className="w-3 h-3 text-emerald-500" />
                      sRGB / 24-bit
                    </>
                  ) : meta.has_audio ? (
                    <>
                      <Volume2 className="w-3 h-3 text-emerald-500" />
                      {meta.audio_codec?.toUpperCase() || "AAC"}
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3 h-3 text-slate-400" />
                      No Audio
                    </>
                  )}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {isImage ? "Direct Vulkan upscale" : meta.has_audio ? "Preserved in output" : "Silent source"}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="text-[11px] text-slate-400 block font-medium">File Size</span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <FileText className="w-3 h-3 text-cyan-500" />
                  {formatBytes(meta.file_size)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {isImage ? meta.video_codec.toUpperCase() : `${Math.round(meta.bitrate / 1000)} kbps`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
