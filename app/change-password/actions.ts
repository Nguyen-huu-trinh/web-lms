"use server";
import { createClient as createIsolatedClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/auth";
import { publicConfig } from "@/lib/supabase/env";
import { validatePasswordChange } from "@/lib/auth-validation";

export async function changePassword(_previous: { error: string }, form: FormData) {
  const { client, profile } = await requireUser(undefined, true);
  const current = String(form.get("current_password") ?? "");
  const password = String(form.get("password") ?? "");
  try { validatePasswordChange(current, password, String(form.get("confirm_password") ?? "")); }
  catch (error) { return { error: (error as Error).message }; }

  // Verify the current password even when the hosted Auth setting is disabled.
  // This short-lived client never writes browser cookies or activates a LMS session.
  const { url, key } = publicConfig();
  const verifier = createIsolatedClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try {
    const { data, error } = await verifier.auth.signInWithPassword({ email: profile.email, password: current });
    if (error || data.user?.id !== profile.id) return { error: "Mật khẩu hiện tại không đúng hoặc chưa thể xác thực. Vui lòng thử lại." };
    // The original session must still be active after password verification.
    const { data: active, error: sessionError } = await client.rpc("session_is_active");
    if (sessionError || !active) return { error: "Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại." };
    const { error: updateError } = await client.auth.updateUser({ password, current_password: current });
    if (updateError) {
      if (updateError.code === "weak_password") return { error: "Mật khẩu mới chưa đáp ứng chính sách Supabase. Hãy dùng mật khẩu dài hơn gồm chữ hoa, chữ thường, số và ký tự đặc biệt." };
      if (updateError.code === "reauthentication_needed") return { error: "Vui lòng đăng xuất rồi đăng nhập lại trước khi đổi mật khẩu." };
      return { error: "Không thể đổi mật khẩu. Kiểm tra mật khẩu hiện tại, chính sách mật khẩu và thử lại." };
    }
    // The auth.users trigger clears the flag in the same transaction as the password.
    const { data: updated, error: profileError } = await client.from("profiles").select("must_change_password").eq("id", profile.id).single();
    if (profileError || updated.must_change_password) return { error: "Mật khẩu đã đổi nhưng chưa thể xác nhận trạng thái tài khoản. Vui lòng đăng nhập lại; không dùng lại mật khẩu cũ." };
  } finally {
    await verifier.auth.signOut({ scope: "local" });
  }
  revalidatePath("/", "layout");
  redirect("/courses?password=changed");
}
