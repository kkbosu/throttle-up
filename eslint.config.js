import globals from 'globals';
import importX from 'eslint-plugin-import-x';

// Guards for the module split, not a style guide:
// - no-undef: a forgotten import would otherwise resolve silently to the browser's element-by-id global
//   (e.g. `hd`, `trk`, `tq` are both variables and element ids).
// - import-x/no-cycle: module cycles make evaluation order fragile.
export default [
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser },
    plugins: { 'import-x': importX },
    rules: {
      'no-undef': 'error',
      'import-x/no-cycle': 'error',
    },
  },
];
