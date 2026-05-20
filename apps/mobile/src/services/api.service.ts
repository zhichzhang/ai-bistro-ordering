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

    get<T>(
        endpoint: string
    ): Promise<T> {

        return request<T>(
            endpoint
        );
    },

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