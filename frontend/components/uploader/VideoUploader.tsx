"use client";

import React, { useState, useRef, DragEvent } from "react";
import { UploadCloud, Film, AlertCircle, X, CheckCircle, FileVideo, Sparkles } from "lucide-react";
import { uploadVideo } from "../../lib/api";
import { UploadedVideo } from "../../types";
import { formatBytes } from "../../lib/utils";

interface VideoUploaderProps {
  onVideoUploaded: (video: UploadedVideo) => void;
  isUploading: boolean;
  setIsUploading: (val: boolean) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoUploaded,
  isUploading,
  setIsUploading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const validExtensions = [".mp4", ".mov", ".mkv", ".webm"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      setErrorMessage(`Format '${ext}' is not supported. Please upload an MP4, MOV, MKV, or WEBM video.`);
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setErrorMessage("File exceeds maximum allowed limit of 2 GB.");
      return;
    }

    setErrorMessage(null);
    setCurrentFilename(file.name);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadVideo(file, (pct) => {
        setUploadProgress(pct);
      });
      setIsUploading(false);
      onVideoUploaded(result);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || "Failed to upload and validate video stream.");
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-200 overflow-hidden ${
          isDragOver
            ? "border-violet-500 bg-violet-50/50 scale-[0.99]"
            : "border-slate-300/80 bg-white hover:border-violet-400 hover:bg-slate-50/50 shadow-sm shadow-slate-100"
        }`}
      >
        {isUploading ? (
          <div className="py-6 space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto shadow-sm">
              <Film className="w-7 h-7 animate-pulse" />
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 text-base">
                Uploading & Probing Video Stream
              </h4>
              <p className="text-xs text-slate-500 mt-1 truncate max-w-xs mx-auto">
                {currentFilename}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>{uploadProgress < 100 ? "Uploading..." : "Running FFprobe validation..."}</span>
                <span>{uploadProgress}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100/60 text-violet-600 flex items-center justify-center mx-auto shadow-sm shadow-indigo-100">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                Drop your video here
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                or <span className="text-violet-600 font-semibold hover:underline">browse files</span> from your computer
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                MP4
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                MOV
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                MKV
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                WEBM
              </span>
              <span className="text-xs font-normal text-slate-400 ml-1">
                Up to 2 GB
              </span>
            </div>
          </div>
        )}
      </div>

        {errorMessage && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
    </div>
  );
};

