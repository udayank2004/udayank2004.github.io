"use client";

import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
import type {
    ResumeSchema,
    ResumeSection,
    ExperienceEntry,
    EducationEntry,
    SkillGroupEntry,
    ProjectEntry,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Register fonts — Computer Modern–like serif for LaTeX feel         */
/*  Using Lora (serif) for body + headings to approximate CMR          */
/* ------------------------------------------------------------------ */
Font.register({
    family: "Lora",
    fonts: [
        { src: "https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvTJPa787weuyJGmKxemMeZ.ttf", fontWeight: 400 },
        { src: "https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvTJPa787z5vCJGmKxemMeZ.ttf", fontWeight: 400, fontStyle: "italic" },
        { src: "https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvTJPa787wsuyJGmKxemMeZ.ttf", fontWeight: 700 },
    ],
});

/* ------------------------------------------------------------------ */
/*  Styles — Pixel-perfect replica of Jake Gutierrez LaTeX template    */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
    page: {
        fontFamily: "Lora",
        fontSize: 10,
        paddingTop: 24,
        paddingBottom: 24,
        paddingHorizontal: 30,
        color: "#000000",
        backgroundColor: "#ffffff",
    },

    /* ── Header ─────────────────────────── */
    headerWrap: {
        alignItems: "center",
        marginBottom: 6,
    },
    name: {
        fontSize: 24,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 2.5,
        marginBottom: 2,
    },
    address: {
        fontSize: 9,
        marginBottom: 2,
        color: "#000",
    },
    contactRow: {
        flexDirection: "row",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 4,
        fontSize: 9,
        marginTop: 1,
    },
    contactItem: {
        color: "#000",
    },
    contactSep: {
        color: "#000",
        marginHorizontal: 4,
    },

    /* ── Section heading ────────────────── */
    sectionHeadingWrap: {
        marginTop: 5,
        marginBottom: 2,
    },
    sectionTitle: {
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        paddingBottom: 1,
    },
    sectionRule: {
        borderBottom: "1pt solid #000000",
    },

    /* ── Subheading (Experience / Education) */
    subheading: {
        marginTop: 1,
        marginBottom: 0,
    },
    subRow1: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 0,
    },
    subTitle: {
        fontSize: 10,
        fontWeight: 700,
        maxWidth: "70%",
    },
    subDate: {
        fontSize: 9.5,
        fontWeight: 700,
        textAlign: "right" as const,
    },
    subRow2: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 1,
    },
    subSubtitle: {
        fontSize: 9,
        fontStyle: "italic",
        maxWidth: "70%",
    },
    subLocation: {
        fontSize: 8.5,
        fontStyle: "italic",
        textAlign: "right" as const,
    },

    /* ── Bullet items ───────────────────── */
    bulletWrap: {
        flexDirection: "row",
        marginBottom: 1,
        paddingLeft: 16,
    },
    bulletDot: {
        width: 8,
        fontSize: 6,
        marginTop: 2.5,
        color: "#000",
    },
    bulletText: {
        flex: 1,
        fontSize: 8.5,
        lineHeight: 1.4,
        color: "#000",
    },

    /* ── Project heading ────────────────── */
    projectRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 2,
        marginBottom: 1,
    },
    projectTitleWrap: {
        flexDirection: "row",
        alignItems: "center",
    },
    projectName: {
        fontSize: 10,
        fontWeight: 700,
    },
    projectTech: {
        fontSize: 9.5,
        fontStyle: "italic",
        marginLeft: 4,
    },
    projectDate: {
        fontSize: 9.5,
        fontWeight: 700,
        textAlign: "right" as const,
    },

    /* ── Skills ─────────────────────────── */
    skillRow: {
        flexDirection: "row",
        marginBottom: 1.5,
        paddingLeft: 6,
    },
    skillCategory: {
        fontWeight: 700,
        fontSize: 9.5,
    },
    skillItems: {
        fontSize: 9.5,
    },

    /* ── List items (Certifications etc.) ─ */
    listBulletWrap: {
        flexDirection: "row",
        marginBottom: 1,
        paddingLeft: 16,
    },

    /* ── Paragraph / text sections ──────── */
    paragraph: {
        fontSize: 9,
        lineHeight: 1.35,
        color: "#000",
        marginBottom: 3,
    },

    /* ── Entry spacer ───────────────────── */
    entryBlock: {
        marginBottom: 6,
    },
});

/* ------------------------------------------------------------------ */
/*  Sub-Renderers                                                      */
/* ------------------------------------------------------------------ */

