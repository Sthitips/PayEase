
import { useState } from "react";

export default function AuthForm({
  mode,
  onSubmit,
  error,
  loading,
}) {
  const isSignup = mode === "signup";
  const [validationError, setValidationError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (isSignup && password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    onSubmit?.(Object.fromEntries(formData.entries()));
  }

  const inputClass =
    "w-full rounded-xl border border-[#182D43]/15 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#FF684F] focus:ring-2 focus:ring-[#FF684F]/20";

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {isSignup && (
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            autoComplete="name"
            minLength={2}
            required
            className={inputClass}
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
          className={inputClass}
        />
      </div>

      {isSignup && (
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClass}
          />
        </div>
      )}

      {!isSignup && (
        <div className="text-right">
          <a
            href="/forgot-password"
            className="text-sm font-semibold text-[#182D43] hover:text-[#FF684F] hover:underline"
          >
            Forgot password?
          </a>
        </div>
      )}

      {(validationError || error) && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {validationError || error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full rounded-xl border-2 border-[#182D43]
          bg-[#FF684F] px-4 py-3.5 font-bold text-[#182D43]
          shadow-[3px_3px_0px_#182D43]
          transition-all duration-100
          hover:translate-x-[2px] hover:translate-y-[2px]
          hover:shadow-[1px_1px_0px_#182D43]
          active:translate-x-[3px] active:translate-y-[3px]
          active:shadow-none
          disabled:cursor-not-allowed disabled:opacity-60
        "
      >
        {loading
          ? "Please wait..."
          : isSignup
            ? "Create account →"
            : "Login to PayEase →"}
      </button>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        By continuing, you agree to our{" "}
        <a href="/terms" className="font-semibold text-[#182D43] underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="font-semibold text-[#182D43] underline">
          Privacy Policy
        </a>.
      </p>
    </form>
  );
}
