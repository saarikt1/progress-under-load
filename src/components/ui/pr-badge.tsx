import { Trophy } from "lucide-react";

export function PRBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Trophy className="h-3 w-3" />
            New PR
        </span>
    );
}
