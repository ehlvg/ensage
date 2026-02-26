/** Format a byte count as a human-readable string */
export function formatBytes(bytes: number): string {
	if (bytes < 1_024) return `${bytes} B`;
	if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
	if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
	return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

/** Format a future timestamp as a relative string (e.g. "in 3h") */
export function formatRelative(ts: number | null): string {
	if (!ts) return 'never';
	const diff = ts - Date.now();
	if (diff < 0) return 'expired';
	const s = Math.floor(diff / 1000);
	if (s < 60) return `in ${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `in ${m}m`;
	const h = Math.floor(m / 60);
	if (h < 24) return `in ${h}h`;
	return `in ${Math.floor(h / 24)}d`;
}
