export type AuthFieldErrors = {
  confirmPassword?: string;
  displayName?: string;
  email?: string;
  password?: string;
  terms?: string;
};

export const PASSWORD_MIN_LENGTH = 8;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Nhập email.';
  if (!emailPattern.test(email.trim())) return 'Email không hợp lệ.';
}

/** Same rule as the web `newPasswordSchema`. */
export function validateNewPassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH)
    return `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Mật khẩu cần có cả chữ và số.';
}

export function validateLogin(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Nhập mật khẩu.';
  return errors;
}

export function validateRegistration(
  displayName: string,
  email: string,
  password: string,
  acceptTerms: boolean
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  if (!displayName.trim()) errors.displayName = 'Nhập tên hiển thị.';
  else if (displayName.trim().length > 60) errors.displayName = 'Tên hiển thị tối đa 60 ký tự.';

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  const passwordError = validateNewPassword(password);
  if (passwordError) errors.password = passwordError;

  if (!acceptTerms) errors.terms = 'Bạn cần đồng ý với điều khoản để tiếp tục.';

  return errors;
}

export function validateResetPassword(password: string, confirmPassword: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const passwordError = validateNewPassword(password);
  if (passwordError) errors.password = passwordError;
  if (!confirmPassword) errors.confirmPassword = 'Nhập lại mật khẩu.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Hai mật khẩu chưa giống nhau.';
  return errors;
}

/** Same rules as the web `changePasswordFormSchema`. */
/** Setting a first password: same rules as the web `setPasswordFormSchema`. */
export function validateSetPassword(password: string, confirmPassword: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const passwordError = validateNewPassword(password);
  if (passwordError) errors.password = passwordError;
  if (!confirmPassword) errors.confirmPassword = 'Nhập lại mật khẩu mới.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Hai mật khẩu chưa giống nhau.';
  return errors;
}

export function validateChangePassword(
  currentPassword: string,
  password: string,
  confirmPassword: string
): AuthFieldErrors & { currentPassword?: string } {
  const errors: AuthFieldErrors & { currentPassword?: string } = {};
  if (!currentPassword) errors.currentPassword = 'Nhập mật khẩu hiện tại.';
  const passwordError = validateNewPassword(password);
  if (passwordError) errors.password = passwordError;
  else if (password === currentPassword)
    errors.password = 'Mật khẩu mới cần khác mật khẩu hiện tại.';
  if (!confirmPassword) errors.confirmPassword = 'Nhập lại mật khẩu mới.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Hai mật khẩu chưa giống nhau.';
  return errors;
}

export type PasswordStrength = {
  /** 0 = empty, 1 = weak, 2 = fair, 3 = strong. */
  level: 0 | 1 | 2 | 3;
  label: string;
};

/** Rough strength for the sign-up meter; the real rules are in `validateNewPassword`. */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { level: 0, label: '' };
  if (validateNewPassword(password)) return { level: 1, label: 'Yếu' };

  const strong =
    password.length >= 12 ||
    (/[a-z]/.test(password) && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password));
  return strong ? { level: 3, label: 'Mạnh' } : { level: 2, label: 'Khá mạnh' };
}

/** `minhanh@gmail.com` → `minh••••@gmail.com`. */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const name = email.slice(0, at);
  const visible = name.slice(0, Math.min(4, Math.max(1, name.length - 2)));
  return `${visible}••••${email.slice(at)}`;
}
