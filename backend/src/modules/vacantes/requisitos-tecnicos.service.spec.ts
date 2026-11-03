import { BadRequestException } from '@nestjs/common';
import { RequisitosTecnicosService } from './requisitos-tecnicos.service';

import { RequisitoTecnicoItemDto } from './dto/requisito-tecnico-item.dto';

describe('RequisitosTecnicosService - HU5-S1-02 Asociar requisitos técnicos', () => {
  let service: RequisitosTecnicosService;

  const VACANTE_ID_1 = '11111111-1111-4111-8111-111111111111';
  const VACANTE_ID_2 = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    service = new RequisitosTecnicosService();
    service.limpiar();
  });

  describe('Verificar la asociación de requisitos técnicos', () => {
    it('al recibir requisitos de una vacante válida, el sistema debe relacionarlos con el identificador correcto de esa vacante', () => {
      const items: RequisitoTecnicoItemDto[] = [
        {
          competencia: 'SQL',
          nivel: 'Avanzado',
          tipo: 'Obligatorio',
          descripcion: 'Dominio de consultas y modelado relacional.',
        },
      ];

      const resultado = service.asociarRequisitos(VACANTE_ID_1, items);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].idVacante).toBe(VACANTE_ID_1);
      expect(resultado[0].competencia).toBe('SQL');
      expect(resultado[0].nivel).toBe('Avanzado');
      expect(resultado[0].tipo).toBe('Obligatorio');
      expect(resultado[0].id).toBeDefined();
    });

    it('rechaza la asociación si no se especifica el identificador de la vacante', () => {
      expect(() =>
        service.asociarRequisitos('', [
          { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
        ]),
      ).toThrow(BadRequestException);
    });
  });

  describe('Verificar múltiples requisitos técnicos', () => {
    it('al asociar varias competencias a una misma vacante, el sistema debe conservar todos los requisitos válidos vinculados a ella', () => {
      const items: RequisitoTecnicoItemDto[] = [
        { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
        { competencia: 'Python', nivel: 'Intermedio', tipo: 'Obligatorio' },
        { competencia: 'Power BI', nivel: 'Intermedio', tipo: 'Obligatorio' },
        { competencia: 'Excel', nivel: 'Avanzado', tipo: 'Deseable' },
      ];

      const resultado = service.asociarRequisitos(VACANTE_ID_1, items);

      expect(resultado).toHaveLength(4);
      const nombresGuardados = resultado.map((r) => r.competencia);
      expect(nombresGuardados).toEqual(['SQL', 'Python', 'Power BI', 'Excel']);
      expect(resultado.every((r) => r.idVacante === VACANTE_ID_1)).toBe(true);
    });
  });

  describe('Verificar la recuperación de requisitos', () => {
    it('al consultar una vacante con requisitos asociados, el sistema debe devolver las competencias técnicas vinculadas a esa vacante', () => {
      service.asociarRequisitos(VACANTE_ID_1, [
        { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
        { competencia: 'Python', nivel: 'Intermedio', tipo: 'Obligatorio' },
      ]);

      const recuperados = service.obtenerRequisitos(VACANTE_ID_1);

      expect(recuperados).toHaveLength(2);
      expect(recuperados.map((r) => r.competencia)).toEqual(['SQL', 'Python']);
      expect(recuperados[0].nivel).toBe('Avanzado');
      expect(recuperados[1].nivel).toBe('Intermedio');
    });

    it('devuelve lista vacía si la vacante no tiene requisitos asociados aún', () => {
      const recuperados = service.obtenerRequisitos('vacante-sin-requisitos');
      expect(recuperados).toEqual([]);
    });
  });

  describe('Verificar el aislamiento entre vacantes', () => {
    it('al consultar los requisitos de una vacante, el sistema no debe incluir requisitos pertenecientes a otra vacante', () => {
      service.asociarRequisitos(VACANTE_ID_1, [
        { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
        { competencia: 'Python', nivel: 'Intermedio', tipo: 'Obligatorio' },
      ]);

      service.asociarRequisitos(VACANTE_ID_2, [
        { competencia: 'React', nivel: 'Avanzado', tipo: 'Obligatorio' },
        { competencia: 'TypeScript', nivel: 'Intermedio', tipo: 'Deseable' },
      ]);

      const requisitosVacante1 = service.obtenerRequisitos(VACANTE_ID_1);
      const requisitosVacante2 = service.obtenerRequisitos(VACANTE_ID_2);

      // Verificación de aislamiento estricto
      expect(requisitosVacante1.map((r) => r.competencia)).toEqual(['SQL', 'Python']);
      expect(requisitosVacante2.map((r) => r.competencia)).toEqual(['React', 'TypeScript']);

      // Ningún requisito de la vacante 2 está en la vacante 1
      expect(requisitosVacante1.some((r) => r.competencia === 'React')).toBe(false);
      expect(requisitosVacante1.some((r) => r.competencia === 'TypeScript')).toBe(false);

      // Ningún requisito de la vacante 1 está en la vacante 2
      expect(requisitosVacante2.some((r) => r.competencia === 'SQL')).toBe(false);
      expect(requisitosVacante2.some((r) => r.competencia === 'Python')).toBe(false);
    });
  });

  describe('Verificar requisitos duplicados', () => {
    it('al asociar nuevamente el mismo requisito técnico a una vacante, el sistema debe evitar su duplicación dentro de la estructura de indexación', () => {
      service.asociarRequisitos(VACANTE_ID_1, [
        { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
      ]);

      // Intento de asociar nuevamente SQL (incluso con mayúsculas/espacios variantes)
      expect(() =>
        service.asociarRequisitos(VACANTE_ID_1, [
          { competencia: '  sql  ', nivel: 'Intermedio', tipo: 'Deseable' },
        ]),
      ).toThrow(BadRequestException);

      // La estructura de indexación conserva una única entrada
      const recuperados = service.obtenerRequisitos(VACANTE_ID_1);
      expect(recuperados).toHaveLength(1);
      expect(recuperados[0].competencia).toBe('SQL');
      expect(recuperados[0].nivel).toBe('Avanzado');
    });

    it('rechaza duplicados dentro del mismo lote de requisitos', () => {
      expect(() =>
        service.asociarRequisitos(VACANTE_ID_1, [
          { competencia: 'Python', nivel: 'Básico', tipo: 'Obligatorio' },
          { competencia: 'python', nivel: 'Avanzado', tipo: 'Deseable' },
        ]),
      ).toThrow(BadRequestException);
    });
  });

  describe('Estructura de indexación para el motor de matching', () => {
    it('genera la estructura indexada con pesos de nivel y segmentación obligatoria/deseable', () => {
      service.asociarRequisitos(VACANTE_ID_1, [
        { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
        { competencia: 'Excel', nivel: 'Intermedio', tipo: 'Deseable' },
      ]);

      const indexData = service.obtenerEstructuraIndexacion(VACANTE_ID_1);

      expect(indexData.totalRequisitos).toBe(2);
      expect(indexData.obligatorios).toHaveLength(1);
      expect(indexData.deseables).toHaveLength(1);

      expect(indexData.competenciasIndex['sql']).toBeDefined();
      expect(indexData.competenciasIndex['sql'].pesoNivel).toBe(3); // Avanzado = 3
      expect(indexData.competenciasIndex['sql'].esObligatorio).toBe(true);

      expect(indexData.competenciasIndex['excel']).toBeDefined();
      expect(indexData.competenciasIndex['excel'].pesoNivel).toBe(2); // Intermedio = 2
      expect(indexData.competenciasIndex['excel'].esObligatorio).toBe(false);
    });
  });

  describe('Actualización y eliminación de requisitos', () => {
    it('permite actualizar el nivel o tipo de un requisito específico', () => {
      const [creado] = service.asociarRequisitos(VACANTE_ID_1, [
        { competencia: 'SQL', nivel: 'Intermedio', tipo: 'Deseable' },
      ]);

      const actualizado = service.actualizarRequisito(VACANTE_ID_1, creado.id, {
        nivel: 'Avanzado',
        tipo: 'Obligatorio',
      });

      expect(actualizado.nivel).toBe('Avanzado');
      expect(actualizado.tipo).toBe('Obligatorio');

      const enIndice = service.obtenerRequisitos(VACANTE_ID_1);
      expect(enIndice[0].nivel).toBe('Avanzado');
      expect(enIndice[0].tipo).toBe('Obligatorio');
    });

    it('permite eliminar un requisito técnico de una vacante', () => {
      const [sql, python] = service.asociarRequisitos(VACANTE_ID_1, [
        { competencia: 'SQL', nivel: 'Avanzado', tipo: 'Obligatorio' },
        { competencia: 'Python', nivel: 'Intermedio', tipo: 'Obligatorio' },
      ]);

      const resultado = service.eliminarRequisito(VACANTE_ID_1, sql.id);
      expect(resultado.eliminado).toBe(true);

      const restantes = service.obtenerRequisitos(VACANTE_ID_1);
      expect(restantes).toHaveLength(1);
      expect(restantes[0].id).toBe(python.id);
    });
  });
});
