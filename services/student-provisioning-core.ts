export type ExistingAccount = {
  id: string; profile_id: string | null; role: "ADMIN" | "STUDENT" | null;
  has_password: boolean; auth_exists: boolean;
};
export type ProvisioningPorts = {
  findAccount: (email: string) => Promise<ExistingAccount[]>;
  createAccount: (email: string, password: string) => Promise<string>;
  confirmExisting?: (account: ExistingAccount) => Promise<void>;
  grantAccess: (id: string) => Promise<void>;
};

// Pure orchestration, with all privileged IO supplied by the guarded server service.
// Auth and Postgres cannot share a transaction: failed grants are safely retryable.
export async function provisionStudent(email: string, ports: ProvisioningPorts) {
  let matches = await ports.findAccount(email);
  let created = false;
  let id: string | undefined;
  if (!matches.length) {
    try {
      id = await ports.createAccount(email, "123456");
      created = true;
    } catch {
      // A concurrent request may have created the same normalized Auth email.
      matches = await ports.findAccount(email);
      if (!matches.length) throw new Error("Không thể tạo tài khoản. Kiểm tra cấu hình Supabase Auth và chính sách mật khẩu mặc định.");
    }
  }
  if (!created) {
    if (matches.length !== 1) throw new Error("Email trùng nhiều record. Cần kiểm tra dữ liệu thủ công.");
    const account = matches[0];
    if (account.role === "ADMIN") throw new Error("Email thuộc tài khoản Admin; không thể thêm làm học sinh.");
    if (!account.auth_exists || !account.has_password) throw new Error("Tài khoản cũ thiếu Auth user hoặc mật khẩu. Cần xử lý thủ công; hệ thống không tự thay đổi tài khoản này.");
    await ports.confirmExisting?.(account);
    id = account.id;
  }
  if (!id) throw new Error("Không thể xác định tài khoản.");
  try { await ports.grantAccess(id); }
  catch { throw new Error("Tài khoản đã tồn tại nhưng chưa cấp được quyền. Kiểm tra môn/giáo viên và phiên Admin rồi thử lại; mật khẩu được giữ nguyên."); }
  return { id, created };
}
