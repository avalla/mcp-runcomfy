import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

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

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
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
