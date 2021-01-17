const keyStr =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=';

export function encode(input: string): string {
  const output = [];
  let chr1;
  let chr2;
  let chr3;
  let enc1;
  let enc2;
  let enc3;
  let enc4;
  let i = 0;

  do {
    chr1 = input.charCodeAt(i++);
    chr2 = input.charCodeAt(i++);
    chr3 = input.charCodeAt(i++);

    // eslint-disable-next-line no-bitwise
    enc1 = chr1 >> 2;
    // eslint-disable-next-line no-bitwise
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    // eslint-disable-next-line no-bitwise
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    // eslint-disable-next-line no-bitwise
    enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }

    output.push(
      keyStr.charAt(enc1) +
        keyStr.charAt(enc2) +
        keyStr.charAt(enc3) +
        keyStr.charAt(enc4),
    );
  } while (i < input.length);

  return output.join('');
}

export function encodeFromByteArray(input: number[]): string {
  const output = [];
  let chr1;
  let chr2;
  let chr3;
  let enc1;
  let enc2;
  let enc3;
  let enc4;
  let i = 0;

  do {
    chr1 = input[i++];
    chr2 = input[i++];
    chr3 = input[i++];

    // eslint-disable-next-line no-bitwise
    enc1 = chr1 >> 2;
    // eslint-disable-next-line no-bitwise
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    // eslint-disable-next-line no-bitwise
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    // eslint-disable-next-line no-bitwise
    enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }

    output.push(
      keyStr.charAt(enc1) +
        keyStr.charAt(enc2) +
        keyStr.charAt(enc3) +
        keyStr.charAt(enc4),
    );
  } while (i < input.length);

  return output.join('');
}

export function urlDecode(input: string): string {
  let output = '';
  let i = 0;

  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  const base64test = /[^A-Za-z0-9\-_=]/g;
  if (base64test.exec(input)) {
    throw new Error(
      'There were invalid base64 characters in the input text.\n' +
        "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
        'Expect errors in decoding.',
    );
  }

  do {
    const enc1 = keyStr.indexOf(input.charAt(i++));
    const enc2 = keyStr.indexOf(input.charAt(i++));
    const enc3 = keyStr.indexOf(input.charAt(i++));
    const enc4 = keyStr.indexOf(input.charAt(i++));

    // eslint-disable-next-line no-bitwise
    const chr1 = (enc1 << 2) | (enc2 >> 4);

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      // eslint-disable-next-line no-bitwise
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      // eslint-disable-next-line no-bitwise
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);

  return decodeURIComponent(escape(output));
}
