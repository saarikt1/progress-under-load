import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/chat", label: "Chat" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      {navItems.map((item) => (
        <Link key={item.href} className="nav-link" href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
