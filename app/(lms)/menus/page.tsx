import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth";
export default async function MenusPage() { await requireUser(); redirect("/menu"); }

