/**
 * Punto único que se ejecuta una sola vez después de guardar varios registros juntos (HU-13, T13.6),
 * en vez de una vez por registro.
 * La afinidad la recalcula Épica 3. Hoy el front de perfil no llama al recálculo: recalculateAffinity
 * (shared/services/affinity-service) no se usa en ninguna pantalla de perfil. Cuando Épica 3 lo defina,
 * se conecta aquí.
 */
export async function afterBatchSave(savedCount: number): Promise<void> {
  if (savedCount === 0) return;
  // TODO(E3): conectar aquí el recálculo de afinidad del egresado
}
