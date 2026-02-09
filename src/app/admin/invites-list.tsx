import { getAuthEnv } from "@/server/auth";
import { listInvites } from "@/server/invite";
import { RevokeInviteButton } from "./revoke-invite-button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function InvitesList() {
    const env = await getAuthEnv();
    const invites = await listInvites(env.DB);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Invites</CardTitle>
            </CardHeader>
            <CardContent>
                {invites.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No active invites found.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invites.map((invite) => (
                                <TableRow key={invite.id}>
                                    <TableCell className="font-medium">{invite.email}</TableCell>
                                    <TableCell>
                                        {new Date(invite.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(invite.expires_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <RevokeInviteButton inviteId={invite.id} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
