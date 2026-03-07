"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Scans", href: "/scans" },
  { label: "Reports", href: "/reports" }
];

const PROFILE_ITEMS = ["Account", "Settings", "Privacy", "Logout"];

export default function PortalNavbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-slate-900">
          Veriscan
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`text-sm font-medium transition ${
                  isActive ? "text-slate-900" : "text-slate-700 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            className="hidden rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 md:inline-flex"
          >
            EN
          </button>
          <Link
            href="/"
            className="hidden rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 md:inline-flex"
          >
            New Scan
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOpen((previous) => !previous)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700"
              aria-label="Profile menu"
              aria-expanded={isOpen}
            >
              VS
            </button>

            {isOpen ? (
              <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {PROFILE_ITEMS.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setIsOpen(false)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
