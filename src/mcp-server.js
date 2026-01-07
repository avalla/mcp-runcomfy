import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";

export async function startRunComfyMcpServer({
  apiKey,
  apiClient,
  modelsCatalog,
  videoModels,
  imageModels,
} = {}) {
  if (!apiClient) throw new Error("apiClient is required");
  if (!modelsCatalog) throw new Error("modelsCatalog is required");
  if (!videoModels) throw new Error("videoModels is required");
  if (!imageModels) throw new Error("imageModels is required");

  const server = new Server(
    {
      name: "runcomfy",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "runcomfy_generate_video",
          description:
            "Generate a video using RunComfy AI models. Returns a request_id to check status later.",
          inputSchema: {
            type: "object",
            properties: {
              model: {
                type: "string",
                description:
                  "Model to use. Use runcomfy_list_models to discover available model_id values. You may also use short aliases like wan-2.1, kling, minimax.",
                default: "wan-2.1",
              },
              prompt: {
                type: "string",
                description: "Text prompt describing the video to generate",
              },
              image_url: {
                type: "string",
                description:
                  "Optional: Public HTTPS URL of input image for image-to-video models",
              },
              duration: {
                type: "number",
                description: "Video duration in seconds (model dependent)",
              },
              aspect_ratio: {
                type: "string",
                description: "Aspect ratio like 16:9, 9:16, 1:1",
              },
              seed: {
                type: "number",
                description: "Random seed for reproducibility",
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "runcomfy_generate_image",
          description:
            "Generate an image using RunComfy AI models (text-to-image). Returns a request_id to check status later.",
          inputSchema: {
            type: "object",
            properties: {
              model: {
                type: "string",
                description:
                  "Model to use. Use runcomfy_list_models to discover available model_id values. You may also use short aliases like flux-2-pro.",
                default: "flux-2-pro",
              },
              prompt: {
                type: "string",
                description: "Text prompt describing the image to generate",
              },
              aspect_ratio: {
                type: "string",
                description: "Aspect ratio like 16:9, 9:16, 1:1",
              },
              seed: {
                type: "number",
                description: "Random seed for reproducibility",
              },
              inputs: {
                type: "object",
                description:
                  "Optional: Model-specific inputs (advanced). Keys must match the model input schema.",
                additionalProperties: true,
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "runcomfy_edit_image",
          description:
            "Edit an image using RunComfy AI models (image-to-image). Returns a request_id to check status later.",
          inputSchema: {
            type: "object",
            properties: {
              model: {
                type: "string",
                description:
                  "Model to use. Use runcomfy_list_models to discover available model_id values. You may also use short aliases like flux-2-dev-edit or flux-kontext-pro-edit.",
                default: "flux-2-dev-edit",
              },
              prompt: {
                type: "string",
                description: "Text prompt describing the edit",
              },
              image_url: {
                type: "string",
                description:
                  "Public HTTPS URL of the input image (for models that accept a single image_url)",
              },
              image_urls: {
                type: "array",
                description:
                  "Public HTTPS URLs of input images (for models that accept image_urls)",
                items: {
                  type: "string",
                },
              },
              seed: {
                type: "number",
                description: "Random seed for reproducibility",
              },
              aspect_ratio: {
                type: "string",
                description: "Aspect ratio like 16:9, 9:16, 1:1",
              },
              inputs: {
                type: "object",
                description:
                  "Optional: Model-specific inputs (advanced). Keys must match the model input schema.",
                additionalProperties: true,
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "runcomfy_check_status",
          description:
            "Check the status of a RunComfy request. Returns: in_queue, in_progress, completed, or cancelled.",
          inputSchema: {
            type: "object",
            properties: {
              request_id: {
                type: "string",
                description: "The request_id returned from generate_video",
              },
            },
            required: ["request_id"],
          },
        },
        {
          name: "runcomfy_get_result",
          description:
            "Get the result of a completed RunComfy request. Returns video/image URLs.",
          inputSchema: {
            type: "object",
            properties: {
              request_id: {
                type: "string",
                description: "The request_id to fetch results for",
              },
            },
            required: ["request_id"],
          },
        },
        {
          name: "runcomfy_cancel",
          description: "Cancel a queued RunComfy request.",
          inputSchema: {
            type: "object",
            properties: {
              request_id: {
                type: "string",
                description: "The request_id to cancel",
              },
            },
            required: ["request_id"],
          },
        },
        {
          name: "runcomfy_list_models",
          description: "List available models on RunComfy (scraped from the models page) plus curated aliases.",
          inputSchema: {
            type: "object",
            properties: {
              refresh: {
                type: "boolean",
                description: "Force refresh of the models list (bypasses cache)",
                default: false,
              },
            },
          },
        },

        {
          name: "runcomfy_download_media",
          description:
            "Download a generated media (image/video) to local disk. You can pass a direct media URL, or a request_id to resolve the media URL from RunComfy results.",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "Direct HTTPS URL to the media file to download",
              },
              request_id: {
                type: "string",
                description:
                  "Optional: resolve media URL from a completed RunComfy request_id (via /v1/requests/{request_id}/result)",
              },
              kind: {
                type: "string",
                description: "Preferred media kind when resolving from request_id",
                enum: ["image", "video"],
              },
              index: {
                type: "number",
                description:
                  "Optional index when the result contains multiple images/videos (0-based)",
              },
              output_dir: {
                type: "string",
                description:
                  "Directory where the file will be saved (defaults to a temp folder)",
              },
              filename: {
                type: "string",
                description:
                  "Optional output filename (if omitted, it will be inferred from URL or request_id)",
              },
              overwrite: {
                type: "boolean",
                description: "Overwrite if the target file already exists",
                default: false,
              },
              return_mode: {
                type: "string",
                description:
                  "How to return the downloaded media. path: only return saved_path in JSON. resource_link: also include a file:// resource_link. embedded: also include an embedded resource with base64 blob.",
                enum: ["path", "resource_link", "embedded"],
                default: "path",
              },
            },
          },
        },
      ],
    };
  });

  function inferExtensionFromMimeType(mimeType) {
    const normalized = String(mimeType || "").split(";")[0].trim().toLowerCase();
    switch (normalized) {
      case "image/png":
        return ".png";
      case "image/jpeg":
        return ".jpg";
      case "image/webp":
        return ".webp";
      case "image/gif":
        return ".gif";
      case "video/mp4":
        return ".mp4";
      case "video/webm":
        return ".webm";
      default:
        return "";
    }
  }

  function pickMediaUrlFromResult(result, { kind, index }) {
    const output = result?.output && typeof result.output === "object" ? result.output : null;
    if (!output) return null;

    const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;

    const images = Array.isArray(output.images) ? output.images : [];
    const videos = Array.isArray(output.videos) ? output.videos : [];

    const candidates = [];
    if (output.image) candidates.push({ kind: "image", url: output.image });
    if (output.video) candidates.push({ kind: "video", url: output.video });

    for (const url of images) candidates.push({ kind: "image", url });
    for (const url of videos) candidates.push({ kind: "video", url });

    const filtered = kind ? candidates.filter((c) => c.kind === kind) : candidates;
    const picked = filtered[safeIndex] ?? filtered[0] ?? candidates[0];
    return picked?.url || null;
  }

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;
      let extraContent = [];

      switch (name) {
        case "runcomfy_generate_video": {
          const modelKey = args.model || "wan-2.1";
          const modelId = videoModels[modelKey] || modelKey;
          const options = {};

          if (args.image_url) options.image_url = args.image_url;
          if (args.duration) options.duration = args.duration;
          if (args.aspect_ratio) options.aspect_ratio = args.aspect_ratio;
          if (args.seed) options.seed = args.seed;

          result = await apiClient.generateVideo(modelId, args.prompt, options);
          break;
        }

        case "runcomfy_generate_image": {
          const modelKey = args.model || "flux-2-pro";
          const modelId = imageModels[modelKey] || modelKey;

          const options = {
            ...(args.inputs && typeof args.inputs === "object" ? args.inputs : {}),
          };

          if (args.aspect_ratio) options.aspect_ratio = args.aspect_ratio;
          if (args.seed) options.seed = args.seed;

          result = await apiClient.generateImage(modelId, args.prompt, options);
          break;
        }

        case "runcomfy_edit_image": {
          const modelKey = args.model || "flux-2-dev-edit";
          const modelId = imageModels[modelKey] || modelKey;

          const body = {
            prompt: args.prompt,
            ...(args.inputs && typeof args.inputs === "object" ? args.inputs : {}),
          };

          if (Array.isArray(args.image_urls) && args.image_urls.length > 0) {
            body.image_urls = args.image_urls;
          } else if (args.image_url) {
            body.image_url = args.image_url;
          }

          if (args.aspect_ratio) body.aspect_ratio = args.aspect_ratio;
          if (args.seed) body.seed = args.seed;

          result = await apiClient.runModel(modelId, body);
          break;
        }

        case "runcomfy_check_status":
          result = await apiClient.checkStatus(args.request_id);
          break;

        case "runcomfy_get_result":
          result = await apiClient.getResult(args.request_id);
          break;

        case "runcomfy_cancel":
          result = await apiClient.cancelRequest(args.request_id);
          break;

        case "runcomfy_list_models":
          result = await modelsCatalog.listModels({
            refresh: Boolean(args.refresh),
            aliases: {
              video: videoModels,
              image: imageModels,
            },
          });
          break;

        case "runcomfy_download_media": {
          const outputDir =
            typeof args.output_dir === "string" && args.output_dir.trim().length > 0
              ? args.output_dir.trim()
              : join(tmpdir(), "runcomfy-media");

          await mkdir(outputDir, { recursive: true });

          let mediaUrl = typeof args.url === "string" && args.url.trim().length > 0 ? args.url : null;
          const requestId =
            typeof args.request_id === "string" && args.request_id.trim().length > 0
              ? args.request_id.trim()
              : null;

          if (!mediaUrl && requestId) {
            const runcomfyResult = await apiClient.getResult(requestId);
            mediaUrl = pickMediaUrlFromResult(runcomfyResult, {
              kind: args.kind,
              index: args.index,
            });
          }

          if (!mediaUrl) {
            throw new Error("Provide either url or request_id (with an available output image/video)");
          }

          const response = await fetch(mediaUrl);
          if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(`Media download failed: ${response.status} - ${errorText}`);
          }

          const contentType = response.headers.get("content-type") || "";
          const inferredExt = inferExtensionFromMimeType(contentType);

          let finalFilename =
            typeof args.filename === "string" && args.filename.trim().length > 0
              ? args.filename.trim()
              : null;

          if (!finalFilename) {
            const pathname = (() => {
              try {
                return new URL(mediaUrl).pathname;
              } catch {
                return "";
              }
            })();

            const base = pathname ? basename(pathname) : "";
            finalFilename = base && base.length > 0 ? base : null;
          }

          if (!finalFilename) {
            const safeKind = args.kind === "video" ? "video" : "image";
            finalFilename = requestId
              ? `runcomfy-${requestId}-${safeKind}${inferredExt || ""}`
              : `runcomfy-${safeKind}${inferredExt || ""}`;
          }

          if (!extname(finalFilename) && inferredExt) {
            finalFilename = `${finalFilename}${inferredExt}`;
          }

          const outputPath = join(outputDir, finalFilename);
          const buffer = await response.arrayBuffer();
          const bytes = buffer.byteLength;

          const file = Bun.file(outputPath);
          if ((await file.exists()) && !args.overwrite) {
            throw new Error(`File already exists: ${outputPath} (set overwrite=true to replace)`);
          }

          await Bun.write(outputPath, new Uint8Array(buffer));

          const returnMode =
            args.return_mode === "resource_link" || args.return_mode === "embedded"
              ? args.return_mode
              : "path";

          result = {
            ok: true,
            url: mediaUrl,
            saved_path: outputPath,
            bytes,
            mime_type: contentType || null,
            return_mode: returnMode,
          };

          extraContent = [];
          if (returnMode === "resource_link") {
            extraContent.push({
              type: "resource_link",
              uri: `file://${outputPath}`,
              name: finalFilename,
              mimeType: contentType || undefined,
            });
          }

          if (returnMode === "embedded") {
            const base64 = Buffer.from(new Uint8Array(buffer)).toString("base64");
            extraContent.push({
              type: "resource",
              resource: {
                uri: `file://${outputPath}`,
                mimeType: contentType || undefined,
                blob: base64,
              },
            });
          }
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
          ...(Array.isArray(extraContent) ? extraContent : []),
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  if (!apiKey) {
    console.error(
      "Warning: RUNCOMFY_API_KEY is not set. Only runcomfy_list_models will work; Model API tools will error."
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RunComfy MCP server running");

  return { server };
}
