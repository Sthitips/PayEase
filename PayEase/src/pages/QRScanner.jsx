import { useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ScanLine, Users, Mic, MicOff, ChevronUp, ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";

const members = [
  { id: 1, name: "You" },
  { id: 2, name: "Riya" },
  { id: 3, name: "Ananya" },
  { id: 4, name: "Rahul" },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

function parseQRData(qrText) {
  // Parse UPI QR codes like:
  // upi://pay?pa=merchant@upi&pn=Merchant&am=500&tn=Lunch

  try {
    const url = new URL(qrText);

    if (url.protocol === "upi:") {
      return {
        merchant: url.searchParams.get("pn") || "",
        amount: url.searchParams.get("am") || "",
        description: url.searchParams.get("tn") || "",
      };
    }
  } catch {
    // The QR may contain plain text instead of a URL.
  }

  return {
    merchant: "",
    amount: "",
    description: "",
  };
}

export default function QRScanner() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [scanned, setScanned] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([1, 2, 3, 4]);
  const [message, setMessage] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || "");
  const [isTranscriptorOpen, setIsTranscriptorOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  function startScanner() {
    setScanned(false);
    setQrData(null);
    setMessage("");

    // html5-qrcode needs a DOM element with this id.
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        const data = parseQRData(decodedText);

        setQrData(decodedText);
        setMerchant(data.merchant);
        setAmount(data.amount);
        setDescription(data.description);
        setScanned(true);

        scanner.clear().catch(console.error);
      },
      () => {
        // Ignore scan errors while the camera is searching.
      }
    );
  }

  function toggleMember(memberId) {
    setSelectedMembers((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  }

  const splitAmount =
    selectedMembers.length > 0 && Number(amount) > 0
      ? Number(amount) / selectedMembers.length
      : 0;

  function handleRecordExpense(event) {
    event.preventDefault();

    if (!amount || Number(amount) <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    if (selectedMembers.length === 0) {
      setMessage("Select at least one member to split this expense.");
      return;
    }

    if (!description.trim()) {
      setMessage("Please describe what this expense was for.");
      return;
    }

    // Demo only: this does not save to the backend yet.
    const expense = {
      groupId,
      amount: Number(amount),
      merchant,
      description,
      paidBy: "You",
      splitAmong: selectedMembers,
      qrData,
      createdAt: new Date().toISOString(),
    };

    console.log("Expense to record:", expense);

    setMessage("Expense validated! Backend integration comes next.");
  }

  function handleStartRecording() {
    setIsRecording(true);

    // TODO: Connect actual speech recognition here.
    // Mock transcript for frontend testing.
    setTranscript(
      "I paid 1200 rupees for dinner. I had a pizza for 400, Riya had pasta for 350, and the rest was shared equally."
    );
  }

  function handleStopRecording() {
    setIsRecording(false);
  }

  function handleUseTranscript() {
    setDescription(transcript);
    setIsTranscriptorOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="mb-6 flex items-center gap-2 font-bold hover:underline"
        >
          <ArrowLeft size={18} />
          Back to group
        </button>

        <section className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#667386]">
            Add a shared expense
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Scan. Record. Split.
          </h1>

          <p className="mt-2 text-sm text-[#526174] sm:text-base">
            Scan the merchant's QR after paying for the group.
          </p>
        </section>

        {/* Scanner */}
        {!scanned && (
          <section className="rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43]">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border-2 border-[#182D43] bg-[#FFE1D9] p-3">
                <ScanLine size={24} />
              </div>

              <div>
                <h2 className="text-xl font-black">Scan QR code</h2>
                <p className="text-sm text-[#526174]">
                  Point your camera at the merchant's QR
                </p>
              </div>
            </div>

            <div id="qr-reader" className="overflow-hidden rounded-xl" />

            <button
              onClick={startScanner}
              className="mt-4 w-full rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-5 py-3 font-black shadow-[4px_4px_0px_#182D43] transition active:translate-y-1 active:shadow-none"
            >
              Open camera
            </button>

            <p className="mt-3 text-xs text-[#667386]">
              Camera access requires permission. For local development,
              use localhost or HTTPS.
            </p>
          </section>
        )}

        {/* Expense form */}
        {scanned && (
          <form
            onSubmit={handleRecordExpense}
            className="space-y-5 rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43] sm:p-7"
          >

            {!groupId && (
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Select group
                </label>

                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  required
                  className="w-full rounded-xl border-2 border-[#182D43] bg-white px-4 py-3"
                >
                  <option value="">Choose a group</option>
                  <option value="1">Goa Trip</option>
                  <option value="2">Flatmates</option>
                  <option value="3">College Fest</option>
                </select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Confirm expense</h2>

              <span className="flex items-center gap-1 rounded-full bg-[#DDF5E5] px-3 py-1 text-xs font-bold text-[#24754C]">
                <Check size={14} />
                QR scanned
              </span>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-bold"
              >
                Total amount (₹)
              </label>

              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount"
                required
                className="w-full rounded-xl border-2 border-[#182D43] bg-[#FFF4DE] px-4 py-3 text-2xl font-black outline-none focus:border-[#FF684F]"
              />
            </div>

            <div>
              <label
                htmlFor="merchant"
                className="mb-2 block text-sm font-bold"
              >
                Merchant
              </label>

              <input
                id="merchant"
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
                placeholder="e.g. Cafe Coffee Day"
                className="w-full rounded-xl border-2 border-[#182D43] px-4 py-3 outline-none focus:border-[#FF684F]"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-bold"
              >
                What did you pay for?
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. Lunch after shopping"
                rows={3}
                required
                className="w-full resize-none rounded-xl border-2 border-[#182D43] px-4 py-3 outline-none focus:border-[#FF684F]"
              />
            </div>

            {/* Voice Transcriptor */}
            <div className="overflow-hidden rounded-2xl border-2 border-[#182D43]">
              {/* Panel Header */}
              <button
                type="button"
                onClick={() => setIsTranscriptorOpen(!isTranscriptorOpen)}
                className="flex w-full items-center justify-between bg-[#182D43] px-4 py-4 text-[#FFF4DE]"
              >
                <span className="flex items-center gap-2 font-black">
                  <Mic size={20} />
                  Voice Transcriptor
                </span>

                {isTranscriptorOpen ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronUp size={20} />
                )}
              </button>

              {/* Animated panel */}
              <div
                className={`grid transition-all duration-500 ease-in-out ${isTranscriptorOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                  }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-4 bg-[#FFF4DE] p-4">
                    <p className="text-sm text-[#526174]">
                      Describe who paid and what everyone had. We'll help you
                      split the expense.
                    </p>

                    {/* Microphone */}
                    <div className="flex flex-col items-center gap-3 py-3">
                      <button
                        type="button"
                        onClick={
                          isRecording
                            ? handleStopRecording
                            : handleStartRecording
                        }
                        className={`flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#182D43] transition-all ${isRecording
                            ? "animate-pulse bg-[#FF684F]"
                            : "bg-[#FFC83D] hover:scale-105"
                          }`}
                      >
                        {isRecording ? (
                          <MicOff size={26} />
                        ) : (
                          <Mic size={26} />
                        )}
                      </button>

                      <span className="text-sm font-bold">
                        {isRecording ? "Listening..." : "Tap to speak"}
                      </span>
                    </div>

                    {/* Transcript */}
                    <div>
                      <label
                        htmlFor="voiceTranscript"
                        className="mb-2 block text-sm font-bold"
                      >
                        Transcript
                      </label>

                      <textarea
                        id="voiceTranscript"
                        value={transcript}
                        onChange={(event) => setTranscript(event.target.value)}
                        placeholder="Your spoken words will appear here..."
                        rows={4}
                        className="w-full resize-none rounded-xl border-2 border-[#182D43] bg-white px-4 py-3 text-sm outline-none focus:border-[#FF684F]"
                      />
                    </div>

                    {/* Use transcript */}
                    <button
                      type="button"
                      onClick={handleUseTranscript}
                      disabled={!transcript.trim()}
                      className="w-full rounded-xl border-2 border-[#182D43] bg-[#FFC83D] px-5 py-3 font-black shadow-[4px_4px_0px_#182D43] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Use transcript
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Split members */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Users size={18} />
                <h3 className="font-black">Split with</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {members.map((member) => {
                  const isSelected = selectedMembers.includes(member.id);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className={`rounded-xl border-2 border-[#182D43] px-3 py-3 text-left font-bold transition ${isSelected
                        ? "bg-[#FFC83D] shadow-[3px_3px_0px_#182D43]"
                        : "bg-white opacity-60"
                        }`}
                    >
                      <span className="flex items-center justify-between">
                        {member.name}
                        {isSelected && <Check size={16} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split summary */}
            <div className="rounded-xl border-2 border-[#182D43] bg-[#FFF4DE] p-4">
              <p className="text-sm font-semibold text-[#526174]">
                Equal split · {selectedMembers.length} members
              </p>

              <p className="mt-1 text-2xl font-black">
                {formatCurrency(splitAmount)}
                <span className="ml-2 text-sm font-semibold">per person</span>
              </p>
            </div>

            {message && (
              <p
                role="status"
                className="rounded-lg bg-[#DDF5E5] p-3 text-sm font-semibold"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-5 py-4 font-black shadow-[4px_4px_0px_#182D43] transition active:translate-y-1 active:shadow-none"
            >
              Record expense
            </button>

            <button
              type="button"
              onClick={() => {
                setScanned(false);
                setQrData(null);
                setMessage("");
              }}
              className="w-full rounded-xl border-2 border-[#182D43] bg-white px-5 py-3 font-bold"
            >
              Scan another QR
            </button>
          </form>
        )}
      </main>
    </div>
  );
}