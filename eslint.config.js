import globals from 'globals';

// A guard for the module split, not a style guide.
// no-undef: a forgotten import would otherwise resolve silently to the browser's element-by-id global
// (e.g. `hd`, `trk`, `tq` are both variables and element ids).
//
// Import cycles are allowed. v11's functions call each other freely (act -> setMachine -> lab, the machine
// table -> master/lab/say ...), and the split moves code verbatim, so the module graph has cycles. They are
// safe because cross-module references inside cycles are function declarations (initialised before any module
// code runs) or are only read when called. Reading another module's `const` while modules are still loading
// would throw a ReferenceError at startup, which every run of the golden suite would report.
export default [
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser },
    rules: {
      'no-undef': 'error',
    },
  },
];
