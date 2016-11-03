import sha512 from 'js-sha512';

async function stringToArrayBuffer (str: string) {
  return <Promise<ArrayBuffer>> new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', () => resolve(fileReader.result));
    fileReader.addEventListener('error', () => reject(fileReader.error));

    fileReader.readAsArrayBuffer(new Blob([str]));
  });
}

function arrayBufferToHexString (arraybuffer: ArrayBuffer) {
  // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
  const hexCodes: string[] = [];
  const view = new DataView(arraybuffer);
  const padding = '00000000';

  for (let i = 0; i < view.byteLength; i += 4) {
    const value = view.getUint32(i);
    const stringValue = value.toString(16);
    const paddedValue = `${padding}${stringValue}`.slice(-1 * padding.length)
    hexCodes.push(paddedValue);
  }

  return hexCodes.join('');
}

export async function sha512Wrapper (data: string) {
  if (sha512) {
    return Promise.resolve(sha512(data));
  }

  const dataArrayBuffer = await stringToArrayBuffer(data);
  const hashArrayBuffer =
    await crypto.subtle.digest('SHA-512', dataArrayBuffer);
  return arrayBufferToHexString(hashArrayBuffer);
}
