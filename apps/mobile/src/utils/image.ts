// apps/mobile/src/utils/image.ts

export function toDirectImageUrl(
    url: string
): string {
    const match =
        url.match(
            /\/d\/([^/]+)\//
        );

    if (!match) {
        return url;
    }

    const fileId =
        match[1];

    return `https://drive.google.com/uc?export=view&id=${fileId}`;
}