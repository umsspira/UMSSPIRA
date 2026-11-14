export type RequisitoTecnico = {
  nombre: string;
  nivel: "Básico" | "Intermedio" | "Avanzado";
  tipo: "Obligatorio" | "Deseable";
};

export type VacanteEditable = {
  id: string;
  nombre: string;
  estado: "Disponible" | "No disponible";
  codigo: string;
  descripcion: string;
  requisitos: RequisitoTecnico[];
};

export type EstadoEdicion =
  | "inicial"
  | "error"
  | "pendiente"
  | "guardado";

// Datos de ejemplo para probar los 4 mockups.
// Posteriormente se reemplazarán por la API del backend.
export function crearVacanteEjemplo(id: string): VacanteEditable {
  return {
    id,
    nombre: "Analista de Datos Junior",
    estado: "Disponible",
    codigo: `VAC-${id.padStart(4, "0")}`,
    descripcion:
      "Apoyar análisis comercial, reportes y tableros para toma de decisiones.",
    requisitos: [
      { nombre: "SQL", nivel: "Avanzado", tipo: "Obligatorio" },
      { nombre: "Python", nivel: "Intermedio", tipo: "Obligatorio" },
      { nombre: "Power BI", nivel: "Intermedio", tipo: "Obligatorio" },
      { nombre: "Excel", nivel: "Avanzado", tipo: "Deseable" },
    ],
  };
}

export function requisitoDuplicado(
  requisitos: RequisitoTecnico[],
  nombre: string
): boolean {
  return requisitos.some(
    (r) =>
      r.nombre.trim().toLowerCase() ===
      nombre.trim().toLowerCase()
  );
}

export function validarVacante(
  vacante: VacanteEditable
): string | null {
  if (!vacante.nombre.trim()) {
    return "El nombre del cargo es obligatorio.";
  }

  if (!vacante.descripcion.trim()) {
    return "La descripción de la vacante es obligatoria.";
  }

  if (vacante.requisitos.length === 0) {
    return "La vacante debe tener al menos un requisito técnico.";
  }

  const nombres = vacante.requisitos.map((r) =>
    r.nombre.trim().toLowerCase()
  );

  if (new Set(nombres).size !== nombres.length) {
    return "No se permiten requisitos técnicos duplicados.";
  }

  return null;
}

// Almacenamiento aislado para la demostración.
// No modifica el almacenamiento que utilizan otros módulos.
export function guardarDemostracion(
  vacante: VacanteEditable
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    `hu5-edicion-demo-${vacante.id}`,
    JSON.stringify(vacante)
  );
}

export function leerDemostracion(
  id: string
): VacanteEditable | null {
  if (typeof window === "undefined") return null;

  try {
    const datos = localStorage.getItem(`hu5-edicion-demo-${id}`);
    if (!datos) return null;

    const vacante = JSON.parse(datos) as VacanteEditable;

    if (
      vacante.id !== id ||
      typeof vacante.nombre !== "string" ||
      typeof vacante.descripcion !== "string" ||
      !Array.isArray(vacante.requisitos)
    ) {
      return null;
    }

    return vacante;
  } catch {
    return null;
  }
}