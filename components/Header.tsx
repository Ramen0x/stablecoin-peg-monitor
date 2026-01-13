"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const navItems = [{ href: "/", label: "Dashboard" }, { href: "/history", label: "History" }];
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">$</span>
              </div>
              <span className="text-lg font-semibold text-zinc-100">Stablecoin Peg Monitor</span>
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === item.href ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="text-xs text-zinc-500">Data from DeFiLlama</div>
        </div>
      </div>
    </header>
  );
}
