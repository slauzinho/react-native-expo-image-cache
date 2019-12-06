export interface DownloadOptions {
    md5?: boolean;
    headers?: {
        [name: string]: string;
    };
}
export declare const setBaseDir: (baseDir: string) => string;
export declare class CacheEntry {
    uri: string;
    options: DownloadOptions;
    constructor(uri: string, options: DownloadOptions);
    createBaseDir(): Promise<void>;
    getPath(): Promise<string | undefined>;
}
export default class CacheManager {
    static entries: {
        [uri: string]: CacheEntry;
    };
    static get(uri: string, options: DownloadOptions): CacheEntry;
    static clearCache(): Promise<void>;
    static getCacheSize(): Promise<number>;
}
/**
 * As we can now set an uri that is not in the cacheDirectory,
 * we need to be able to delete files.
 */
export declare const removeCacheEntry: (uri: string) => Promise<void>;
