'use client';

import { io } from "socket.io-client";
import {
  useGetAllConversationsQuery,
  useLazyGetConversationByPhoneQuery,
  useSendOutboundMessageMutation,
  useStartOrGetConversationMutation,
  useDeleteConversationMutation,
} from "@/redux/api/messages";
import { useGetCustomersQuery } from "@/redux/api/customers";
import {
  setCustomers,
  selectCustomers,
} from "@/redux/slices/customers";
import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Clock, Check, CheckCheck, AlertTriangle, MoreVertical, Trash2, X } from "lucide-react";
import { FaEye, FaPaperPlane } from "react-icons/fa6";
import { toast, ToastContainer } from "react-toastify";
import Loading from "@/redux/Shared/Loading";
import Cookies from "js-cookie";

interface Message {
  isSentByAdmin: boolean;
  contentType: string;
  content: string;
  timestamp: string;
  isSystemMessage?: boolean;
  messageStatus?: 'queued' | 'sent' | 'delivered' | 'read' | 'undelivered' | 'failed';
}

interface Conversation {
  _id: string;
  participantPhoneNumber: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export default function WhatsAppInbox() {
  // All hooks must be called before any conditional returns
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [forceRenderKey, setForceRenderKey] = useState(0);

  const [showNewConvoModal, setShowNewConvoModal] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState("");
  const [showSystemOnly, setShowSystemOnly] = useState(false);
  const [openMenuPhone, setOpenMenuPhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const dispatch = useDispatch();
  const customers = useSelector(selectCustomers);

  const {
    data: allConvsData,
    isLoading: loadingConvs,
    refetch: refetchAllConversations,
  } = useGetAllConversationsQuery({});

  const { data: customersResponse } = useGetCustomersQuery(
    undefined,
    { skip: customers.length > 0 }
  );

  const [
    fetchConversation,
    { data: singleConvData, isFetching: loadingMessages },
  ] = useLazyGetConversationByPhoneQuery();

  const [sendMessage, { isLoading: sending }] = useSendOutboundMessageMutation();
  const [startConversation, { isLoading: startingConvo }] =
    useStartOrGetConversationMutation();

  const [deleteConversation] = useDeleteConversationMutation();

  // Check admin status
  useEffect(() => {
    const role = Cookies.get("role");
    setIsAdmin(role?.toLowerCase() === "admin");
  }, []);

  const conversations = allConvsData?.data || [];
  const activeConversation = singleConvData?.data || null;

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedPhone) {
      const firstPhone = conversations[0].participantPhoneNumber;
      setSelectedPhone(firstPhone);
    }
  }, [conversations, selectedPhone]);

  // Populate customers
  useEffect(() => {
    if (customersResponse?.data) {
      dispatch(setCustomers(customersResponse.data));
    }
  }, [customersResponse?.data, dispatch]);

  // Socket Connection with real-time updates
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_URL?.replace(/\/api\/v1\/?$/, "");
    const socket = io(backendUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[SOCKET] Connected");
    });

    socket.on("new-whatsapp-message-received", (payload) => {
      console.log("[SOCKET] New message received:", payload);

      // Refresh all conversations list
      refetchAllConversations();

      // If the message is from the currently open conversation, refresh it
      if (selectedPhone && payload.from === selectedPhone) {
        fetchConversation(selectedPhone, false);
        setForceRenderKey((prev) => prev + 1);
      }

      // Force re-render to move sender to top
      setForceRenderKey((prev) => prev + 1);
    });

    socket.on("disconnect", () => {
      console.log("[SOCKET] Disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [refetchAllConversations, selectedPhone, fetchConversation]);

  // Fetch messages when phone is selected
  useEffect(() => {
    if (selectedPhone) {
      fetchConversation(selectedPhone);
    }
  }, [selectedPhone, fetchConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, forceRenderKey]);

  const getDisplayName = (phone: string) => {
    const normalizedPhone = phone.replace(/\D/g, "");
    const customer = customers.find((c: any) => {
      const cPhone = c.storePersonPhone?.replace(/\D/g, "") || "";
      return cPhone === normalizedPhone || `1${cPhone}` === normalizedPhone;
    });
    return customer?.storeName || customer?.storePersonName || normalizedPhone;
  };

  const MessageStatusIcon = ({ status }: { status?: string }) => {
    switch (status) {
      case "queued": return <Clock className="w-4 h-4 text-gray-300" />;
      case "sent": return <Check className="w-4 h-4 text-gray-300" />;
      case "delivered": return <FaPaperPlane className="w-3.5 h-3.5 text-blue-200" />;
      case "read": return <FaEye className="w-4 h-4 text-green-200" />;
      case "undelivered":
      case "failed": return <AlertTriangle className="w-4 h-4 text-red-200" />;
      default: return null;
    }
  };

  const handleSelectPhone = (phone: string) => {
    setSelectedPhone(phone);
    setMessageInput("");
    setOpenMenuPhone(null);
  };

  const handleStartNewConversation = async () => {
    if (!newPhoneInput.trim()) return toast.error("Please enter a phone number");
    const cleanedPhone = newPhoneInput.trim().replace(/\s+/g, "");
    if (!cleanedPhone.startsWith("+")) return toast.error("Phone must start with +");

    try {
      await startConversation({ phoneNumber: cleanedPhone }).unwrap();
      setSelectedPhone(cleanedPhone);
      setShowNewConvoModal(false);
      setNewPhoneInput("");
      refetchAllConversations();
    } catch (err) {
      toast.error("Failed to start conversation.");
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedPhone || sending) return;

    try {
      await sendMessage({
        phoneNumber: selectedPhone,
        content: messageInput.trim(),
        contentType: "text",
      }).unwrap();

      setMessageInput("");
      fetchConversation(selectedPhone, false);
      refetchAllConversations();
    } catch (err) {
      console.error("Send failed:", err);
      toast.error("Failed to send message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteConversation = async (phone: string) => {
    if (!confirm(`Delete conversation with ${getDisplayName(phone)}?`)) return;

    try {
      await deleteConversation(phone).unwrap();
      toast.success("Conversation deleted");
      if (selectedPhone === phone) setSelectedPhone(null);
      refetchAllConversations();
    } catch (err) {
      toast.error("Failed to delete conversation");
    }
  };

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    messages.forEach((msg) => {
      const dateLabel = formatDate(msg.timestamp);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateLabel) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date: dateLabel, messages: [msg] });
      }
    });
    return groups;
  };

  const getLastMessage = (conv: Conversation) => {
    const last = conv.messages[conv.messages.length - 1];
    if (!last) return "";
    const prefix = last.isSentByAdmin ? "You: " : "";
    return `${prefix}${last.content}`;
  };

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase().trim();
    return conversations.filter((conv: any) => {
      const displayName = getDisplayName(conv.participantPhoneNumber).toLowerCase();
      const phone = conv.participantPhoneNumber.toLowerCase();
      const lastMsg = getLastMessage(conv).toLowerCase();

      return (
        displayName.includes(query) ||
        phone.includes(query) ||
        lastMsg.includes(query)
      );
    });
  }, [conversations, searchQuery]);

  // Admin access check - after all hooks
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Only administrators can access WhatsApp Inbox.<br />
            Please contact your administrator if you believe this is an error.
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
          <h2 className="text-xl font-semibold text-gray-800">
            WhatsApp<span className="text-sm relative bottom-1.5 text-red-700">✚</span>
          </h2>
          <button
            onClick={() => setShowNewConvoModal(true)}
            className="w-9 h-9 rounded-full bg-red-700 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            title="Start new conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone or message..."
            className="w-full h-10 pl-4 pr-10 rounded-full border border-gray-300 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32">
              <Loading
                title="Loading Conversations"
                message=""
                spinnerSize="sm"
                showProgressDots={false}
              />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-base">
              {searchQuery ? "No matching conversations found" : "No conversations yet"}
            </div>
          ) : (
            filteredConversations.map((conv: any) => {
              const displayName = getDisplayName(conv.participantPhoneNumber);
              const lastMessagePreview = getLastMessage(conv);
              const isSelected = selectedPhone === conv.participantPhoneNumber;

              return (
                <div
                  key={conv._id}
                  className={`relative flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-green-50 border-l-4 border-l-green-600" : ""
                  }`}
                  onClick={() => handleSelectPhone(conv.participantPhoneNumber)}
                >
                  <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700 font-semibold text-base">
                    {displayName.charAt(0).toUpperCase() || "#"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium text-gray-900 truncate">
                        {displayName}
                      </span>
                      <span className="text-sm text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {truncate(lastMessagePreview, 50)}
                    </p>
                  </div>

                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuPhone(
                          openMenuPhone === conv.participantPhoneNumber ? null : conv.participantPhoneNumber
                        );
                      }}
                      className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>

                    {openMenuPhone === conv.participantPhoneNumber && (
                      <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.participantPhoneNumber);
                            setOpenMenuPhone(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete conversation
                        </button>
                      </div>
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
        {!selectedPhone ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <svg className="w-20 h-20 mb-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            <p className="text-xl font-medium">Select a conversation</p>
            <p className="text-base mt-2">Or start a new one with the + button</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-lg">
                  {selectedPhone.slice(-2)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {getDisplayName(selectedPhone)}
                  </p>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {selectedPhone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setShowSystemOnly(false)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    !showSystemOnly ? "bg-white shadow-sm text-green-700 font-semibold" : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  All Messages
                </button>
                <button
                  onClick={() => setShowSystemOnly(true)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    showSystemOnly ? "bg-white shadow-sm text-green-700 font-semibold" : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  System Only
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#f0f2f5]">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loading
                    title="Loading Messages"
                    message=""
                    spinnerSize="sm"
                    showProgressDots={false}
                  />
                </div>
              ) : !activeConversation ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-lg">
                  No messages found
                </div>
              ) : (
                groupMessagesByDate(activeConversation.messages).map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center justify-center my-6">
                      <span className="bg-white text-sm text-gray-600 px-4 py-1.5 rounded-full shadow-sm border border-gray-200">
                        {group.date}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {group.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.isSentByAdmin ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-3 rounded-xl shadow text-base leading-relaxed whitespace-pre-wrap break-words ${
                              msg.isSentByAdmin
                                ? "bg-green-700 text-white rounded-br-none"
                                : "bg-white text-gray-900 rounded-bl-none border border-gray-200"
                            }`}
                          >
                            <p className="break-words whitespace-pre-wrap">{msg.content}</p>

                            <div className="flex items-center justify-end gap-2 mt-1">
                              <p className={`text-xs ${msg.isSentByAdmin ? "text-green-200" : "text-gray-500"}`}>
                                {formatTime(msg.timestamp)}
                              </p>
                              {msg.isSentByAdmin && <MessageStatusIcon status={msg.messageStatus} />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-white flex items-center gap-4">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-5 py-3 rounded-2xl border border-gray-300 text-base focus:outline-none focus:border-green-500 bg-gray-50 resize-none min-h-[44px] max-h-32 overflow-y-auto"
                rows={1}
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sending}
                className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {sending ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaPaperPlane className="w-6 h-6" />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConvoModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Start New Conversation</h3>
            <p className="text-base text-gray-600 mb-4">
              Enter the customer's phone number (with country code)
            </p>
            <input
              type="text"
              value={newPhoneInput}
              onChange={(e) => setNewPhoneInput(e.target.value)}
              placeholder="+1..."
              className="w-full px-5 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => setShowNewConvoModal(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleStartNewConversation}
                disabled={startingConvo || !newPhoneInput.trim()}
                className="px-5 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-base"
              >
                {startingConvo ? "Starting..." : "Start"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function truncate(text: string, maxLength: number = 50) {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength).trimEnd() + "...";
}