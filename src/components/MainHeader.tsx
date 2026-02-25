"use client";

import React from "react";

export function MainHeader() {
    return (
        <header className="mx-auto mb-10 max-w-5xl text-center">
            <h1 className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                Resume AI Optimizer
            </h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                Paste a job description and upload your resume — get instant, actionable
                feedback.
            </p>
        </header>
    );
}
