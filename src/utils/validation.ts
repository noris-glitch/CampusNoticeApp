export const STUDENT_ID_PATTERN = /^[A-Za-z0-9]{4}\/[A-Za-z0-9]{1}\/[A-Za-z0-9]{4}\/[A-Za-z0-9]{2}$/;

export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidLocalPhoneNumber(value: string): boolean {
  return /^0\d{9}$/.test(value);
}

export function sanitizeStudentIdInput(value: string): string {
  return value.replace(/[^A-Za-z0-9/]/g, '').slice(0, 13);
}

export function isValidStudentId(value: string): boolean {
  return STUDENT_ID_PATTERN.test(value.trim());
}
