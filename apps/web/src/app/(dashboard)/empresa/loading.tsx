import { Cargando } from "./_components/estado-pantalla";

// CA-08: mientras Next prepara cualquier pantalla de /empresa se ve un indicador, no una pantalla en blanco.
export default function EmpresaLoading() {
  return <Cargando texto="Cargando..." />;
}
