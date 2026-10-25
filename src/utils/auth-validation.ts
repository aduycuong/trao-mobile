export type AuthFieldErrors = {
  confirmPassword?: string;
  displayName?: string;
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  if (!email.trim()) errors.email = 'Vui lòng nhập email.';
  else if (!emailPattern.test(email.trim())) errors.email = 'Email chưa đúng định dạng.';

  if (!password) errors.password = 'Vui lòng nhập mật khẩu.';
  else if (password.length < 6) errors.password = 'Mật khẩu cần có ít nhất 6 ký tự.';

  return errors;
}

export function validateRegistration(
  displayName: string,
  email: string,
  password: string,
  confirmPassword: string
): AuthFieldErrors {
  const errors = validateLogin(email, password);

  if (!displayName.trim()) errors.displayName = 'Vui lòng nhập tên của bạn.';
  else if (displayName.trim().length < 2) errors.displayName = 'Tên cần có ít nhất 2 ký tự.';

  if (!confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Mật khẩu nhập lại chưa khớp.';

  return errors;
}
