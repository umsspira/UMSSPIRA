import { CreateCustomInterestUseCase } from './create-custom-interest.use-case';
import { UpdateCustomInterestUseCase } from './update-custom-interest.use-case';
import { DeleteCustomInterestUseCase } from './delete-custom-interest.use-case';
import type { MentorCatalogRepository } from '../ports/mentor-catalog-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

describe('Custom Interests Use Cases', () => {
  const actor: ActorContext = {
    id: '11111111-1111-1111-1111-111111111111',
    permissions: ['mentores:self:write'],
  } as unknown as ActorContext;

  let mockRepo: jest.Mocked<MentorCatalogRepository>;
  let createUseCase: CreateCustomInterestUseCase;
  let updateUseCase: UpdateCustomInterestUseCase;
  let deleteUseCase: DeleteCustomInterestUseCase;

  beforeEach(() => {
    mockRepo = {
      areas: jest.fn(),
      setAreas: jest.fn(),
      interestCatalog: jest.fn(),
      interests: jest.fn(),
      addInterests: jest.fn(),
      removeInterest: jest.fn(),
      createCustomInterest: jest.fn(),
      updateCustomInterest: jest.fn(),
      removeCustomInterest: jest.fn(),
    };
    createUseCase = new CreateCustomInterestUseCase(mockRepo);
    updateUseCase = new UpdateCustomInterestUseCase(mockRepo);
    deleteUseCase = new DeleteCustomInterestUseCase(mockRepo);
  });

  describe('CreateCustomInterestUseCase', () => {
    it('creates a custom interest and delegates to repository (CAF-02)', async () => {
      mockRepo.createCustomInterest.mockResolvedValue({
        interest: {
          id: 'interest-1',
          name: 'GraphQL Avanzado',
          area: { id: 'area-1', name: 'Backend' },
          esPersonalizado: true,
        },
        coincidenciaSugerido: false,
        mensaje: 'Interés agregado',
      });

      const result = await createUseCase.execute(actor, {
        areaId: 'area-1',
        texto: 'GraphQL Avanzado',
      });

      expect(mockRepo.createCustomInterest).toHaveBeenCalledWith(
        actor.id,
        'area-1',
        'GraphQL Avanzado',
      );
      expect(result.interest.esPersonalizado).toBe(true);
      expect(result.coincidenciaSugerido).toBe(false);
    });

    it('returns matched suggested indicator if topic coincides (CAF-07)', async () => {
      mockRepo.createCustomInterest.mockResolvedValue({
        interest: {
          id: 'suggested-1',
          name: 'NestJS',
          area: { id: 'area-1', name: 'Backend' },
          esPersonalizado: false,
        },
        coincidenciaSugerido: true,
        mensaje: 'Se seleccionó el interés sugerido existente',
      });

      const result = await createUseCase.execute(actor, {
        areaId: 'area-1',
        texto: 'nestjs',
      });

      expect(result.coincidenciaSugerido).toBe(true);
      expect(result.interest.esPersonalizado).toBe(false);
    });
  });

  describe('UpdateCustomInterestUseCase', () => {
    it('updates custom interest text (CAF-10)', async () => {
      mockRepo.updateCustomInterest.mockResolvedValue({
        id: 'interest-1',
        name: 'NestJS + Microservicios',
        area: { id: 'area-1', name: 'Backend' },
        esPersonalizado: true,
      });

      const result = await updateUseCase.execute(actor, 'interest-1', {
        texto: 'NestJS + Microservicios',
      });

      expect(mockRepo.updateCustomInterest).toHaveBeenCalledWith(
        actor.id,
        'interest-1',
        'NestJS + Microservicios',
      );
      expect(result.name).toBe('NestJS + Microservicios');
    });
  });

  describe('DeleteCustomInterestUseCase', () => {
    it('removes custom interest (CAF-09)', async () => {
      mockRepo.removeCustomInterest.mockResolvedValue();

      const result = await deleteUseCase.execute(actor, 'interest-1');

      expect(mockRepo.removeCustomInterest).toHaveBeenCalledWith(actor.id, 'interest-1');
      expect(result).toEqual({
        id: 'interest-1',
        eliminado: true,
        mensaje: 'Interés eliminado',
      });
    });
  });
});
