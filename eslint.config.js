import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'src/scripts/app.js']
  },
  {
    files: ['src/scripts/lib/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {...globals.browser}
    },
    rules: {
      'no-unused-vars': ['error', {args: 'none'}]
    }
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {...globals.node}
    }
  }
];
