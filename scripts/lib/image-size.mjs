// Intrinsic dimensions read straight from the file header, so body images can
// carry width/height without pulling in an image dependency. Returns undefined
// for anything it does not recognise; callers fall back to omitting the attrs.

const readPng = (buffer) => {
  if (buffer.length < 24) return undefined;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const readGif = (buffer) => {
  if (buffer.length < 10) return undefined;
  if (buffer.toString('ascii', 0, 3) !== 'GIF') return undefined;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
};

const readJpeg = (buffer) => {
  if (buffer.length < 4) return undefined;
  if (buffer.readUInt16BE(0) !== 0xffd8) return undefined;

  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    // SOF0-SOF15 carry the frame size; DHT/DAC/RST markers in that range do not.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }

    offset += 2 + length;
  }

  return undefined;
};

const readWebp = (buffer) => {
  if (buffer.length < 30) return undefined;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return undefined;
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return undefined;

  const format = buffer.toString('ascii', 12, 16);

  if (format === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }

  if (format === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (format === 'VP8X') {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  return undefined;
};

export const imageSize = (buffer) =>
  readPng(buffer) ?? readGif(buffer) ?? readJpeg(buffer) ?? readWebp(buffer);
