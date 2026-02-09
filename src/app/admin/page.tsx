import { InvitesList } from "./invites-list";
import { CreateInviteForm } from "./create-invite-form";

export default function AdminPage() {
  return (
    <section className="page space-y-8">
      <div>
        <h1>Admin</h1>
        <p className="muted">Manage invites and system settings.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <CreateInviteForm />
        <InvitesList />
      </div>
    </section>
  );
}
