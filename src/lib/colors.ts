export function scoreColor(score: number) {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
}

export function progressColor(score: number) {
    if (score >= 80) return "[&>div]:bg-emerald-500";
    if (score >= 50) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-red-500";
}
