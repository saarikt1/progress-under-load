# Admin Setup & Login Instructions

To log in as an admin, you need to configure the local environment variables and ensure the admin user is bootstrapped in the database.

## 1. Configure Environment Variables

Create or edit `.env.local` in the project root:

```bash
# .env.local
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password-to-something-secure
# Optional but recommended
SESSION_TTL_DAYS=30
PBKDF2_ITERATIONS=250000
```

*Note: `PBKDF2_ITERATIONS` defaults to 250,000 if not set. For local dev you can lower it (e.g. 100,000) to speed up logins, but keep it high for production.*

## 2. Apply Local Migrations

Run the D1 migrations so the `users` table includes auth columns:

```bash
npm run db:migrate:local
```

## 3. Start the Development Server

Run the app locally:

```bash
npm run dev
```

## 4. Trigger Admin Bootstrap

The system is designed to automatically create the admin user if no users exist in the database.

1.  Navigate to the **Login Page** (e.g., `http://localhost:3000/login`).
2.  Attempt to log in with the credentials you set in `.env.local`.
    *   **Mechanism**: The login route (`/api/auth/login`) calls `ensureAdminBootstrap` before processing the login.
    *   If the database is empty, it will create the admin user with your credentials.
    *   If users already exist, it skips bootstrapping (so you must use the credentials that were first used to create the admin).

## 5. Verify Admin Access

1.  Upon successful login, you should be redirected to the dashboard.
2.  Navigate to `http://localhost:3000/admin`.
3.  You should see the Admin Dashboard with "Create Invite" options.

## 6. Invite a User

1.  Use the **Create Invite** form on `/admin` to generate an invite link.
2.  Share the link with the user.
3.  The user visits `/accept-invite?code=...`, sets a password, and gets logged in.
