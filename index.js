#!/usr/bin/env bun

import { createRunComfyApiClient } from "./src/runcomfy-api.js";
import { createModelsCatalog } from "./src/models-catalog.js";
import { startRunComfyMcpServer } from "./src/mcp-server.js";

const API_KEY = process.env.RUNCOMFY_API_KEY;
const BASE_URL = "https://model-api.runcomfy.net";
const MODELS_PAGE_URL = "https://www.runcomfy.com/models/all";
const MODELS_CACHE_TTL_MS = Number(process.env.RUNCOMFY_MODELS_CACHE_TTL_MS ?? 10 * 60 * 1000);

// Popular video generation models on RunComfy
const VIDEO_MODELS = {
  "wan-2.1": "wanai/wan-2-1/i2v-480p",
  "wan-2.1-720p": "wanai/wan-2-1/i2v-720p",
  "animatediff": "animatediff/animatediff-lightning",
  "svd": "stabilityai/stable-video-diffusion",
  "kling": "kling/kling-1-6/standard/image-to-video",
  "minimax": "minimax/video-01",
};

// Popular image generation/editing models on RunComfy
const IMAGE_MODELS = {
  "flux-2-pro": "blackforestlabs/flux-2/pro/text-to-image",
  "flux-2-dev-edit": "blackforestlabs/flux-2/dev/edit",
  "flux-kontext-pro-edit": "blackforestlabs/flux-1-kontext/pro/edit",
  "qwen-edit-next-scene": "qwen/qwen-edit-2509/lora/next-scene",
};

const apiClient = createRunComfyApiClient({
  apiKey: API_KEY,
  baseUrl: BASE_URL,
});

const modelsCatalog = createModelsCatalog({
  modelsPageUrl: MODELS_PAGE_URL,
  cacheTtlMs: MODELS_CACHE_TTL_MS,
});

startRunComfyMcpServer({
  apiKey: API_KEY,
  apiClient,
  modelsCatalog,
  videoModels: VIDEO_MODELS,
  imageModels: IMAGE_MODELS,
}).catch(console.error);
