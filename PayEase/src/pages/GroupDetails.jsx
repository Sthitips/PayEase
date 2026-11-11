import { useEffect, useState } from "react";
import api from "../lib/api";
import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";

import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Users,
  Plus,
  Copy,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(amount) || 0));

function ThreeDCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border-2 border-[#182D43] shadow-[5px_5px_0px_#182D43] ${className}`}
    >
      {children}
    </div>
  );
}

ModuleRegistry.registerModules([AllCommunityModule]);

const payEaseTheme = themeQuartz.withParams({
  backgroundColor: "#FFFFFF",
  foregroundColor: "#182D43",
  headerBackgroundColor: "#FFF0B8",
  headerTextColor: "#182D43",
  borderColor: "#E7DCC7",
  accentColor: "#FF684F",
  fontFamily: "inherit",
});

const columnDefs = [
  {
    field: "title",
    headerName: "Description",
    minWidth: 200,
    flex: 2,
    filter: "agTextColumnFilter",
  },
  {
    field: "payer",
    headerName: "Paid By",
    minWidth: 140,
    flex: 1,
    filter: "agTextColumnFilter",
  },
  {
    field: "amount",
    headerName: "Amount",
    minWidth: 130,
    flex: 1,
    filter: "agNumberColumnFilter",
    valueFormatter: (params) => formatCurrency(params.value),
  },
  {
    field: "date",
    headerName: "Date",
    minWidth: 150,
    flex: 1,
    filter: "agDateColumnFilter",
    valueFormatter: (params) =>
      params.value
        ? params.value.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        : "—",
  },
  {
    field: "input_source",
    headerName: "Source",
    minWidth: 120,
    flex: 1,
    filter: "agTextColumnFilter",
    valueFormatter: (params) =>
      params.value
        ? params.value.charAt(0).toUpperCase() + params.value.slice(1)
        : "Manual",
  },
  {
    field: "split_type",
    headerName: "Split Type",
    minWidth: 140,
    flex: 1,
    filter: "agTextColumnFilter",
    valueFormatter: (params) =>
      params.value
        ? params.value.replaceAll("_", " ")
        : "—",
  },
];

