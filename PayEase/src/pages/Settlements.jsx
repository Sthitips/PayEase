
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeftRight,
  Check,
  Clock,
  ChartNoAxesColumn,
} from "lucide-react";

import api from "../lib/api";
import Navbar from "../components/Navbar";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(amount) || 0));

export default function Settlement() {
  const { groupId } = useParams();

  // Data
  const [currentUser, setCurrentUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [myPaymentReports, setMyPaymentReports] = useState([]);
  const [processingSettlementId, setProcessingSettlementId] =
    useState(null);
  const [incomingPaymentReports, setIncomingPaymentReports] =
    useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [error, setError] = useState("");

  // Fetch all settlement-related data
  async function fetchSettlementData() {
    try {
      setLoading(true);
      setError("");

      const [
        balancesResponse,
        settlementsResponse,
        profileResponse,
        groupResponse,
        myReportsResponse,
        incomingReportsResponse,
      ] = await Promise.all([
        api.get(`/api/groups/${groupId}/settlements/balances`),
        api.get(`/api/groups/${groupId}/settlements/`),
        api.get("/api/auth/me"),
        api.get(`/api/groups/${groupId}`),
        api.get("/api/settlement-payments/my-reports"),
        api.get("/api/settlement-payments/pending-confirmation"),
      ]);

      setMembers(balancesResponse.data);
      setSettlements(settlementsResponse.data);
      setCurrentUser(profileResponse.data);
      setGroup(groupResponse.data);
      setMyPaymentReports(myReportsResponse.data);
      setIncomingPaymentReports(incomingReportsResponse.data);
    } catch (err) {
      console.error("Failed to fetch settlement data:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to load settlement information."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentDecision(paymentId, action) {
    try {
      setProcessingSettlementId(paymentId);
      setError("");

      await api.patch(
        `/api/settlement-payments/${paymentId}/confirm`,
        { action }
      );

      await fetchSettlementData();
    } catch (err) {
      console.error("Failed to process payment confirmation:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to process payment confirmation."
      );
    } finally {
      setProcessingSettlementId(null);
    }
  }

  // Report a manual payment
  async function handleMarkAsPaid(settlementId) {
    try {
      setProcessingSettlementId(settlementId);
      setError("");

      await api.post(
        `/api/settlement-payments/${settlementId}/initiate`,
        { payment_method: "manual" }
      );

      await fetchSettlementData();
    } catch (err) {
      console.error("Failed to report payment:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to report payment."
      );
    } finally {
      setProcessingSettlementId(null);
    }
  }

  // Generate an optimized settlement plan
  async function handleGeneratePlan() {
    try {
      setGeneratingPlan(true);
      setError("");

      await api.post(
        `/api/groups/${groupId}/settlements/plan`
      );

      // Fetch the newly created settlement records
      await fetchSettlementData();
    } catch (err) {
      console.error("Failed to generate settlement plan:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to generate settlement plan."
      );
    } finally {
      setGeneratingPlan(false);
    }
  }

  // Fetch data when the page opens or group changes
  useEffect(() => {
    if (groupId) {
      fetchSettlementData();
    }
  }, [groupId]);

  // Separate pending and completed settlements
  const pendingSettlements = settlements.filter(
    (settlement) => settlement.status === "pending"
  );

  const completedSettlements = settlements.filter(
    (settlement) => settlement.status === "completed"
  );

  // Check whether the group has outstanding balances
  const hasOutstandingBalances = members.some(
    (member) =>
      Math.abs(Number(member.net_balance)) > 0.01
  );

  // Only show Generate Plan when there is no existing pending plan
  const canGeneratePlan =
    !loading &&
    !error &&
    pendingSettlements.length === 0 &&
    hasOutstandingBalances;

  // Current user's net balance
  const currentUserBalance = Number(
    members.find(
      (member) =>
        Number(member.user_id) === Number(currentUser?.id)
    )?.net_balance ?? 0
  );

  const totalToReceive = Math.max(currentUserBalance, 0);
  const totalToPay = Math.max(-currentUserBalance, 0);

  // Resolve user IDs into member names
  const getMemberName = (userId) =>
    members.find(
      (member) =>
        Number(member.user_id) === Number(userId)
    )?.name || "Unknown member";

  // Total group expenses = sum of the amounts paid by members
  const totalGroupExpenses = members.reduce(
    (total, member) =>
      total + Number(member.total_paid || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Group details */}
        <section className="mb-8 flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-[#182D43] bg-[#BFE8DF] text-5xl">
            🏕️
          </div>

          <div>
            <h1 className="text-3xl font-black sm:text-4xl">
              {group?.name || "Group"}
            </h1>

            <p className="mt-1 text-[#526174]">
              {members.length} members ·{" "}
              {formatCurrency(totalGroupExpenses)} total expenses
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

        {/* Loading state */}
        {loading && (
          <div className="mb-6 rounded-xl border-2 border-[#182D43] bg-white p-5 font-bold">
            Loading settlement information...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-xl border-2 border-red-400 bg-red-50 p-5 font-semibold text-red-700">
            {error}

            <button
              onClick={fetchSettlementData}
              className="ml-3 underline"
            >
              Retry
            </button>
          </div>
        )}

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

            {/* Generate settlement plan */}
            {canGeneratePlan && (
              <div className="mb-6 rounded-xl border-2 border-dashed border-[#182D43] bg-[#FFF9ED] p-5">
                <h4 className="text-lg font-black">
                  Ready to settle up?
                </h4>

                <p className="mt-1 text-sm text-[#526174]">
                  Generate an optimized payment plan to clear
                  everyone's outstanding balances with fewer
                  transactions.
                </p>

                <button
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan}
                  className="mt-4 rounded-xl border-2 border-[#182D43] bg-[#182D43] px-5 py-3 font-black text-white shadow-[4px_4px_0px_#B7C3CF] transition hover:bg-[#294762] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generatingPlan
                    ? "Generating plan..."
                    : "Generate Settlement Plan"}
                </button>
              </div>
            )}

            {/* Already settled state */}
            {!loading &&
              !error &&
              pendingSettlements.length === 0 &&
              !hasOutstandingBalances && (
                <p className="mb-5 rounded-xl bg-[#DDF5E5] p-4 font-semibold text-[#24754C]">
                  Everyone is settled up! No payments are needed.
                </p>
              )}

            {/* Pending settlement records */}
            <div className="space-y-3">
              {pendingSettlements.length === 0 ? (
                <p className="rounded-xl bg-[#F2F8F2] p-4 text-sm text-[#526174]">
                  No pending settlements.
                </p>
              ) : (
                pendingSettlements.map((settlement) => {
                  const paymentReport = myPaymentReports.find(
                    (payment) =>
                      Number(payment.settlement_id) ===
                      Number(settlement.id) &&
                      payment.status === "pending_confirmation"
                  );

                  const isPayer =
                    Number(settlement.from_user_id) ===
                    Number(currentUser?.id);

                  const incomingReport = incomingPaymentReports.find(
                    (payment) =>
                      Number(payment.settlement_id) === Number(settlement.id) &&
                      payment.status === "pending_confirmation"
                  );

                  const isRecipient =
                    Number(settlement.to_user_id) === Number(currentUser?.id);

                  return (
                    <div
                      key={settlement.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F2F8F2] p-3 sm:flex-nowrap"
                    >
                      {/* Payer */}
                      <div className="min-w-0 flex-1">
                        <p className="font-black">
                          {getMemberName(settlement.from_user_id)}
                        </p>

                        <p className="text-sm text-[#526174]">
                          pays
                        </p>
                      </div>

                      <ArrowRight
                        size={24}
                        className="shrink-0"
                      />

                      {/* Recipient */}
                      <div className="min-w-0 flex-1">
                        <p className="font-black">
                          {getMemberName(settlement.to_user_id)}
                        </p>
                      </div>

                      {/* Amount */}
                      <span className="rounded-lg bg-[#DDF5E5] px-3 py-2 font-black text-[#24754C]">
                        {formatCurrency(settlement.amount)}
                      </span>

                      {/* Payer action */}
                      {isPayer &&
                        (paymentReport ? (
                          <span className="rounded-lg bg-[#FFE1A3] px-3 py-2 text-sm font-bold text-[#805A00]">
                            Awaiting Confirmation
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkAsPaid(settlement.id)}
                            disabled={processingSettlementId === settlement.id}
                            className="rounded-lg border-2 border-[#182D43] bg-[#182D43] px-4 py-2 text-sm font-bold text-white hover:bg-[#294762] disabled:opacity-50"
                          >
                            {processingSettlementId === settlement.id
                              ? "Processing..."
                              : "Mark as Paid"}
                          </button>
                        ))}

                      {/* Recipient confirmation */}
                      {isRecipient && incomingReport && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handlePaymentDecision(incomingReport.id, "confirm")
                            }
                            disabled={processingSettlementId === incomingReport.id}
                            className="rounded-lg border-2 border-[#182D43] bg-[#DDF5E5] px-3 py-2 text-sm font-bold text-[#24754C] hover:bg-[#C5EBD2] disabled:opacity-50"
                          >
                            {processingSettlementId === incomingReport.id
                              ? "Processing..."
                              : "Confirm"}
                          </button>

                          <button
                            onClick={() =>
                              handlePaymentDecision(incomingReport.id, "reject")
                            }
                            disabled={processingSettlementId === incomingReport.id}
                            className="rounded-lg border-2 border-[#182D43] bg-[#FFE1D9] px-3 py-2 text-sm font-bold text-[#9F3346] hover:bg-[#FFD0C7] disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Current user's totals */}
            <div className="mt-8 flex flex-wrap gap-8 border-t-2 border-[#E5E7EB] pt-6">
              <div>
                <p className="font-bold">
                  You will receive
                </p>

                <p className="mt-1 text-2xl font-black text-[#24754C]">
                  {formatCurrency(totalToReceive)}
                </p>
              </div>

              <div>
                <p className="font-bold">
                  You need to pay
                </p>

                <p className="mt-1 text-2xl font-black text-[#9F3346]">
                  {formatCurrency(totalToPay)}
                </p>
              </div>
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
                    key={member.user_id}
                    className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4D9F4] text-xl">
                        👤
                      </div>

                      <p className="font-black">
                        {member.name}
                        {Number(member.user_id) ===
                          Number(currentUser?.id) && " (You)"}
                      </p>
                    </div>

                    <span
                      className={`rounded-lg px-3 py-2 text-sm font-black ${Number(member.net_balance) >= 0
                        ? "bg-[#DDF5E5] text-[#24754C]"
                        : "bg-[#FFE1D9] text-[#9F3346]"
                        }`}
                    >
                      {Number(member.net_balance) >= 0 ? "+" : "−"}
                      {formatCurrency(member.net_balance)}
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

              <div className="space-y-3">
                {completedSettlements.length === 0 ? (
                  <p className="rounded-xl bg-[#F2F8F2] p-4 text-sm text-[#526174]">
                    No completed settlements yet.
                  </p>
                ) : (
                  completedSettlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="flex items-center gap-3 rounded-xl bg-[#F2F8F2] p-3"
                    >
                      <div className="rounded-full bg-[#DDF5E5] p-2 text-[#24754C]">
                        <Check size={18} />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {getMemberName(settlement.from_user_id)}
                          {" settled "}

                          <span className="font-black">
                            {formatCurrency(settlement.amount)}
                          </span>

                          {" with "}
                          {getMemberName(settlement.to_user_id)}
                        </p>

                        <p className="mt-1 text-xs text-[#526174]">
                          {settlement.completed_at
                            ? new Date(
                              settlement.completed_at
                            ).toLocaleDateString()
                            : "Completed"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
