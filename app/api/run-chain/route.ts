import {
    NextResponse,
} from "next/server";

import {
    GoogleGenAI,
} from "@google/genai";

import {
    createClient,
} from "@/lib/supabase/server";

import {
    createAdminClient,
} from "@/lib/supabase/admin";


export const runtime =
    "nodejs";


const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const MAX_IMAGE_SIZE =
    5 * 1024 * 1024;


/*
 * Same models used by the main app.
 */
const PRIMARY_MODEL =
    "gemini-3.8-flash";

const FALLBACK_MODEL =
    "gemini-3.5-flash-lite";


function getErrorMessage(
    error: unknown
) {
    if (
        error instanceof Error
    ) {
        return error.message;
    }

    return "Unknown generation error.";
}


function getErrorStatus(
    error: unknown
): number | undefined {
    if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (
            error as {
                status?: unknown;
            }
        ).status === "number"
    ) {
        return (
            error as {
                status: number;
            }
        ).status;
    }


    /*
     * Some Gemini SDK errors put the
     * HTTP code inside the message.
     */
    if (
        error instanceof Error
    ) {
        const message =
            error.message;

        if (
            message.includes(
                '"code":503'
            ) ||
            message.includes(
                "503"
            )
        ) {
            return 503;
        }

        if (
            message.includes(
                '"code":429'
            ) ||
            message.includes(
                "429"
            )
        ) {
            return 429;
        }
    }


    return undefined;
}


function isTimeoutError(
    error: unknown
) {
    return (
        error instanceof Error &&
        (
            error.name ===
            "AbortError" ||
            error.name ===
            "RequestTimeoutError" ||
            error.message
                .toLowerCase()
                .includes(
                    "timeout"
                ) ||
            error.message
                .toLowerCase()
                .includes(
                    "aborted"
                )
        )
    );
}


function shouldUseFallback(
    error: unknown
) {
    const status =
        getErrorStatus(
            error
        );

    return (
        status === 503 ||
        status === 429 ||
        isTimeoutError(
            error
        )
    );
}


function getExtension(
    mimeType: string
) {
    switch (mimeType) {
        case "image/png":
            return "png";

        case "image/webp":
            return "webp";

        default:
            return "jpg";
    }
}


