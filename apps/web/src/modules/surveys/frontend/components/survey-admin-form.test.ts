import { validateSurveyForm } from './survey-admin-form';

describe('validateSurveyForm', () => {
  it('CA-03: marca como obligatorios los campos vacíos', () => {
    const errors = validateSurveyForm({ title: '', startDate: '', endDate: '' });
    expect(errors.title).toBe('Este campo es obligatorio');
    expect(errors.startDate).toBe('Este campo es obligatorio');
    expect(errors.endDate).toBe('Este campo es obligatorio');
  });

  it('CA-04: la fecha de fin no puede ser anterior a la de inicio', () => {
    const errors = validateSurveyForm({
      title: 'Encuesta 2027',
      startDate: '2027-03-01',
      endDate: '2027-02-01',
    });
    expect(errors.endDate).toBe('La fecha de fin no puede ser anterior a la de inicio');
    expect(errors.title).toBeUndefined();
  });

  it('no da errores con datos válidos', () => {
    expect(
      validateSurveyForm({ title: 'Encuesta 2027', startDate: '2027-01-15', endDate: '2027-12-31' }),
    ).toEqual({});
  });

  it('pide la carrera cuando el administrador tiene varias', () => {
    const values = { title: 'Encuesta 2027', startDate: '2027-01-15', endDate: '2027-12-31' };
    expect(validateSurveyForm(values, true).careerId).toBe('Este campo es obligatorio');
    expect(validateSurveyForm({ ...values, careerId: 'c2' }, true)).toEqual({});
    expect(validateSurveyForm(values)).toEqual({});
  });
});