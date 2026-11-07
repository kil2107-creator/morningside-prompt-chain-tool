"use client";

import {
    useEffect,
    useState,
} from "react";

type Theme =
    | "light"
    | "dark"
    | "system";


export default function ThemeSelector() {
    const [
        theme,
        setTheme,
    ] =
        useState<Theme>(
            "system"
        );


    useEffect(() => {
        const savedTheme =
            localStorage.getItem(
                "mcc-theme"
            ) as Theme | null;


        if (
            savedTheme ===
            "light" ||
            savedTheme ===
            "dark"
        ) {
            setTheme(
                savedTheme
            );

            document.documentElement
                .setAttribute(
                    "data-theme",
                    savedTheme
                );
        } else {
            setTheme(
                "system"
            );

            document.documentElement
                .removeAttribute(
                    "data-theme"
                );
        }
    }, []);


    function changeTheme(
        nextTheme: Theme
    ) {
        setTheme(
            nextTheme
        );


        if (
            nextTheme ===
            "system"
        ) {
            localStorage.removeItem(
                "mcc-theme"
            );

            document.documentElement
                .removeAttribute(
                    "data-theme"
                );

            return;
        }


        localStorage.setItem(
            "mcc-theme",
            nextTheme
        );

        document.documentElement
            .setAttribute(
                "data-theme",
                nextTheme
            );
    }


    return (
        <div
            className="theme-selector"
            aria-label="Theme"
        >
            <button
                type="button"
                onClick={() =>
                    changeTheme(
                        "light"
                    )
                }
                className={
                    theme ===
                    "light"
                        ? "theme-option theme-option-active"
                        : "theme-option"
                }
            >
                Light
            </button>

            <button
                type="button"
                onClick={() =>
                    changeTheme(
                        "dark"
                    )
                }
                className={
                    theme ===
                    "dark"
                        ? "theme-option theme-option-active"
                        : "theme-option"
                }
            >
                Dark
            </button>

            <button
                type="button"
                onClick={() =>
                    changeTheme(
                        "system"
                    )
                }
                className={
                    theme ===
                    "system"
                        ? "theme-option theme-option-active"
                        : "theme-option"
                }
            >
                System
            </button>
        </div>
    );
}

