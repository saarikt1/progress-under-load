import Link from "next/link";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/chat", label: "Chat" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Primary">
      {navItems.map((item) => (
        <Button key={item.href} asChild variant="secondary" size="sm">
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </nav>
  );
}
