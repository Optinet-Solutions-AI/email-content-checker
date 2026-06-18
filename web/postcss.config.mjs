/**
 * postcss.config.mjs — PostCSS pipeline (Tailwind + autoprefixer)
 *
 * Inputs:  globals.css
 * Outputs: processed CSS
 * Used by: Next.js build
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
