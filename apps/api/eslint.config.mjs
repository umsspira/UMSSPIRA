import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'src/generated/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      curly: ['error', 'all'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/modules/nlp/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(?:^|/)radar(?:/|$)',
              message: 'El módulo NLP no debe depender del módulo Radar.',
            },
            {
              regex: '.*',
              importNames: ['RADAR_AREA_IDS'],
              message: 'El catálogo de áreas pertenece al módulo Radar.',
            },
          ],
        },
      ],
    },
  },
);
