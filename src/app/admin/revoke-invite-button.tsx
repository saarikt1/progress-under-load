"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeInviteAction } from "@/app/actions/invite";

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
    const [isPending, startTransition] = useTransition();

    return (
        <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => {
                if (!confirm("Are you sure you want to revoke this invite?")) return;
                startTransition(async () => {
                    await revokeInviteAction(inviteId);
                });
            }}
        >
            {isPending ? "Revoking..." : "Revoke"}
        </Button>
    );
}
