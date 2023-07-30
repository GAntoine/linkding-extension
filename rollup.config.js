import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import copy from "rollup-plugin-copy";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";

const production = !process.env.ROLLUP_WATCH;

export default [
  {
    input: "src/index.ts",
    output: [
      {
        sourcemap: true,
        format: "iife",
        name: "linkding",
        file: "build/chrome/build/bundle.js",
      },
      {
        sourcemap: true,
        format: "iife",
        name: "linkding",
        file: "build/firefox/build/bundle.js",
      },
    ],
    plugins: [
      // Compile Svelte components
      svelte({ emitCss: false, preprocess: sveltePreprocess() }),

      // Resolve bare module imports
      resolve({
        browser: true,
        dedupe: (importee) =>
          importee === "svelte" || importee.startsWith("svelte/"),
      }),

      // Minify if building for production
      production && terser(),

      // Compile TypeScript files
      typescript(),

      // Copy static files to build directory
      copy({
        targets: [
          {
            src: ["icons", "options", "popup", "styles"],
            dest: ["build/chrome", "build/firefox"],
          },
        ],
      }),
    ],
    watch: {
      clearScreen: false,
    },
  },
  {
    input: "src/background.ts",
    output: [
      {
        sourcemap: true,
        format: "iife",
        file: "build/chrome/build/background.js",
      },
      {
        sourcemap: true,
        format: "iife",
        file: "build/firefox/build/background.js",
      },
    ],
    plugins: [
      // Resolve bare module imports
      resolve({ browser: true }),

      // Minify if building for production
      production && terser(),

      // Compile TypeScript files
      typescript(),
    ],
    watch: {
      clearScreen: false,
    },
  },
];
