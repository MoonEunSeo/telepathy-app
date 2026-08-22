import type { CorsOptions } from 'cors';

type OriginDelegate = Exclude<CorsOptions['origin'], undefined>;

export function createOriginDelegate(allowedOrigins: readonly string[]): OriginDelegate {
  const originSet = new Set(allowedOrigins);

  return (origin, callback) => {
    callback(null, origin === undefined || originSet.has(origin));
  };
}
