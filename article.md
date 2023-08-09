# Advanced Tailwind colour palettes made easy using plugins

## Intro

Despite the ability to prototype rapidly, fast performance, no zombie CSS and an extensive ecosystem of neat tools and add-ons, something still bothers me about Tailwind CSS. Don't get me wrong: I have fully embraced the utility-first approach to build amazing user interfaces, but extending Tailwind's colour palette in a quick and easy way is a bit of a let-down for me. This article will teach you how to extend the colour palette using Tailwind's plugin API, allowing you to create beautiful applications using your brand's colours.

## Tailwind's design system

Tailwind ships with, as the devs put it themselves, 'an expertly-crafted default colour palette out-of-the-box', consisting from 22 different shades of grey, red, green, and blue. Tailwind's colour system is based on a series of stops ranging from 50 through 950, following the HSL (Hue, Saturation, Lightness) colour space. The different stops increase/decrease the lightness of a certain colour, predictably brightening or darkening the colour. The 500 colour stop of a color is considered the base of a colour: it's like the colour hasn't decided if it wants to be a Jedi or a Sith yet. In summary, this system allows designers and developers alike to create consistent and visually enticing interfaces with ease.

## Extending the colour palette

However, while Tailwind's default colour palette is impressive, it might not be extensive enough if your project requires very specific branding. Fortunately, Tailwind allows us to override existing colours, add additional colours or use arbitrary values for certain use cases.

You can update your `tailwind.config.ts` file to add any amount of new colours as shown below. Depending on your designs and application, you could extend the colour palette in two ways:

You define one or multiple colours inside the `colors` object which is a `key/value` pair of a name and a colour.

```ts
module.exports = {
  theme: {
    extend: {
      colors: {
        purple: '#6600ff',
      },
    },
  },
};
```

Alternatively, you represent a colour in a similar fashion to Tailwind's solution, adding or reducing colour stops according to your needs.

```ts
module.exports = {
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#f0e5ff',
          ...
          500: '#6600ff',
          ...
          950: '#0a001a',
        },
      }
    },
  },
};
```

Now, let's say you are working on an elaborate dashboard application. This app requires shades of green, red and yellow for things such as feedback, warnings, and errors. Aside from that, we'll need to use different shades of grey for your general UI as well as to some brand-specific colours. How would you go about managing this? That's where a Tailwind plugin _might_ come in handy!

## Creating a Tailwind plugin

This part of the tutorial assumes a few things:

- You are familiar with Tailwind CSS, but since you have made it this far, I'm sure you'll manage!
- You are familiar with TypeScript: we do want type safety after all.

First things first - we want our plugin to be as simple as possible. Our requirements:

- We want our plugin to only receive one or multiple names and hex values, in a similar fashion to how Tailwind takes care of extending the colour palette
- We want to leverage existing Tailwind utilities such as `bg-color-500`, `shadow-color-300` and `text-color-800`
- We want to keep IntelliSense for our custom colours working

### Space travel

We want to be able to supply hex colour codes to our plugin. However, earlier we learned that Tailwind uses the HSL colour space.

How do we get there? Space travel. We'll have to traverse various colour spaces to reach our end goal.

According to [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl), `hsl()` expresses `sRGB` colors using hue, saturation and lightness, so let's start by looking at converting hex (our desired input) to rgb.

Hex codes follow a syntax of either 3, 4, 6 or 8 characters: `#RGB`, `#RGBA`, `#RRGGBB` and `#RRGGBBAA`. In this format, `Red`, `Green` and `Blue` are well presented and might look familiar. `A` represents an optional `Alpha` value of the color, indicating transparency. However, given that we don't want to consider transparency or opacity of the actual output (Tailwind exposes opacity utilities for us to use), we'll ignore `A` in this tutorial.

The code below accepts a `hex` string and creates three colour channels: red, green and blue.

