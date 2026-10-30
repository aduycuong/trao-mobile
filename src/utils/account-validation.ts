export const DISPLAY_NAME_MAX_LENGTH = 50;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const BIO_MAX_LENGTH = 200;

export type TextField = 'name' | 'username' | 'bio';

/** Same rules as the web `displayNameSchema`. */
export function validateDisplayName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return 'Nhập tên hiển thị.';
  if (name.length > DISPLAY_NAME_MAX_LENGTH)
    return `Tên hiển thị tối đa ${DISPLAY_NAME_MAX_LENGTH} ký tự.`;
}

/** Same rules as the web `usernameSchema`; the server lower-cases it. */
export function validateUsername(value: string): string | undefined {
  const name = value.trim().toLowerCase();
  if (name.length < USERNAME_MIN_LENGTH)
    return `Tên người dùng tối thiểu ${USERNAME_MIN_LENGTH} ký tự.`;
  if (name.length > USERNAME_MAX_LENGTH)
    return `Tên người dùng tối đa ${USERNAME_MAX_LENGTH} ký tự.`;
  if (!/^[a-z0-9_.]+$/.test(name)) return 'Chỉ dùng chữ không dấu, số, dấu chấm và gạch dưới.';
}

/** An empty bio clears it. */
export function validateBio(value: string): string | undefined {
  if (value.trim().length > BIO_MAX_LENGTH) return `Giới thiệu tối đa ${BIO_MAX_LENGTH} ký tự.`;
}

export function validateTextField(field: TextField, value: string): string | undefined {
  if (field === 'name') return validateDisplayName(value);
  if (field === 'username') return validateUsername(value);
  return validateBio(value);
}
