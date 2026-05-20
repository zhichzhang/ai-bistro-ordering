// apps/mobile/src/utils/image.ts

/**
 * Convert a Google Drive sharing URL into a direct image URL.
 */
export function toDirectImageUrl(
    url: string
): string {
    const match = url.match(
        /\/d\/([^/]+)\//
    );

    if (!match) {
        return url;
    }

    const fileId = match[1];

    return `https://drive.google.com/uc?export=view&id=${fileId}`;
}