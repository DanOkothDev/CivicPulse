import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/*
  Palette (arbitrary Tailwind values, so no theme config is needed):
  light #e6f5f8 | cyan #3cc3dd | blue #1a77ab | deep #0d5694 | grey #626569
*/

const gradientButton =
  "bg-gradient-to-b from-[#3cc3dd] to-[#0d5694] text-white shadow-md shadow-[#0d5694]/25";

const dropStyles = `
@keyframes cp-drop{0%{opacity:0;transform:translateY(-8px)}100%{opacity:1;transform:translateY(0)}}
.cp-drop{animation:cp-drop .25s ease-out}
@media (prefers-reduced-motion:reduce){.cp-drop{animation:none}}
`;

export default function PublicNavbar() {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the mobile menu whenever the page changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close with Escape, close when the screen grows, and lock page scroll while open
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileMenuOpen]);

  const getDashboardPath = () => {
    if (role === "admin") return "/admin";
    if (role === "authority") return "/authority/assigned";
    if (role === "verifier") return "/verifier/queue";
    return "/dashboard";
  };

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
    { label: "Live Map", path: "/map" },
    { label: "FAQ", path: "/faq" },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <style>{dropStyles}</style>

      {/* Backdrop behind the mobile menu */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-[#082f5c]/40 backdrop-blur-[2px] md:hidden"
        />
      )}

      <header
        className={`sticky top-0 z-50 border-b border-[#e6f5f8] backdrop-blur-xl transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 py-2.5 shadow-lg shadow-[#0d5694]/5 sm:py-3"
            : "bg-white/80 py-3 sm:py-4"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-12">
          {/* Brand Logo */}
          <Link
            to="/"
            className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
          >

            <div className="min-w-0">
              <span className="block truncate text-lg font-extrabold tracking-tight text-[#626569] sm:text-2xl">
                Civic
                <span className="bg-gradient-to-r from-[#3cc3dd] to-[#0d5694] bg-clip-text text-transparent">
                  Pulse
                </span>
              </span>
              <p className="hidden text-[11px] font-semibold tracking-tight text-[#626569]/80 lg:block">
                Community Infrastructure Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-1 transition-colors ${
                    active
                      ? "font-extrabold text-[#0d5694]"
                      : "text-[#626569] hover:text-[#0d5694]"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-[#3cc3dd] to-[#0d5694]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons (tablet and desktop) */}
          <div className="hidden items-center gap-2.5 md:flex">
            {isAuthenticated ? (
              <Link
                to={getDashboardPath()}
                className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-extrabold tracking-wide transition hover:-translate-y-0.5 hover:brightness-110 ${gradientButton}`}
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-xs font-bold text-[#0d5694] transition-colors hover:text-[#3cc3dd]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-extrabold tracking-wide transition hover:-translate-y-0.5 hover:brightness-110 ${gradientButton}`}
                >
                  <span>Sign Up</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile: quick action + hamburger */}
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            {isAuthenticated ? (
              <Link
                to={getDashboardPath()}
                className={`rounded-lg px-3.5 py-2 text-xs font-extrabold max-[380px]:hidden ${gradientButton}`}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/register"
                className={`rounded-lg px-3.5 py-2 text-xs font-extrabold max-[380px]:hidden ${gradientButton}`}
              >
                Sign Up
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg bg-white p-2 text-[#0d5694] shadow-md shadow-[#0d5694]/10 ring-1 ring-[#0d5694]/5 transition hover:bg-[#e6f5f8]"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="cp-drop absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto px-3 pb-4 pt-3 md:hidden">
            <div className="rounded-3xl bg-white p-4 shadow-2xl shadow-[#0d5694]/20 ring-1 ring-[#0d5694]/5">
              <nav className="flex flex-col gap-1.5 text-sm font-semibold">
                {navLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-xl px-4 py-3 transition ${
                        active
                          ? `font-extrabold ${gradientButton}`
                          : "text-[#626569] hover:bg-[#e6f5f8] hover:text-[#0d5694]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 flex flex-col gap-2.5 border-t border-[#e6f5f8] pt-4">
                {isAuthenticated ? (
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-3 text-center text-xs font-extrabold tracking-wide ${gradientButton}`}
                  >
                    Go to Dashboard
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full rounded-lg border border-[#d3eaf0] bg-white py-3 text-center text-xs font-bold text-[#0d5694] transition hover:bg-[#e6f5f8]"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full rounded-lg py-3 text-center text-xs font-extrabold tracking-wide ${gradientButton}`}
                    >
                      Sign Up (Create Resident Account)
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
