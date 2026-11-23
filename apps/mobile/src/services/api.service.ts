// apps/mobile/src/services/api.service.ts

const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL!;

if (!API_BASE_URL) {
    throw new Error(
        "Missing EXPO_PUBLIC_API_BASE_URL"
    );
}

type RequestOptions = {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
};

/**
 * Execute a typed API request against the backend service.
 */
async function request<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                method:
                    options.method ?? "GET",

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers ?? {}),
                },

                body:
                    options.body
                        ? JSON.stringify(
                            options.body
                        )
                        : undefined,
            }
        );

    if (!response.ok) {
        const text =
            await response.text();

        throw new Error(
            text ||
            `Request failed: ${response.status}`
        );
    }

    return response.json();
}

export const apiService = {
    /**
     * Execute a GET request.
     */
    get<T>(
        endpoint: string
    ): Promise<T> {
        return request<T>(
            endpoint
        );
    },

    /**
     * Execute a POST request.
     */
    post<T>(
        endpoint: string,
        body?: unknown
    ): Promise<T> {
        return request<T>(
            endpoint,
            {
                method: "POST",
                body,
            }
        );
    },

    /**
     * Execute a PATCH request.
     */
    patch<T>(
        endpoint: string,
        body?: unknown
    ): Promise<T> {
        return request<T>(
            endpoint,
            {
                method: "PATCH",
                body,
            }
        );
    },

    /**
     * Execute a PUT request.
     */
    put<T>(
        endpoint: string,
        body?: unknown
    ): Promise<T> {
        return request<T>(
            endpoint,
            {
                method: "PUT",
                body,
            }
        );
    },

    /**
     * Execute a DELETE request.
     */
    delete<T>(
        endpoint: string
    ): Promise<T> {
        return request<T>(
            endpoint,
            {
                method: "DELETE",
            }
        );
    },
};