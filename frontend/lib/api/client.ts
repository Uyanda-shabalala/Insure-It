/**
 * Minimal fetch wrapper for the Insure-It backend.
 * No mock data: when the backend is unreachable or an endpoint does not exist,
 * callers get a typed error they can show to the user.
 */

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: string = "") {
    super(message);
    this.name = "ApiError";
  }
}

/** The endpoint is not implemented (404/405) - the feature depending on it is unavailable, not broken. */
export class EndpointUnavailableError extends ApiError {
  constructor(public readonly endpoint: string, status: number) {
    super(`The backend does not provide ${endpoint} yet.`, status);
    this.name = "EndpointUnavailableError";
  }
}

export function apiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  // Existing deployments may configure a base ending in /api. Paths below already include it.
  const legacy = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return (base || legacy?.replace(/\/api\/?$/, "") || "").replace(/\/+$/, "");
}

/** Returns the raw body text (for error codes such as NO_SERIAL_FOUND) and a readable message if there is one. */
async function readError(response: Response): Promise<{ message: string | null; body: string }> {
  let body = "";
  try {
    body = await response.text();
    const json = JSON.parse(body) as { detail?: string; message?: string; error?: string };
    return { message: json.detail || json.message || json.error || null, body };
  } catch {
    return { message: null, body }; // Some errors have no JSON body.
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Multipart upload (e.g. an image). The browser sets the Content-Type, so none is added here. */
  formData?: FormData;
  /** Treat 404/405 as "endpoint missing" instead of a normal failure. Default true for lists/actions. */
  missingMeansUnavailable?: boolean;
}

/** Returns parsed JSON, or null for 204/empty bodies. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  const { method = "GET", body, formData, missingMeansUnavailable = true } = options;
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      cache: "no-store",
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch (caught) {
    if (caught instanceof ApiError) throw caught;
    throw new ApiError("Could not reach the backend. Check that it is running and the address is correct.", 0);
  }

  if (!response.ok) {
    if (missingMeansUnavailable && (response.status === 404 || response.status === 405)) {
      throw new EndpointUnavailableError(`${method} ${path}`, response.status);
    }
    const error = await readError(response);
    throw new ApiError(error.message ?? `The backend returned status ${response.status}.`, response.status, error.body);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}
