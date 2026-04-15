type CacheValue = unknown;

interface CacheEntry<T = CacheValue> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheValue>>();
const namespaceVersions = new Map<string, number>();

const now = () => Date.now();

const getVersionKey = (namespace: string, scope?: string | number) =>
  `${namespace}:${scope ?? 'global'}`;

const getVersion = (namespace: string, scope?: string | number) => {
  const key = getVersionKey(namespace, scope);
  return namespaceVersions.get(key) ?? 0;
};

const buildCacheKey = (
  namespace: string,
  key: string,
  ttlMs: number,
  scope?: string | number
): string => {
  const version = getVersion(namespace, scope);
  return `${namespace}|${scope ?? 'global'}|v${version}|ttl${ttlMs}|${key}`;
};

export const getOrSetCache = async <T>(
  namespace: string,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  scope?: string | number
): Promise<T> => {
  const cacheKey = buildCacheKey(namespace, key, ttlMs, scope);
  const existing = memoryCache.get(cacheKey);

  if (existing && existing.expiresAt > now()) {
    return existing.value as T;
  }

  if (inflight.has(cacheKey)) {
    return (await inflight.get(cacheKey)) as T;
  }

  const promise = loader()
    .then((value) => {
      memoryCache.set(cacheKey, {
        value,
        expiresAt: now() + ttlMs,
      });
      return value;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, promise as Promise<CacheValue>);
  return (await promise) as T;
};

export const invalidateCacheNamespace = (
  namespace: string,
  scope?: string | number
) => {
  const key = getVersionKey(namespace, scope);
  const current = namespaceVersions.get(key) ?? 0;
  namespaceVersions.set(key, current + 1);
};

export const invalidateUserCaches = (userId: number, namespaces: string[]) => {
  for (const namespace of namespaces) {
    invalidateCacheNamespace(namespace, userId);
  }
};

export const purgeExpiredCacheEntries = () => {
  const current = now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= current) {
      memoryCache.delete(key);
    }
  }
};
