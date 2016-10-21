import fetch from 'isomorphic-fetch';
import { ZipLoader } from './zip-loader';

export interface JapontLoaderConfig {
  text: string;
  fontPath: string;
  CSSFontFamilyName: string;
  APIUrl: string;
}

class JapontLoader {

  private config: JapontLoaderConfig;
  private $: {
    styleEl: HTMLStyleElement,
  };
  private license: string;
  private blob: Blob;
  private blobUrl: string;

  constructor(
    { text, fontPath, APIUrl, CSSFontFamilyName }: JapontLoaderConfig = <JapontLoaderConfig>{}
  ) {
    this.config = <JapontLoaderConfig>{};
    this.$ = <any>{};

    this.setConfig({ text, fontPath, APIUrl, CSSFontFamilyName });
  }

  get text() {
    return this.config.text;
  }
  set text(text) {
    if (!text) {
      const allText = document.body.textContent || '';
      this.config.text = Array.from(new Set(allText.split(''))).join('');
    } else {
      this.config.text = text;
    }
  }

  get fontPath() {
    return this.config.fontPath;
  }
  set fontPath(fontPath) {
    this.config.fontPath = fontPath;
  }

  get APIUrl() {
    return this.config.APIUrl;
  }
  set APIUrl(APIUrl) {
    this.config.APIUrl = APIUrl;
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

  get styleEl() {
    return this.$.styleEl;
  }
  set styleEl(styleEl) {
    const oldEl = this.$.styleEl;
    if (oldEl) {
      oldEl.remove();
    }
    this.$.styleEl = styleEl;
  }

  setConfig({ text, fontPath, APIUrl, CSSFontFamilyName }: JapontLoaderConfig) {
    this.text = text;
    this.fontPath = fontPath;
    this.CSSFontFamilyName = CSSFontFamilyName;
    this.APIUrl = APIUrl;
  }

  async loadFont() {
    if (
      !this.text || !this.fontPath || !this.APIUrl
    ) {
      throw new Error('Please set config at first.');
    }

    const zipArrBuf = await fetch(
      new URL(
        this.fontPath,
        new URL('./fonts/', this.APIUrl).toString()
      ).toString(),
      {
        mode: 'cors',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: this.text,
      }).then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.arrayBuffer();
      });

    const zip = await new ZipLoader().loadAsync(zipArrBuf);
    const licenseZipObj = zip.getFile('LICENSE');
    if (licenseZipObj) {
      this.license = await licenseZipObj.loadAsync('string');
    }

    const fontZipObj = zip.searchFiles(/\.woff$/)[0];
    this.CSSFontFamilyName =
      this.CSSFontFamilyName || fontZipObj.name.replace(/([^\/]+)\.woff$/, '$1');

    this.blob = new Blob(
      [ await fontZipObj.loadAsync('arraybuffer') ],
      { type: 'application/x-font-woff' }
    );
    this.blobUrl = URL.createObjectURL(this.blob);

    this.enableFont();
  }

  enableFont() {
    const styleEl = document.createElement('style');
    styleEl.appendChild(document.createTextNode(this.generateCSSText()));
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
      .map(line => ` * ${line}`).join('\n');

    return `
/**
${licenseInComment}
 */
@font-face {
  font-family: '${this.CSSFontFamilyName}';
  src: url('${this.blobUrl}') format('woff');
}
    `;
  }

  async fetchFontPathList() {
    const fontPathList = await fetch(
      new URL('./fonts', this.APIUrl).toString(),
      { mode: 'cors' }
    ).then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    });

    return fontPathList;
  }
}

export default JapontLoader;
