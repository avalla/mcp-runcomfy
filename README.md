# RunComfy MCP Server

MCP server to generate AI videos and images using the RunComfy APIs.

## Setup

1. Install dependencies:
```bash
cd mcp-servers/runcomfy
bun install
```

2. Get your API key from: https://www.runcomfy.com/profile

3. Add the configuration to your `~/.windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "runcomfy": {
      "command": "bun",
      "args": [".../mcp-runcomfy/index.js"],
      "env": {
        "RUNCOMFY_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

4. Restart Windsurf

## Available tools

### runcomfy_generate_video
Generate an AI video. Parameters:
- `prompt` (required): Video description
- `model`: wan-2.1, wan-2.1-720p, animatediff, svd, kling, minimax
- `image_url`: Image URL for image-to-video models
- `duration`: Duration in seconds
- `aspect_ratio`: 16:9, 9:16, 1:1
- `seed`: Seed for reproducibility

### runcomfy_generate_image
Generate an AI image (text-to-image). Parameters:
- `prompt` (required): Image description
- `model`: flux-2-pro
- `aspect_ratio`: 16:9, 9:16, 1:1
- `seed`: Seed for reproducibility
- `inputs`: Advanced model-specific inputs (object)

### runcomfy_edit_image
Edit an image (image-to-image). Parameters:
- `prompt` (required): Edit instruction
- `model`: flux-2-dev-edit, flux-kontext-pro-edit, qwen-edit-next-scene
- `image_url`: Single image URL (some models)
- `image_urls`: Multiple image URLs (some models)
- `aspect_ratio`: 16:9, 9:16, 1:1
- `seed`: Seed for reproducibility
- `inputs`: Advanced model-specific inputs (object)

### runcomfy_check_status
Check the status of a request.

### runcomfy_get_result
Get the result (video URL) of a completed request.

### runcomfy_cancel
Cancel a queued request.

### runcomfy_list_models
List available models plus curated alias maps for video and image.

## Usage example

```
// Generate video
runcomfy_generate_video({
  prompt: "A calm person breathing slowly, teal glow, dark background",
  model: "wan-2.1",
  aspect_ratio: "1:1"
})

// Check status
runcomfy_check_status({ request_id: "abc123" })

// Get result
runcomfy_get_result({ request_id: "abc123" })

// Generate image
runcomfy_generate_image({
  prompt: "A minimal flat illustration of a calm person breathing, teal and navy",
  model: "flux-2-pro",
  aspect_ratio: "1:1"
})

// Edit image
runcomfy_edit_image({
  prompt: "Change the background to a dark gradient and add a subtle teal glow",
  model: "flux-2-dev-edit",
  image_urls: ["https://example.com/input.png"]
})
```

