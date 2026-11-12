import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ProjectRepository } from '../ports/project-repository.port';
import { CreateProjectUseCase } from './create-project.use-case';
import { DeleteProjectUseCase } from './delete-project.use-case';
import { ListProjectsUseCase } from './list-projects.use-case';
import { UpdateProjectUseCase } from './update-project.use-case';

const actor: ActorContext = {
  id: 'usuario-1',
  email: 'titulado@example.com',
  name: 'María Pérez',
  role: 'titulado',
  credentialVersion: 1,
  permissions: ['perfil:self:read', 'perfil:self:write'],
  scopes: { graduateId: 'titulado-1', companyIds: [], careerIds: [] },
};
const scope = { graduateId: 'titulado-1', userId: 'usuario-1' };
const project = {
  id: 'proyecto-1',
  graduateId: 'titulado-1',
  name: 'Inventario',
  url: 'https://github.com/maria/inventario',
  description: null,
  createdAt: new Date('2026-11-11T12:00:00Z'),
  updatedAt: null,
};
const input = { nombre: 'Inventario', url: 'https://github.com/maria/inventario' };

function setup() {
  const repository = {
    list: jest.fn().mockResolvedValue([project]),
    create: jest.fn().mockResolvedValue(project),
    update: jest.fn().mockResolvedValue(project),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const asRepository = repository as unknown as ProjectRepository;
  return {
    repository,
    list: new ListProjectsUseCase(asRepository),
    create: new CreateProjectUseCase(asRepository),
    update: new UpdateProjectUseCase(asRepository),
    remove: new DeleteProjectUseCase(asRepository),
  };
}

describe('Proyectos del titulado (HU-19, T19.2)', () => {
  it('lista solo los proyectos del titulado de la sesión', async () => {
    const { repository, list } = setup();

    await expect(list.execute(actor)).resolves.toEqual([project]);
    expect(repository.list).toHaveBeenCalledWith(scope);
  });

  it('crea el proyecto en el perfil del titulado de la sesión', async () => {
    const { repository, create } = setup();

    await expect(create.execute(actor, input)).resolves.toEqual(project);
    expect(repository.create).toHaveBeenCalledWith(scope, input);
  });

  it('edita y elimina dentro del perfil del titulado de la sesión', async () => {
    const { repository, update, remove } = setup();

    await update.execute(actor, 'proyecto-1', input);
    await remove.execute(actor, 'proyecto-1');

    expect(repository.update).toHaveBeenCalledWith(scope, 'proyecto-1', input);
    expect(repository.remove).toHaveBeenCalledWith(scope, 'proyecto-1');
  });

  it('propaga el 403 del repositorio cuando el proyecto es de otro titulado', async () => {
    const { repository, remove } = setup();
    repository.remove.mockRejectedValue(
      new BusinessRuleError('forbidden', 'PROFILE_RECORD_FORBIDDEN', 'No tienes permiso'),
    );

    await expect(remove.execute(actor, 'proyecto-ajeno')).rejects.toMatchObject({
      code: 'PROFILE_RECORD_FORBIDDEN',
    });
  });

  it('rechaza cuentas sin perfil de titulado sin tocar el repositorio', async () => {
    const { repository, list, create } = setup();
    const admin = { ...actor, scopes: { ...actor.scopes, graduateId: null } };

    await expect(list.execute(admin)).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(create.execute(admin, input)).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
