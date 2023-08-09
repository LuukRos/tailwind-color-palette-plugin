import plugin from 'tailwindcss/plugin';
import { hexToHsl } from './color-utils';

export const COLOR_STOPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

type ColorStop = (typeof COLOR_STOPS)[number];
type Color = `#${string}`;
type Colors = Record<string, Color>;

export const getLightnessForColorStop = (stop: ColorStop) => 100 - stop / 10;

export const createColorObject = (
  colors: Colors,
  valueFormatter: (key: string, value: ColorStop) => string,
) => {
  const colorObject: Record<string, Record<string, string>> = {};

  Object.entries(colors).forEach(([key, value]) => {
    colorObject[key] = {} as { [key in ColorStop]: string };

    const { hue, saturation } = hexToHsl(value);
    COLOR_STOPS.forEach((stop) => {
      const lightness = getLightnessForColorStop(stop);
      colorObject[key][
        valueFormatter(key, stop)
      ] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    });
  });

  return colorObject;
};

const flattenColorObject = (input: ReturnType<typeof createColorObject>) => {
  const result: { [key: string]: string } = {};

  for (const key in input) {
    const nestedColors = input[key];

    for (const nestedKey in nestedColors) {
      result[nestedKey] = nestedColors[nestedKey];
    }
  }

  return result;
};

type PluginOptions = {
  /**
   * Object of key/value pairs of color names and hex values.
   */
  colors: Colors;
};

export const colorPlugin = plugin.withOptions(
  ({ colors }: PluginOptions) => {
    const colorVariables = flattenColorObject(
      createColorObject(colors, (key, value) => `--${key}-${value}`),
    );

    return ({ addBase }) => {
      addBase({
        ':root': colorVariables,
      });
    };
  },

  ({ colors }: PluginOptions) => {
    const colorPalette = flattenColorObject(
      createColorObject(colors, (key, value) => `${key}-${value}`),
    );

    return {
      theme: { extend: { colors: colorPalette } },
    };
  },
);
