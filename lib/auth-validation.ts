export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") throw new Error("Email không hợp lệ.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email không hợp lệ.");
  return email;
}
export function validatePasswordChange(current: string, password: string, confirm: string) {
  if (!current || current.length > 1024) throw new Error("Nhập mật khẩu hiện tại.");
  if (password.trim().length < 6 || password.length > 1024) throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự, tối đa 1024 ký tự.");
  if (password !== confirm) throw new Error("Hai ô mật khẩu mới không khớp.");
  if (password === current || password === "123456") throw new Error("Chọn mật khẩu mới khác mật khẩu hiện tại và mật khẩu mặc định.");
}
