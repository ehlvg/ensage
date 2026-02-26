export const isVercel = Boolean(process.env.VERCEL);

export const hasPostgres =
	Boolean(process.env.POSTGRES_URL) ||
	Boolean(process.env.POSTGRES_URL_NON_POOLING) ||
	Boolean(process.env.DATABASE_URL);

export const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const uploadMode: 'local' | 'blob' = isVercel ? 'blob' : 'local';

export const vercelConfigOk = !isVercel || (hasPostgres && hasBlobToken);
