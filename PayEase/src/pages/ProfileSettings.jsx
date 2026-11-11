
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  Mail,
  LockKeyhole,
  Bell,
  ShieldCheck,
  Palette,
  LogOut,
  ChevronRight,
  Camera,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

import Navbar from "../components/Navbar";

export default function ProfileSettings() {
  const navigate = useNavigate();

  const [name, setName] = useState("Sthiti Pragyan Sahu");
  const [email, setEmail] = useState("sthiti@example.com");
  const [editing, setEditing] = useState(false);

  const [notifications, setNotifications] = useState({
    expense: true,
    settlement: true,
    group: false,
  });

  const [currency, setCurrency] = useState("USD");

  const toggleNotification = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    setEditing(false);
    alert("Profile updated!");
  };

  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">

        {/* Back button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center gap-2 font-bold hover:underline"
        >
          <ArrowLeft size={18} />
          Back to dashboard
        </button>

        {/* Heading */}
        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#667386]">
            Account
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Profile & Settings
          </h1>

          <p className="mt-2 text-[#526174]">
            Manage your profile and personalize PayEase.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.5fr]">

          {/* Profile card */}
          <section className="h-fit rounded-2xl border-2 border-[#182D43] bg-white p-6 shadow-[5px_5px_0px_#182D43]">

            <div className="flex flex-col items-center text-center">

              {/* Avatar */}
              <div className="relative mb-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#182D43] bg-[#FFE1A3] text-5xl">
                  👩🏻
                </div>

                <button
                  className="absolute bottom-0 right-0 rounded-full border-2 border-[#182D43] bg-[#FF684F] p-2 text-white"
                  title="Change profile picture"
                >
                  <Camera size={15} />
                </button>
              </div>

              <h2 className="text-2xl font-black">
                {name}
              </h2>

              <p className="mt-1 text-sm text-[#526174]">
                {email}
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
                    Account created
                  </p>

                  <p className="text-xs text-[#526174]">
                    January 2026
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
                    Update your account details.
                  </p>
                </div>
              </div>

              <div className="space-y-4">

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Full name
                  </label>

                  <input
                    value={name}
                    disabled={!editing}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#182D43] px-4 py-3 outline-none focus:border-[#FF684F] disabled:bg-[#FFF4DE]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Email address
                  </label>

                  <input
                    type="email"
                    value={email}
                    disabled={!editing}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#182D43] px-4 py-3 outline-none focus:border-[#FF684F] disabled:bg-[#FFF4DE]"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  {editing ? (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="rounded-xl border-2 border-[#182D43] px-4 py-2 font-bold"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-4 py-2 font-black shadow-[3px_3px_0px_#182D43]"
                      >
                        <Check size={16} />
                        Save changes
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="rounded-xl border-2 border-[#182D43] bg-[#FFE1A3] px-4 py-2 font-black shadow-[3px_3px_0px_#182D43]"
                    >
                      Edit profile
                    </button>
                  )}
                </div>
              </div>
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
                    Personalize your experience.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold">Default currency</p>

                  <p className="text-sm text-[#526174]">
                    Currency used throughout PayEase
                  </p>
                </div>
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
                    Keep your account secure.
                  </p>
                </div>
              </div>

              <button className="flex w-full items-center justify-between rounded-xl border-2 border-[#182D43] p-4 text-left font-bold transition hover:bg-[#FFF4DE]">
                <span className="flex items-center gap-3">
                  <LockKeyhole size={18} />
                  Change password
                </span>

                <ChevronRight size={18} />
              </button>
            </section>

            {/* Logout */}
            <button
  onClick={() => {
    logout();
    navigate("/", { replace: true });
  }}
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
