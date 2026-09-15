import { sanitizeFileName } from './filename.util';

describe('filename.util', () => {
  it('corrects latin1-mangled Vietnamese filename from NFD', () => {
    const nfd = '1908 DỰ TRÙ MẪU - APP.xlsx'.normalize('NFD');
    const latin1Mangled = Buffer.from(nfd, 'utf8').toString('latin1');
    expect(sanitizeFileName(latin1Mangled)).toBe('1908 DỰ TRÙ MẪU - APP.xlsx');
  });

  it('corrects latin1-mangled Vietnamese filename from NFC', () => {
    const nfc = '1908 DỰ TRÙ MẪU - APP.xlsx'.normalize('NFC');
    const latin1Mangled = Buffer.from(nfc, 'utf8').toString('latin1');
    expect(sanitizeFileName(latin1Mangled)).toBe('1908 DỰ TRÙ MẪU - APP.xlsx');
  });

  it('preserves plain ASCII filenames', () => {
    expect(sanitizeFileName('budget-sample.xlsx')).toBe('budget-sample.xlsx');
  });

  it('preserves already valid UTF-8 filenames', () => {
    expect(sanitizeFileName('Dự toán tour 2026.xlsx')).toBe('Dự toán tour 2026.xlsx');
  });

  it('handles empty input gracefully', () => {
    expect(sanitizeFileName('')).toBe('');
  });
});
