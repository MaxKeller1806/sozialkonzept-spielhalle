import { redirect } from "next/navigation";
import { getCurrentUser, getAuthState } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const auth = await getAuthState(user);
  redirect(
    auth.redirect ??
      (user.role === "superuser"
        ? "/certiano"
        : user.role === "admin"
          ? "/dashboard"
          : "/schulung")
  );
}
