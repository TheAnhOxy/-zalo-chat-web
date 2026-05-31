import { redirect } from "next/navigation";

export default function SessionsRedirectPage() {
  redirect("/settings/device-sessions");
}
