import 'js-polyfills/url';

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
    for (const key in opts.query) {
      (<any>url).searchParams.append(key, opts.query[key]);
    }
  }

  return url.toString();
}
