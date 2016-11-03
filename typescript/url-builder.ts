export interface builderOptions {
  baseURL: string;
  query?: any;
  path: string | string[];
}

export function urlBuilder(opts: builderOptions) {
  if (opts.path && !Array.isArray(opts.path)) {
    opts.path = [opts.path];
  }

  let url = new URL(opts.baseURL || location.href);
  for (const path of opts.path) {
    url = new URL(path, url.toString());
  }

  if (opts.query) {
    const query: string[] = [];
    for (const key in opts.query) {
      const keyVal =
        encodeURIComponent(key) + '=' + encodeURIComponent(opts.query[key]);
      query.push(keyVal);
    }
    url = new URL('?' + query.join('&'), url.toString());
  }

  return url.toString();
}
