"use client";

import React, { useState } from "react";
import { Film, Image as ImageIcon, Download, Trash2, Eye, Clock, CheckCircle2, XCircle, ArrowRight, Sparkles, Filter } from "lucide-react";
import { JobRecord } from "../../types";
import { getDownloadUrl, getOriginalDownloadUrl, getFullMediaUrl } from "../../lib/api";
import { formatBytes, formatDuration } from "../../lib/utils";

interface VideoLibraryProps {
  jobs: JobRecord[];
  onSelectJob: (job: JobRecord) => void;
  onDeleteJob: (jobId: string) => void;
  onNewEnhancement: () => void;
}

export const VideoLibrary: React.FC<VideoLibraryProps> = ({
  jobs,
  onSelectJob,
  onDeleteJob,
  onNewEnhancement,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "video" | "image">("all");

  const isJobImage = (job: JobRecord) => {
    return (
      job.settings?.media_type === "image" ||
      job.input_metadata?.media_type === "image" ||
      /\.(jpg|jpeg|png|webp|bmp)$/i.test(job.original_filename || "")
    );
  };

  const filteredJobs = jobs.filter((job) => {
    if (filterMode === "video") return !isJobImage(job);
    if (filterMode === "image") return isJobImage(job);
    return true;
  });

  const videoCount = jobs.filter((j) => !isJobImage(j)).length;
  const imageCount = jobs.filter((j) => isJobImage(j)).length;

  const formatDisplayTitle = (name: string) => {
    // Check if filename is a raw UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    if (uuidRegex.test(name)) {
      const ext = name.split(".").pop();
      return `Media Clip #${name.slice(0, 8)}.${ext}`;
    }
    return name;
  };

  if (jobs.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center max-w-lg mx-auto shadow-sm shadow-slate-100">
        <div className="w-16 h-16 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          No enhanced media yet
        </h3>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Upload any video or photo to upscale and enhance it locally on your RTX 5050 GPU.
        </p>
        <button
          onClick={onNewEnhancement}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-500/20 hover:scale-[1.02] transition-all"
        >
          Enhance Your First File
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Media Library & History ({jobs.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, compare, and export your locally enhanced videos and images
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 self-start sm:self-auto">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({jobs.length})
          </button>
          <button
            onClick={() => setFilterMode("video")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === "video"
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Videos ({videoCount})</span>
          </button>
          <button
            onClick={() => setFilterMode("image")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === "image"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Images ({imageCount})</span>
          </button>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-slate-500 text-sm">
          No {filterMode === "video" ? "videos" : "images"} found in your history.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => {
            const isImage = isJobImage(job);
            const thumbUrl =
              getFullMediaUrl(job.thumbnail_url) ||
              (isImage && job.enhanced_video_url ? getFullMediaUrl(job.enhanced_video_url) : null) ||
              (isImage && job.video_url ? getFullMediaUrl(job.video_url) : null);
            const isCompleted = job.status === "COMPLETED";
            const inMeta = job.input_metadata;
            const outMeta = job.output_metadata;

            return (
              <div
                key={job.id}
                className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Poster image / Thumbnail */}
                  <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={job.original_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : isImage ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900 text-indigo-400">
                        <ImageIcon className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-300">Image Asset</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-slate-600">
                        <Film className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Video Asset</span>
                      </div>
                    )}

                    {/* Media Type Tag (Top Right) */}
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
                      {isImage ? <ImageIcon className="w-3 h-3 text-indigo-400" /> : <Film className="w-3 h-3 text-violet-400" />}
                      <span>{isImage ? "IMAGE" : "VIDEO"}</span>
                    </span>

                    {/* Duration (Only for videos) */}
                    {!isImage && inMeta && inMeta.duration > 0 && (
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-semibold text-white tracking-wide">
                        {formatDuration(inMeta.duration)}
                      </span>
                    )}

                    {/* Status badge */}
                    <span
                      className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : job.status === "FAILED"
                          ? "bg-rose-500 text-white"
                          : "bg-violet-600 text-white"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {/* Body info */}
                  <div className="p-5 space-y-3">
                    <h4
                      className="font-bold text-slate-900 text-sm line-clamp-1"
                      title={job.original_filename}
                    >
                      {formatDisplayTitle(job.original_filename)}
                    </h4>

                    {/* Resolution transformation pill */}
                    {inMeta && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span>{inMeta.display_width}×{inMeta.display_height}</span>
                        <ArrowRight className="w-3 h-3 text-violet-600" />
                        <span className="text-violet-700 font-bold">
                          {outMeta
                            ? `${outMeta.display_width}×${outMeta.display_height}`
                            : job.settings?.target_resolution || (isImage ? "8K Ultra" : "4K UHD")}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{job.created_at ? new Date(job.created_at).toLocaleDateString() : ""}</span>
                      <span>
                        {outMeta?.file_size
                          ? formatBytes(outMeta.file_size)
                          : inMeta
                          ? formatBytes(inMeta.file_size)
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isCompleted && (
                      <button
                        onClick={() => onSelectJob(job)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-colors"
                        title="Compare Before & After"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Compare</span>
                      </button>
                    )}

                    {isCompleted && (
                      <a
                        href={getDownloadUrl(job.id)}
                        download
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold transition-colors"
                        title={isImage ? "Download Enhanced Image" : "Download Enhanced 4K Video"}
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isImage ? "Enhanced" : "4K"}</span>
                      </a>
                    )}

                    {job.input_path && (
                      <a
                        href={getOriginalDownloadUrl(job.id)}
                        download
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 text-xs font-semibold transition-colors"
                        title="Download Original Source File"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>Original</span>
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteJob(job.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
