type RGB = {
  red: number;
  green: number;
  blue: number;
};

const HEX_VALIDATION_REGEX = new RegExp(
  /^#(?:(?:[\da-f]{3}){1,2}|(?:[\da-f]{4}){1,2})$/i,
);

export const isValidHex = (hex: string) => HEX_VALIDATION_REGEX.test(hex);

export const stripHash = (hex: string) => hex.replace('#', '');

export const parseHexChannels = (hex: string, channels: number[]) =>
  parseInt(`0x${channels.map((channel) => hex[channel]).join('')}`);

export const hexToRgb = (hex: string) => {
  hex = stripHash(hex);

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hex.length === 4) hex = hex.substring(0, 3);
  if (hex.length === 8) hex = hex.substring(0, 6);

  if (hex.length === 3) {
    red = parseHexChannels(hex, [0, 0]);
    green = parseHexChannels(hex, [1, 1]);
    blue = parseHexChannels(hex, [2, 2]);
  } else {
    red = parseHexChannels(hex, [0, 1]);
    green = parseHexChannels(hex, [2, 3]);
    blue = parseHexChannels(hex, [4, 5]);
  }

  return {
    red,
    green,
    blue,
  } as RGB;
};

type HSL = {
  hue: number;
  saturation: number;
  lightness: number;
};

export const rgbToHsl = (rgb: RGB) => {
  let { red, green, blue } = rgb;

  // Make r, g, and b fractions of 1
  red /= 255;
  green /= 255;
  blue /= 255;

  // Find greatest and smallest channel values
  const channelMin = Math.min(red, green, blue);
  const channelMax = Math.max(red, green, blue);
  const delta = channelMax - channelMin;

  let hue = 0;
  let saturation = 0;
  let lightness = 0;

  if (delta === 0) hue = 0;
  else if (channelMax === red) hue = ((green - blue) / delta) % 6;
  else if (channelMax === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  hue = Math.round(hue * 60);

  if (hue < 0) hue += 360;

  lightness = (channelMax + channelMin) / 2;
  saturation = delta == 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  saturation = +(saturation * 100).toFixed(1);
  lightness = +(lightness * 100).toFixed(1);

  return {
    hue,
    saturation,
    lightness,
  } as HSL;
};

export const hexToHsl = (hex: string) => {
  hex = stripHash(hex);

  const rgb = hexToRgb(hex);
  const { hue, saturation, lightness } = rgbToHsl(rgb);

  return {
    hue,
    saturation,
    lightness,
  } as HSL;
};