function RenderExperience({ items }: { items: ExperienceEntry[] }) {
    return (
        <>
            {items.map((exp, i) => (
                <View key={i} style={s.entryBlock}>
                    <View style={s.subheading}>
                        <View style={s.subRow1}>
                            <Text style={s.subTitle}>{exp.company}</Text>
                            <Text style={s.subDate}>{exp.duration}</Text>
                        </View>
                        <View style={s.subRow2}>
                            <Text style={s.subSubtitle}>{exp.position}</Text>
                            <Text style={s.subLocation}>{exp.location}</Text>
                        </View>
                    </View>
                    {exp.bullets?.map((b, j) => (
                        <View key={j} style={s.bulletWrap}>
                            <Text style={s.bulletDot}>•</Text>
                            <Text style={s.bulletText}>{b}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </>
    );
}

function RenderEducation({ items }: { items: EducationEntry[] }) {
    return (
        <>
            {items.map((edu, i) => (
                <View key={i} style={s.entryBlock}>
                    <View style={s.subheading}>
                        <View style={s.subRow1}>
                            <Text style={s.subTitle}>{edu.school}</Text>
                            <Text style={s.subDate}>{edu.duration}</Text>
                        </View>
                        <View style={s.subRow2}>
                            <Text style={s.subSubtitle}>{edu.degree}</Text>
                            <Text style={s.subLocation}>{edu.location}</Text>
                        </View>
                    </View>
                    {edu.details && (
                        <View style={s.bulletWrap}>
                            <Text style={s.bulletDot}>•</Text>
                            <Text style={s.bulletText}>{edu.details}</Text>
                        </View>
                    )}
                </View>
            ))}
        </>
    );
}

function RenderSkills({ items }: { items: SkillGroupEntry[] }) {
    return (
        <>
            {items.map((sg, i) => (
                <View key={i} style={s.skillRow}>
                    <Text style={s.skillCategory}>{sg.category}: </Text>
                    <Text style={s.skillItems}>{sg.items.join(", ")}</Text>
                </View>
            ))}
        </>
    );
}

function RenderProjects({ items }: { items: ProjectEntry[] }) {
    return (
        <>
            {items.map((proj, i) => (
                <View key={i} style={s.entryBlock}>
                    <View style={s.projectRow}>
                        <View style={s.projectTitleWrap}>
                            <Text style={s.projectName}>{proj.name}</Text>
                            {proj.description && (
                                <Text style={s.projectTech}> | {proj.description}</Text>
                            )}
                        </View>
                        {proj.link && <Text style={s.projectDate}>{proj.link}</Text>}
                    </View>
                    {proj.highlights?.map((h, j) => (
                        <View key={j} style={s.bulletWrap}>
                            <Text style={s.bulletDot}>•</Text>
                            <Text style={s.bulletText}>{h}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </>
    );
}

function RenderList({ items }: { items: string[] }) {
    return (
        <>
            {items.map((item, i) => (
                <View key={i} style={s.listBulletWrap}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{item}</Text>
                </View>
            ))}
        </>
    );
}

function RenderText({ content }: { content: string }) {
    return <Text style={s.paragraph}>{content}</Text>;
}

/* ------------------------------------------------------------------ */
/*  Section Dispatcher                                                 */
/* ------------------------------------------------------------------ */
function SectionRenderer({ section }: { section: ResumeSection }) {
    switch (section.type) {
        case "experience":
            return <RenderExperience items={section.content} />;
        case "education":
            return <RenderEducation items={section.content} />;
        case "skills":
            return <RenderSkills items={section.content} />;
        case "projects":
            return <RenderProjects items={section.content} />;
        case "list":
            return <RenderList items={section.content} />;
        case "text":
            return <RenderText content={section.content} />;
        default:
            return null;
    }
}

/* ------------------------------------------------------------------ */
/*  Main Template                                                      */
/* ------------------------------------------------------------------ */
interface ResumeTemplate1Props {
    data: ResumeSchema;
}

export function ResumeTemplate1({ data }: ResumeTemplate1Props) {
    const { personalInfo, sections } = data;

    // Build contact items array for separator logic
    const contactParts: string[] = [];
    if (personalInfo?.phone) contactParts.push(personalInfo.phone);
    if (personalInfo?.email) contactParts.push(personalInfo.email);
    if (personalInfo?.linkedin) contactParts.push(personalInfo.linkedin);
    if (personalInfo?.github) contactParts.push(personalInfo.github);
    if (personalInfo?.website) contactParts.push(personalInfo.website);

    // ── Migration: Handle old schema format ────────────────
    let finalSections = sections || [];

    // If we have old-format fields, migrate them to sections
    if (finalSections.length === 0) {
        const oldData = data as any;
        if (oldData.summary) {
            finalSections.push({ id: "summary", title: "Summary", type: "text", content: oldData.summary });
        }
        if (oldData.experience && oldData.experience.length > 0) {
            finalSections.push({ id: "experience", title: "Experience", type: "experience", content: oldData.experience });
        }
        if (oldData.education && oldData.education.length > 0) {
            finalSections.push({ id: "education", title: "Education", type: "education", content: oldData.education });
        }
        if (oldData.skills && oldData.skills.length > 0) {
            finalSections.push({ id: "skills", title: "Skills", type: "skills", content: oldData.skills });
        }
        if (oldData.projects && oldData.projects.length > 0) {
            finalSections.push({ id: "projects", title: "Projects", type: "projects", content: oldData.projects });
        }
    }

    return (
        <Document>
            <Page size="LETTER" style={s.page}>
                {/* ── Header  ─────────────────────────── */}
                <View style={s.headerWrap}>
                    <Text style={s.name}>{personalInfo.name}</Text>
                    {personalInfo.location && (
                        <Text style={s.address}>{personalInfo.location}</Text>
                    )}
                    <View style={s.contactRow}>
                        {contactParts.map((part, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <Text style={s.contactSep}>|</Text>}
                                <Text style={s.contactItem}>{part}</Text>
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* ── Dynamic Sections ────────────────── */}
                {finalSections.map((section) => (
                    <View key={section.id}>
                        <View style={s.sectionHeadingWrap}>
                            <Text style={s.sectionTitle}>{section.title}</Text>
                            <View style={s.sectionRule} />
                        </View>
                        <SectionRenderer section={section} />
                    </View>
                ))}
            </Page>
        </Document>
    );
}