```ts
type RGB = {
  red: number;
  green: number;
  blue: number;
};

export const hexToRgb = (hex: string) => {
  // Create RGB channels
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hex.length === 3) {
    // If our input is a 3 character code, we want to duplicate each individual channel.
    red = parseInt(`0x${hex[0]}${hex[0]}`);
    green = parseInt(`0x${hex[1]}${hex[1]}`);
    blue = parseInt(`0x${hex[2]}${hex[2]}`);
  } else {
    // If our input is a 6 character code, we want to use the corresponding R, G and B channels.
    red = parseInt(`0x${hex[0]}${hex[1]}`);
    green = parseInt(`0x${hex[2]}${hex[3]}`);
    blue = parseInt(`0x${hex[4]}${hex[5]}`);
  }

  return {
    red,
    green,
    blue,
  } as RGB;
};
```

The code above already gives us a very neat output:

```ts
const rgb = hexToRgb('#9146ff');
// {
//   red: 145,
//   green: 70,
//   blue: 255,
// }
```

We are now one step closer to our plugin. We 'just' have to convert our RGB colours to the HSL colour space in order to create a palette following the colour stops defined by Tailwind. Converting RGB to HSL is quite the challenge, because of some advanced mathematics going on. The code below contains some insights into what is happening.

```ts
type HSL = {
  hue: number;
  saturation: number;
  lightness: number;
};

export const rgbToHsl = (rgb: RGB) => {
  let { red, green, blue } = rgb;

  // Divide channels by 255 to obtain values between 0 and 1.
  red /= 255;
  green /= 255;
  blue /= 255;

  // Get the minimum and maximum values of those channels.
  const channelMin = Math.min(red, green, blue);
  const channelMax = Math.max(red, green, blue);
  // Get the difference between the minimum and maximum channel values.
  const delta = channelMax - channelMin;

  // Initialise the variables for our HSL colour space.
  let hue = 0;
  let saturation = 0;
  let lightness = 0;

  // Calculate the Hue value. We have to use different formula based on the maximum channel value.
  if (delta === 0) hue = 0;
  else if (channelMax === red) hue = ((green - blue) / delta) % 6;
  else if (channelMax === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  hue = Math.round(hue * 60);

  // Convert negative hue values to positive values.
  if (hue < 0) hue += 360;

  // Calculate lightness, which is the sum of the maximum and minimum channel values divided by 2.
  lightness = (channelMax + channelMin) / 2;

  // Calculate saturation, which depend on lightness. If there is no difference between the channels, our saturation will be 0. If there is a difference, we leverage lightness.
  saturation = delta == 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  // Convert these values to a fixed percentage value, which can be used in a hsl() function.
  saturation = +(saturation * 100).toFixed(1);
  lightness = +(lightness * 100).toFixed(1);

  return {
    hue,
    saturation,
    lightness,
  } as HSL;
};
```

