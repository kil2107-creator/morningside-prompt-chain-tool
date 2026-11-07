"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    requireSuperadmin,
} from "@/lib/require-superadmin";


type AdminClient =
    Awaited<
        ReturnType<
            typeof requireSuperadmin
        >
    >["admin"];


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


/*
 * --------------------------------------------------
 * GET SAFE TEMPORARY ORDER
 * --------------------------------------------------
 *
 * step_order must remain positive because
 * the database has a check constraint.
 *
 * We therefore choose a number above every
 * currently used step_order.
 */

async function getTemporaryOrder(
    admin: AdminClient,
    chainId: string
) {
    const {
        data: lastStep,
        error,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "step_order"
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .order(
                "step_order",
                {
                    ascending:
                        false,
                }
            )
            .limit(1)
            .maybeSingle();


    if (error) {
        throw new Error(
            `Could not determine temporary step order: ${error.message}`
        );
    }


    return (
        (
            lastStep
                ?.step_order ??
            0
        ) + 1000
    );
}


/*
 * --------------------------------------------------
 * NORMALIZE STEP ORDER
 * --------------------------------------------------
 *
 * Example:
 *
 * Before deleting:
 * 1, 2, 3
 *
 * Delete 2:
 * 1, 3
 *
 * Normalize:
 * 1, 2
 */

async function normalizeStepOrder(
    admin: AdminClient,
    chainId: string
) {
    const {
        data: steps,
        error,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "id, step_order"
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .order(
                "step_order",
                {
                    ascending:
                        true,
                }
            );


    if (error) {
        throw new Error(
            `Could not normalize prompt steps: ${error.message}`
        );
    }


    if (
        !steps ||
        steps.length === 0
    ) {
        return;
    }


    /*
     * Move every step temporarily above
     * the current range.
     *
     * This avoids collisions with the
     * unique:
     *
     * prompt_chain_id + step_order
     *
     * constraint.
     */

    const highestOrder =
        Math.max(
            ...steps.map(
                (step) =>
                    step.step_order
            )
        );

    const temporaryBase =
        highestOrder +
        1000;


    for (
        let index = 0;
        index < steps.length;
        index++
    ) {
        const {
            error:
                temporaryError,
        } =
            await admin
                .from(
                    "prompt_chain_steps"
                )
                .update({
                    step_order:
                        temporaryBase +
                        index,
                })
                .eq(
                    "id",
                    steps[index].id
                );


        if (
            temporaryError
        ) {
            throw new Error(
                `Could not temporarily reorder prompt steps: ${temporaryError.message}`
            );
        }
    }


    /*
     * Now safely assign:
     *
     * 1, 2, 3...
     */

    for (
        let index = 0;
        index < steps.length;
        index++
    ) {
        const {
            error:
                finalError,
        } =
            await admin
                .from(
                    "prompt_chain_steps"
                )
                .update({
                    step_order:
                        index + 1,
                })
                .eq(
                    "id",
                    steps[index].id
                );


        if (
            finalError
        ) {
            throw new Error(
                `Could not finalize prompt step order: ${finalError.message}`
            );
        }
    }
}


/*
 * --------------------------------------------------
 * CREATE STEP
 * --------------------------------------------------
 */

export async function createPromptStep(
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

    const promptText =
        getRequiredString(
            formData,
            "prompt_text"
        );


    const {
        data: lastStep,
        error:
            lastStepError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "step_order"
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .order(
                "step_order",
                {
                    ascending:
                        false,
                }
            )
            .limit(1)
            .maybeSingle();


    if (
        lastStepError
    ) {
        throw new Error(
            `Could not determine prompt step order: ${lastStepError.message}`
        );
    }


    const nextOrder =
        lastStep
            ? lastStep.step_order +
            1
            : 1;


    const {
        error,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .insert({
                prompt_chain_id:
                chainId,

                step_order:
                nextOrder,

                name,

                prompt_text:
                promptText,
            });


    if (error) {
        throw new Error(
            `Could not create prompt step: ${error.message}`
        );
    }


    revalidatePath(
        `/chains/${chainId}`
    );
}


/*
 * --------------------------------------------------
 * UPDATE STEP
 * --------------------------------------------------
 */

export async function updatePromptStep(
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

    const stepId =
        getRequiredString(
            formData,
            "step_id"
        );

    const name =
        getRequiredString(
            formData,
            "name"
        );

    const promptText =
        getRequiredString(
            formData,
            "prompt_text"
        );


    const {
        error,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                name,

                prompt_text:
                promptText,

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                "id",
                stepId
            )
            .eq(
                "prompt_chain_id",
                chainId
            );


    if (error) {
        throw new Error(
            `Could not update prompt step: ${error.message}`
        );
    }


    revalidatePath(
        `/chains/${chainId}`
    );
}


/*
 * --------------------------------------------------
 * DELETE STEP
 * --------------------------------------------------
 */

export async function deletePromptStep(
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

    const stepId =
        getRequiredString(
            formData,
            "step_id"
        );


    const {
        error,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .delete()
            .eq(
                "id",
                stepId
            )
            .eq(
                "prompt_chain_id",
                chainId
            );


    if (error) {
        throw new Error(
            `Could not delete prompt step: ${error.message}`
        );
    }


    await normalizeStepOrder(
        admin,
        chainId
    );


    revalidatePath(
        `/chains/${chainId}`
    );
}


/*
 * --------------------------------------------------
 * MOVE STEP UP
 * --------------------------------------------------
 */

export async function movePromptStepUp(
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

    const stepId =
        getRequiredString(
            formData,
            "step_id"
        );


    const {
        data: currentStep,
        error:
            currentError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "id, step_order"
            )
            .eq(
                "id",
                stepId
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .single();


    if (
        currentError ||
        !currentStep
    ) {
        throw new Error(
            "Could not find the prompt step."
        );
    }


    /*
     * Already the first step.
     */

    if (
        currentStep.step_order <=
        1
    ) {
        return;
    }


    const targetOrder =
        currentStep.step_order -
        1;


    const {
        data: previousStep,
        error:
            previousError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "id, step_order"
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .eq(
                "step_order",
                targetOrder
            )
            .single();


    if (
        previousError ||
        !previousStep
    ) {
        throw new Error(
            "Could not find the previous prompt step."
        );
    }


    /*
     * Important:
     *
     * We cannot temporarily use a
     * negative order because the DB
     * requires step_order > 0.
     */

    const temporaryOrder =
        await getTemporaryOrder(
            admin,
            chainId
        );


    /*
     * Current:
     *
     * Step A = 2
     * Step B = 1
     *
     * Temporary:
     *
     * Step A = 1003
     */

    const {
        error:
            tempError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                step_order:
                temporaryOrder,
            })
            .eq(
                "id",
                currentStep.id
            );


    if (tempError) {
        throw new Error(
            `Could not reorder prompt step: ${tempError.message}`
        );
    }


    /*
     * Move previous step into the
     * current step's old position.
     */

    const {
        error:
            previousUpdateError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                step_order:
                currentStep
                    .step_order,
            })
            .eq(
                "id",
                previousStep.id
            );


    if (
        previousUpdateError
    ) {
        /*
         * Best-effort rollback.
         */
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                step_order:
                currentStep
                    .step_order,
            })
            .eq(
                "id",
                currentStep.id
            );

        throw new Error(
            `Could not reorder previous step: ${previousUpdateError.message}`
        );
    }


    /*
     * Move current step into the
     * previous position.
     */

    const {
        error:
            currentUpdateError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                step_order:
                targetOrder,
            })
            .eq(
                "id",
                currentStep.id
            );


    if (
        currentUpdateError
    ) {
        throw new Error(
            `Could not finalize prompt step order: ${currentUpdateError.message}`
        );
    }


    revalidatePath(
        `/chains/${chainId}`
    );
}


/*
 * --------------------------------------------------
 * MOVE STEP DOWN
 * --------------------------------------------------
 */

export async function movePromptStepDown(
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

    const stepId =
        getRequiredString(
            formData,
            "step_id"
        );


    const {
        data: currentStep,
        error:
            currentError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "id, step_order"
            )
            .eq(
                "id",
                stepId
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .single();


    if (
        currentError ||
        !currentStep
    ) {
        throw new Error(
            "Could not find the prompt step."
        );
    }


    const {
        data: nextStep,
        error:
            nextError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "id, step_order"
            )
            .eq(
                "prompt_chain_id",
                chainId
            )
            .gt(
                "step_order",
                currentStep
                    .step_order
            )
            .order(
                "step_order",
                {
                    ascending:
                        true,
                }
            )
            .limit(1)
            .maybeSingle();


    if (nextError) {
        throw new Error(
            `Could not find the next prompt step: ${nextError.message}`
        );
    }


    /*
     * Already the final step.
     */

    if (!nextStep) {
        return;
    }


    const temporaryOrder =
        await getTemporaryOrder(
            admin,
            chainId
        );


    /*
     * Temporarily move current
     * step above the used range.
     */

    const {
        error:
            tempError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                step_order:
                temporaryOrder,
            })
            .eq(
                "id",
                currentStep.id
            );


    if (tempError) {
        throw new Error(
            `Could not reorder prompt step: ${tempError.message}`
        );
    }


    /*
     * Move next step into current
     * step's original position.
     */

    const {
        error:
            nextUpdateError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                step_order:
                currentStep
                    .step_order,
            })
            .eq(
                "id",
                nextStep.id
            );


    if (
        nextUpdateError
    ) {
        /*
         * Best-effort rollback.
         */
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                step_order:
                currentStep
                    .step_order,
            })
            .eq(
                "id",
                currentStep.id
            );

        throw new Error(
            `Could not reorder next step: ${nextUpdateError.message}`
        );
    }


    /*
     * Move current step into the
     * next step's previous position.
     */

    const {
        error:
            currentUpdateError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .update({
                step_order:
                nextStep
                    .step_order,
            })
            .eq(
                "id",
                currentStep.id
            );


    if (
        currentUpdateError
    ) {
        throw new Error(
            `Could not finalize prompt step order: ${currentUpdateError.message}`
        );
    }


    revalidatePath(
        `/chains/${chainId}`
    );
}

