import JSZip from 'jszip';

export const ZIP_SIGNATURE = {
  LOCAL_FILE_HEADER: 0x04034B50,
}

export async function arrayBufferToStringAsync(arrbuf: ArrayBuffer) {
  return <Promise<string>> new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', () => resolve(fileReader.result));
    fileReader.addEventListener('error', () => reject(fileReader.error));

    fileReader.readAsText(new Blob([arrbuf]));
  });
}

export class ZipFile {
  name: string;
  data: ArrayBuffer;

  constructor({
    name, data
  }: {
    name: string, data: ArrayBuffer
  }) {
    this.name = name;
    this.data = data;
  }

  async loadAsync(type: 'string' | 'arraybuffer'): Promise<any> {
    if (type === 'arraybuffer') {
      return this.data;
    } else if (type === 'string') {
      return await arrayBufferToStringAsync(this.data);
    } else {
      throw new Error('Type is not supported.');
    }
  }
}

export class ZipLoader {

  public data: ArrayBuffer;
  public useJSZip: boolean;
  private zip: JSZip;
  private fileList: ZipFile[];

  constructor(useJSZip = true) {
    this.useJSZip = useJSZip && !!JSZip;
  }

  async loadAsync(data: ArrayBuffer) {
    this.data = data;
    if (this.useJSZip) {
      this.zip = await new JSZip().loadAsync(this.data);
      this.fileList = [];
      const allFiles = this.zip.file(/^/);
      for (const file of allFiles) {
        this.fileList.push(new ZipFile({
          name: file.name,
          data: await file.async('arraybuffer'),
        }));
      }
    } else {
      this.fileList = [];

      let offset = 0;
      const dv = new DataView(this.data);
      while (true) {
        const signature = dv.getUint32(offset, true);
        if (signature !== ZIP_SIGNATURE.LOCAL_FILE_HEADER) break;

        const compressType = dv.getInt16(offset + 8, true);
        if (compressType !== 0) {
          throw new Error('The version of this zip is not supported. Please use JSZip.');
        }

        const fileSize = dv.getInt32(offset + 22, true);
        const fileNameSize = dv.getInt16(offset + 26, true);
        const extraSize = dv.getInt16(offset + 28, true);
        const fileDataOffset = offset + 30 + fileNameSize + extraSize;

        const fileName =
          await arrayBufferToStringAsync(
            this.data.slice(offset + 30, offset + 30 + fileNameSize)
          );
        this.fileList.push(new ZipFile({
          name: fileName,
          data: this.data.slice(fileDataOffset, fileDataOffset + fileSize),
        }));

        offset = fileDataOffset + fileSize;
      }
    }
    return this;
  }

  getFile(name: string): ZipFile | null {
    for (const file of this.fileList) {
      if (file.name === name) {
        return file;
      }
    }
    return null;
  }

  searchFiles(nameRegexp: RegExp): Array<ZipFile> {
    const matchedFileList =
      this.fileList.filter(file => file.name.match(nameRegexp));
    return matchedFileList;
  }

}
