
const path = require('path');

module.exports = {
  // Configuración especial para Next.js
  'apps/web/**/*.{js,jsx,ts,tsx}': (filenames) => {
    const files = filenames.map((file) => {
      const relativePath = path.relative(
        path.join(process.cwd(), 'apps/web'),
        file
      );

      return `--file "${relativePath.replace(/\\/g, '/')}"`;
    });

    return `pnpm --filter web exec next lint ${files.join(' ')}`;
  },

  // Configuración para NestJS
  'apps/api/**/*.ts': 'pnpm --filter api exec eslint --fix'
};
