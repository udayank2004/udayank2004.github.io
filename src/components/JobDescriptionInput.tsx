"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface JobDescriptionInputProps {
    value: string;
    onChange: (value: string) => void;
}

export function JobDescriptionInput({ value, onChange }: JobDescriptionInputProps) {
    return (
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-lg">
                    <Label htmlFor="jd" className="text-base font-semibold">
                        Paste Job Description Here
                    </Label>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea
                    id="jd"
                    placeholder="Copy the full job description and paste it here…"
                    className="h-[300px] resize-none overflow-y-auto bg-background/50 text-sm leading-relaxed"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </CardContent>
        </Card>
    );
}
