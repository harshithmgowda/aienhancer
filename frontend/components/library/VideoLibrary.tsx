"use client";

import React from "react";
import { Film, Download, Trash2, Eye, Clock, CheckCircle2, XCircle, ArrowRight, Sparkles } from "lucide-react";
import { JobRecord } from "../../types";
import { getDownloadUrl, getFullMediaUrl } from "../../lib/api";
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
  if (jobs.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center max-w-lg mx-auto shadow-sm shadow-slate-100">
        <div className="w-16 h-16 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-4">
          <Film className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          No enhanced videos yet
        </h3>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Upload any video to upscale it to 4K UHD using your RTX 5050 GPU.
        </p>
        <button
          onClick={onNewEnhancement}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-500/20 hover:scale-[1.02] transition-all"
        >
          Enhance Your First Video
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Video Library & History ({jobs.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {jobs.map((job) => {
          const thumbUrl = getFullMediaUrl(job.thumbnail_url);
          const isCompleted = job.status === "COMPLETED";
          const inMeta = job.input_metadata;
          const outMeta = job.output_metadata;

          return (
            <div
              key={job.id}
              className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Poster image */}
                <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={job.original_filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="w-10 h-10 text-slate-600" />
                  )}
                  {inMeta && (
                    <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-semibold text-white">
                      {formatDuration(inMeta.duration)}
                    </span>
                  )}
                  <span
                    className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isCompleted
                        ? "bg-emerald-500/90 text-white"
                        : job.status === "FAILED"
                        ? "bg-rose-500/90 text-white"
                        : "bg-violet-600/90 text-white"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                {/* Body info */}
                <div className="p-5 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                    {job.original_filename}
                  </h4>

                  {/* Resolution transformation pill */}
                  {inMeta && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span>{inMeta.display_width}×{inMeta.display_height}</span>
                      <ArrowRight className="w-3 h-3 text-violet-600" />
                      <span className="text-violet-700 font-bold">
                        {outMeta
                          ? `${outMeta.display_width}×${outMeta.display_height}`
                          : job.settings?.target_resolution || "4K"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{job.created_at ? new Date(job.created_at).toLocaleDateString() : ""}</span>
                    <span>{outMeta?.file_size ? formatBytes(outMeta.file_size) : inMeta ? formatBytes(inMeta.file_size) : ""}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {isCompleted && (
                    <>
                      <button
                        onClick={() => onSelectJob(job)}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-violet-700 hover:border-violet-300 transition-colors"
                        title="Compare Before & After"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={getDownloadUrl(job.id)}
                        download
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                        title="Download Enhanced Video"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </>
                  )}
                </div>

                <button
                  onClick={() => onDeleteJob(job.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete Video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