const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  floatingFilter: true,
};
export default function GroupDetails() {
  const { groupId } = useParams();
  const [apiGroup, setApiGroup] = useState(null);
  const [apiMembers, setApiMembers] = useState([]);
  const [apiExpenses, setApiExpenses] = useState([]);
  const [apiBalances, setApiBalances] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [quickFilterText, setQuickFilterText] = useState("");
  const group = apiGroup;
  const members = apiMembers;

  const transactions = apiExpenses.map((expense) => {
    const payer = members.find(
      (member) => member.id === expense.paid_by
    );

    return {
      ...expense,
      title: expense.description,
      payer: payer?.name || "Unknown member",
      date: expense.expense_date
        ? new Date(expense.expense_date)
        : null,
      transcript: expense.transcription_text || "",
    };
  });
  const currentUserBalance = apiBalances.find(
    (balance) => balance.user_id === currentUser?.id
  );

  const totalSpent = transactions.reduce(
    (total, expense) => total + Number(expense.amount),
    0
  );

  const youOwe = Math.max(
    -(Number(currentUserBalance?.net_balance ?? 0)),
    0
  );

  const owedToYou = Math.max(
    Number(currentUserBalance?.net_balance ?? 0),
    0
  );

  const memberColors = [
    "#FF684F",
    "#FFC83D",
    "#A9C7FF",
    "#B6E3B8",
    "#E7C7FF",
    "#F4B8C5",
  ];

  const memberSpending = members.map((member, index) => {
    const balance = apiBalances.find(
      (item) => item.user_id === member.id
    );

    return {
      ...member,
      spent: Number(balance?.total_paid ?? 0),
      color: memberColors[index % memberColors.length],
    };
  });

  useEffect(() => {
    let active = true;

    async function fetchGroupData() {
      try {
        setApiLoading(true);
        setApiError("");

        const [
          groupResponse,
          membersResponse,
          expensesResponse,
          balancesResponse,
          profileResponse,
        ] = await Promise.all([
          api.get(`/api/groups/${groupId}`),
          api.get(`/api/groups/${groupId}/members`),
          api.get(`/api/groups/${groupId}/expenses/`),
          api.get(`/api/groups/${groupId}/balances`),
          api.get("/api/auth/me"),
        ]);

        if (!active) return;

        setApiGroup(groupResponse.data);
        setApiMembers(membersResponse.data);
        setApiExpenses(expensesResponse.data);
        setApiBalances(balancesResponse.data);
        setCurrentUser(profileResponse.data);

      } catch (error) {
        console.error("Failed to load group:", error);

        if (!active) return;

        setApiError(
          error.response?.data?.detail ||
          "Unable to load group details."
        );

      } finally {
        if (active) setApiLoading(false);
      }
    }

    fetchGroupData();

    return () => {
      active = false;
    };
  }, [groupId]);

  useEffect(() => {
    if (!apiLoading && apiGroup) {
      console.log("Group:", apiGroup);
      console.log("Members:", apiMembers);
      console.log("Expenses:", apiExpenses);
      console.log("Balances:", apiBalances);
      console.log("Current user:", currentUser);
    }
  }, [
    apiLoading,
    apiGroup,
    apiMembers,
    apiExpenses,
    apiBalances,
    currentUser,
  ]);

  const navigate = useNavigate();

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy invite code:", error);
    }
  }

  if (apiLoading) {
    return (
      <div className="min-h-screen bg-[#FFF4DE] flex items-center justify-center">
        <p className="font-bold text-[#182D43]">
          Loading group details...
        </p>
      </div>
    );
  }

  if (apiError || !group) {
    return (
      <div className="min-h-screen bg-[#FFF4DE] flex flex-col items-center justify-center gap-4">
        <p className="font-bold text-red-600">
          {apiError || "Group not found."}
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-xl bg-[#182D43] px-5 py-3 font-bold text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
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
              {group.emoji || "👥"}
            </div>

            <div>
              <h1 className="text-3xl font-black sm:text-4xl">
                {group.name}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-[#526174]">
                <Users size={16} />
                {members.length} members · {transactions.length} transactions
              </p>
            </div>
          </div>
        </section>


        {/* Invite Code Card */}
        <ThreeDCard className="bg-[#182D43] p-5 text-[#FFF4DE] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">
                Invite friends to this group
              </h2>
              <p className="mt-1 text-sm text-[#D7DFE8]">
                Share this code with friends so they can join.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border-2 border-[#FFF4DE]/40 bg-white/10 px-5 py-3">
                <span className="font-black tracking-[0.2em] text-xl">
                  {group.invite_code}
                </span>
              </div>

              <button
                type="button"
                onClick={copyInviteCode}
                className="flex items-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#FFC83D] px-4 py-3 font-bold text-[#182D43] shadow-[3px_3px_0px_#FFF4DE] transition active:translate-y-1 active:shadow-none"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </ThreeDCard>


        <div>
          <button onClick={() => navigate(`/group/${groupId}/settle`)} className="rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-5 py-3 font-black shadow-[4px_4px_0px_#182D43] transition active:translate-y-1 active:shadow-none">
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
              {memberSpending.map((member) => {
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
                Search, sort and manage group expenses.
              </p>
            </div>

            <button
              onClick={() => navigate(`/group/${groupId}/scan`)}
              type="button"
              className="flex items-center gap-2 rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-4 py-3 font-bold shadow-[4px_4px_0px_#182D43] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_#182D43] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Plus size={18} />
              Add expense
            </button>
          </div>

          <ThreeDCard className="overflow-hidden bg-white p-4 sm:p-5">
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={quickFilterText}
                onChange={(event) =>
                  setQuickFilterText(event.target.value)
                }
                placeholder="Search transactions..."
                className="w-full rounded-xl border-2 border-[#182D43]/20 bg-[#FFF9ED] px-4 py-3 text-sm outline-none transition focus:border-[#FF684F]"
              />
            </div>

            {/* AG Grid */}
            <div className="w-full">
              <AgGridReact
                theme={payEaseTheme}
                rowData={transactions}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                quickFilterText={quickFilterText}
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 20, 50]}
                animateRows={true}
                domLayout="autoHeight"
                suppressCellFocus={true}
                overlayNoRowsTemplate="No expenses recorded in this group yet."
              />
            </div>
          </ThreeDCard>
        </section>


      </main>
    </div>
  );
}
