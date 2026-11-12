// Datos de un proyecto tal como llegan en el cuerpo de la petición (HU-19)
export interface ProjectInput {
  nombre: string;
  url: string;
  descripcion?: string | null;
}
