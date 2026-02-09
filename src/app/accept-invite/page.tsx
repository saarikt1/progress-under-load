"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, Suspense, useEffect, useState } from "react";
import { redeemInviteAction } from "@/app/actions/invite";
import { checkInviteAction } from "@/app/actions/check-invite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function AcceptInviteForm() {
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const [state, formAction, isPending] = useActionState(redeemInviteAction, null);
    const [isValid, setIsValid] = useState<boolean | null>(null);

    useEffect(() => {
        if (code) {
            checkInviteAction(code).then((res) => setIsValid(res.isValid));
        }
    }, [code]);

    // We can do a quick check via a server action or just rely on the final submission.
    // However, for better UX, we should probably check validity on load.
    // Since this is a client component, we can't directly call DB. 
    // We could make the page a Server Component that passes validation status to the form.

    // For now, let's keep it simple as requested but improve the "Invalid Link" handling.

    if (!code) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Card className="w-full max-w-md border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Invalid Link</CardTitle>
                        <CardDescription>This invite link is invalid or missing the code.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Welcome!</CardTitle>
                <CardDescription>Set your password to create your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="code" value={code} />

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium">Password</label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={12}
                            placeholder="Minimum 12 characters"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={12}
                            placeholder="Re-enter password"
                        />
                    </div>

                    {state?.error && (
                        <p className="text-sm text-destructive font-medium">{state.error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function AcceptInvitePage() {
    return (
        <div className="page flex justify-center items-center min-h-[50vh]">
            <Suspense fallback={<div>Loading invite...</div>}>
                <AcceptInviteForm />
            </Suspense>
        </div>
    );
}
