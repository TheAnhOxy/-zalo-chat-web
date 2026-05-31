import { redirect } from "next/navigation";

export default function ChangePasswordRedirectPage() {
  redirect("/settings/account-security");
}
