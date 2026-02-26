import { describe, it, expect } from 'vitest';
import { sanitizeFilename, contentDisposition } from './helpers.js';

describe('sanitizeFilename', () => {
	it('preserves simple ASCII names', () => {
		expect(sanitizeFilename('file.txt')).toBe('file.txt');
	});

	it('preserves non-ASCII characters like Cyrillic', () => {
		expect(sanitizeFilename('тестовый-файл.txt')).toBe('тестовый-файл.txt');
	});

	it('replaces forbidden characters and trims length', () => {
		const name = 'my*file:?<>.txt';
		expect(sanitizeFilename(name)).toBe('my_file____.txt');
	});

	it('falls back to "file" when nothing usable remains', () => {
		expect(sanitizeFilename('   \u0000\u0001 ')).toBe('file');
	});
});

describe('contentDisposition', () => {
	it('builds a header that includes an ASCII fallback and UTF-8 filename*', () => {
		const header = contentDisposition('attachment', 'тестовый-файл.txt');
		expect(header).toContain('attachment;');
		expect(header).toContain('filename="');
		expect(header).toContain("filename*=UTF-8''");
		expect(header).toContain('%D1%82%D0%B5%D1%81%D1%82%D0%BE%D0%B2%D1%8B%D0%B9');
	});
});

