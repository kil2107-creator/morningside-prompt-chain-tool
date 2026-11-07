import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    const formData = await request.formData();

    const credential = formData.get("credential");
    const csrfFromBody = formData.get("g_csrf_token");

    const cookieStore = await cookies();
    const csrfFromCookie = cookieStore.get("g_csrf_token")?.value;

    if (
        typeof credential !== "string" ||
        typeof csrfFromBody !== "string" ||
        !csrfFromCookie ||
        csrfFromBody !== csrfFromCookie
    ) {
        return new Response("Invalid Google sign-in request.", {
            status: 400,
        });
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
    });

    if (error) {
        return new Response(`Sign in failed: ${error.message}`, {
            status: 400,
        });
    }

    return NextResponse.redirect(
        new URL("/", request.url),
        303
    );
}
