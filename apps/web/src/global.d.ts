/**
 * Declaración de tipos para imports de hojas de estilo globales (side-effect).
 *
 * Next.js resuelve `import "@/app/.../estilos.css"` en tiempo de compilación,
 * pero el compilador de TypeScript no incluye una declaración para archivos
 * `.css`, por lo que el editor reporta "Cannot find module ... for side-effect
 * import". Este archivo la provee.
 */
declare module '*.css';
