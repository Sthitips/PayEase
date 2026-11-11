import { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Users,
  Palmtree,
  House,
  Wallet,
  UserRound,
  ChevronRight,
  X,
  QrCode,
  ScanQrCodeIcon,
} from "lucide-react";
import QRScanner from "./QRScanner";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(amount) || 0));

function ThreeDCard({ children, className = "", onClick, ...props }) {
  return (
    <div
      {...props}
      onClick={onClick}
      className={`rounded-2xl border-2 border-[#182D43] shadow-[5px_5px_0px_#182D43] transition-all duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[7px_7px_0px_#182D43] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[1px_1px_0px_#182D43] ${className}`}
    >
      {children}
    </div>
  );
}

const groupStyles = [
  { emoji: "🌴", color: "bg-[#FFE1D9]" },
  { emoji: "🏠", color: "bg-[#FFF0B8]" },
  { emoji: "🎉", color: "bg-[#DDEBFF]" },
  { emoji: "✈️", color: "bg-[#E5E1FF]" },
  { emoji: "🍕", color: "bg-[#DDF3E4]" },
];

async function fetchGroupSummary(group, currentUserId) {
  const [membersResponse, expensesResponse, balancesResponse] =
    await Promise.all([
      api.get(`/api/groups/${group.id}/members`),
      api.get(`/api/groups/${group.id}/expenses/`),
      api.get(`/api/groups/${group.id}/balances`),
    ]);

  const members = membersResponse.data;
  const expenses = expensesResponse.data;
  const balances = balancesResponse.data;

  const currentUserBalance = balances.find(
    (member) => member.user_id === currentUserId
  );

  const style = groupStyles[(group.id - 1) % groupStyles.length];

  return {
    ...group,
    members: members.length,
    expenses: expenses.length,
    balance: Number(currentUserBalance?.net_balance ?? 0),
    emoji: style.emoji,
    color: style.color,
  };
}


