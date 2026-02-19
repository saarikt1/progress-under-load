import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/admin/invites-list", () => ({
  InvitesList: () => <div>Invites list</div>,
}));

vi.mock("@/app/admin/create-invite-form", () => ({
  CreateInviteForm: () => <div>Create invite form</div>,
}));

import AdminPage from "@/app/admin/page";
import ChatPage from "@/app/chat/page";
import LoginPage from "@/app/login/page";
import UploadPage from "@/app/upload/page";

describe("Route stubs", () => {
  it("renders the upload page heading", () => {
    render(<UploadPage />);
    expect(screen.getByRole("heading", { name: "Upload CSV" })).toBeInTheDocument();
  });

  it("renders the chat page heading", () => {
    render(<ChatPage />);
    expect(screen.getByRole("heading", { name: "Chat" })).toBeInTheDocument();
  });

  it("renders the admin page heading", () => {
    render(<AdminPage />);
    expect(screen.getByRole("heading", { name: "Admin" })).toBeInTheDocument();
  });

  it("renders the login page heading", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});
