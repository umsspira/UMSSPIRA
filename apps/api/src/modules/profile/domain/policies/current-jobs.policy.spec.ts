import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { MAX_CURRENT_JOBS_MESSAGE, assertCurrentJobsLimit } from './current-jobs.policy';

describe('assertCurrentJobsLimit (HU-21 CA-09)', () => {
  it('permite un trabajo actual mientras haya menos de 2 guardados', () => {
    expect(() => assertCurrentJobsLimit(true, 0)).not.toThrow();
    expect(() => assertCurrentJobsLimit(true, 1)).not.toThrow();
  });

  it('rechaza un tercer trabajo actual con el mismo mensaje que el formulario', () => {
    expect(() => assertCurrentJobsLimit(true, 2)).toThrow(BusinessRuleError);
    expect(() => assertCurrentJobsLimit(true, 2)).toThrow(MAX_CURRENT_JOBS_MESSAGE);
  });

  it('un trabajo con fecha fin no cuenta para el límite', () => {
    expect(() => assertCurrentJobsLimit(false, 5)).not.toThrow();
  });
});
