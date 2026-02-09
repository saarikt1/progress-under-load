"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createInviteAction } from "@/app/actions/invite";

export function CreateInviteForm() {
    const [result, setResult] = useState<{
        code?: string;
        email?: string;
        error?: string;
    } | null>(null);

    async function action(formData: FormData) {
        const res = await createInviteAction(formData);
        if (res.error) {
            setResult({ error: res.error });
        } else if (res.invite) {
            setResult({ code: res.invite.code, email: res.invite.email });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Invite</CardTitle>
            </CardHeader>
            <CardContent>
                {result?.code ? (
                    <div className="space-y-4">
                        <div className="rounded-md bg-green-50 p-4">
                            <p className="text-sm text-green-800">
                                Invite created for <strong>{result.email}</strong>
                            </p>
                            <p className="mt-2 text-xs text-green-700">
                                Share this link (it will only be shown once):
                            </p>
                            <code className="mt-1 block break-all rounded bg-white p-2 text-xs font-mono border">
                                {typeof window !== "undefined" ? window.location.origin : ""}
                                /accept-invite?code={result.code}
                            </code>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setResult(null)}
                            className="w-full"
                        >
                            Create Another
                        </Button>
                        <Button
                            variant="outline" // Using 'outline' as 'base' is not a standard shadcn variant
                            onClick={() => setResult(null)}
                            className="w-full mt-2"
                        >
                            Close
                        </Button>
                    </div>
                ) : (
                    <form action={action} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email Address
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="friend@example.com"
                                required
                            />
                        </div>
                        {result?.error && (
                            <p className="text-sm text-red-600">{result.error}</p>
                        )}
                        <Button type="submit">Generate Invite</Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
