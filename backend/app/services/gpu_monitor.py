import shutil
import subprocess
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class GPUMonitor:
    @staticmethod
    def get_gpu_status() -> Dict[str, Any]:
        """Query real NVIDIA GPU status via nvidia-smi."""
        nvidia_smi = shutil.which("nvidia-smi")
        if not nvidia_smi:
            return {
                "available": False,
                "error": "nvidia-smi executable not found in PATH",
                "name": "N/A",
                "memory_used_mb": 0,
                "memory_total_mb": 0,
                "gpu_utilization_pct": 0,
                "temperature_c": 0
            }

        try:
            cmd = [
                nvidia_smi,
                "--query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw",
                "--format=csv,noheader,nounits"
            ]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=3,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            line = result.stdout.strip().split("\n")[0]
            parts = [p.strip() for p in line.split(",")]
            
            name = parts[0]
            driver_ver = parts[1]
            total_mb = float(parts[2])
            used_mb = float(parts[3])
            free_mb = float(parts[4])
            gpu_util = float(parts[5]) if parts[5].replace('.', '', 1).isdigit() else 0.0
            temp_c = float(parts[6]) if parts[6].replace('.', '', 1).isdigit() else 0.0
            pwr = float(parts[7]) if len(parts) > 7 and parts[7].replace('.', '', 1).isdigit() else 0.0

            return {
                "available": True,
                "name": name,
                "driver_version": driver_ver,
                "memory_total_mb": round(total_mb, 1),
                "memory_used_mb": round(used_mb, 1),
                "memory_free_mb": round(free_mb, 1),
                "memory_used_pct": round((used_mb / total_mb) * 100, 1) if total_mb > 0 else 0,
                "gpu_utilization_pct": round(gpu_util, 1),
                "temperature_c": round(temp_c, 1),
                "power_draw_w": round(pwr, 1)
            }
        except Exception as e:
            logger.error(f"Error querying nvidia-smi: {e}")
            return {
                "available": False,
                "error": str(e),
                "name": "NVIDIA GPU (query failed)",
                "memory_used_mb": 0,
                "memory_total_mb": 0,
                "gpu_utilization_pct": 0,
                "temperature_c": 0
            }

    @staticmethod
    def get_vulkan_status() -> Dict[str, Any]:
        """Query Vulkan acceleration availability."""
        vulkaninfo = shutil.which("vulkaninfo")
        if not vulkaninfo:
            return {
                "available": False,
                "error": "vulkaninfo executable not found"
            }
        try:
            cmd = [vulkaninfo, "--summary"]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            output = result.stdout
            has_discrete = "PHYSICAL_DEVICE_TYPE_DISCRETE_GPU" in output
            has_nvidia = "NVIDIA" in output
            
            return {
                "available": "VULKANINFO" in output or "GPU0:" in output,
                "discrete_gpu_supported": has_discrete,
                "nvidia_supported": has_nvidia,
                "summary": "Vulkan Discrete GPU active" if (has_discrete and has_nvidia) else "Vulkan available"
            }
        except Exception as e:
            logger.error(f"Error querying vulkaninfo: {e}")
            return {
                "available": False,
                "error": str(e)
            }

