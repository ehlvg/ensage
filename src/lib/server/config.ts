import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In production (built), this file lives inside build/ — project root is resolved relative to cwd.
// Use process.cwd() as the canonical project root so paths work in both dev and prod.
const PROJECT_ROOT = process.cwd();

const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

const rawAccent = process.env.ACCENT_COLOR ?? '#22c55e';

export const config = {
	port: parseInt(process.env.PORT ?? '3000', 10),
	uploadDir: process.env.UPLOAD_DIR ?? path.join(PROJECT_ROOT, 'uploads'),
	dbPath: process.env.DB_PATH ?? path.join(PROJECT_ROOT, 'db', 'ensage.db'),
	maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '524288000', 10),
	maxTextSize: parseInt(process.env.MAX_TEXT_SIZE ?? '5242880', 10),
	rateUpload: parseInt(process.env.RATE_LIMIT_UPLOAD ?? '10', 10),
	rateRead: parseInt(process.env.RATE_LIMIT_READ ?? '100', 10),
	rateAuth: parseInt(process.env.RATE_LIMIT_AUTH ?? '20', 10),
	tokenSecret: process.env.TOKEN_SECRET ?? 'ensage-default-secret-change-me',
	exaApiKey: process.env.EXA_API_KEY ?? '',
	accentColor: HEX_RE.test(rawAccent) ? rawAccent : '#22c55e',
	nodeEnv: process.env.NODE_ENV ?? 'production',
	projectRoot: PROJECT_ROOT
} as const;

/** MIME types safe to display inline in the browser */
export const SAFE_INLINE_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'video/mp4',
	'video/webm',
	'audio/mpeg',
	'audio/ogg',
	'audio/wav',
	'application/pdf',
	'text/plain'
]);

// Unused __dirname suppresses linter warnings
void __dirname;
