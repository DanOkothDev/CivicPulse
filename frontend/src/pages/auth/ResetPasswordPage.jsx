import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const INPUT =
  "mt-2 w-full rounded-xl border border-[#cfe9f0] bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#1B8FC0] focus:outline-none focus:ring-2 focus:ring-[#38C6DC]/30";
const MAX_PASSWORD = 128;

export default function ResetPasswordPage() {
  const { logout } = useAuth();
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.get("token") || "";
  });
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    setReady(true);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError(
        "This reset link is missing its security token. Request a new link.",
      );
      return;
    }
    if (password.length < 10) {
      setError("Use at least 10 characters for your new password.");
      return;
    }
    if (password.length > MAX_PASSWORD) {
      setError(`Use ${MAX_PASSWORD} characters or fewer.`);
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      logout();
      setSuccess(true);
      setToken("");
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(
        cause.status === 429
          ? "Too many attempts. Please wait before trying again."
          : cause.status === 503
            ? "Password reset is temporarily unavailable. Please try again later."
            : "This reset link is invalid, expired, or already used. Request a new reset link.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#E6F5F8] px-4 py-10 sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-lg rounded-3xl border border-[#cfe9f0] bg-white p-7 shadow-xl sm:p-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B8FC0] hover:underline"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
        <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#E6F5F8] text-[#0B5A9C]">
          <ShieldCheck size={25} />
        </div>
        {success ? (
          <div aria-live="polite">
            <h1 className="mt-5 text-2xl font-extrabold text-[#0B5A9C]">
              Password updated
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your password has been reset. Sign in with your new password to
              continue.
            </p>
            <Link
              to="/login"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0B5A9C] px-4 font-semibold text-white hover:bg-[#084b82]"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-extrabold text-[#0B5A9C]">
              Create a new password
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose a password with 10–128 characters. Your reset link can only
              be used once.
            </p>
            {!ready ? (
              <p className="mt-7 text-sm text-slate-500" aria-live="polite">
                Checking your reset link…
              </p>
            ) : !token ? (
              <div
                role="alert"
                className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              >
                This reset link is incomplete or has expired. Request a new
                reset link to continue.
                <Link
                  to="/forgot-password"
                  className="ml-1 font-bold underline"
                >
                  Request a new link
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-7 space-y-5">
                <label
                  htmlFor="reset-password"
                  className="block text-sm font-semibold text-slate-700"
                >
                  New password
                  <span className="relative block">
                    <KeyRound
                      aria-hidden="true"
                      size={17}
                      className="absolute left-3 top-5 text-[#1B8FC0]"
                    />
                    <input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={10}
                      maxLength={MAX_PASSWORD}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${INPUT} pl-10 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={
                        showPassword ? "Hide new password" : "Show new password"
                      }
                      className="absolute right-3 top-4 rounded p-1 text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38C6DC]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                <label
                  htmlFor="reset-confirmation"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Confirm new password
                  <span className="relative block">
                    <input
                      id="reset-confirmation"
                      type={showConfirmation ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={10}
                      maxLength={MAX_PASSWORD}
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      className={`${INPUT} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmation((visible) => !visible)}
                      aria-label={
                        showConfirmation
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      className="absolute right-3 top-4 rounded p-1 text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38C6DC]"
                    >
                      {showConfirmation ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </span>
                </label>
                <p className="text-xs leading-5 text-slate-500">
                  A longer password or passphrase is easier to remember and
                  helps protect your account.
                </p>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B5A9C] px-4 font-semibold text-white hover:bg-[#084b82] disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? "Updating password…" : "Reset password"}
                </button>
              </form>
            )}
          </>
        )}
        <p className="mt-7 text-center text-xs text-slate-500">
          CivicPulse · Public infrastructure
        </p>
      </section>
    </main>
  );
}
