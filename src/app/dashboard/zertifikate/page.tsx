import { redirect } from "next/navigation";

export default function ZertifikateRedirectPage() {
  redirect("/dashboard/audit-export");
}
