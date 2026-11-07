import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleSignIn from "./google-sign-in";

export default async function LoginPage() {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();

    if (data?.claims) {
        redirect("/");
    }

    return (
        <main
            style={{
                maxWidth: "600px",
                margin: "80px auto",
                padding: "40px",
                fontFamily: "Arial",
            }}
        >
            <h1>Sign in</h1>

            <p style={{ marginBottom: "24px" }}>
                Sign in with Google to access your profile.
            </p>

            <GoogleSignIn />
        </main>
    );
}
