import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Vacancy } from '../api/vacantes.ts';
import {
  crearVacanteEditable,
  DESCRIPCION_MAX_CARACTERES,
  validarVacante,
  vacanteTieneCambios,
} from '../../app/vacantes/[id]/editar/vacante-edicion.ts';

const vacancy: Vacancy = {
  id: 'vac-123',
  idEmpresa: 'empresa-1',
  empresa: 'Empresa de prueba',
  titulo: 'Analista',
  modalidad: 'Híbrido',
  estado: 'Disponible',
  fechaCreacion: null,
  descripcion: 'Descripción inicial de más de veinte caracteres.',
  ubicacion: 'Cochabamba',
  area: 'Datos',
  condiciones: '',
  requisitos: [{ id: 'req-1', nombre: 'SQL' }],
};

describe('Edición de vacantes (EPIC5-S2-05)', () => {
  it('carga el código derivado del ID y los cambios iniciales están limpios', () => {
    const initial = crearVacanteEditable(vacancy, [
      {
        id: 'req-1',
        idVacante: vacancy.id,
        competencia: 'SQL',
        nivel: 'Avanzado',
        tipo: 'Obligatorio',
      },
    ]);

    assert.equal(initial.id, vacancy.id);
    assert.equal(initial.codigo, vacancy.id);
    assert.equal(vacanteTieneCambios(initial, initial), false);
    assert.equal(vacanteTieneCambios(null, initial), false);
  });

  it('habilita cambios al editar y vuelve al estado inicial al descartar', () => {
    const initial = crearVacanteEditable(vacancy, []);
    const edited = { ...initial, nombre: 'Analista de datos' };

    assert.equal(vacanteTieneCambios(edited, initial), true);
    assert.equal(vacanteTieneCambios(initial, initial), false);
    assert.equal(edited.codigo, initial.codigo);
  });

  it('acepta descripciones hasta 300 caracteres y rechaza las más largas', () => {
    const initial = crearVacanteEditable(vacancy, [
      {
        id: 'req-1',
        idVacante: vacancy.id,
        competencia: 'SQL',
        nivel: 'Avanzado',
        tipo: 'Obligatorio',
      },
    ]);
    const atLimit = {
      ...initial,
      descripcion: 'a'.repeat(DESCRIPCION_MAX_CARACTERES),
    };
    const overLimit = {
      ...initial,
      descripcion: 'a'.repeat(DESCRIPCION_MAX_CARACTERES + 1),
    };

    assert.equal(validarVacante(atLimit), null);
    assert.equal(
      validarVacante(overLimit),
      'La descripción debe tener entre 20 y 300 caracteres.',
    );
  });
});
