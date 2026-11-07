import { apiUrl } from "@/lib/services/api-config";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The request could not be completed.";
}

function responseMessage(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const data = body as Record<string, unknown>;
  const fields = data.errors;
  if (Array.isArray(fields)) {
    const messages = fields.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      const message = entry.defaultMessage ?? entry.message;
      return typeof message === "string"
        ? [
            `${typeof entry.field === "string" ? `${entry.field}: ` : ""}${message}`,
          ]
        : [];
    });
    if (messages.length) return messages.join("; ");
  } else if (fields && typeof fields === "object") {
    const messages = Object.entries(fields).flatMap(([field, message]) =>
      typeof message === "string" ? [`${field}: ${message}`] : [],
    );
    if (messages.length) return messages.join("; ");
  }
  for (const key of ["detail", "message", "error", "title"]) {
    if (typeof data[key] === "string") return data[key];
  }
  return "";
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      cache: "no-store",
      credentials: "include",
      headers,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      "Cannot reach the backend. Check the connection and retry. If a submission was in progress, refresh the inventory before submitting again.",
    );
  }
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError("The backend response was interrupted. Refresh device records before submitting again.");
  }
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!response.ok) {
    const explanation =
      response.status === 401
        ? "Authentication is required by the backend. Use your existing authenticated session."
        : response.status === 403
          ? "The backend denied this request. Check session permissions and the backend's CSRF requirements."
          : response.status === 404
            ? "The requested backend resource or endpoint is unavailable."
            : "The backend could not complete this request.";
    const message = response.status === 401 || response.status === 403
      ? explanation
      : responseMessage(data) || explanation;
    throw new ApiError(
      `${message} (HTTP ${response.status})`,
      response.status,
    );
  }
  if (text && data === undefined)
    throw new ApiError("The backend returned an invalid JSON response.");
  return data;
}