export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [user, setUser] = useState(null);
  const [groupMode, setGroupMode] = useState("create");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSideBarOpen, setIsSideBarOpen] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const navigate = useNavigate();

  // Positive balance = people owe you.
  // Negative balance = you owe people.
  const totalOwed = groups.reduce(
    (total, group) => total + Math.max(group.balance, 0),
    0
  );

  const totalOwing = groups.reduce(
    (total, group) => total + Math.max(-group.balance, 0),
    0
  );

  async function handleCreateGroup(event) {
    event.preventDefault();

    if (!groupName.trim()) return;

    try {
      setCreatingGroup(true);
      setMessage("");

      const response = await api.post("/api/groups/", {
        name: groupName.trim(),
        description: null,
        currency: "USD",
      });

      // Add the actual group returned by FastAPI.
      const enrichedGroup = await fetchGroupSummary(
        response.data,
        user.id
      );

      setGroups((current) => [
        enrichedGroup,
        ...current,
      ]);

      setGroupName("");
      setShowGroupForm(false);

      setMessage(`"${response.data.name}" created successfully!`);
    } catch (err) {
      console.error("Group creation failed:", err);

      setMessage(
        err.response?.data?.detail ||
        "Unable to create group. Please try again."
      );
    } finally {
      setCreatingGroup(false);
    }
  }


  async function handleJoinGroup(event) {
    event.preventDefault();

    const code = inviteCode.trim().toUpperCase();

    if (!code) return;

    try {
      setJoiningGroup(true);
      setMessage("");

      // 1. Send the invite code to the backend
      const response = await api.post("/api/groups/join", {
        invite_code: code,
      });

      // 2. Fetch the joined group's complete dashboard summary
      const enrichedGroup = await fetchGroupSummary(
        response.data,
        user.id
      );

      // 3. Add the new group without creating duplicates
      setGroups((current) => [
        enrichedGroup,
        ...current.filter((group) => group.id !== enrichedGroup.id),
      ]);

      // 4. Reset the form
      setInviteCode("");

      // 5. Show success
      setMessage(
        `Successfully joined "${response.data.name}"!`
      );

    } catch (err) {
      console.error("Joining group failed:", err);

      setMessage(
        err.response?.data?.detail ||
        "Unable to join group. Please try again."
      );

    } finally {
      setJoiningGroup(false);
    }
  }



  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError("");

        const [profileResponse, groupsResponse] = await Promise.all([
          api.get("/api/auth/me"),
          api.get("/api/groups/"),
        ]);

        const currentUser = profileResponse.data;
        const rawGroups = groupsResponse.data;

        const enrichedGroups = await Promise.all(
          rawGroups.map((group) =>
            fetchGroupSummary(group, currentUser.id)
          )
        );

        if (!active) return;

        setUser(currentUser);
        setGroups(enrichedGroups);
      } catch (err) {
        console.error("Dashboard loading failed:", err);

        if (!active) return;

        setError(
          err.response?.data?.detail ||
          "Unable to load your dashboard."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, []);

  function openGroup(group) {
    navigate(`/group/${group.id}`);
  }


  return (
    <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
      {/* Header */}
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl space-y-9 px-5 py-8 sm:px-8 sm:py-10">
        {/* Welcome */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#667386]">
            Your money, minus the awkwardness.
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Hey there!
          </h1>
          <p className="mt-2 text-sm text-[#526174] sm:text-base">
            Here's where your group finances stand.
          </p>
        </section>

        {/* QR Scanner */}
        <section className="flex items-center justify-center">
          <button onClick={() => navigate("/scan")} className="grid grid-cols-1 w-full bg-[#FFE1D9] rounded-2xl border-2 border-[#182D43] shadow-[5px_5px_0px_#182D43] transition-all duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[7px_7px_0px_#182D43] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[1px_1px_0px_#182D43]">
            <div className="md:flex md:flex-row md:items-center md:justify-between">
              <div className="p-5 sm:p-7">
                <h2 className="text-center md:text-left text-2xl font-black sm:text-3xl">Scan QR Code</h2>
                <p className="text-center md:text-left mt-1 text-sm text-[#526174]">
                  Scan a QR code to make a payment.
                </p>
              </div>
              <div className="p-5 sm:p-7">
                <ScanQrCodeIcon className="mx-auto h-20 w-20 mt-2" />
              </div>
            </div>
          </button>
        </section>

        {/* Balance summary */}
        <section
          aria-label="Your overall balances"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2"
        >
          <ThreeDCard className="bg-white p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#182D43] bg-[#FFE1D9]">
                <ArrowUpRight size={26} strokeWidth={2.5} />
              </div>
              <span className="rounded-full bg-[#FFE1D9] px-3 py-1 text-xs font-bold">
                OUTGOING
              </span>
            </div>
            <p className="text-sm font-semibold text-[#526174]">
              Total you owe
            </p>
            <p className="mt-1 text-3xl font-black sm:text-4xl">
              {formatCurrency(totalOwing)}
            </p>
            <p className="mt-3 text-sm text-[#526174]">
              Across all your groups
            </p>
          </ThreeDCard>

          <ThreeDCard className="bg-[#FFC83D] p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#182D43] bg-[#FFF4DE]">
                <ArrowDownLeft size={26} strokeWidth={2.5} />
              </div>
              <span className="rounded-full border border-[#182D43] px-3 py-1 text-xs font-bold">
                INCOMING
              </span>
            </div>
            <p className="text-sm font-semibold">Total owed to you</p>
            <p className="mt-1 text-3xl font-black sm:text-4xl">
              {formatCurrency(totalOwed)}
            </p>
            <p className="mt-3 text-sm">Across all your groups</p>
          </ThreeDCard>
        </section>

        {/* Groups heading */}
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">Your groups</h2>
              <p className="mt-1 text-sm text-[#526174]">
                All your shared expenses, in one place.
              </p>
            </div>
            <span className="shrink-0 rounded-full border-2 border-[#182D43] bg-white px-3 py-1.5 text-sm font-bold">
              {groups.length} groups
            </span>
          </div>

          {/* Group cards */}
          {loading ? (
            <div className="rounded-2xl border-2 border-dashed border-[#182D43]/40 p-10 text-center">
              <p className="font-semibold">Loading your groups...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-6 text-center">
              <p className="font-semibold text-red-700">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg bg-[#182D43] px-4 py-2 text-sm font-bold text-white"
              >
                Retry
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#182D43]/40 p-10 text-center">
              <Users className="mx-auto mb-3" size={36} />
              <h3 className="text-lg font-bold">No groups yet</h3>
              <p className="mt-1 text-sm text-[#526174]">
                Create a group or join your friends to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <ThreeDCard
                  key={group.id}
                  onClick={() => openGroup(group)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openGroup(group);
                    }
                  }}
                  className="cursor-pointer bg-white p-5 outline-none focus-visible:ring-4 focus-visible:ring-[#FF684F]/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#182D43] text-2xl ${group.color}`}
                    >
                      {group.emoji}
                    </div>
                    <ChevronRight size={22} className="mt-1 shrink-0" />
                  </div>

                  <h3 className="mt-4 text-xl font-black">{group.name}</h3>
                  <p className="mt-1 text-sm text-[#526174]">
                    {group.members} members · {group.expenses} expenses
                  </p>

                  <div className="my-4 border-t-2 border-dashed border-[#182D43]/20" />

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#526174]">
                    Your balance
                  </p>
                  <p
                    className={`mt-1 text-lg font-black ${group.balance > 0
                      ? "text-[#24754C]"
                      : group.balance < 0
                        ? "text-[#C94B36]"
                        : "text-[#526174]"
                      }`}
                  >
                    {group.balance > 0
                      ? `You're owed ${formatCurrency(group.balance)}`
                      : group.balance < 0
                        ? `You owe ${formatCurrency(group.balance)}`
                        : "All settled up!"}
                  </p>
                </ThreeDCard>
              ))}
            </div>
          )}
        </section>

        {/* Create / Join group */}
        <section className="rounded-2xl border-2 border-[#182D43] bg-[#182D43] p-5 text-[#FFF4DE] shadow-[6px_6px_0px_#FF684F] sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">
                Let's get started.
              </h2>
              <p className="mt-2 max-w-lg text-sm text-[#D7DFE8]">
                Planning a trip or splitting rent? Get everyone on the same
                page.
              </p>
            </div>
          </div>

          {/* Toggle */}
          <div
            className="mt-6 grid grid-cols-2 gap-2 rounded-xl border-2 border-[#FFF4DE]/30 p-1.5"
            role="group"
            aria-label="Choose group action"
          >
            <button
              type="button"
              onClick={() => {
                setGroupMode("create");
                setShowGroupForm(false);
                setMessage("");
              }}
              aria-pressed={groupMode === "create"}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 font-bold transition-all active:translate-y-1 ${groupMode === "create"
                ? "border-2 border-[#182D43] bg-[#FF684F] text-[#182D43]"
                : "text-[#FFF4DE] hover:bg-white/10"
                }`}
            >
              <Plus size={19} />
              Create group
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupMode("join");
                setShowGroupForm(false);
                setMessage("");
              }}
              aria-pressed={groupMode === "join"}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 font-bold transition-all active:translate-y-1 ${groupMode === "join"
                ? "border-2 border-[#182D43] bg-[#FFC83D] text-[#182D43]"
                : "text-[#FFF4DE] hover:bg-white/10"
                }`}
            >
              <Users size={19} />
              Join group
            </button>
          </div>

          {/* Toggle content */}
          <div className="mt-5">
            {groupMode === "create" ? (
              <form
                onSubmit={handleCreateGroup}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <label className="sr-only" htmlFor="groupName">
                  New group name
                </label>
                <input
                  id="groupName"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="e.g. Manali Trip, Flatmates..."
                  maxLength={60}
                  required
                  className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-[#FFF4DE] bg-white px-4 text-[#182D43] outline-none placeholder:text-[#7A8795] focus:border-[#FF684F] focus:ring-2 focus:ring-[#FF684F]/40"
                />
                <button
                  type="submit"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-5 font-black text-[#182D43] shadow-[4px_4px_0px_#FFF4DE] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_#FFF4DE] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <Plus size={19} />
                  Create group
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleJoinGroup}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <label className="sr-only" htmlFor="inviteCode">
                  Group invite code
                </label>

                <input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(event) =>
                    setInviteCode(event.target.value.toUpperCase())
                  }
                  placeholder="Enter your 8-character invite code"
                  maxLength={8}
                  minLength={8}
                  required
                  className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-[#FFF4DE] bg-white px-4 text-[#182D43] uppercase tracking-widest outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#7A8795] focus:border-[#FFC83D] focus:ring-2 focus:ring-[#FFC83D]/40"
                />


                <button
                  type="submit"
                  disabled={joiningGroup || inviteCode.trim().length !== 8}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#FFC83D] px-5 font-black text-[#182D43] shadow-[4px_4px_0px_#FFF4DE] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_#FFF4DE] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Users size={19} />
                  {joiningGroup ? "Joining..." : "Join group"}
                </button>

              </form>
            )}

            {message && (
              <div
                role="status"
                className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-[#FFF4DE]/40 bg-white/10 p-3 text-sm"
              >
                <p>{message}</p>
                <button
                  type="button"
                  aria-label="Dismiss message"
                  onClick={() => setMessage("")}
                  className="shrink-0 rounded p-1 hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[#182D43]/15 px-5 py-6 text-center text-sm text-[#526174]">
        Made for friends, not financial drama. ✨
      </footer>
    </div>
  );
}
