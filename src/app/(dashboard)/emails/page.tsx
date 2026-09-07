'use client';

import {
  useGetAllEmailInboxesQuery,
  useLazyGetEmailsForTargetQuery,
  useSendCustomEmailMutation,
  useSendBulkEmailMutation,
  useUploadEmbeddedImageMutation,
} from "@/redux/api/emails";
import {
  useSendEmailForNotPaidOrdersMutation,
  useGetSingleCustomerQuery,
} from "@/redux/api/customers";
import { useGetProductsQuery } from "@/redux/api/product";
import { useGetProspectsQuery } from "@/redux/api/prospects";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  X,
  Send as SendIcon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Paperclip,
  Users,
  FileText,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import Loading from "@/redux/Shared/Loading";
import Cookies from "js-cookie";
import QuoteModal from "@/Features/Customers/details/QuoteModal";

type TargetType = "customer" | "employee";

interface InboxRow {
  targetType: TargetType;
  targetId: string;
  name: string;
  targetEmail: string;
  lastEmail: { subject: string; type: string; timestamp: string } | null;
  emailCount: number;
  lastActivity: string | null;
}

interface EmailHistoryEntry {
  timestamp: string;
  type: "system" | "custom" | "bulk";
  subject: string;
  html: string;
}

export default function EmailsInbox() {
  const [activeTab, setActiveTab] = useState<TargetType>("customer");
  const [selected, setSelected] = useState<InboxRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Compose (single-target) state
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const composeFileInputRef = useRef<HTMLInputElement>(null);

  // Rich message body (contentEditable — supports pasted/dropped inline
  // images alongside text). composeBodyEmpty mirrors whether the editor
  // has any real content, since a contentEditable div can't be a
  // controlled input the way a textarea's value can.
  const composeEditorRef = useRef<HTMLDivElement>(null);
  const [composeBodyEmpty, setComposeBodyEmpty] = useState(true);
  const [composePendingImageUploads, setComposePendingImageUploads] = useState(0);
  const [uploadEmbeddedImage] = useUploadEmbeddedImageMutation();

  // Advanced options (order-invoice + aging-report attachments) — collapsed
  // by default, customer targets only.
  const [composeShowAdvanced, setComposeShowAdvanced] = useState(false);
  const [composeSelectedOrderIds, setComposeSelectedOrderIds] = useState<Set<string>>(new Set());
  const [composeIncludeAgingReport, setComposeIncludeAgingReport] = useState(false);

  const { data: composeCustomerData } = useGetSingleCustomerQuery(selected?.targetId as string, {
    skip: !selected || selected.targetType !== "customer" || !showComposeModal,
  });
  const composeCustomerOrders: any[] = composeCustomerData?.data?.customerOrders || [];

  // Send Custom Quote (customer-only) state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteItems, setQuoteItems] = useState<any[]>([
    { product: null, quotePrice: "" },
  ]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quoteNote, setQuoteNote] = useState("");

  // Bulk Mail state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRecipientTab, setBulkRecipientTab] = useState<"customer" | "prospect">("customer");
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  // Keys are "customer:<id>" or "prospect:<id>" so a recipient can be
  // selected from either list and both stay selected when switching tabs.
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkAttachments, setBulkAttachments] = useState<File[]>([]);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Rich message body (same paste/drop-enabled contentEditable as Compose
  // Email — see composeEditorRef above).
  const bulkEditorRef = useRef<HTMLDivElement>(null);
  const [bulkBodyEmpty, setBulkBodyEmpty] = useState(true);
  const [bulkPendingImageUploads, setBulkPendingImageUploads] = useState(0);

  const { data: prospectsData, isLoading: loadingProspects } = useGetProspectsQuery();

  const [isAdmin, setIsAdmin] = useState(false);

  const {
    data: inboxData,
    isLoading: loadingInboxes,
    refetch: refetchInboxes,
  } = useGetAllEmailInboxesQuery({});

  const [fetchThread, { data: threadData, isFetching: loadingThread }] =
    useLazyGetEmailsForTargetQuery();

  const [sendCustomEmail, { isLoading: sending }] = useSendCustomEmailMutation();
  const [sendBulkEmail, { isLoading: sendingBulk }] = useSendBulkEmailMutation();
  const [sendQuoteEmail, { isLoading: sendingQuote }] =
    useSendEmailForNotPaidOrdersMutation();
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery();

  useEffect(() => {
    const role = Cookies.get("role");
    setIsAdmin(role?.toLowerCase() === "admin");
  }, []);

  const customers: InboxRow[] = inboxData?.data?.customers || [];
  const employees: InboxRow[] = inboxData?.data?.employees || [];
  const activeRows = activeTab === "customer" ? customers : employees;

  const thread = threadData?.data || null;
  const history: EmailHistoryEntry[] = thread?.history || [];

  useEffect(() => {
    if (selected) {
      fetchThread({ targetType: selected.targetType, targetId: selected.targetId });
      setExpandedIndex(null);
    }
  }, [selected, fetchThread]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return activeRows;
    const q = searchQuery.toLowerCase().trim();
    return activeRows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) || row.targetEmail.toLowerCase().includes(q),
    );
  }, [activeRows, searchQuery]);

  const bulkFilteredCustomers = useMemo(() => {
    if (!bulkSearchQuery.trim()) return customers;
    const q = bulkSearchQuery.toLowerCase().trim();
    return customers.filter(
      (row) =>
        row.name.toLowerCase().includes(q) || row.targetEmail.toLowerCase().includes(q),
    );
  }, [customers, bulkSearchQuery]);

  // Prospects normalized to the same {id, name, email} shape as customers
  // so the Bulk Mail picker can treat both lists uniformly. Prospects with
  // no email on file are excluded — there's nothing to send to.
  const prospectRows = useMemo(
    () =>
      (prospectsData?.data || [])
        .filter((p) => p.storePersonEmail)
        .map((p) => ({ id: p._id, name: p.storePersonName || p.storeName, email: p.storePersonEmail })),
    [prospectsData],
  );

  const bulkFilteredProspects = useMemo(() => {
    if (!bulkSearchQuery.trim()) return prospectRows;
    const q = bulkSearchQuery.toLowerCase().trim();
    return prospectRows.filter(
      (row) => row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q),
    );
  }, [prospectRows, bulkSearchQuery]);

  const bulkActiveList = bulkRecipientTab === "customer" ? bulkFilteredCustomers : bulkFilteredProspects;

  // Resolve every selected "type:id" key back to a real email address for
  // the actual send — customers use targetEmail, prospects use email.
  const bulkSelectedEmails = useMemo(() => {
    const emails: string[] = [];
    bulkSelectedKeys.forEach((key) => {
      const [type, id] = key.split(":");
      if (type === "customer") {
        const c = customers.find((row) => row.targetId === id);
        if (c) emails.push(c.targetEmail);
      } else {
        const p = prospectRows.find((row) => row.id === id);
        if (p) emails.push(p.email);
      }
    });
    return emails;
  }, [bulkSelectedKeys, customers, prospectRows]);

  const handleSelectRow = (row: InboxRow) => {
    setSelected(row);
  };

  const handleTabChange = (tab: TargetType) => {
    setActiveTab(tab);
    setSelected(null);
    setSearchQuery("");
  };

  const handleOpenCompose = () => {
    if (!selected) return toast.error("Select a customer or employee first");
    setComposeSubject("");
    setComposeAttachments([]);
    setComposeShowAdvanced(false);
    setComposeSelectedOrderIds(new Set());
    setComposeIncludeAgingReport(false);
    setComposePendingImageUploads(0);
    setComposeBodyEmpty(true);
    setShowComposeModal(true);
    // Editor isn't mounted yet on this render — clear it right after.
    requestAnimationFrame(() => {
      if (composeEditorRef.current) composeEditorRef.current.innerHTML = "";
    });
  };

  const toggleComposeOrderSelection = (orderId: string) => {
    setComposeSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Inserts an <img> at the current cursor position (falling back to the
  // end of the editor), showing the local blob immediately while the real
  // upload happens in the background. Centered + aspect-ratio-preserving
  // styling is applied inline so it survives being read back out as HTML
  // for the final email. Parameterized over which editor (Compose vs Bulk
  // Mail) so both message boxes share the exact same paste/drop behavior.
  const insertImageIntoEditor = useCallback(
    (
      file: File,
      editorRef: React.RefObject<HTMLDivElement | null>,
      setBodyEmpty: (v: boolean) => void,
      setPendingUploads: React.Dispatch<React.SetStateAction<number>>,
    ) => {
      const editor = editorRef.current;
      if (!editor) return;

      const localUrl = URL.createObjectURL(file);
      const img = document.createElement("img");
      img.src = localUrl;
      img.setAttribute(
        "style",
        "display:block;margin:12px auto;max-width:100%;height:auto;border-radius:8px;opacity:0.5;",
      );
      img.dataset.uploadStatus = "pending";

      const selection = window.getSelection();
      let inserted = false;
      if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.setEndAfter(img);
        selection.removeAllRanges();
        selection.addRange(range);
        inserted = true;
      }
      if (!inserted) editor.appendChild(img);
      setBodyEmpty(false);

      setPendingUploads((n) => n + 1);
      uploadEmbeddedImage(file)
        .unwrap()
        .then((res: any) => {
          img.src = res?.data?.url || localUrl;
          img.style.opacity = "1";
          img.dataset.uploadStatus = "done";
        })
        .catch(() => {
          toast.error("Failed to upload pasted image");
          img.remove();
        })
        .finally(() => {
          URL.revokeObjectURL(localUrl);
          setPendingUploads((n) => Math.max(0, n - 1));
        });
    },
    [uploadEmbeddedImage],
  );

  const makePasteHandler =
    (
      editorRef: React.RefObject<HTMLDivElement | null>,
      setBodyEmpty: (v: boolean) => void,
      setPendingUploads: React.Dispatch<React.SetStateAction<number>>,
    ) =>
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = Array.from(e.clipboardData.items || []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));

      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) insertImageIntoEditor(file, editorRef, setBodyEmpty, setPendingUploads);
        return;
      }

      // Plain-text-only paste for everything else, so rich HTML/styles from
      // external sources (Word, other web pages) can't leak into the email.
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    };

  const makeDropHandler =
    (
      editorRef: React.RefObject<HTMLDivElement | null>,
      setBodyEmpty: (v: boolean) => void,
      setPendingUploads: React.Dispatch<React.SetStateAction<number>>,
    ) =>
    (e: React.DragEvent<HTMLDivElement>) => {
      const files = Array.from(e.dataTransfer.files || []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      e.preventDefault();
      files.forEach((file) => insertImageIntoEditor(file, editorRef, setBodyEmpty, setPendingUploads));
    };

  const handleComposePaste = makePasteHandler(
    composeEditorRef,
    setComposeBodyEmpty,
    setComposePendingImageUploads,
  );
  const handleComposeDrop = makeDropHandler(
    composeEditorRef,
    setComposeBodyEmpty,
    setComposePendingImageUploads,
  );
  const handleBulkPaste = makePasteHandler(bulkEditorRef, setBulkBodyEmpty, setBulkPendingImageUploads);
  const handleBulkDrop = makeDropHandler(bulkEditorRef, setBulkBodyEmpty, setBulkPendingImageUploads);

  const handleSendCustomEmail = async () => {
    if (!selected) return;
    if (!composeSubject.trim()) return toast.error("Subject is required");
    if (composeBodyEmpty) return toast.error("Email body is required");
    if (composePendingImageUploads > 0) {
      return toast.error("Please wait for images to finish uploading");
    }

    const editor = composeEditorRef.current;
    const bodyHtml = editor?.innerHTML || "";
    const bodyText = editor?.innerText || "";

    try {
      await sendCustomEmail({
        targetType: selected.targetType,
        targetId: selected.targetId,
        subject: composeSubject.trim(),
        bodyText: bodyText.trim() || " ",
        bodyHtml,
        attachments: composeAttachments,
        orderIds: Array.from(composeSelectedOrderIds),
        includeAgingReport: composeIncludeAgingReport,
      }).unwrap();

      toast.success(`Email sent to ${selected.name}`);
      setShowComposeModal(false);
      setComposeSubject("");
      setComposeAttachments([]);
      setComposeShowAdvanced(false);
      setComposeSelectedOrderIds(new Set());
      setComposeIncludeAgingReport(false);
      if (editor) editor.innerHTML = "";
      setComposeBodyEmpty(true);
      fetchThread({ targetType: selected.targetType, targetId: selected.targetId });
      refetchInboxes();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to send email");
    }
  };

  const handleOpenQuoteModal = () => {
    if (!selected) return;
    setQuoteItems([{ product: null, quotePrice: "" }]);
    setSelectedProduct(null);
    setQuoteNote("");
    setIsQuoteModalOpen(true);
  };

  const handleSendQuoteEmail = async () => {
    if (!selected) return;
    try {
      const validItems = quoteItems.filter((i) => i.product && i.quotePrice);
      if (validItems.length === 0) throw new Error("Add at least one product");

      const quoteList = validItems.map((i) => ({
        productName: i.product.name,
        quotePrice: parseFloat(i.quotePrice),
      }));

      await sendQuoteEmail({
        id: selected.targetId,
        quoteList,
        noteText: quoteNote,
      }).unwrap();

      toast.success(`Quote sent to ${selected.name}`);
      setIsQuoteModalOpen(false);
      setQuoteItems([{ product: null, quotePrice: "" }]);
      setQuoteNote("");
      fetchThread({ targetType: selected.targetType, targetId: selected.targetId });
      refetchInboxes();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to send quote email");
    }
  };

  const handleOpenBulkModal = () => {
    setBulkRecipientTab("customer");
    setBulkSearchQuery("");
    setBulkSelectedKeys(new Set());
    setBulkSubject("");
    setBulkAttachments([]);
    setBulkPendingImageUploads(0);
    setBulkBodyEmpty(true);
    setShowBulkModal(true);
    requestAnimationFrame(() => {
      if (bulkEditorRef.current) bulkEditorRef.current.innerHTML = "";
    });
  };

  const toggleBulkSelection = (id: string) => {
    const key = `${bulkRecipientTab}:${id}`;
    setBulkSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bulkActiveListAllSelected =
    bulkActiveList.length > 0 &&
    bulkActiveList.every((row: any) =>
      bulkSelectedKeys.has(`${bulkRecipientTab}:${bulkRecipientTab === "customer" ? row.targetId : row.id}`),
    );

  const handleBulkSelectAll = () => {
    setBulkSelectedKeys((prev) => {
      const next = new Set(prev);
      bulkActiveList.forEach((row: any) => {
        const key = `${bulkRecipientTab}:${bulkRecipientTab === "customer" ? row.targetId : row.id}`;
        if (bulkActiveListAllSelected) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const handleSendBulkEmail = async () => {
    if (bulkSelectedKeys.size === 0) return toast.error("Select at least one recipient");
    if (!bulkSubject.trim()) return toast.error("Subject is required");
    if (bulkBodyEmpty) return toast.error("Email body is required");
    if (bulkPendingImageUploads > 0) {
      return toast.error("Please wait for images to finish uploading");
    }

    const editor = bulkEditorRef.current;
    const bodyHtml = editor?.innerHTML || "";
    const bodyText = editor?.innerText || "";

    try {
      const result = await sendBulkEmail({
        targetEmails: bulkSelectedEmails,
        subject: bulkSubject.trim(),
        bodyText: bodyText.trim() || " ",
        bodyHtml,
        attachments: bulkAttachments,
      }).unwrap();

      toast.success(
        `Bulk email sent to ${result.data.sent} of ${result.data.total} recipient(s)`,
      );
      setShowBulkModal(false);
      setBulkSelectedKeys(new Set());
      setBulkSubject("");
      setBulkAttachments([]);
      if (editor) editor.innerHTML = "";
      setBulkBodyEmpty(true);
      refetchInboxes();
      if (selected) fetchThread({ targetType: selected.targetType, targetId: selected.targetId });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to send bulk email");
    }
  };

  const formatDateTime = (timestamp: string) =>
    new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const typeBadgeClasses = (type: string) => {
    switch (type) {
      case "custom":
        return "bg-blue-100 text-blue-700";
      // "marketing" is the old value for what's now "bulk" — history
      // entries logged before the rename still carry it, so keep matching
      // it here rather than backfilling every stored record.
      case "bulk":
      case "marketing":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Only administrators can access the Emails inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <ToastContainer />

      {/* LEFT SIDEBAR */}
      <div className="w-130 flex-shrink-0 border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 h-23 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Emails</h2>
          <button
            onClick={handleOpenBulkModal}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-black text-black hover:bg-gray-100 transition-colors text-sm font-medium"
            title="Send a bulk email to multiple customers"
          >
            <Users className="w-4 h-4" />
            Bulk Mail
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 m-3">
          <button
            onClick={() => handleTabChange("customer")}
            className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "customer"
                ? "bg-white shadow-sm text-red-700 font-semibold"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => handleTabChange("employee")}
            className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "employee"
                ? "bg-white shadow-sm text-red-700 font-semibold"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Employees
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full h-10 pl-4 pr-10 rounded-full border border-gray-300 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingInboxes ? (
            <div className="flex items-center justify-center h-32">
              <Loading title="Loading" message="" spinnerSize="sm" showProgressDots={false} />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-base">
              {searchQuery
                ? "No matches found"
                : activeTab === "customer"
                ? "No customers found"
                : "No employees found"}
            </div>
          ) : (
            filteredRows.map((row) => {
              const isSelected =
                selected?.targetType === row.targetType && selected?.targetId === row.targetId;

              return (
                <div
                  key={`${row.targetType}-${row.targetId}`}
                  className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-red-50 border-l-4 border-l-red-700" : ""
                  }`}
                  onClick={() => handleSelectRow(row)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium text-gray-900 truncate">
                        {row.name}
                      </span>
                      {row.lastActivity && (
                        <span className="text-sm text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(row.lastActivity)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">{row.targetEmail}</p>
                    {row.lastEmail && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {row.lastEmail.subject}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <svg className="w-20 h-20 mb-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            <p className="text-xl font-medium">Select a {activeTab}</p>
            <p className="text-base mt-2">View their email history or send a new one</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">{selected.name}</p>
                <p className="text-sm text-gray-600 truncate mt-1">{selected.targetEmail}</p>
              </div>

              <div className="flex items-center gap-3">
                {selected.targetType === "customer" && (
                  <button
                    onClick={handleOpenQuoteModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Send Custom Quote
                  </button>
                )}
                <button
                  onClick={handleOpenCompose}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  <SendIcon className="w-4 h-4" />
                  Compose Email
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-[#f7f7f8]">
              {loadingThread ? (
                <div className="flex items-center justify-center h-full">
                  <Loading title="Loading Emails" message="" spinnerSize="sm" showProgressDots={false} />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p className="text-lg">No emails sent yet</p>
                  <button
                    onClick={handleOpenCompose}
                    className="mt-4 text-red-700 hover:underline text-sm font-medium"
                  >
                    Send the first one
                  </button>
                </div>
              ) : (
                [...history]
                  .map((entry, idx) => ({ entry, idx }))
                  .reverse()
                  .map(({ entry, idx }) => {
                    const isExpanded = expandedIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${typeBadgeClasses(entry.type)}`}
                              >
                                {entry.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(entry.timestamp)}
                              </span>
                            </div>
                            <p className="text-base font-medium text-gray-900 truncate mt-1">
                              {entry.subject}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 p-4 bg-gray-50">
                            <iframe
                              title={`email-${idx}`}
                              srcDoc={entry.html}
                              sandbox=""
                              className="w-full rounded-lg border border-gray-200 bg-white"
                              style={{ height: "480px" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </>
        )}
      </div>

      {/* Compose Modal (single target) */}
      {showComposeModal && selected && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
          <div
            className={`bg-white rounded-xl p-6 w-full shadow-xl transition-all duration-300 ease-in-out max-h-[90vh] overflow-y-auto ${
              composeShowAdvanced ? "max-w-3xl" : "max-w-lg"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Compose Email</h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              To: <span className="font-medium text-gray-800">{selected.name}</span> (
              {selected.targetEmail})
            </p>

            <div className="flex gap-6 items-start">
              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Email subject"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-base focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <div
                    ref={composeEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() =>
                      setComposeBodyEmpty(
                        !composeEditorRef.current ||
                          (!composeEditorRef.current.textContent?.trim() &&
                            !composeEditorRef.current.querySelector("img")),
                      )
                    }
                    onPaste={handleComposePaste}
                    onDrop={handleComposeDrop}
                    onDragOver={(e) => e.preventDefault()}
                    data-placeholder="Write your message... (you can paste or drop images here)"
                    className="empty-editor-placeholder w-full min-h-[180px] px-4 py-2.5 rounded-lg border border-gray-300 text-base focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 overflow-y-auto"
                  />
                  {composePendingImageUploads > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Uploading image...</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attachments
                  </label>
                  <input
                    ref={composeFileInputRef}
                    type="file"
                    multiple
                    onChange={(e) =>
                      setComposeAttachments((prev) => [...prev, ...Array.from(e.target.files || [])])
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => composeFileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach files
                  </button>
                  {composeAttachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {composeAttachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm"
                        >
                          <span className="truncate text-gray-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setComposeAttachments((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-gray-400 hover:text-red-600 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selected.targetType === "customer" && (
                  <button
                    type="button"
                    onClick={() => setComposeShowAdvanced((v) => !v)}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    <ChevronRight
                      className={`w-4 h-4 transition-transform duration-200 ${composeShowAdvanced ? "rotate-90" : ""}`}
                    />
                    Advanced options
                    {(composeSelectedOrderIds.size > 0 || composeIncludeAgingReport) && (
                      <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                        {composeSelectedOrderIds.size + (composeIncludeAgingReport ? 1 : 0)}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {selected.targetType === "customer" && (
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    composeShowAdvanced ? "grid-cols-[16rem]" : "grid-cols-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="w-64 border-l border-gray-200 pl-5 space-y-4">
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                          <Receipt className="w-4 h-4" />
                          Attach order invoices
                        </p>
                        <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                          {composeCustomerOrders.length === 0 ? (
                            <p className="p-3 text-xs text-gray-500 text-center">No orders found</p>
                          ) : (
                            composeCustomerOrders.map((order) => (
                              <label
                                key={order._id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={composeSelectedOrderIds.has(order._id)}
                                  onChange={() => toggleComposeOrderSelection(order._id)}
                                  className="w-4 h-4 rounded border-gray-300 text-red-700 focus:ring-red-500"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-gray-900">
                                    {order.PONumber || order.invoiceNumber || order._id}
                                  </p>
                                  <p className="truncate text-xs text-gray-500">
                                    ${Number(order.orderAmount || 0).toFixed(2)}
                                  </p>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={composeIncludeAgingReport}
                          onChange={(e) => setComposeIncludeAgingReport(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-red-700 focus:ring-red-500"
                        />
                        <FileSpreadsheet className="w-4 h-4" />
                        Attach aging report
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => setShowComposeModal(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCustomEmail}
                disabled={sending || !composeSubject.trim() || composeBodyEmpty}
                className="px-5 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-base"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Custom Quote Modal (moved from customer details page) */}
      {selected && (
        <QuoteModal
          isOpen={isQuoteModalOpen}
          quoteItems={quoteItems}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          note={quoteNote}
          isSending={sendingQuote}
          productsLoading={productsLoading}
          productsData={productsData}
          onClose={() => setIsQuoteModalOpen(false)}
          onSendEmail={handleSendQuoteEmail}
          setQuoteItems={setQuoteItems}
          setNote={setQuoteNote}
        />
      )}

      {/* Bulk Mail Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Bulk Mail</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select recipients ({bulkSelectedKeys.size} selected)
                  </label>
                  <button
                    onClick={handleBulkSelectAll}
                    className="text-sm text-red-700 hover:underline font-medium"
                  >
                    {bulkActiveListAllSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setBulkRecipientTab("customer")}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      bulkRecipientTab === "customer"
                        ? "bg-white shadow-sm text-red-700 font-semibold"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Customers
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkRecipientTab("prospect")}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      bulkRecipientTab === "prospect"
                        ? "bg-white shadow-sm text-red-700 font-semibold"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Prospects
                  </button>
                </div>

                <input
                  type="text"
                  value={bulkSearchQuery}
                  onChange={(e) => setBulkSearchQuery(e.target.value)}
                  placeholder={`Search ${bulkRecipientTab === "customer" ? "customers" : "prospects"}...`}
                  className="w-full h-9 px-3 mb-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {bulkRecipientTab === "prospect" && loadingProspects ? (
                    <div className="p-4 flex justify-center">
                      <Loading title="Loading" message="" spinnerSize="sm" showProgressDots={false} />
                    </div>
                  ) : bulkActiveList.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      No {bulkRecipientTab === "customer" ? "customers" : "prospects"} found
                    </div>
                  ) : (
                    bulkActiveList.map((row: any) => {
                      const id = bulkRecipientTab === "customer" ? row.targetId : row.id;
                      const email = bulkRecipientTab === "customer" ? row.targetEmail : row.email;
                      return (
                        <label
                          key={id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={bulkSelectedKeys.has(`${bulkRecipientTab}:${id}`)}
                            onChange={() => toggleBulkSelection(id)}
                            className="w-4 h-4 rounded border-gray-300 text-red-700 focus:ring-red-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {row.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{email}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  bulkSelectedKeys.size > 0
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={bulkSubject}
                      onChange={(e) => setBulkSubject(e.target.value)}
                      placeholder="Email subject"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-base focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <div
                      ref={bulkEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() =>
                        setBulkBodyEmpty(
                          !bulkEditorRef.current ||
                            (!bulkEditorRef.current.textContent?.trim() &&
                              !bulkEditorRef.current.querySelector("img")),
                        )
                      }
                      onPaste={handleBulkPaste}
                      onDrop={handleBulkDrop}
                      onDragOver={(e) => e.preventDefault()}
                      data-placeholder="Write your message... (you can paste or drop images here)"
                      className="empty-editor-placeholder w-full min-h-[150px] px-4 py-2.5 rounded-lg border border-gray-300 text-base focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 overflow-y-auto"
                    />
                    {bulkPendingImageUploads > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Uploading image...</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attachments
                    </label>
                    <input
                      ref={bulkFileInputRef}
                      type="file"
                      multiple
                      onChange={(e) =>
                        setBulkAttachments((prev) => [
                          ...prev,
                          ...Array.from(e.target.files || []),
                        ])
                      }
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bulkFileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                      Attach files
                    </button>
                    {bulkAttachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {bulkAttachments.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm"
                          >
                            <span className="truncate text-gray-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setBulkAttachments((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-gray-400 hover:text-red-600 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBulkEmail}
                disabled={
                  sendingBulk ||
                  bulkSelectedKeys.size === 0 ||
                  !bulkSubject.trim() ||
                  bulkBodyEmpty
                }
                className="px-5 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-base"
              >
                {sendingBulk ? "Sending..." : `Send Bulk (${bulkSelectedKeys.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
