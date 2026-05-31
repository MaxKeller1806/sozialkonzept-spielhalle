import { NextResponse } from "next/server";
import { getCurrentUser, getAuthState } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const authState = await getAuthState(user);
  return NextResponse.json({ user, authState });
}
