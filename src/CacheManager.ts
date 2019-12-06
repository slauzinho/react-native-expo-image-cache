// @flow
import * as _ from "lodash";
import * as FileSystem from "expo-file-system";
import MD5 from "crypto-js/md5";

export interface DownloadOptions {
  md5?: boolean;
  headers?: { [name: string]: string };
}

let _baseDir = `${FileSystem.cacheDirectory}expo-image-cache/`;
const getBaseDir = (): string => _baseDir;
export const setBaseDir = (baseDir: string): string => _baseDir = baseDir;

export class CacheEntry {
  uri: string;

  options: DownloadOptions;

  constructor(uri: string, options: DownloadOptions) {
    this.uri = uri;
    this.options = options;
  }

  async createBaseDir(): Promise<void> {
    const BASE_DIR = getBaseDir();
    const { exists } = await FileSystem.getInfoAsync(BASE_DIR);
    if(!exists){
      try{
        await FileSystem.makeDirectoryAsync(BASE_DIR, {intermediates: true});
      }catch(err){
      }
    }
  }

  async getPath(): Promise<string | undefined> {
    const { uri, options } = this;
    const { path, exists, tmpPath } = await getCacheEntry(uri);
    if (exists) {
      return path;
    }
    const result = await FileSystem.createDownloadResumable(uri, tmpPath, options).downloadAsync();
    // If the image download failed, we don't cache anything
    if (result && result.status !== 200) {
      return undefined;
    }
    this.createBaseDir();
    await FileSystem.moveAsync({ from: tmpPath, to: path });
    return path;
  }
}

export default class CacheManager {
  static entries: { [uri: string]: CacheEntry } = {};

  static get(uri: string, options: DownloadOptions): CacheEntry {
    if (!CacheManager.entries[uri]) {
      CacheManager.entries[uri] = new CacheEntry(uri, options);
    }
    return CacheManager.entries[uri];
  }

  static async clearCache(): Promise<void> {
    const BASE_DIR = getBaseDir();
    await FileSystem.deleteAsync(BASE_DIR, { idempotent: true });
    await FileSystem.makeDirectoryAsync(BASE_DIR);
  }

  static async getCacheSize(): Promise<number> {
    const result = await FileSystem.getInfoAsync(_baseDir);
    if (!result.exists) {
      throw new Error(`${_baseDir} not found`);
    }
    return result.size;
  }
}

const getCacheKey = (uri: string): { key: string, ext: string } => {
  const filename = uri.substring(uri.lastIndexOf("/"), uri.indexOf("?") === -1 ? uri.length : uri.indexOf("?"));
  const ext = filename.indexOf(".") === -1 ? ".jpg" : filename.substring(filename.lastIndexOf("."));
  return {key: 'I' + MD5(uri), ext};
};


/**
 * As we can now set an uri that is not in the cacheDirectory,
 * we need to be able to delete files.
 */
export const removeCacheEntry = async (uri: string): Promise<void> => {
  const {ext, key} = getCacheKey(uri);
  return await FileSystem.deleteAsync(
      `${getBaseDir()}${key}${ext}`,
      {idempotent: true}
  );
};

const getCacheEntry = async (uri: string): Promise<{ exists: boolean, path: string, tmpPath: string }> => {
  const BASE_DIR = getBaseDir();
  const {ext, key} = getCacheKey(uri);
  const path = `${BASE_DIR}${key}${ext}`;
  const tmpPath = `${BASE_DIR}${key}-${_.uniqueId()}${ext}`;
  // TODO: maybe we don't have to do this every time
  try {
      await FileSystem.makeDirectoryAsync(BASE_DIR);
  } catch (e) {
      // do nothing
  }
  let info = null;
   try{
     info = await FileSystem.getInfoAsync(path);
     const {exists} = info;
     return { exists, path, tmpPath };
   }catch(e){
   }
   return { exists: false, path, tmpPath };
};