Phew, that was quite the pill to swallow. You can read up a bit more on the whole science-y part over [here](https://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/), if you are interested. Regardless, this code now gives us an even neater output that we get to use in our plugin. Trust me, we're getting there!

```ts
const rgb = hexToRgb('#9146ff'); // First go from hex to RGB
const hsl = rgbToHsl(rgb); // Then go from RGB to HSL
// {
//   hue: 264,
//   saturation: 100,
//   lightness: 63.7
// }
```

### Making a plugin

#### Introduction

This is where things get interesting. We are going to use the logic we wrote previously and hook this up to a Tailwind plugin, along with some additional things we'll have to take care of. There are a few ways to go about this, but we'll first get familiar with the idea of writing Tailwind plugins.

Plugins allow us to inject new styles into our app's stylesheets using JavaScript instead of CSS. To get started, we can add a `plugins` array in our `tailwind.config.ts` file. Each entry in our array would be a `plugin()` function that takes an anonymous function as its first argument, in which you can destructure quite a few helper functions that might suite your plugins needs.

Some examples include

- `addBase()` (for registering new base styles)
- `theme()` (for accessing the Tailwind config in your project)
- `addUtilities()` (for added new static utility styles)

All helper functions can be found in the [Tailwind docs](https://tailwindcss.com/docs/plugins). Additionally, `plugin()` takes another optional argument that'll allow us to merge configuration values into the `tailwind.config.ts` file. Lastly, there is also a `plugin.withOptions()` function that can be used to pass options to the plugin if they don't necessarily belong in the `tailwind.config.ts` file. The API is similar to the `plugin()` API, except that each argument should be a function that receives `options`.

Given that we want our colour palette to be based on different hex values passed into our plugin, we can start of by defining a `plugin` variable which is an instance of Tailwind's `plugin.withOptions` function. We can use `addBase()` to register new styles in Tailwind's `base` layer. Let's set up our `tailwind.config.ts` file to get started:

```ts
import type { Config } from 'tailwindcss';

export default {
  plugins: [
    plugin.withOptions((options) => {
      // Our new base styles end up here.
    }, (options) => {
      // Our configuration options end up here.
    });
  ],
} satisfies Config;
```

#### Our plugin

Let's take a step back for a second.

What do we want to achieve? Ideally, we'd want to extend the current colour palette with any colour palette we generate based on a single hex colour.

A few things we need to do:

1. Figure out, or define, the Tailwind colour stops already present in its extensive palette
2. Use our earlier hex to rgb to hsl logic to end up with a single HSL value for one hex code
3. Figure out a way to apply the Tailwind colour stops to our HSL colour, so that we end up with an actual palette
4. Add the new palette to the existing Tailwind palettes

As we learned earlier, Tailwind represents its colour palette using values ranging from 50 through 950, in which 50 and 950 represent the lightest and darkest shades of a single colour, respectively. We can translate these steps to code and use TypeScript to get some neat inference going on.

```ts
// This represents a readonly array of all color stops within Tailwind's design system.
const COLOR_STOPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

// We then use our readonly array to create a union type for the different colour stops.
// This will be inferred as 50 | 100 | ... | 900 | 950.
type ColorStop = (typeof COLOR_STOPS)[number];
```

We can then use these colour stops to determine the lightness for each stop.

```ts
// We first divide the stop (for example 500) by 10 to get its percentage equivalent, and then subtract that from 100 (the maximum amount of lightness that can be applied to a colour).
const getLightnessForColorStop = (stop: ColorStop) => 100 - stop / 10;
getLightnessForColorStop(50); // 95
getLightnessForColorStop(500); // 50
getLightnessForColorStop(950); // 5
```

We've already come a long way! Next up? Let's generate an actual HSL color for each stop we have defined earlier.

```ts
const { hue, saturation } = hexToHsl('#9146ff');

COLOR_STOPS.forEach((stop) => {
  const lightness = getLightnessForColorStop(stop);
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
});
```

We iterate over `COLOR_STOPS` to generate a HSL colour with applied lightness for each stop. This gives us a nice list of `hsl()` strings with different percentages of lightness. You'll also notice that I've been a bit cheeky and introduced something new: `hexToHsl`. This is basically a helper function that calls the `hexToRgb` and `rgbToHsl` functions we defined earlier.

Next, we'll make sure that all colours we pass into our plugin's options can get picked up and parsed into an actual palette:

```ts
const createColorObject = (
  colors: ResolvableTo<RecursiveKeyValuePair<string, string>>,
  valueFormatter: (key: string, value: number) => string,
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
```

We iterate over all the `colors` passed in and create a `colorObject` for each `key` of `colors`. That means that a colour option passed into the plugin named `primary` will become a new key in this `colorObject`. We iterate over all familiar colour stops and assign the associated colour to a new key inside a nested object in `colorObject`.

However, you might have noticed something funky going on - something we didn't read about before.

What on earth is `valueFormatter`?

`valueFormatter` is an additional argument to be passed into `createColorObject`. It'll allow us to write our logic once but get different output for the different use cases of our plugin:

1. Creating CSS variables
2. Adding the colours to our palette

Aside from that, you might also see some interesting types taking the stage: these are imported from Tailwind CSS.

Output of this would look like this:

```ts
{
  primary: {
    'primary-50': 'hsl(264, 100%, 95%)',
    // ...
    'primary-500': 'hsl(264, 100%, 50%)',
    // ...
    'primary-950': 'hsl(264, 100%, 5%)'
  },
  secondary: {
    'secondary-50': 'hsl(58, 100%, 95%)',
    // ...
    'secondary-500': 'hsl(58, 100%, 50%)',
    // ...
    'secondary-950': 'hsl(58, 100%, 5%)'
  }
}
```

Let's bring our code together and knock this plugin out of the park. We'll need to do a few things to achieve the above use cases:

1. Create valid CSS variables and add them to the `:root` of our stylesheet using `addBase()`
2. Create an object of colours to inject into our stylesheet

#### CSS Variables

CSS variables are a relatively new feature. They represent custom properties that contain a value that can be used in other declarations using the `var()` function. More information about them can be found on the excellent documentation of [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/--*).

Keep in mind that CSS variables are always prefixed with `--`. This is where the `valueFormatter` we saw earlier comes in: we can pass this into `createColorObject` to format the output in such a way that it becomes a valid CSS variable.

```ts
const colorVariables = createColorObject(
  colors,
  (key, value) => `--${key}-${value}`,
);
```

This results in an output similar to what we saw earlier, but with each nested `key` (e.g., `primary-50` or `secondary-700`) being formatted as a valid CSS variable: `--primary-50` or `--secondary-700`.

#### Colour injection

We can achieve the same outcome for the colours we want to inject into our stylesheet.

```ts
const colorPalette = createColorObject(
  colors,
  (key, value) => `${key}-${value}`,
);
```

#### Wrapping up

However, both the `colorVariables` and `colorPalette` are not useable for us yet. That is because all values are in a data structure that is too elaborate for Tailwind (or probably even regular CSS) to understand. We can resolve this by flattening our nested object structure and pass that result to the plugin.

```ts
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
```

Now, let's wrap up!

We want to flatten our outputs and put them in the correct location within our plugin. Your final plugin should look somewhat like this:

```ts
export const colorPlugin = plugin.withOptions(
  ({ colors }) => {
    const colorVariables = flattenColorObject(
      createColorObject(colors, (key, value) => `--${key}-${value}`),
    );

    return ({ addBase }) => {
      addBase({
        // colorVariables are supposed to go on our :root element on the base layer.
        ':root': colorVariables,
      });
    };
  },

  ({ colors }: { colors: Partial<Config> }) => {
    const colorPalette = flattenColorObject(
      createColorObject(colors, (key, value) => `${key}-${value}`),
    );

    return {
      // The theme's colour palette can be extended with our generated colorPalette.
      theme: { extend: { colors: colorPalette } },
    };
  },
);
```

## Conclusion and next steps

You can then import and add the plugin into your `tailwind.config.ts` file. Be sure to add as many colours as your heart desires!

```ts
import type { Config } from 'tailwindcss';
import { colorPlugin } from './src/plugins/colors';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    colorPlugin({
      colors: {
        primary: '#9146ff',
        secondary: '#fff945',
      },
    }),
  ],
} satisfies Config;
```

Plug this into your code base and go wild with colours tailored specifically to your project's needs. Some final takeaways:

- Colour and colour theory are hard. A form of art. Designers and experts alike spend days, weeks or even months defining and refining colour palettes to convey messages and match with the vision of their brands and products. Our generated colour palettes, while very useful, might not be suited for your project's use case.
- What if you don't actually need a full palette with stops ranging from 50 through 950? No worries! These unused classes are tree shaken regardless, so no need to worry about bloating your bundle. In any case, you can still use the existing Tailwind colours or extend your `tailwind.config.ts` file on an as-needed basis.
- Our colour palette hasn't been tested for accessibility purposes, meaning this might give us issues in the long term.

I hope you learned something new and exciting today. Feel free to look at the final code on my **GitHub ADD LINK HERE** profile.

Godspeed.
