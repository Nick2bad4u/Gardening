export {};

declare global {
    interface Window {
        /** Optional analytics queue installed only in published Pages builds. */
        dataLayer?: unknown[];
    }
}
