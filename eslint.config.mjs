import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  globalIgnores(['dist']),
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['cdk/**/*.{js,mjs,cjs,ts}', 'lambda-functions/**/*.{js,mjs,cjs,ts}'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['variableLike', 'method', 'typeLike'],
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
  },
];
