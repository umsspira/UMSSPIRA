import { CV_SIZE_MESSAGE, CV_TYPE_MESSAGE, MAX_CV_BYTES, validateCvFile } from './cv-file.policy';

const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

describe('validateCvFile (HU-16)', () => {
  it('acepta un PDF válido', () => {
    expect(() => validateCvFile('curriculum.pdf', pdf)).not.toThrow();
  });

  it('rechaza una extensión distinta aunque el contenido sea PDF', () => {
    expect(() => validateCvFile('curriculum.docx', pdf)).toThrow(CV_TYPE_MESSAGE);
  });

  it('rechaza contenido que no sea PDF', () => {
    expect(() => validateCvFile('curriculum.pdf', Uint8Array.from([0x89, 0x50, 0x4e, 0x47])))
      .toThrow(CV_TYPE_MESSAGE);
  });

  it('rechaza archivos mayores a 4 MB', () => {
    const large = new Uint8Array(MAX_CV_BYTES + 1);
    large.set(pdf);
    expect(() => validateCvFile('curriculum.pdf', large)).toThrow(CV_SIZE_MESSAGE);
  });
});
