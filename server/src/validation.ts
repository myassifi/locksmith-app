export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Expected an object');
  return value as Record<string, unknown>;
}

export function text(value: unknown, name: string, required = false): string | null {
  if (value === null || value === undefined || value === '') {
    if (required) throw new ApiError(400, `${name} is required`);
    return null;
  }
  if (typeof value !== 'string' || value.length > 2000) throw new ApiError(400, `Invalid ${name}`);
  const result = value.trim();
  if (required && !result) throw new ApiError(400, `${name} is required`);
  return result || null;
}

export function number(value: unknown, name: string, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000000 || (integer && !Number.isSafeInteger(value))) {
    throw new ApiError(400, `${name} must be a nonnegative ${integer ? 'whole number' : 'number'}`);
  }
  return value;
}

export function fields(body: Record<string, unknown>, allowed: string[]) {
  const invalid = Object.keys(body).find(key => !allowed.includes(key));
  if (invalid) throw new ApiError(400, `Unsupported field: ${invalid}`);
}

export function date(value: unknown, name: string) {
  const raw = text(value, name, true)!;
  const result = new Date(raw);
  if (!Number.isFinite(result.getTime())) throw new ApiError(400, `Invalid ${name}`);
  return result;
}
