import { render, screen } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import ChatPage from "@/app/chat/page";
import UploadPage from "@/app/upload/page";

describe("Route stubs", () => {
  it("renders the upload page heading", () => {
    render(<UploadPage />);
    expect(screen.getByRole("heading", { name: "Upload" })).toBeInTheDocument();
  });

  it("renders the chat page heading", () => {
    render(<ChatPage />);
    expect(screen.getByRole("heading", { name: "Chat" })).toBeInTheDocument();
  });

  it("renders the admin page heading", () => {
    render(<AdminPage />);
    expect(screen.getByRole("heading", { name: "Admin" })).toBeInTheDocument();
  });
});
