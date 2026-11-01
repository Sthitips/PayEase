import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {useNavigate} from "react-router-dom";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Pencil,
  Check,
  X,
  Users,
  Plus,
} from "lucide-react";
import Navbar from "@/components/Navbar";

// Mock group data — we'll replace this with an API response later.
const mockGroup = {
  id: "1",
  name: "Goa Trip",
  emoji: "🌴",
  members: [
    { id: 1, name: "You", spent: 4500, color: "#FF684F" },
    { id: 2, name: "Riya", spent: 3200, color: "#FFC83D" },
    { id: 3, name: "Ananya", spent: 2100, color: "#A9C7FF" },
    { id: 4, name: "Rahul", spent: 1800, color: "#B6E3B8" },
    { id: 5, name: "Karan", spent: 1400, color: "#E7C7FF" },
  ],
  transactions: [
    {
      id: 1,
      title: "Hotel booking",
      amount: 4500,
      payer: "You",
      date: "Oct 26",
      transcript:
        "I paid four thousand five hundred rupees for the hotel booking for all five of us.",
    },
  {
      id: 2,
      title: "Dinner at the beach",
      amount: 3200,
      payer: "Riya",
      date: "Oct 25",
      transcript:
        "Riya paid three thousand two hundred rupees for dinner at the beach. Split this equally between all five people.",
    },
  {
      id: 3,
      title: "Cab to the airport",
      amount: 1800,
      payer: "Rahul",
      date: "Oct 25",
      transcript:
        "Rahul paid eighteen hundred for the cab to the airport.",
    },
  {
      id: 4,
      title: "Groceries",
      amount: 2100,
      payer: "Ananya",
      date: "Oct 24",
      transcript:
        "Ananya bought groceries worth two thousand one hundred rupees for the group.",
    },
  {
      id: 5,
      title: "Snacks and drinks",
      amount: 1400,
      payer: "Karan",
      date: "Oct 24",
      transcript:
        "Karan paid fourteen hundred for snacks and drinks.",
    },
  ],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function ThreeDCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border-2 border-[#182D43] shadow-[5px_5px_0px_#182D43] ${className}`}
    >
      {children}
    </div>
  );
}

