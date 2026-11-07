"use server";

import {
    redirect,
} from "next/navigation";

import {
    revalidatePath,
} from "next/cache";

import {
    requireSuperadmin,
} from "@/lib/require-superadmin";


function getRequiredString(
    formData: FormData,
    key: string
) {
    const value =
        formData.get(key);

    if (
        typeof value !==
        "string" ||
        !value.trim()
    ) {
        throw new Error(
            `${key} is required.`
        );
    }

    return value.trim();
}


function validateSlug(
    slug: string
) {
    if (
        !/^[a-z0-9-]+$/.test(
            slug
        )
    ) {
        throw new Error(
            "Slug must contain only lowercase letters, numbers, and hyphens."
        );
    }
}


export async function createPromptChain(
    formData: FormData
) {
    const {
        admin,
    } =
        await requireSuperadmin();


    const name =
        getRequiredString(
            formData,
            "name"
        );

    const slug =
        getRequiredString(
            formData,
            "slug"
        );

    validateSlug(
        slug
    );


    const descriptionValue =
        formData.get(
            "description"
        );

    const description =
        typeof descriptionValue ===
        "string"
            ? descriptionValue.trim()
            : "";


    const isActive =
        formData.get(
            "is_active"
        ) === "on";


    const {
        data,
        error,
    } =
        await admin
            .from(
                "prompt_chains"
            )
            .insert({
                name,
                slug,

                description:
                    description ||
                    null,

                is_active:
                isActive,
            })
            .select(
                "id"
            )
            .single();


    if (
        error ||
        !data
    ) {
        if (
            error?.code ===
            "23505"
        ) {
            throw new Error(
                "A prompt chain with that slug already exists."
            );
        }

        throw new Error(
            error?.message ??
            "Could not create prompt chain."
        );
    }


    revalidatePath(
        "/"
    );

    redirect(
        `/chains/${data.id}`
    );
}


export async function updatePromptChain(
    formData: FormData
) {
    const {
        admin,
    } =
        await requireSuperadmin();


    const chainId =
        getRequiredString(
            formData,
            "chain_id"
        );

    const name =
        getRequiredString(
            formData,
            "name"
        );

    const slug =
        getRequiredString(
            formData,
            "slug"
        );

    validateSlug(
        slug
    );


    const descriptionValue =
        formData.get(
            "description"
        );

    const description =
        typeof descriptionValue ===
        "string"
            ? descriptionValue.trim()
            : "";


    const isActive =
        formData.get(
            "is_active"
        ) === "on";


    const {
        error,
    } =
        await admin
            .from(
                "prompt_chains"
            )
            .update({
                name,
                slug,

                description:
                    description ||
                    null,

                is_active:
                isActive,

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                "id",
                chainId
            );


    if (error) {
        if (
            error.code ===
            "23505"
        ) {
            throw new Error(
                "A prompt chain with that slug already exists."
            );
        }

        throw new Error(
            `Could not update prompt chain: ${error.message}`
        );
    }


    revalidatePath(
        "/"
    );

    revalidatePath(
        `/chains/${chainId}`
    );

    redirect(
        `/chains/${chainId}`
    );
}


export async function deletePromptChain(
    formData: FormData
) {
    const {
        admin,
    } =
        await requireSuperadmin();


    const chainId =
        getRequiredString(
            formData,
            "chain_id"
        );


    /*
     * Do not delete a chain that is
     * currently used by Prompt Mix.
     */

    const {
        data: mixRow,
        error:
            mixError,
    } =
        await admin
            .from(
                "prompt_chain_mix"
            )
            .select(
                "prompt_chain_id, is_active"
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .maybeSingle();


    if (mixError) {
        throw new Error(
            `Could not check prompt mix: ${mixError.message}`
        );
    }


    if (
        mixRow?.is_active
    ) {
        throw new Error(
            "This prompt chain is currently active in Prompt Mix. Deactivate or remove it from Prompt Mix before deleting it."
        );
    }


    /*
     * Also protect chains that already
     * have generation history.
     */

    const {
        data:
            generationRequest,
        error:
            generationError,
    } =
        await admin
            .from(
                "generation_requests"
            )
            .select(
                "id"
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .limit(1)
            .maybeSingle();


    if (
        generationError
    ) {
        throw new Error(
            `Could not check generation history: ${generationError.message}`
        );
    }


    if (
        generationRequest
    ) {
        throw new Error(
            "This prompt chain already has generation history and cannot be deleted. Create a temporary test chain if you need to demonstrate deletion."
        );
    }


    const {
        error:
            deleteError,
    } =
        await admin
            .from(
                "prompt_chains"
            )
            .delete()
            .eq(
                "id",
                chainId
            );


    if (
        deleteError
    ) {
        throw new Error(
            `Could not delete prompt chain: ${deleteError.message}`
        );
    }


    revalidatePath(
        "/"
    );

    redirect("/");
}

