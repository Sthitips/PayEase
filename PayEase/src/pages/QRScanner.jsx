import { useState, useRef, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ScanLine, Users, Mic, MicOff, ChevronUp, ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../lib/api";

const members = [
  { id: 1, name: "You" },
  { id: 2, name: "Riya" },
  { id: 3, name: "Ananya" },
  { id: 4, name: "Rahul" },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(amount) || 0));

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
  const [searchParams] = useSearchParams();
  const captureStartedRef = useRef(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([1, 2, 3, 4]);
  const [message, setMessage] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || "");
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(!groupId);
  const [groupsError, setGroupsError] = useState("");
  const [isTranscriptorOpen, setIsTranscriptorOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const [voiceError, setVoiceError] = useState("");
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isConfirmingExpense, setIsConfirmingExpense] = useState(false);
  const activeGroupId = groupId || selectedGroupId;
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");

    // Only restore the form when returning from PayPal.
    if (paymentStatus !== "returned" && paymentStatus !== "cancelled") {
      return;
    }

    const savedData = sessionStorage.getItem(
      "payease_pending_payment"
    );

    if (!savedData) {
      setMessage("Your previous QR scan could not be restored. Please scan again.");
      return;
    }

    try {
      const data = JSON.parse(savedData);

      setQrData(data.qrData);
      setAmount(data.amount);
      setMerchant(data.merchant);
      setDescription(data.description);
      setSelectedGroupId(
        String(data.selectedGroupId || groupId || "")
      );
      setSelectedMembers(data.selectedMembers || [1, 2, 3, 4]);
      setScanned(true);

      setMessage(
        paymentStatus === "returned"
          ? "You've returned from PayPal. Payment verification is pending."
          : "PayPal checkout was cancelled. Your scanned QR details have been restored."
      );
    } catch (error) {
      console.error("Failed to restore QR scan:", error);
      setMessage("Unable to restore your previous QR scan. Please scan again.");
    }
  }, [groupId, searchParams]);


  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const orderId = searchParams.get("order_id");

    if (paymentStatus !== "returned" || !orderId) {
      return;
    }

    // Prevent duplicate capture requests.
    if (captureStartedRef.current) {
      return;
    }

    captureStartedRef.current = true;

    async function capturePayment() {
      try {
        setMessage("Verifying and capturing your PayPal payment...");

        const response = await api.post(
          `/api/paypal/capture-order/${encodeURIComponent(orderId)}`
        );

        if (
          response.data.success &&
          response.data.order_status === "COMPLETED"
        ) {
          setIsPaymentCompleted(true);

          setMessage("Payment successful! Your transaction has been verified.");

          // Remove pending payment data after successful capture.
          sessionStorage.removeItem("payease_pending_payment");
        } else {
          setMessage(
            response.data.message ||
            "Payment could not be confirmed. Please try again."
          );
          captureStartedRef.current = false;
        }

      } catch (error) {
        console.error("PayPal capture failed:", error);

        setMessage(
          error.response?.data?.detail ||
          "Unable to verify your payment. Please try again."
        );

        captureStartedRef.current = false;
      }
    }

    capturePayment();

  }, [groupId, searchParams]);

  useEffect(() => {
    // If scanner is opened from a group page, use that group directly.
    if (groupId) {
      setSelectedGroupId(String(groupId));
      setLoadingGroups(false);
      return;
    }

    let isMounted = true;

    async function fetchGroups() {
      try {
        setLoadingGroups(true);
        setGroupsError("");

        const response = await api.get("/api/groups/");

        if (isMounted) {
          setGroups(response.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch groups:", error);

        if (isMounted) {
          setGroupsError(
            error.response?.data?.detail ||
            "Unable to load your groups. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingGroups(false);
        }
      }
    }

    fetchGroups();

    return () => {
      isMounted = false;
    };
  }, [groupId]);


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
  async function handlePayWithPayPal() {
    if (!amount || Number(amount) <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    try {
      setIsCreatingOrder(true);
      setMessage("");

      const activeGroupId = groupId || selectedGroupId;

      if (!activeGroupId) {
        setMessage("Please select a group before paying.");
        return;
      }

      const response = await api.post("/api/paypal/create-order", {
        amount: Number(amount),
        group_id: Number(activeGroupId),
      });

      const { approval_url } = response.data;

      if (!approval_url) {
        throw new Error("PayPal approval URL was not returned.");
      }

      // Preserve the scanned QR and expense details before redirecting.
      const storageKey = `payease_pending_payment`;

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          qrData,
          amount,
          merchant,
          description,
          selectedGroupId: activeGroupId,
          selectedMembers,
        })
      );

      // Redirect the buyer to PayPal Sandbox.
      window.location.href = approval_url;

    } catch (error) {
      console.error("PayPal order creation failed:", error);

      setMessage(
        error.response?.data?.detail ||
        error.message ||
        "Unable to initiate PayPal payment."
      );

      setIsCreatingOrder(false);
    }
  }

  function handleStartRecording() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Speech recognition is not supported in this browser. Please use Google Chrome."
      );
      return;
    }

    setVoiceError("");
    setTranscript("");

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let updatedTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        updatedTranscript += event.results[i][0].transcript + " ";
      }

      setTranscript(updatedTranscript.trim());
    };

    recognition.onerror = (event) => {
      setVoiceError(
        event.error === "not-allowed"
          ? "Microphone permission was denied. Please allow microphone access."
          : `Speech recognition error: ${event.error}`
      );
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleStopRecording() {
    recognitionRef.current?.stop();
  }

  async function handleGenerateAIDraft() {
    const userInput = transcript.trim();

    if (userInput.length < 5) {
      setMessage("Please provide a more detailed expense description.");
      return;
    }

    const activeGroupId = groupId || selectedGroupId;

    if (!activeGroupId) {
      setMessage("Please select a group first.");
      return;
    }

    try {
      setIsGeneratingDraft(true);
      setMessage("");
      setAiDraft(null);

      const response = await api.post(
        `/api/groups/${activeGroupId}/expenses/ai-draft`,
        {
          description: userInput,
        }
      );

      const draft = response.data;

      if (draft.clarification_needed) {
        setMessage(
          draft.clarification_question ||
          "The AI needs more information. Please clarify your expense."
        );
        return;
      }

      const membersResponse = await api.get(
        `/api/groups/${activeGroupId}/members`
      );

      setGroupMembers(membersResponse.data);
      setAiDraft(draft);

      // Temporary verification until we build the preview UI.
      console.log("AI Expense Draft:", draft);

      setMessage("AI expense draft generated successfully!");
    } catch (error) {
      console.error("AI draft generation failed:", error);

      setMessage(
        error.response?.data?.detail ||
        "Unable to generate an AI expense draft. Please try again."
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function handleConfirmExpense() {
    if (!aiDraft) return;

    const activeGroupId = groupId || selectedGroupId;

    const totalInCents = Math.round(Number(aiDraft.amount) * 100);

    const allocatedInCents = aiDraft.splits.reduce(
      (total, split) =>
        total + Math.round(Number(split.share_amount) * 100),
      0
    );

    if (totalInCents !== allocatedInCents) {
      setMessage("The allocation does not match the total expense.");
      return;
    }

    try {
      setIsConfirmingExpense(true);
      setMessage("");

      const payload = {
        amount: aiDraft.amount,
        description: aiDraft.description,
        merchant: aiDraft.merchant || null,
        input_source: "ai",
        split_type: aiDraft.split_type,
        transcription_text: transcript,
        participants: aiDraft.participants,
        splits: aiDraft.splits.map((split) => ({
          user_id: split.user_id,
          share_amount: split.share_amount,
        })),
      };

      await api.post(
        `/api/groups/${activeGroupId}/expenses/ai-confirm`,
        payload
      );

      // Clear the draft and return to the group page.
      setAiDraft(null);
      setTranscript("");

      navigate(`/group/${activeGroupId}`);
    } catch (error) {
      console.error("Expense confirmation failed:", error);

      setMessage(
        error.response?.data?.detail ||
        "Unable to save the expense. Please try again."
      );
    } finally {
      setIsConfirmingExpense(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF4DE] text-[#182D43]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">

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
          <form onSubmit={(event) => event.preventDefault()}
            className="space-y-5 rounded-2xl border-2 border-[#182D43] bg-white p-5 shadow-[5px_5px_0px_#182D43] sm:p-7"
          >

            {!groupId && (
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Select group
                </label>

                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  disabled={loadingGroups}
                  required
                  className="w-full rounded-xl border-2 border-[#182D43] bg-white px-4 py-3"
                >
                  <option value="">
                    {loadingGroups ? "Loading groups..." : "Select a group"}
                  </option>

                  {groups.map((group) => (
                    <option key={group.id} value={String(group.id)}>
                      {group.name}
                    </option>
                  ))}
                </select>

                {groupsError && (
                  <p className="mt-2 text-sm text-red-600">
                    {groupsError}
                  </p>
                )}

                {!loadingGroups && !groupsError && groups.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    You haven't joined any groups yet.
                  </p>
                )}
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
                Total amount ($)
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

            {isPaymentCompleted ? (
              <div className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-[#182D43] bg-[#DDF5E5] px-5 py-4 font-black text-[#24754C] shadow-[4px_4px_0px_#182D43]">
                <Check size={22} />
                Payment Done
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePayWithPayPal}
                disabled={isCreatingOrder}
                className="w-full rounded-xl border-2 border-[#182D43] bg-[#FFC83D] px-5 py-4 font-black shadow-[4px_4px_0px_#182D43] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingOrder ? "Connecting to PayPal..." : "Pay with PayPal"}
              </button>
            )}

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
                      {voiceError && (
                        <p className="rounded-lg bg-red-100 p-3 text-sm font-semibold text-red-700">
                          {voiceError}
                        </p>
                      )}
                    </div>

                    {/* Use transcript */}
                    <button
                      type="button"
                      onClick={handleGenerateAIDraft}
                      disabled={!transcript.trim() || isGeneratingDraft}
                      className="w-full rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-5 py-3 font-black shadow-[4px_4px_0px_#182D43] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGeneratingDraft
                        ? "Analyzing Expense..."
                        : "Generate AI Expense Draft"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Expense Preview */}
            {aiDraft && (
              <div className="space-y-5 rounded-2xl border-2 border-[#182D43] bg-[#FFF4DE] p-5 shadow-[5px_5px_0px_#182D43]">

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">
                    AI Expense Breakdown
                  </h2>
                  <span className="rounded-full bg-[#DDF5E5] px-3 py-1 text-xs font-bold text-[#24754C]">
                    Draft Ready
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#526174]">
                    Total expense
                  </p>
                  <p className="text-3xl font-black">
                    {formatCurrency(aiDraft.amount)}
                  </p>
                  <p className="mt-1 text-sm text-[#526174]">
                    {aiDraft.description}
                    {aiDraft.merchant ? ` · ${aiDraft.merchant}` : ""}
                  </p>
                </div>

                <div className="rounded-xl border-2 border-[#182D43] bg-white p-4">
                  <p className="mb-3 font-black">Who owes what?</p>

                  <div className="space-y-3">
                    {aiDraft.splits.map((split) => {
                      const member = groupMembers.find(
                        (item) => Number(item.id) === Number(split.user_id)
                      );

                      return (
                        <div
                          key={split.user_id}
                          className="flex items-center justify-between"
                        >
                          <span className="font-semibold">
                            {member?.name || `Member ${split.user_id}`}
                            {Number(split.user_id) === Number(aiDraft.payer_user_id)
                              ? " (Paid)"
                              : ""}
                          </span>

                          <span className="font-black">
                            {formatCurrency(split.share_amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex justify-between border-t-2 border-dashed border-[#182D43] pt-3">
                    <span className="font-black">Total allocated</span>
                    <span className="font-black">
                      {formatCurrency(
                        aiDraft.splits.reduce(
                          (sum, split) => sum + Number(split.share_amount),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-[#182D43] bg-white p-4">
                  <p className="text-sm text-[#526174]">Split method</p>
                  <p className="font-black capitalize">
                    {aiDraft.split_type.replaceAll("_", " ")}
                  </p>

                  {aiDraft.adjustment && (
                    <p className="mt-2 text-sm text-[#526174]">
                      Special adjustment applied for{" "}
                      {aiDraft.adjustment.participant_name}.
                    </p>
                  )}
                </div>

                {aiDraft.items?.length > 0 && (
                  <div className="rounded-xl border-2 border-[#182D43] bg-white p-4">
                    <p className="mb-3 font-black">Itemized breakdown</p>

                    {aiDraft.items.map((item, index) => (
                      <div key={index} className="flex justify-between py-2">
                        <span>{item.description}</span>
                        <span className="font-bold">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmExpense}
                  disabled={isConfirmingExpense}
                  className="w-full rounded-xl border-2 border-[#182D43] bg-[#FF684F] px-5 py-4 font-black shadow-[4px_4px_0px_#182D43] transition active:translate-y-1 active:shadow-none disabled:opacity-50"
                >
                  {isConfirmingExpense
                    ? "Saving Expense..."
                    : "Confirm Expense"}
                </button>

                <button
                  type="button"
                  onClick={() => setAiDraft(null)}
                  disabled={isConfirmingExpense}
                  className="w-full rounded-xl border-2 border-[#182D43] bg-white px-5 py-3 font-bold"
                >
                  Discard Draft
                </button>
              </div>
            )}


            {message && (
              <p
                role="status"
                className="rounded-lg bg-[#DDF5E5] p-3 text-sm font-semibold"
              >
                {message}
              </p>
            )}


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