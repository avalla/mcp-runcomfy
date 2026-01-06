export function createRunComfyApiClient({ apiKey, baseUrl }) {
  async function makeRequest(endpoint, options = {}) {
    if (!apiKey) {
      throw new Error(
        "RUNCOMFY_API_KEY environment variable is required for RunComfy Model API requests"
      );
    }

    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RunComfy API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async function runModel(modelId, body) {
    return makeRequest(`/v1/models/${modelId}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async function generateVideo(modelId, prompt, options = {}) {
    return runModel(modelId, {
      prompt,
      ...options,
    });
  }

  async function generateImage(modelId, prompt, options = {}) {
    return runModel(modelId, {
      prompt,
      ...options,
    });
  }

  async function checkStatus(requestId) {
    return makeRequest(`/v1/requests/${requestId}/status`);
  }

  async function getResult(requestId) {
    return makeRequest(`/v1/requests/${requestId}/result`);
  }

  async function cancelRequest(requestId) {
    return makeRequest(`/v1/requests/${requestId}/cancel`, {
      method: "POST",
    });
  }

  return {
    runModel,
    generateVideo,
    generateImage,
    checkStatus,
    getResult,
    cancelRequest,
  };
}
