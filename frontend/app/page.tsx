"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
import { VideoUploader } from "../components/uploader/VideoUploader";
import { VideoMetadataCard } from "../components/uploader/VideoMetadataCard";
import { EnhancementSettingsPanel } from "../components/settings/EnhancementSettingsPanel";
import { ProcessingMonitor } from "../components/processing/ProcessingMonitor";
import { ComparisonViewer } from "../components/comparison/ComparisonViewer";
import { VideoLibrary } from "../components/library/VideoLibrary";
import { SystemDiagnostics } from "../components/system/SystemDiagnostics";
import {
  UploadedVideo,
  EnhancementSettings,
  JobRecord,
  SystemStatus,
  GPUSystemInfo
} from "../types";
import {
  fetchSystemStatus,
  fetchJobs,
  fetchJob,
  createJob,
  cancelJob,
  deleteJob,
  getWebSocketSystemUrl,
  getWebSocketJobUrl
} from "../lib/api";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<string>("enhance");
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [gpuInfo, setGpuInfo] = useState<GPUSystemInfo | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null);
  const [comparisonJob, setComparisonJob] = useState<JobRecord | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const [settings, setSettings] = useState<EnhancementSettings>({
    target_resolution: "2160p",
    model: "realesrgan-plus",
    quality_preset: "balanced",
    codec: "h264",
    preserve_audio: true,
    interpolate_fps: false,
    target_fps_multiplier: 1,
    color_grade: "none",
    clarity_boost: true,
    hdr_tone: false,
    film_grain: "none",
    vignette: false
  });

  const systemWsRef = useRef<WebSocket | null>(null);
  const jobWsRef = useRef<WebSocket | null>(null);

  // Load initial system data & job history
  const loadInitialData = async () => {
    try {
      const [sys, jobList] = await Promise.all([fetchSystemStatus(), fetchJobs()]);
      setSystemStatus(sys);
      setGpuInfo(sys.gpu);
      setJobs(jobList);
      setIsBackendConnected(true);

      // Check for running job
      const inProgress = jobList.find((j) =>
        ["QUEUED", "INITIALIZING", "PROCESSING", "ENCODING"].includes(j.status)
      );
      if (inProgress) {
        setActiveJob(inProgress);
      }
    } catch (e) {
      setIsBackendConnected(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(loadInitialData, 8000);
    return () => clearInterval(interval);
  }, []);

  // System telemetry WebSocket
  useEffect(() => {
    const wsUrl = getWebSocketSystemUrl();
    try {
      const ws = new WebSocket(wsUrl);
      systemWsRef.current = ws;

      ws.onopen = () => setIsBackendConnected(true);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "gpu_telemetry" && data.gpu) {
            setGpuInfo(data.gpu);
          }
          if (data.type === "job_progress" && activeJob && data.job_id === activeJob.id) {
            setActiveJob((prev) => (prev ? { ...prev, ...data } : null));
          }
          if (data.type === "job_completed" && activeJob && data.job_id === activeJob.id) {
            setActiveJob((prev) => (prev ? { ...prev, ...data, status: "COMPLETED" } : null));
            loadInitialData();
          }
        } catch (err) {}
      };

      ws.onerror = () => setIsBackendConnected(false);
      ws.onclose = () => setIsBackendConnected(false);

      return () => {
        ws.close();
      };
    } catch (e) {}
  }, [activeJob?.id]);

  // Job specific WebSocket
  useEffect(() => {
    if (!activeJob || ["COMPLETED", "FAILED", "CANCELLED"].includes(activeJob.status)) {
      if (jobWsRef.current) {
        jobWsRef.current.close();
        jobWsRef.current = null;
      }
      return;
    }

    const wsUrl = getWebSocketJobUrl(activeJob.id);
    const ws = new WebSocket(wsUrl);
    jobWsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "job_progress") {
          setActiveJob((prev) => (prev ? { ...prev, ...data } : null));
        } else if (data.type === "job_completed") {
          setActiveJob((prev) => (prev ? { ...prev, ...data, status: "COMPLETED" } : null));
          loadInitialData();
        } else if (data.type === "job_failed") {
          setActiveJob((prev) => (prev ? { ...prev, ...data, status: "FAILED" } : null));
          loadInitialData();
        } else if (data.type === "job_cancelled") {
          setActiveJob((prev) => (prev ? { ...prev, ...data, status: "CANCELLED" } : null));
          loadInitialData();
        }
      } catch (e) {}
    };

    return () => {
      ws.close();
    };
  }, [activeJob?.id, activeJob?.status]);

  const handleViewComparison = async (jobToView: JobRecord) => {
    try {
      const freshJob = await fetchJob(jobToView.id);
      setComparisonJob(freshJob);
    } catch {
      setComparisonJob(jobToView);
    }
  };

  const handleStartEnhancement = async () => {
    if (!uploadedVideo) return;
    try {
      const newJob = await createJob(uploadedVideo.video_id, settings);
      setActiveJob(newJob);
      loadInitialData();
    } catch (err: any) {
      alert(`Error starting enhancement: ${err.message}`);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      await cancelJob(activeJob.id);
      setActiveJob((prev) => (prev ? { ...prev, status: "CANCELLED", stage: "Cancelled" } : null));
      loadInitialData();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this video and enhancement record?")) return;
    try {
      await deleteJob(jobId);
      if (activeJob?.id === jobId) setActiveJob(null);
      if (comparisonJob?.id === jobId) setComparisonJob(null);
      loadInitialData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const activeJobCount = jobs.filter((j) =>
    ["QUEUED", "INITIALIZING", "PROCESSING", "ENCODING"].includes(j.status)
  ).length;

  return (
    <div className="flex bg-slate-50/50 min-h-screen text-slate-900 font-sans antialiased selection:bg-violet-100 selection:text-violet-900">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setComparisonJob(null);
          setCurrentTab(tab);
        }}
        gpuInfo={gpuInfo}
        activeJobCount={activeJobCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={
            comparisonJob
              ? "Before & After Comparison"
              : currentTab === "enhance"
              ? "PIXELFORGE AI"
              : currentTab === "queue"
              ? "Active Processing Queue"
              : currentTab === "library"
              ? "Video Library"
              : "System Hardware & Engine Status"
          }
          subtitle={
            comparisonJob
              ? "Interactive synchronized split viewer comparing original source vs enhanced 4K output"
              : currentTab === "enhance"
              ? "Transform ordinary footage into extraordinary clarity."
              : currentTab === "queue"
              ? "Real-time GPU inference pipeline & progress monitoring"
              : currentTab === "library"
              ? "Browse, compare, and download finished video enhancements"
              : "NVIDIA RTX 5050 GPU, Vulkan device layers, and local engine configuration"
          }
          isBackendConnected={isBackendConnected}
        />

        <main className="flex-1 p-8 max-w-6xl w-full mx-auto space-y-8">
          {/* COMPARISON VIEW */}
          {comparisonJob ? (
            <ComparisonViewer
              job={comparisonJob}
              onBack={() => setComparisonJob(null)}
            />
          ) : currentTab === "enhance" ? (
            /* ENHANCE VIDEO TAB */
            <div className="space-y-8">
              {/* Active Job Monitor if running */}
              {activeJob && (
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active Job
                  </div>
                  <ProcessingMonitor
                    job={activeJob}
                    gpuInfo={gpuInfo}
                    onCancelJob={handleCancelJob}
                    onViewComparison={() => handleViewComparison(activeJob)}
                  />
                </div>
              )}

              {/* Upload Zone or Video Metadata Card */}
              {!uploadedVideo ? (
                <VideoUploader
                  onVideoUploaded={(v) => setUploadedVideo(v)}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                />
              ) : (
                <div className="space-y-6">
                  <VideoMetadataCard
                    video={uploadedVideo}
                    onReset={() => setUploadedVideo(null)}
                  />

                  <EnhancementSettingsPanel
                    inputMetadata={uploadedVideo.metadata}
                    settings={settings}
                    onChangeSettings={setSettings}
                    onStartEnhancement={handleStartEnhancement}
                    disabled={
                      activeJob !== null &&
                      ["QUEUED", "INITIALIZING", "PROCESSING", "ENCODING"].includes(
                        activeJob.status
                      )
                    }
                  />
                </div>
              )}
            </div>
          ) : currentTab === "queue" ? (
            /* QUEUE TAB */
            <div className="space-y-6">
              {activeJob ? (
                <ProcessingMonitor
                  job={activeJob}
                  gpuInfo={gpuInfo}
                  onCancelJob={handleCancelJob}
                  onViewComparison={() => handleViewComparison(activeJob)}
                />
              ) : (
                <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center max-w-lg mx-auto shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800">No active jobs in queue</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    All enhancement jobs have finished or none have been submitted.
                  </p>
                  <button
                    onClick={() => setCurrentTab("enhance")}
                    className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs"
                  >
                    Enhance a Video
                  </button>
                </div>
              )}
            </div>
          ) : currentTab === "library" ? (
            /* LIBRARY TAB */
            <VideoLibrary
              jobs={jobs}
              onSelectJob={(j) => handleViewComparison(j)}
              onDeleteJob={handleDeleteJob}
              onNewEnhancement={() => {
                setComparisonJob(null);
                setCurrentTab("enhance");
              }}
            />
          ) : (
            /* SYSTEM TAB */
            <SystemDiagnostics status={systemStatus} onRefresh={loadInitialData} />
          )}
        </main>
      </div>
    </div>
  );
}
