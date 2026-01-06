export function createModelsCatalog({
  modelsPageUrl,
  cacheTtlMs,
  fetchImpl = fetch,
  userAgent = "runcomfy-mcp/1.0",
} = {}) {
  let modelsCache = {
    fetchedAtMs: 0,
    models: [],
    error: null,
  };

  const entryRegex =
    /"author":"(?<author>[^"]+)"[\s\S]*?"object":"(?<object>[^"]+)"[\s\S]*?"task":"(?<task>[^"]*)"[\s\S]*?"playground_type":"(?<playground_type>[^"]+)"/g;

  function extractModelsFromModelsAllHtml(html) {
    const modelsById = new Map();

    function addMatches(text) {
      for (const match of text.matchAll(entryRegex)) {
        const { author, object, task, playground_type } = match.groups ?? {};
        if (!author || !object) continue;
        if (playground_type !== "model") continue;

        const modelId = `${author}/${object}`;
        if (modelsById.has(modelId)) continue;

        modelsById.set(modelId, {
          model_id: modelId,
          author,
          object,
          task: task || null,
          playground_type,
        });
      }
    }

    addMatches(html);

    if (modelsById.size === 0) {
      const normalized = html.replace(/\\\"/g, '"');
      addMatches(normalized);
    }

    return Array.from(modelsById.values());
  }

  async function fetchAllModels() {
    const response = await fetchImpl(modelsPageUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunComfy models page error: ${response.status} - ${errorText}`);
    }

    const html = await response.text();
    const models = extractModelsFromModelsAllHtml(html);
    if (!Array.isArray(models) || models.length === 0) {
      throw new Error(
        "Failed to extract models from RunComfy models page (unexpected format or empty list)."
      );
    }

    return models;
  }

  async function listModels({ refresh = false, aliases = {} } = {}) {
    const nowMs = Date.now();
    const isFresh = nowMs - modelsCache.fetchedAtMs < cacheTtlMs;

    if (!refresh && isFresh && modelsCache.models.length > 0) {
      return {
        source: modelsPageUrl,
        fetched_at_ms: modelsCache.fetchedAtMs,
        cached: true,
        count: modelsCache.models.length,
        models: modelsCache.models,
        aliases,
        note: "Use a full model_id (author/object). Aliases map common short keys to model_id.",
        last_error: modelsCache.error,
      };
    }

    try {
      const models = await fetchAllModels();
      modelsCache = {
        fetchedAtMs: nowMs,
        models,
        error: null,
      };

      return {
        source: modelsPageUrl,
        fetched_at_ms: modelsCache.fetchedAtMs,
        cached: false,
        count: modelsCache.models.length,
        models: modelsCache.models,
        aliases,
        note: "Use a full model_id (author/object). Aliases map common short keys to model_id.",
        last_error: null,
      };
    } catch (error) {
      const lastError = error?.message || String(error);
      modelsCache = {
        fetchedAtMs: nowMs,
        models: modelsCache.models,
        error: lastError,
      };

      return {
        source: modelsPageUrl,
        fetched_at_ms: modelsCache.fetchedAtMs,
        cached: modelsCache.models.length > 0,
        count: modelsCache.models.length,
        models: modelsCache.models,
        aliases,
        note: "Use a full model_id (author/object). Aliases map common short keys to model_id.",
        last_error: lastError,
        warning:
          modelsCache.models.length > 0
            ? "Model list refresh failed; returning last cached list."
            : "Model list refresh failed; returning only aliases.",
      };
    }
  }

  return {
    listModels,
  };
}
