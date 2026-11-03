const path = require('path');

module.exports = {
  // Configuración especial para Next.js
  'apps/web/**/*.{js,jsx,ts,tsx}': (filenames) => {
    const files = filenames.map((file) => {
      // Convierte la ruta absoluta en una ruta relativa a apps/web
      const relativePath = path.relative(path.join(process.cwd(), 'apps/web'), file);
      return `--file ${relativePath}`;
    });
    return `pnpm --filter web exec next lint ${files.join(' ')}`;
  },
  
  // Configuración normal para NestJS
  'apps/api/**/*.ts': (filenames) => {
    return `pnpm --filter api exec eslint ${filenames.join(' ')} --fix`;
  }
};
