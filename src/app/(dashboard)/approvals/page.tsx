"use client";

import { useState } from "react";
import {
  MessageSquare,
  CheckCircle,
  User,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  Mail,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Loading from "@/redux/Shared/Loading";
import {
  useGetReportsQuery,
  useApproveStoreChangesMutation,
  useResolveReportsMutation,
} from "@/redux/api/reports";
import toast from "react-hot-toast";

interface Reporter {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  storeName?: string;
  storePersonEmail?: string;
  shippingCity?: string;
  image?: string;
  phone?: string;
  address?: string;
}

interface DataChange {
  field: string;
  oldValue: string;
  newValue: string;
  _id: string;
}

interface Report {
  _id: string;
  reporterId: Reporter | null;
  reporterRole: "customer" | "driver" | "team" | "outsider";
  reporterEmail?: string;
  reporterName?: string;
  reportText: string;
  reportMedia: string[];
  isResolved: boolean;
  isApprovalNeeded: boolean;
  dataChanges: DataChange[];
  isApproved: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminReportsPage() {
  const { data, isLoading, isError, error, refetch } =
    useGetReportsQuery(undefined);
  const [approveStoreChanges] = useApproveStoreChangesMutation();
  const [resolveReports] = useResolveReportsMutation();

  // Track which reports are currently being processed (approve/resolve)
  const [processingReports, setProcessingReports] = useState<
    Record<string, boolean>
  >({});

  const [activeTab, setActiveTab] = useState<
    "reports" | "approvals" | "outsider"
  >("reports");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "customer" | "team" | "driver"
  >("all");

  // Parse report text
  const parseReportText = (text: string) => {
    if (!text.trim()) return { subject: null, message: "" };

    const lines = text.split(/\r\n|\n/);
    let subject: string | null = null;
    let messageStartIndex = 0;

    if (lines[0].startsWith("Subject: ")) {
      subject = lines[0].replace("Subject: ", "").trim();
      messageStartIndex = 1;
      while (
        messageStartIndex < lines.length &&
        !lines[messageStartIndex].trim()
      )
        messageStartIndex++;
    }

    let message = lines.slice(messageStartIndex).join("\n").trim();
    if (message.startsWith("Message:")) {
      message = message.replace(/^Message:\s*/i, "").trim();
    }

    return { subject, message: message || "No message content" };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileType = (url: string): "image" | "pdf" | "other" => {
    const ext = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || ""))
      return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  };

  const isImageUrl = (value: string) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(value);

  const handleResolve = async (reportId: string) => {
    setProcessingReports((prev) => ({ ...prev, [reportId]: true }));

    const loadingToast = toast.loading("Resolving report...");

    try {
      const response = await resolveReports(reportId).unwrap();
      toast.success(response.message || "Report resolved successfully!", {
        id: loadingToast,
      });
      refetch();
    } catch (err: any) {
      const errorMessage = err?.data?.message || "Failed to resolve report.";
      toast.error(errorMessage, { id: loadingToast });
      console.error("Resolve error:", err);
    } finally {
      setProcessingReports((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const handleApprove = async (reportId: string) => {
    setProcessingReports((prev) => ({ ...prev, [reportId]: true }));

    const loadingToast = toast.loading("Approving changes...");

    try {
      const response = await approveStoreChanges(reportId).unwrap();
      toast.success(response.message || "Changes approved successfully!", {
        id: loadingToast,
      });
      refetch();
    } catch (err: any) {
      const errorMessage = err?.data?.message || "Failed to approve changes.";
      toast.error(errorMessage, { id: loadingToast });
      console.error("Approval error:", err);
    } finally {
      setProcessingReports((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  // Categorize reports
  const reports = data?.data || [];

  // Reports: internal non-approval, exclude outsider
  const reportMessages = reports.filter(
    (r: Report) => !r.isApprovalNeeded && r.reporterRole !== "outsider",
  );

  // Approvals: only approval-needed
  const approvalRequests = reports.filter((r: Report) => r.isApprovalNeeded);

  // Outsider Messages: only outsider role
  const outsiderMessages = reports.filter(
    (r: Report) => r.reporterRole === "outsider",
  );

  // Counts for tabs: only pending/unresolved/unapproved
  const pendingReportsCount = reportMessages.filter(
    (r: { isResolved: boolean }) => !r.isResolved,
  ).length;
  const pendingApprovalsCount = approvalRequests.filter(
    (r: { isApproved: boolean }) => !r.isApproved,
  ).length;
  const pendingOutsiderCount = outsiderMessages.filter(
    (r: { isResolved: boolean }) => !r.isResolved,
  ).length;

  // Current list
  const currentReports =
    activeTab === "reports"
      ? reportMessages
      : activeTab === "approvals"
        ? approvalRequests
        : outsiderMessages;

  // Apply role filter only to Reports tab
  const filteredReports =
    activeTab === "reports"
      ? currentReports.filter((report: Report) =>
          roleFilter === "all" ? true : report.reporterRole === roleFilter,
        )
      : currentReports;

  const tabs = [
    {
      id: "reports",
      label: "Reports",
      count: pendingReportsCount,
      icon: MessageSquare,
      color: "emerald",
    },
    {
      id: "approvals",
      label: "Approvals",
      count: pendingApprovalsCount,
      icon: CheckCircle,
      color: "amber",
    },
    {
      id: "outsider",
      label: "Outsider Messages",
      count: pendingOutsiderCount,
      icon: User,
      color: "slate",
    },
  ];

  const getTabColorClasses = (color: string, isActive: boolean) => {
    if (!isActive)
      return "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200";

    const colorMap: Record<string, string> = {
      emerald: "bg-red-700 text-white border-red-600",
      amber: "bg-red-900 text-white border-red-700",
      slate: "bg-black text-white border-slate-700",
    };
    return colorMap[color] || "bg-emerald-600 text-white border-emerald-600";
  };

  if (isLoading) {
    return (
      <Loading
        title="Loading Approvals"
        message="Fetching pending change requests"
      />
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 border border-red-300 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
            Error Loading Reports
          </h2>
          <p className="text-gray-600 text-center">
            {(error as any)?.data?.message ||
              "Unable to load reports. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Reports & Requests
          </h1>
        </div>

        {/* Tab Navigation – Styled like Logs Page */}
        <div className="mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-sm inline-flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === "reports") setRoleFilter("all");
                  }}
                  className={`
            px-5 py-3 rounded-md font-medium transition-all duration-200
            flex items-center gap-2 text-sm
            ${getTabColorClasses(tab.color, isActive)}
          `}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{tab.label}</span>
                  <span
                    className={`
            ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold
            ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}
          `}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Filters – only for Reports */}
        {activeTab === "reports" && (
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-4 py-1 rounded-md ${
                roleFilter === "all"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleFilter("customer")}
              className={`px-4 py-1 rounded-md ${
                roleFilter === "customer"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => setRoleFilter("team")}
              className={`px-4 py-1 rounded-md ${
                roleFilter === "team"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Team
            </button>
            <button
              onClick={() => setRoleFilter("driver")}
              className={`px-4 py-1 rounded-md ${
                roleFilter === "driver"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Driver
            </button>
          </div>
        )}

        {/* List */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              No{" "}
              {activeTab === "reports"
                ? "Reports"
                : activeTab === "approvals"
                  ? "Approvals"
                  : "Outsider Messages"}{" "}
              Found
            </h3>
            <p className="text-gray-600">
              {activeTab === "reports" && roleFilter !== "all"
                ? `No ${roleFilter} items available`
                : "No items in this category"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending / Unresolved first (recent first) */}
            {filteredReports
              .filter((report: Report) => {
                if (activeTab === "reports") return !report.isResolved;
                if (activeTab === "approvals") return !report.isApproved;
                return !report.isResolved;
              })
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((report: Report) => {
                const { subject, message } = parseReportText(report.reportText);
                const hasMedia = report.reportMedia?.length > 0;
                const isDone =
                  activeTab === "reports"
                    ? report.isResolved
                    : activeTab === "approvals"
                      ? report.isApproved
                      : report.isResolved;

                return (
                  <div
                    key={report._id}
                    className={`bg-white rounded-lg p-6 border transition-all ${
                      isDone
                        ? "border-gray-300 opacity-60"
                        : "border-emerald-500 opacity-100"
                    }`}
                  >
                    {/* Report Header */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-start gap-3 flex-1">
                        {report.reporterId ? (
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                              {report.reporterRole === "customer"
                                ? report.reporterId.storeName?.[0] || "C"
                                : report.reporterId.firstName?.[0] || "U"}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-800">
                                {report.reporterRole === "customer"
                                  ? report.reporterId.storeName ||
                                    "Unknown Store"
                                  : `${report.reporterId.firstName || ""} ${report.reporterId.lastName || ""}`.trim() ||
                                    "Unknown User"}
                              </h3>
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-3 h-3" />
                                  {report.reporterRole === "customer"
                                    ? report.reporterId.storePersonEmail
                                    : report.reporterId.email}
                                </div>
                                <span className="text-xs text-gray-500 uppercase font-semibold">
                                  {report.reporterRole}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-800">
                                {report.reporterName || "Anonymous User"}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {report.reporterEmail || "No email provided"} |
                                Contact form submission
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(report.createdAt)}
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            isDone
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {isDone
                            ? activeTab === "approvals"
                              ? "Approved"
                              : "Resolved"
                            : "Pending"}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                      {/* Approvals: ONLY data changes */}
                      {activeTab === "approvals" && (
                        <div className="space-y-4">
                          <p className="text-base font-semibold text-gray-700 mb-3">
                            Requested Profile / Store Changes:
                          </p>

                          {report.dataChanges.length > 0 ? (
                            report.dataChanges.map((change) => (
                              <div
                                key={change._id}
                                className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <p className="text-sm font-semibold text-gray-700 mb-3">
                                  Field:{" "}
                                  <span className="text-red-700 font-bold">
                                    {change.field}
                                  </span>
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                      Old Value
                                    </p>
                                    {isImageUrl(change.oldValue) ? (
                                      <a
                                        href={change.oldValue}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full max-w-xs rounded-lg overflow-hidden border border-gray-300 hover:border-emerald-500 transition-colors"
                                      >
                                        <Image
                                          src={change.oldValue}
                                          alt="Old value image"
                                          width={300}
                                          height={300}
                                          className="object-cover w-full h-auto aspect-square"
                                        />
                                      </a>
                                    ) : (
                                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm text-gray-800 font-medium break-words">
                                        {change.oldValue || "—"}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                      New Value (Requested)
                                    </p>
                                    {isImageUrl(change.newValue) ? (
                                      <a
                                        href={change.newValue}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full max-w-xs rounded-lg overflow-hidden border-2 border-emerald-300 hover:border-emerald-600 transition-colors"
                                      >
                                        <Image
                                          src={change.newValue}
                                          alt="New value image"
                                          width={300}
                                          height={300}
                                          className="object-cover w-full h-auto aspect-square"
                                        />
                                      </a>
                                    ) : (
                                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-sm text-emerald-800 font-semibold break-words">
                                        {change.newValue || "—"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-center text-amber-800">
                              <AlertCircle className="w-8 h-8 mx-auto mb-3" />
                              <p className="font-medium">
                                No specific changes requested in this approval.
                              </p>
                              <p className="text-sm mt-2">
                                Please check attached documents or contact the
                                requester if needed.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reports & Outsider: Message only if content exists */}
                      {(activeTab === "reports" || activeTab === "outsider") &&
                        (subject || report.reportText?.trim()) && (
                          <div className="space-y-4">
                            {subject && (
                              <div>
                                <p className="text-sm font-semibold text-gray-500 mb-2">
                                  Subject:
                                </p>
                                <p className="text-lg font-semibold text-gray-800 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                  {subject}
                                </p>
                              </div>
                            )}

                            <div>
                              <p className="text-sm font-semibold text-gray-500 mb-2">
                                Message:
                              </p>
                              <p className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 whitespace-pre-wrap leading-relaxed">
                                {message ||
                                  report.reportText ||
                                  "No message content"}
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Media */}
                      {hasMedia && (
                        <div className="pt-4">
                          <p className="text-sm font-semibold text-gray-500 mb-3">
                            Attached Files ({report.reportMedia.length}):
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {report.reportMedia.map((mediaUrl, idx) => {
                              const fileType = getFileType(mediaUrl);
                              return (
                                <a
                                  key={idx}
                                  href={mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
                                >
                                  {fileType === "image" ? (
                                    <div className="aspect-square relative">
                                      <Image
                                        src={mediaUrl}
                                        alt={`Attachment ${idx + 1}`}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                        className="object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                        <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-square flex flex-col items-center justify-center gap-3 bg-gray-50">
                                      <FileText className="w-12 h-12 text-gray-500" />
                                      <p className="text-xs font-semibold text-gray-600 px-2 text-center truncate w-full">
                                        {fileType.toUpperCase()}
                                      </p>
                                      <ExternalLink className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {!isDone && (
                      <div className="mt-6 flex justify-end pt-5 border-t border-gray-200">
                        {activeTab === "approvals" ? (
                          <button
                            onClick={() => handleApprove(report._id)}
                            disabled={processingReports[report._id]}
                            className={`
                              min-w-[240px] flex items-center justify-center gap-3
                              px-8 py-4 rounded-xl font-semibold text-white shadow-lg
                              transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-95
                              ${
                                processingReports[report._id]
                                  ? "bg-emerald-400 cursor-not-allowed"
                                  : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                              }
                            `}
                          >
                            {processingReports[report._id] && (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            )}
                            <CheckCircle className="w-6 h-6" />
                            Approve Changes
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResolve(report._id)}
                            disabled={processingReports[report._id]}
                            className={`
                              min-w-[240px] flex items-center justify-center gap-3
                              px-8 py-4 rounded-xl font-semibold text-white shadow-lg
                              transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-95
                              ${
                                processingReports[report._id]
                                  ? "bg-emerald-400 cursor-not-allowed"
                                  : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                              }
                            `}
                          >
                            {processingReports[report._id] && (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            )}
                            <CheckCircle className="w-6 h-6" />
                            Mark as Resolved
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Resolved / Approved section */}
            {filteredReports
              .filter((report: Report) => {
                if (activeTab === "reports") return report.isResolved;
                if (activeTab === "approvals") return report.isApproved;
                return report.isResolved;
              })
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((report: Report) => {
                const { subject, message } = parseReportText(report.reportText);
                const hasMedia = report.reportMedia?.length > 0;
                const isDone = true; // This section is only for done items

                return (
                  <div
                    key={report._id}
                    className="bg-white rounded-lg p-6 border border-gray-300 opacity-60"
                  >
                    {/* Same header as above */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-start gap-3 flex-1">
                        {report.reporterId ? (
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                              {report.reporterRole === "customer"
                                ? report.reporterId.storeName?.[0] || "C"
                                : report.reporterId.firstName?.[0] || "U"}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-800">
                                {report.reporterRole === "customer"
                                  ? report.reporterId.storeName ||
                                    "Unknown Store"
                                  : `${report.reporterId.firstName || ""} ${report.reporterId.lastName || ""}`.trim() ||
                                    "Unknown User"}
                              </h3>
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-3 h-3" />
                                  {report.reporterRole === "customer"
                                    ? report.reporterId.storePersonEmail
                                    : report.reporterId.email}
                                </div>
                                <span className="text-xs text-gray-500 uppercase font-semibold">
                                  {report.reporterRole}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-800">
                                {report.reporterName || "Anonymous User"}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {report.reporterEmail || "No email provided"} |
                                Contact form submission
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(report.createdAt)}
                        </div>

                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700">
                          {activeTab === "approvals" ? "Approved" : "Resolved"}
                        </span>
                      </div>
                    </div>

                    {/* Same content as above */}
                    <div className="space-y-6">
                      {activeTab === "approvals" &&
                        report.dataChanges.length > 0 && (
                          <div className="space-y-4">
                            <p className="text-base font-semibold text-gray-700 mb-3">
                              Requested Profile / Store Changes:
                            </p>
                            {report.dataChanges.map((change) => (
                              <div
                                key={change._id}
                                className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm"
                              >
                                <p className="text-sm font-semibold text-gray-700 mb-3">
                                  Field:{" "}
                                  <span className="text-red-700 font-bold">
                                    {change.field}
                                  </span>
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                      Old Value
                                    </p>
                                    {isImageUrl(change.oldValue) ? (
                                      <a
                                        href={change.oldValue}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full max-w-xs rounded-lg overflow-hidden border border-gray-300"
                                      >
                                        <Image
                                          src={change.oldValue}
                                          alt="Old value image"
                                          width={300}
                                          height={300}
                                          className="object-cover w-full h-auto aspect-square"
                                        />
                                      </a>
                                    ) : (
                                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm text-gray-800 font-medium break-words">
                                        {change.oldValue || "—"}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                      New Value (Requested)
                                    </p>
                                    {isImageUrl(change.newValue) ? (
                                      <a
                                        href={change.newValue}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full max-w-xs rounded-lg overflow-hidden border-2 border-emerald-300"
                                      >
                                        <Image
                                          src={change.newValue}
                                          alt="New value image"
                                          width={300}
                                          height={300}
                                          className="object-cover w-full h-auto aspect-square"
                                        />
                                      </a>
                                    ) : (
                                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-sm text-emerald-800 font-semibold break-words">
                                        {change.newValue || "—"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {(activeTab === "reports" || activeTab === "outsider") &&
                        (subject || report.reportText?.trim()) && (
                          <div className="space-y-4">
                            {subject && (
                              <div>
                                <p className="text-sm font-semibold text-gray-500 mb-2">
                                  Subject:
                                </p>
                                <p className="text-lg font-semibold text-gray-800 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                  {subject}
                                </p>
                              </div>
                            )}

                            <div>
                              <p className="text-sm font-semibold text-gray-500 mb-2">
                                Message:
                              </p>
                              <p className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 whitespace-pre-wrap leading-relaxed">
                                {message ||
                                  report.reportText ||
                                  "No message content"}
                              </p>
                            </div>
                          </div>
                        )}

                      {hasMedia && (
                        <div className="pt-4">
                          <p className="text-sm font-semibold text-gray-500 mb-3">
                            Attached Files ({report.reportMedia.length}):
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {report.reportMedia.map((mediaUrl, idx) => {
                              const fileType = getFileType(mediaUrl);
                              return (
                                <a
                                  key={idx}
                                  href={mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
                                >
                                  {fileType === "image" ? (
                                    <div className="aspect-square relative">
                                      <Image
                                        src={mediaUrl}
                                        alt={`Attachment ${idx + 1}`}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                        className="object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                        <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-square flex flex-col items-center justify-center gap-3 bg-gray-50">
                                      <FileText className="w-12 h-12 text-gray-500" />
                                      <p className="text-xs font-semibold text-gray-600 px-2 text-center truncate w-full">
                                        {fileType.toUpperCase()}
                                      </p>
                                      <ExternalLink className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
