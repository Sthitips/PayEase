
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  Mail,
  ShieldCheck,
  Palette,
  LogOut,
  Check,
  LoaderCircle,
  CreditCard,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Navbar from "../components/Navbar";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [user, setUser] = useState(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [editingPaypal, setEditingPaypal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch the logged-in user's profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/auth/me");

        setUser(response.data);
        setPaypalEmail(response.data.paypal_email || "");
      } catch (err) {
        console.error("Failed to fetch profile:", err);

        setError(
          err.response?.data?.detail ||
            "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // Save PayPal email
  async function handleSavePaypalEmail(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const normalizedEmail = paypalEmail.trim();

      const response = await api.patch("/api/auth/me", {
        paypal_email: normalizedEmail || null,
      });

      setUser(response.data);
      setPaypalEmail(response.data.paypal_email || "");
      setEditingPaypal(false);
      setSuccess("PayPal email updated successfully!");
    } catch (err) {
      console.error("Failed to update PayPal email:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to update your PayPal email."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancelPaypalEdit() {
    setPaypalEmail(user?.paypal_email || "");
    setEditingPaypal(false);
    setError("");
    setSuccess("");
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "U";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
        <Navbar />

        <div className="flex min-h-[60vh] items-center justify-center gap-3 font-bold">
          <LoaderCircle className="animate-spin" size={22} />
          Loading your profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">


        {/* Heading */}
        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#667386]">
            Account
          </p>

          <h1 className="mt-2 text-4xl font-black">
            My Profile
          </h1>

          <p className="mt-2 text-[#526174]">
            Manage your account information and payment details.
          </p>
        </section>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-xl border-2 border-red-400 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border-2 border-[#24754C] bg-[#DDF5E5] p-4 font-semibold text-[#24754C]">
            <Check size={18} />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.5fr]">
          {/* Profile overview */}
          <section className="h-fit rounded-2xl border-2 border-[#182D43] bg-white p-6 shadow-[5px_5px_0px_#182D43]">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#182D43] bg-[#FFE1A3] text-3xl font-black">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <h2 className="text-2xl font-black">
                {user?.name}
              </h2>

              <p className="mt-1 break-all text-sm text-[#526174]">
                {user?.email}
              </p>

              <span className="mt-4 rounded-full bg-[#DDF5E5] px-4 py-1 text-xs font-bold text-[#24754C]">
                PayEase Member
              </span>
            </div>

            <div className="mt-6 border-t-2 border-[#E5E7EB] pt-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#FFE1D9] p-3">
                  <UserRound size={20} />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Account information
                  </p>

                  <p className="text-xs text-[#526174]">
                    Your registered PayEase account
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Settings */}
          <div className="space-y-6">
            {/* Personal information */}
            <section className="rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl border-2 border-[#182D43] bg-[#FFE1A3] p-3">
                  <UserRound size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    Personal Information
                  </h2>

                  <p className="text-sm text-[#526174]">
                    Your registered account details.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Full name
                  </label>

                  <div className="flex items-center gap-3 rounded-xl border-2 border-[#182D43] bg-[#FFF4DE] px-4 py-3">
                    <UserRound
                      size={18}
                      className="shrink-0 text-[#667386]"
                    />

                    <span className="font-medium">
                      {user?.name}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Registered email
                  </label>

                  <div className="flex items-center gap-3 rounded-xl border-2 border-[#182D43] bg-[#FFF4DE] px-4 py-3">
                    <Mail
                      size={18}
                      className="shrink-0 text-[#667386]"
                    />

                    <span className="break-all font-medium">
                      {user?.email}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#667386]">
                  Your name and registered email are fixed after
                  account creation.
                </p>
              </div>
            </section>

            {/* PayPal information */}
            <section className="rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl border-2 border-[#182D43] bg-[#BFE8DF] p-3">
                  <CreditCard size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    Payment Information
                  </h2>

                  <p className="text-sm text-[#526174]">
                    Manage your PayPal account details.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSavePaypalEmail}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    PayPal email address
                  </label>

                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => {
                      setPaypalEmail(e.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    disabled={!editingPaypal || saving}
                    placeholder="Enter your PayPal email"
                    className="w-full rounded-xl border-2 border-[#182D43] px-4 py-3 outline-none focus:border-[#FF684F] disabled:bg-[#FFF4DE]"
                  />

                  <p className="mt-2 text-xs text-[#667386]">
                    Enter the email associated with your PayPal account.
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  {editingPaypal ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelPaypalEdit}
                        disabled={saving}
                        className="rounded-xl border-2 border-[#182D43] px-4 py-2 font-bold hover:bg-[#FFF4DE] disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-4 py-2 font-black shadow-[3px_3px_0px_#182D43] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            Save changes
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPaypal(true);
                        setSuccess("");
                        setError("");
                      }}
                      className="rounded-xl border-2 border-[#182D43] bg-[#FFE1A3] px-4 py-2 font-black shadow-[3px_3px_0px_#182D43]"
                    >
                      Edit PayPal email
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Preferences */}
            <section className="rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl border-2 border-[#182D43] bg-[#E9E0FF] p-3">
                  <Palette size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    Preferences
                  </h2>

                  <p className="text-sm text-[#526174]">
                    Your PayEase experience.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold">
                    Default currency
                  </p>

                  <p className="text-sm text-[#526174]">
                    Currency used throughout PayEase.
                  </p>
                </div>

                <span className="rounded-lg border-2 border-[#182D43] bg-[#FFF4DE] px-4 py-2 font-black">
                  USD ($)
                </span>
              </div>
            </section>

            {/* Security */}
            <section className="rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43] sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl border-2 border-[#182D43] bg-[#DDF5E5] p-3">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    Security
                  </h2>

                  <p className="text-sm text-[#526174]">
                    Manage your account access.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#FFF4DE] p-4">
                <ShieldCheck size={20} />

                <p className="text-sm text-[#526174]">
                  Your account is protected through PayEase
                  authentication.
                </p>
              </div>
            </section>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-5 py-4 font-black shadow-[4px_4px_0px_#182D43] transition hover:bg-[#FF806B] active:translate-y-1 active:shadow-none"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
