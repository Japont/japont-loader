import fetch from 'isomorphic-fetch';
import { ZipLoader } from './zip-loader';
import { urlBuilder } from './url-builder';
import { sha512Wrapper as sha512Async } from './sha512-wrapper';

export interface JapontFontConfig {
  text: string;
  fontPath: string;
  APIUrl: string;
  CSSFontFamilyName: string;
}

export class JapontLoader {
  public APIUrl = '';
  public fonts: JapontFont[] = [];

  constructor() {}

  async loadFontAsync(fontPath: string, text = '', CSSFontFamilyName = '') {
    const config = { text, fontPath, CSSFontFamilyName, APIUrl: this.APIUrl };
    const font = new JapontFont(config);
    this.fonts.push(font);
    return font.loadFontAsync();
  }

  alternate() {
    for (const font of this.fonts) {
      font.alternate();
    }
  }

  async fetchFontPathListAsync() {
    const fontPathList = await fetch(
      urlBuilder({ path: './fonts', baseURL: this.APIUrl }),
      { mode: 'cors' }
    ).then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    });

    return fontPathList;
  }
}

export class JapontFont {

  private config: JapontFontConfig = <JapontFontConfig>{};
  private $: {
    styleEl: HTMLStyleElement,
    cssText: string,
  } = <any>{};
  private license: string;
  private blob: Blob;
  private blobUrl: string;

  public info: any = {};

  constructor(config: JapontFontConfig = <JapontFontConfig>{}) {
    this.setConfig(config);
  }

  get text() {
    return this.config.text;
  }
  set text(text) {
    const baseText =
      (text || document.body.textContent || '').replace(/\n/g, '');
    this.config.text =
      Array.from(new Set(baseText.split(''))).sort().join('');
  }

  get fontPath() {
    return this.config.fontPath;
  }
  set fontPath(fontPath) {
    this.config.fontPath = fontPath;
  }

  get CSSFontFamilyName() {
    return this.config.CSSFontFamilyName;
  }
  set CSSFontFamilyName(fontFamily) {
    this.config.CSSFontFamilyName = fontFamily;
    if (this.blob) {
      this.enableFont();
    }
  }

  get APIUrl() {
    return this.config.APIUrl;
  }
  set APIUrl(APIUrl) {
    this.config.APIUrl = APIUrl;
  }

  get styleEl() {
    return this.$.styleEl;
  }
  set styleEl(styleEl) {
    const oldEl = this.$.styleEl;
    if (oldEl && oldEl.parentNode) {
      oldEl.parentNode.removeChild(oldEl);
    }
    this.$.styleEl = styleEl;
  }

  get cssText() {
    return this.$.cssText;
  }
  set cssText(cssText) {
    this.$.cssText = cssText;
    if (this.$.styleEl) {
      this.enableFont();
    }
  }

  setConfig(config: JapontFontConfig) {
    this.text = config.text;
    this.fontPath = config.fontPath;
    this.APIUrl = config.APIUrl;
    this.CSSFontFamilyName = config.CSSFontFamilyName;
  }

  async loadFontAsync() {
    if (
      !this.text || !this.fontPath || !this.APIUrl
    ) {
      throw new Error('Please set config at first.');
    }

    const zipArrBuf = await this.fetchFontFromServer();

    const zip = await new ZipLoader().loadAsync(zipArrBuf);
    const licenseZipObj = zip.getFile('LICENSE');
    if (licenseZipObj) {
      this.license = await licenseZipObj.loadAsync('string');
    }
    const infoZipObj = zip.getFile('info.json');
    if (infoZipObj) {
      this.info = JSON.parse(await infoZipObj.loadAsync('string'));
    }

    const fontZipObj = zip.searchFiles(/\.woff$/)[0];
    this.CSSFontFamilyName =
      this.CSSFontFamilyName ||
      fontZipObj.name.replace(/([^\/]+)\.woff$/, '$1');

    // IE Hack
    if ('ActiveXObject' in window) {
      this.CSSFontFamilyName = this.CSSFontFamilyName.slice(-31);
    }

    this.blob = new Blob(
      [ await fontZipObj.loadAsync('arraybuffer') ],
      { type: 'application/x-font-woff' }
    );
    this.blobUrl = URL.createObjectURL(this.blob);

    this.generateCSSText();
    this.enableFont();

    return this;
  }

  async fetchFontFromServer() {
    const fontURL = urlBuilder({
      path: ['./fonts/', this.fontPath],
      baseURL: this.APIUrl,
      query: { hash: await sha512Async(this.text) }
    });

    let res = await fetch(fontURL, { mode: 'cors' });
    if (!res.ok) {
      res = await fetch(
        fontURL, {
        mode: 'cors',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: this.text,
      }).then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return fetch(fontURL, { mode: 'cors' });
      });
    }

    return await res.arrayBuffer();
  }

  enableFont() {
    const styleEl = document.createElement('style');
    styleEl.appendChild(document.createTextNode(this.cssText));
    document.head.appendChild(styleEl);
    this.styleEl = styleEl;
  }

  disableFont() {
    if (this.styleEl) {
      this.styleEl.remove();
    }
  }

  generateCSSText() {
    const licenseInComment = this.license.split('\n')
      .map(line => line.replace(/\*\//g, '*\\/'))
      .map(line => ` ${line}`).join('\n');

    const cssText = `
/**
${licenseInComment}
 */
@font-face {
  font-family: '${this.CSSFontFamilyName}';
  src: url('${this.blobUrl}') format('woff');
}
    `;
    this.cssText = cssText;
    return cssText;
  }

  alternate() {
    if (!this.info.alternate) return;

    const alternatedCSS = `
@font-face {
  font-family: '${this.CSSFontFamilyName}';
  src: local('${this.info.alternate}');
}
    `;
    this.cssText = alternatedCSS;
  }
}
