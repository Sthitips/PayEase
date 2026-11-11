import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Check,
  Clock,
  ChartNoAxesColumn,
  Users,
  Receipt,
} from "lucide-react";

import Navbar from "../components/Navbar";

const members = [
  {
    id: 1,
    name: "You",
    balance: 2400,
    avatar: "👩🏻",
  },
  {
    id: 2,
    name: "Rahul",
    balance: -1200,
    avatar: "👨🏻",
  },
  {
    id: 3,
    name: "Riya",
    balance: -800,
    avatar: "👩🏽",
  },
  {
    id: 4,
    name: "Ananya",
    balance: -400,
    avatar: "👩🏻‍🦱",
  },
];

const initialSettlements = [
  {
    id: 1,
    from: "Rahul",
    to: "You",
    amount: 1200,
    settled: false,
  },
  {
    id: 2,
    from: "Riya",
    to: "You",
    amount: 800,
    settled: false,
  },
  {
    id: 3,
    from: "Ananya",
    to: "You",
    amount: 400,
    settled: false,
  },
];

const recentSettlements = [
  {
    id: 1,
    from: "You",
    to: "Riya",
    amount: 1000,
    date: "12 Jan 2025",
  },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(amount) || 0));

export default function Settlement() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [settlements, setSettlements] =
    useState(initialSettlements);

  function toggleSettled(id) {
    setSettlements((current) =>
      current.map((settlement) =>
        settlement.id === id
          ? {
              ...settlement,
              settled: !settlement.settled,
            }
          : settlement
      )
    );
  }

  const pendingSettlements = settlements.filter(
    (settlement) => !settlement.settled
  );

  const totalToReceive = pendingSettlements.reduce(
    (sum, settlement) => sum + settlement.amount,
    0
  );

  return (
    <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">

        {/* Back button */}
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="mb-6 flex items-center gap-2 font-bold hover:underline"
        >
          <ArrowLeft size={18} />
          Back to group
        </button>

        {/* Group details */}
        <section className="mb-8 flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-[#182D43] bg-[#BFE8DF] text-5xl">
            🏕️
          </div>

          <div>
            <h1 className="text-3xl font-black sm:text-4xl">
              Goa Trip
            </h1>

            <p className="mt-1 text-[#526174]">
              4 members · ₹6,400 total expenses
            </p>
          </div>
        </section>

        {/* Page heading */}
        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#667386]">
            Settlement
          </p>

          <h2 className="mt-2 text-4xl font-black">
            Settle Up
          </h2>

          <p className="mt-2 text-[#526174]">
            Clear dues within the group in the simplest way.
          </p>
        </section>

        {/* Main layout */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr]">

          {/* Settlement plan */}
          <section className="rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43] sm:p-7">

            {/* Card heading */}
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl border-2 border-[#182D43] bg-[#FFE1A3] p-3">
                <ArrowLeftRight size={25} />
              </div>

              <div>
                <h3 className="text-xl font-black">
                  Settlement Plan
                </h3>

                <p className="text-sm text-[#526174]">
                  Suggested payments to clear all balances.
                </p>
              </div>
            </div>

            {/* Payments */}
            <div className="space-y-3">
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl p-3 sm:flex-nowrap ${
                    settlement.settled
                      ? "bg-[#DDF5E5] opacity-60"
                      : "bg-[#F2F8F2]"
                  }`}
                >
                  {/* Person paying */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DCEBFF] text-2xl">
                      {
                        members.find(
                          (member) =>
                            member.name === settlement.from
                        )?.avatar
                      }
                    </div>

                    <div className="min-w-0">
                      <p className="font-black">
                        {settlement.from}
                      </p>

                      <p className="text-sm text-[#526174]">
                        pays
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight
                    size={24}
                    className="shrink-0"
                  />

                  {/* Person receiving */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F4D9F4] text-2xl">
                      {
                        members.find(
                          (member) =>
                            member.name === settlement.to
                        )?.avatar
                      }
                    </div>

                    <p className="font-black">
                      {settlement.to}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-[#DDF5E5] px-3 py-2 font-black text-[#24754C]">
                      {formatCurrency(settlement.amount)}
                    </span>

                    <button
                      onClick={() =>
                        toggleSettled(settlement.id)
                      }
                      title="Mark as settled"
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#182D43] transition ${
                        settlement.settled
                          ? "bg-[#24754C] text-white"
                          : "bg-white hover:bg-[#FFE1A3]"
                      }`}
                    >
                      {settlement.settled && (
                        <Check size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t-2 border-[#E5E7EB] pt-6">
              <div>
                <p className="font-bold">
                  Total to receive
                </p>

                <p className="mt-1 text-3xl font-black text-[#24754C]">
                  {formatCurrency(totalToReceive)}
                </p>
              </div>

              <button
                onClick={() =>
                  setSettlements((current) =>
                    current.map((settlement) => ({
                      ...settlement,
                      settled: true,
                    }))
                  )
                }
                disabled={pendingSettlements.length === 0}
                className="flex items-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#182D43] px-5 py-3 font-black text-white shadow-[4px_4px_0px_#B7C3CF] transition hover:bg-[#294762] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={18} />
                Mark all settled
              </button>
            </div>
          </section>

          {/* Right side */}
          <div className="space-y-6">

            {/* Group balances */}
            <section className="rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43]">

              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl border-2 border-[#182D43] bg-[#FFE1D9] p-3">
                  <ChartNoAxesColumn size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-black">
                    Group Balances
                  </h3>

                  <p className="text-xs text-[#526174]">
                    + means to receive, − means to pay
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4D9F4] text-2xl">
                        {member.avatar}
                      </div>

                      <p className="font-black">
                        {member.name}
                      </p>
                    </div>

                    <span
                      className={`rounded-lg px-3 py-2 text-sm font-black ${
                        member.balance >= 0
                          ? "bg-[#DDF5E5] text-[#24754C]"
                          : "bg-[#FFE1D9] text-[#9F3346]"
                      }`}
                    >
                      {member.balance >= 0 ? "+" : "−"}{" "}
                      {formatCurrency(
                        Math.abs(member.balance)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent settlements */}
            <section className="rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43]">

              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl border-2 border-[#182D43] bg-[#E9E0FF] p-3">
                  <Clock size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-black">
                    Recent Settlements
                  </h3>

                  <p className="text-sm text-[#526174]">
                    Past settlements in this group
                  </p>
                </div>
              </div>

              {recentSettlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="flex items-center gap-3 rounded-xl bg-[#F2F8F2] p-3"
                >
                  <div className="rounded-full bg-[#DDF5E5] p-2 text-[#24754C]">
                    <Check size={18} />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {settlement.from} settled{" "}
                      <span className="font-black">
                        {formatCurrency(settlement.amount)}
                      </span>{" "}
                      with {settlement.to}
                    </p>

                    <p className="mt-1 text-xs text-[#526174]">
                      {settlement.date}
                    </p>
                  </div>
                </div>
              ))}
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}