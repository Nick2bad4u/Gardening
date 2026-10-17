/**
 * Accept only private Drive file references, without credentials or token-like
 * query parameters. Ordinary share attribution is removed before persistence.
 * This validates the reference shape, not the existence or privacy of a file.
 *
 * @param {unknown} value
 *
 * @returns {string}
 */
export function sensorArchiveUrl(value) {
    const match =
        typeof value === "string"
            ? /^https:\/\/drive\.google\.com\/file\/d\/(?<id>[\w\-]{10,200})\/view(?:\?usp=(?:drive_link|drivesdk|sharing))?$/v.exec(
                  value
              )?.groups
            : undefined;
    const id = match?.["id"];
    if (id === undefined)
        throw new Error(
            "Source sourceUrl must be a canonical HTTPS Drive archive file URL without credentials, fragments or private query parameters."
        );
    return `https://drive.google.com/file/d/${id}/view`;
}