export async function POST(
    request: Request
) {
    const supabase =
        await createClient();


    /*
     * ==================================================
     * 1. AUTHENTICATION
     * ==================================================
     */

    const {
        data: {
            user,
        },
        error:
            userError,
    } =
        await supabase.auth
            .getUser();


    if (
        userError ||
        !user
    ) {
        return NextResponse.json(
            {
                error:
                    "You must be signed in.",
            },
            {
                status: 401,
            }
        );
    }


    const admin =
        createAdminClient();


    /*
     * Week 8:
     * only superadmins can use
     * the prompt-chain tool.
     */

    const {
        data: profile,
        error:
            profileError,
    } =
        await admin
            .from(
                "profiles"
            )
            .select(
                "is_superadmin"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (
        profileError ||
        !profile
    ) {
        return NextResponse.json(
            {
                error:
                    "Could not verify admin access.",
            },
            {
                status: 500,
            }
        );
    }


    if (
        !profile.is_superadmin
    ) {
        return NextResponse.json(
            {
                error:
                    "Superadmin access is required.",
            },
            {
                status: 403,
            }
        );
    }


    /*
     * ==================================================
     * 2. READ INPUT
     * ==================================================
     */

    const formData =
        await request.formData();

    const chainId =
        formData.get(
            "chain_id"
        );

    const image =
        formData.get(
            "image"
        );


    if (
        typeof chainId !==
        "string" ||
        !chainId.trim()
    ) {
        return NextResponse.json(
            {
                error:
                    "Prompt chain is required.",
            },
            {
                status: 400,
            }
        );
    }


    if (
        !(image instanceof File)
    ) {
        return NextResponse.json(
            {
                error:
                    "Please upload an image.",
            },
            {
                status: 400,
            }
        );
    }


    if (
        !ALLOWED_IMAGE_TYPES
            .includes(
                image.type
            )
    ) {
        return NextResponse.json(
            {
                error:
                    "Please upload a JPEG, PNG, or WebP image.",
            },
            {
                status: 400,
            }
        );
    }


    if (
        image.size >
        MAX_IMAGE_SIZE
    ) {
        return NextResponse.json(
            {
                error:
                    "Please upload an image smaller than 5 MB.",
            },
            {
                status: 400,
            }
        );
    }


    /*
     * ==================================================
     * 3. LOAD PROMPT CHAIN
     * ==================================================
     */

    const {
        data: chain,
        error:
            chainError,
    } =
        await admin
            .from(
                "prompt_chains"
            )
            .select(
                "id, name, slug"
            )
            .eq(
                "id",
                chainId
            )
            .maybeSingle();


    if (
        chainError
    ) {
        return NextResponse.json(
            {
                error:
                    `Could not load prompt chain: ${chainError.message}`,
            },
            {
                status: 500,
            }
        );
    }


    if (!chain) {
        return NextResponse.json(
            {
                error:
                    "Prompt chain not found.",
            },
            {
                status: 404,
            }
        );
    }


    /*
     * ==================================================
     * 4. LOAD PROMPT CHAIN STEPS
     * ==================================================
     */

    const {
        data: steps,
        error:
            stepsError,
    } =
        await admin
            .from(
                "prompt_chain_steps"
            )
            .select(
                "id, step_order, name, prompt_text"
            )
            .eq(
                "prompt_chain_id",
                chain.id
            )
            .order(
                "step_order",
                {
                    ascending:
                        true,
                }
            );


    if (
        stepsError
    ) {
        return NextResponse.json(
            {
                error:
                    `Could not load prompt steps: ${stepsError.message}`,
            },
            {
                status: 500,
            }
        );
    }


    if (
        !steps ||
        steps.length === 0
    ) {
        return NextResponse.json(
            {
                error:
                    "This prompt chain does not contain any steps.",
            },
            {
                status: 400,
            }
        );
    }


    /*
     * ==================================================
     * 5. GEMINI SETUP
     * ==================================================
     */

    const apiKey =
        process.env
            .GEMINI_API_KEY;


    if (!apiKey) {
        return NextResponse.json(
            {
                error:
                    "GEMINI_API_KEY is not configured.",
            },
            {
                status: 500,
            }
        );
    }


    const ai =
        new GoogleGenAI({
            apiKey,
        });


    /*
     * ==================================================
     * 6. UPLOAD INPUT IMAGE
     * ==================================================
     */

    const extension =
        getExtension(
            image.type
        );

    const storagePath =
        `${user.id}/prompt-chain-runs/${crypto.randomUUID()}.${extension}`;


    const {
        error:
            uploadError,
    } =
        await admin.storage
            .from(
                "caption-images"
            )
            .upload(
                storagePath,
                image,
                {
                    contentType:
                    image.type,

                    upsert:
                        false,
                }
            );


    if (
        uploadError
    ) {
        return NextResponse.json(
            {
                error:
                    `Could not upload image: ${uploadError.message}`,
            },
            {
                status: 500,
            }
        );
    }


    /*
     * ==================================================
     * 7. CREATE IMAGES ROW
     * ==================================================
     */

    const {
        data: imageRow,
        error:
            imageRowError,
    } =
        await admin
            .from(
                "images"
            )
            .insert({
                user_id:
                user.id,

                storage_bucket:
                    "caption-images",

                storage_path:
                storagePath,

                original_filename:
                image.name,

                mime_type:
                image.type,

                size_bytes:
                image.size,

                alt_text:
                    `Prompt chain input for ${chain.name}`,
            })
            .select(
                "id"
            )
            .single();


    if (
        imageRowError ||
        !imageRow
    ) {
        await admin.storage
            .from(
                "caption-images"
            )
            .remove([
                storagePath,
            ]);


        return NextResponse.json(
            {
                error:
                    imageRowError
                        ?.message ??
                    "Could not save image metadata.",
            },
            {
                status: 500,
            }
        );
    }


    /*
     * ==================================================
     * 8. CREATE GENERATION REQUEST
     * ==================================================
     */

    const {
        data:
            generationRequest,
        error:
            generationRequestError,
    } =
        await admin
            .from(
                "generation_requests"
            )
            .insert({
                user_id:
                user.id,

                prompt_chain_id:
                chain.id,

                image_id:
                imageRow.id,

                user_prompt:
                    `Prompt chain tool run: ${chain.name}`,

                vibe:
                    "Prompt Chain Tool",

                status:
                    "started",
            })
            .select(
                "id"
            )
            .single();


    if (
        generationRequestError ||
        !generationRequest
    ) {
        await admin
            .from(
                "images"
            )
            .delete()
            .eq(
                "id",
                imageRow.id
            );


        await admin.storage
            .from(
                "caption-images"
            )
            .remove([
                storagePath,
            ]);


        return NextResponse.json(
            {
                error:
                    generationRequestError
                        ?.message ??
                    "Could not start generation request.",
            },
            {
                status: 500,
            }
        );
    }

    const generationRequestId =
        generationRequest.id;


    /*
     * ==================================================
     * 9. LOOK UP MODEL IDS
     * ==================================================
     */

    const {
        data: modelRows,
    } =
        await admin
            .from(
                "llm_models"
            )
            .select(
                "id, model_key"
            )
            .in(
                "model_key",
                [
                    PRIMARY_MODEL,
                    FALLBACK_MODEL,
                ]
            );


    const modelIdByKey =
        new Map<
            string,
            string
        >();


    for (
        const modelRow of
    modelRows ??
    []
        ) {
        modelIdByKey.set(
            modelRow.model_key,
            modelRow.id
        );
    }


    /*
     * ==================================================
     * 10. IMAGE → BASE64
     * ==================================================
     */

    const arrayBuffer =
        await image.arrayBuffer();

    const base64Image =
        Buffer.from(
            arrayBuffer
        ).toString(
            "base64"
        );


    /*
     * ==================================================
     * 11. MODEL CALL HELPER
     * ==================================================
     *
     * Every individual attempt is logged.
     */

    async function callModel(
        modelName: string,
        step: {
            id: string;
            step_order: number;
            name: string;
            prompt_text: string;
        },
        contents: Array<
            | {
            inlineData: {
                mimeType: string;
                data: string;
            };
        }
            | {
            text: string;
        }
        >
    ) {
        const controller =
            new AbortController();


        /*
         * 25 seconds per individual model.
         *
         * If primary times out, we can still
         * try fallback without exceeding the
         * overall browser timeout.
         */
        const timeoutId =
            setTimeout(
                () => {
                    controller.abort();
                },
                25000
            );


        const startedAt =
            Date.now();


        try {
            const response =
                await ai.models
                    .generateContent({
                        model:
                        modelName,

                        contents,

                        config: {
                            abortSignal:
                            controller.signal,
                        },
                    });


            const latencyMs =
                Date.now() -
                startedAt;


            const output =
                response.text
                    ?.trim();


            if (!output) {
                throw new Error(
                    "The model returned an empty response."
                );
            }


            /*
             * Log successful model attempt.
             */

            const {
                error:
                    logError,
            } =
                await admin
                    .from(
                        "llm_responses"
                    )
                    .insert({
                        generation_request_id:
                        generationRequestId,

                        prompt_chain_step_id:
                        step.id,

                        llm_model_id:
                            modelIdByKey.get(
                                modelName
                            ) ??
                            null,

                        response_text:
                        output,

                        raw_response:
                            {
                                model:
                                modelName,

                                step_order:
                                step.step_order,
                            },

                        latency_ms:
                        latencyMs,

                        success:
                            true,

                        error_message:
                            null,
                    });


            if (
                logError
            ) {
                console.error(
                    "Could not log successful LLM response:",
                    logError
                );
            }


            return {
                output,
                latencyMs,
                model:
                modelName,
            };
        } catch (error) {
            const latencyMs =
                Date.now() -
                startedAt;

            const errorMessage =
                getErrorMessage(
                    error
                );


            /*
             * Log failed model attempt.
             */

            const {
                error:
                    failedLogError,
            } =
                await admin
                    .from(
                        "llm_responses"
                    )
                    .insert({
                        generation_request_id:
                        generationRequestId,

                        prompt_chain_step_id:
                        step.id,

                        llm_model_id:
                            modelIdByKey.get(
                                modelName
                            ) ??
                            null,

                        response_text:
                            null,

                        raw_response:
                            {
                                model:
                                modelName,

                                step_order:
                                step.step_order,

                                status:
                                    getErrorStatus(
                                        error
                                    ) ??
                                    null,
                            },

                        latency_ms:
                        latencyMs,

                        success:
                            false,

                        error_message:
                        errorMessage,
                    });


            if (
                failedLogError
            ) {
                console.error(
                    "Could not log failed LLM response:",
                    failedLogError
                );
            }


            throw error;
        } finally {
            clearTimeout(
                timeoutId
            );
        }
    }


    /*
     * ==================================================
     * 12. RUN ONE STEP WITH FALLBACK
     * ==================================================
     */

    async function runStep(
        step: {
            id: string;
            step_order: number;
            name: string;
            prompt_text: string;
        },
        contents: Array<
            | {
            inlineData: {
                mimeType: string;
                data: string;
            };
        }
            | {
            text: string;
        }
        >
    ) {
        try {
            return await callModel(
                PRIMARY_MODEL,
                step,
                contents
            );
        } catch (
            primaryError
            ) {
            /*
             * Only provider availability,
             * quota, or timeout errors
             * automatically use fallback.
             */

            if (
                !shouldUseFallback(
                    primaryError
                )
            ) {
                throw primaryError;
            }


            console.warn(
                `${PRIMARY_MODEL} unavailable for Step ${step.step_order}. Trying ${FALLBACK_MODEL}.`
            );


            return await callModel(
                FALLBACK_MODEL,
                step,
                contents
            );
        }
    }


    /*
     * ==================================================
     * 13. RUN PROMPT CHAIN
     * ==================================================
     */

    const outputs:
        Array<{
            stepId: string;
            stepOrder: number;
            stepName: string;
            promptText: string;
            output: string;
            latencyMs: number;
            model: string;
        }> = [];


    let previousOutput =
        "";


    for (
        let index = 0;
        index < steps.length;
        index++
    ) {
        const step =
            steps[index];


        const contents =
            index === 0
                ? [
                    {
                        inlineData:
                            {
                                mimeType:
                                image.type,

                                data:
                                base64Image,
                            },
                    },

                    {
                        text:
                            `${step.prompt_text}

Complete this step based on the uploaded image.

Return only the result of this step.`,
                    },
                ]
                : [
                    {
                        text:
                            `Step instruction:
${step.prompt_text}

Previous step output:
${previousOutput}

Complete this step using the previous step output.

Return only the result of this step.`,
                    },
                ];


        try {
            const result =
                await runStep(
                    step,
                    contents
                );


            outputs.push({
                stepId:
                step.id,

                stepOrder:
                step.step_order,

                stepName:
                step.name,

                promptText:
                step.prompt_text,

                output:
                result.output,

                latencyMs:
                result.latencyMs,

                model:
                result.model,
            });


            /*
             * Core chaining:
             *
             * Step 1 output becomes
             * input context for Step 2.
             */

            previousOutput =
                result.output;
        } catch (error) {
            const errorMessage =
                getErrorMessage(
                    error
                );


            await admin
                .from(
                    "generation_requests"
                )
                .update({
                    status:
                        "failed",

                    error_message:
                    errorMessage,

                    completed_at:
                        new Date()
                            .toISOString(),
                })
                .eq(
                    "id",
                    generationRequestId
                );


            return NextResponse.json(
                {
                    error:
                        isTimeoutError(
                            error
                        )
                            ? `Step ${step.step_order} timed out on both available models.`
                            : `Step ${step.step_order} failed: ${errorMessage}`,

                    completedSteps:
                    outputs,
                },
                {
                    status:
                        isTimeoutError(
                            error
                        )
                            ? 504
                            : 502,
                }
            );
        }
    }


    /*
     * ==================================================
     * 14. MARK RUN SUCCESSFUL
     * ==================================================
     */

    await admin
        .from(
            "generation_requests"
        )
        .update({
            status:
                "succeeded",

            error_message:
                null,

            completed_at:
                new Date()
                    .toISOString(),
        })
        .eq(
            "id",
            generationRequestId
        );


    /*
     * ==================================================
     * 15. RETURN RESULT
     * ==================================================
     */

    const {
        data:
            publicImage,
    } =
        admin.storage
            .from(
                "caption-images"
            )
            .getPublicUrl(
                storagePath
            );


    return NextResponse.json({
        run: {
            id:
            generationRequestId,

            status:
                "succeeded",

            imageUrl:
            publicImage.publicUrl,

            outputs,
        },
    });
}