export default function GroupDetails() {
  const { groupId } = useParams();

  // Mock group lookup. Later, fetch this group using groupId.
  const group = mockGroup;

  const [transactions, setTransactions] = useState(group.transactions);
  const [editingId, setEditingId] = useState(null);
  const [draftTranscript, setDraftTranscript] = useState("");

  const totalSpent = group.members.reduce(
    (total, member) => total + member.spent,
    0
  );

  // Demo balances for this group.
  const youOwe = 1200;
  const owedToYou = 2000;
  const navigate = useNavigate();

  function startEditing(transaction) {
    setEditingId(transaction.id);
    setDraftTranscript(transaction.transcript);
  }

  function saveTranscript(transactionId) {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === transactionId
          ? { ...transaction, transcript: draftTranscript }
          : transaction
      )
    );

    setEditingId(null);
    setDraftTranscript("");
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftTranscript("");
  }

  return (
    <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
      {/* Header */}
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
        {/* Group heading */}
        <section>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#182D43] bg-[#FFE1D9] text-3xl shadow-[4px_4px_0px_#182D43]">
              {group.emoji}
            </div>

            <div>
              <h1 className="text-3xl font-black sm:text-4xl">
                {group.name}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-[#526174]">
                <Users size={16} />
                {group.members.length} members · {transactions.length} transactions
              </p>
            </div>
          </div>
        </section>

        <div>
          <button onClick={()=> navigate(`/group/${groupId}/settle`)} className="rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-5 py-3 font-black shadow-[4px_4px_0px_#182D43] transition active:translate-y-1 active:shadow-none">
            Settle Up
          </button>
        </div>

        {/* Balance cards */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ThreeDCard className="bg-white p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#182D43] bg-[#FFE1D9]">
                <ArrowUpRight size={25} />
              </span>
              <span className="rounded-full bg-[#FFE1D9] px-3 py-1 text-xs font-bold">
                OUTGOING
              </span>
            </div>
            <p className="mt-5 text-sm font-semibold text-[#526174]">
              You owe
            </p>
            <p className="mt-1 text-3xl font-black">
              {formatCurrency(youOwe)}
            </p>
            <p className="mt-2 text-sm text-[#526174]">
              Your outstanding balance in this group
            </p>
          </ThreeDCard>

          <ThreeDCard className="bg-[#FFC83D] p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#182D43] bg-[#FFF4DE]">
                <ArrowDownLeft size={25} />
              </span>
              <span className="rounded-full border border-[#182D43] px-3 py-1 text-xs font-bold">
                INCOMING
              </span>
            </div>
            <p className="mt-5 text-sm font-semibold">You're owed</p>
            <p className="mt-1 text-3xl font-black">
              {formatCurrency(owedToYou)}
            </p>
            <p className="mt-2 text-sm">
              Amount others need to pay you
            </p>
          </ThreeDCard>
        </section>

        {/* Spending chart */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">
                Spending breakdown
              </h2>
              <p className="mt-1 text-sm text-[#526174]">
                How much each member paid towards group expenses.
              </p>
            </div>
            <span className="rounded-full border-2 border-[#182D43] bg-white px-3 py-1.5 text-sm font-bold">
              Total: {formatCurrency(totalSpent)}
            </span>
          </div>

          <ThreeDCard className="bg-white p-5 sm:p-7">
            <div className="space-y-5">
              {group.members.map((member) => {
                const percentage =
                  totalSpent > 0 ? (member.spent / totalSpent) * 100 : 0;

                return (
                  <div key={member.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-bold">{member.name}</span>
                      <span className="text-sm font-bold">
                        {formatCurrency(member.spent)}
                        <span className="ml-2 text-xs font-medium text-[#526174]">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </span>
                    </div>

                    <div className="h-4 overflow-hidden rounded-full border border-[#182D43] bg-[#FFF4DE]">
                      <div
                        className="h-full rounded-full border-r border-[#182D43]"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: member.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ThreeDCard>
        </section>

        {/* Transactions */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">
                Transactions
              </h2>
              <p className="mt-1 text-sm text-[#526174]">
                Expense details and voice transcripts.
              </p>
            </div>

            <button
              onClick={()=>navigate(`/group/${groupId}/scan`)}
              type="button"
              className="flex items-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-4 py-3 font-bold shadow-[4px_4px_0px_#182D43] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_#182D43] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Plus size={18} />
              Add expense
            </button>
          </div>

          <div className="space-y-4">
            {transactions.map((transaction) => {
              const isEditing = editingId === transaction.id;

              return (
                <ThreeDCard
                  key={transaction.id}
                  className="bg-white p-5 sm:p-6"
                >
                  {/* Transaction heading */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#182D43] bg-[#FFF0B8]">
                        <Receipt size={22} />
                      </div>

                      <div>
                        <h3 className="font-black">{transaction.title}</h3>
                        <p className="mt-1 text-sm text-[#526174]">
                          Paid by {transaction.payer} · {transaction.date}
                        </p>
                      </div>
                    </div>

                    <p className="text-xl font-black">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>

                  {/* Transcript */}
                  <div className="mt-5 rounded-xl border-2 border-dashed border-[#182D43]/30 bg-[#FFF9ED] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#526174]">
                        Audio transcript
                      </p>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEditing(transaction)}
                          className="flex items-center gap-1.5 rounded-lg border border-[#182D43] bg-white px-3 py-1.5 text-xs font-bold transition hover:bg-[#FFE1D9]"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div>
                        <label
                          className="sr-only"
                          htmlFor={`transcript-${transaction.id}`}
                        >
                          Edit audio transcript
                        </label>

                        <textarea
                          id={`transcript-${transaction.id}`}
                          value={draftTranscript}
                          onChange={(event) =>
                            setDraftTranscript(event.target.value)
                          }
                          rows={4}
                          className="w-full resize-y rounded-lg border-2 border-[#182D43] bg-white p-3 text-sm outline-none focus:border-[#FF684F] focus:ring-2 focus:ring-[#FF684F]/30"
                        />

                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="flex items-center gap-1.5 rounded-lg border-2 border-[#182D43] bg-white px-3 py-2 text-sm font-bold"
                          >
                            <X size={15} />
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => saveTranscript(transaction.id)}
                            className="flex items-center gap-1.5 rounded-lg border-2 border-[#182D43] bg-[#B6E3B8] px-3 py-2 text-sm font-bold shadow-[3px_3px_0px_#182D43] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          >
                            <Check size={15} />
                            Save changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-[#526174]">
                        {transaction.transcript}
                      </p>
                    )}
                  </div>
                </ThreeDCard>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
