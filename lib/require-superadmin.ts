import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireSuperadmin() {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        redirect("/login");
    }

    const admin =
        createAdminClient();

    const {
        data: profile,
        error: profileError,
    } = await admin
        .from("profiles")
        .select(
            "id, username, is_superadmin"
        )
        .eq("id", user.id)
        .single();

    if (
        profileError ||
        !profile?.is_superadmin
    ) {
        redirect("/unauthorized");
    }

    return {
        user,
        profile,
        admin,
    };
}

