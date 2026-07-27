import pluginJs from '@eslint/js'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import eslintConfigPrettier from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'build/',
      'dist/',
      '.turbo/',
      '.vercel/',
      'coverage/',
      '*.log',
      '.env*',
      '*.d.ts',
      'next-env.d.ts',
    ],
  },

  // base files
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  ...nextTs,
  perfectionist.configs['recommended-natural'],
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'consistent-return': 'error',
      'eol-last': ['error', 'always'],
      indent: 'off',
      'max-len': 'off',
      'no-control-regex': 'off',
      'no-fallthrough': 'error',
      'no-multiple-empty-lines': [
        'error',
        {
          max: 1,
          maxBOF: 0,
          maxEOF: 0,
        },
      ],
      'no-unreachable': 'error',
      'object-shorthand': ['error', 'always'],
      'perfectionist/sort-interfaces': 'warn',
      'perfectionist/sort-objects': 'warn',
      quotes: 'off',
      'require-await': 'error',
      semi: 'off',
    },
  },
]

export default config
