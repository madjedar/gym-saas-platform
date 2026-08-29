/**
 * Custom API Error for handling centralized HTTP errors safely.
 */
export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Centralized fetch wrapper to handle secure API consumption.
 * - Uniformly catches HTTP errors (e.g., 401, 429)
 * - Returns a standard structure so the UI never crashes
 */
export async function fetchApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    // Handle Rate Limiting Specifically
    if (response.status === 429) {
      return {
        error: "Trop de requêtes. Veuillez patienter un moment.",
        status: 429,
      };
    }

    // Attempt to parse JSON regardless of success to grab error messages
    let data;
    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      data = await response.json();
    }

    if (!response.ok) {
      // Return a safe error message without exposing backend stack traces
      return {
        error: data?.error || data?.message || "Une erreur inattendue s'est produite.",
        status: response.status,
      };
    }

    return { data, status: response.status };
  } catch (error) {
    // Network errors or fetch aborts
    console.error('FetchAPI Network Error:', error);
    return {
      error: "Erreur de connexion serveur. Vérifiez votre connexion internet.",
      status: 0, // Indicates a network failure
    };
  }
}
