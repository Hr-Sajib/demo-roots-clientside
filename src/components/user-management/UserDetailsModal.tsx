"use client";

import { useState } from "react";

interface UserDetailsModalProps {
  selectedUser: any | null;
  onClose: () => void;
}

export default function UserDetailsModal({
  selectedUser,
  onClose,
}: UserDetailsModalProps) {
  if (!selectedUser) return null;

  const dummyImageUrl = "https://arbora-bucket.s3.us-east-2.amazonaws.com/system+assets/gray-male-head-placeholder-vector-23804676.jpg";

  // 🧠 Check if license is expired
  const isLicenseExpired =
    selectedUser.documentExpiryDate &&
    new Date(selectedUser.documentExpiryDate) < new Date();

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl relative">
        <div className="flex justify-center mb-4">
          <img
            src={selectedUser.image || dummyImageUrl}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
          />
        </div>
        <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">
          {selectedUser.firstName} {selectedUser.lastName}
        </h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border justify-center p-4 rounded-xl">
          <div>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">Email:</span>{" "}
              <span className="text-gray-600">{selectedUser.email}</span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">First Name:</span>{" "}
              <span className="text-gray-600">
                {selectedUser.firstName || "N/A"}
              </span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">Last Name:</span>{" "}
              <span className="text-gray-600">
                {selectedUser.lastName || "N/A"}
              </span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">Role:</span>{" "}
              <span className="text-gray-600">{selectedUser.role}</span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">Phone:</span>{" "}
              <span className="text-gray-600">
                {selectedUser.phone || "N/A"}
              </span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">Address:</span>{" "}
              <span className="text-gray-600">
                {selectedUser.address || "N/A"}
              </span>
            </p>
          </div>

          <div>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">City:</span>{" "}
              <span className="text-gray-600">{selectedUser.city || "N/A"}</span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">State:</span>{" "}
              <span className="text-gray-600">{selectedUser.state || "N/A"}</span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">ZIP Code:</span>{" "}
              <span className="text-gray-600">
                {selectedUser.zipCode || "N/A"}
              </span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">License Image:</span>{" "}
              {selectedUser.documentLink ? (
                <a
                  href={selectedUser.documentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:underline"
                >
                  View Image
                </a>
              ) : (
                <span className="text-gray-600">N/A</span>
              )}
            </p>

            {/* ✅ Highlight expired license date */}
            <p className="mb-2">
              <span className="font-semibold text-gray-700">
                License Expiry Date:
              </span>{" "}
              <span
                className={`${
                  isLicenseExpired
                    ? "text-red-700 font-bold"
                    : "text-gray-600"
                }`}
              >
                {selectedUser.documentExpiryDate
                  ? new Date(
                      selectedUser.documentExpiryDate
                    ).toLocaleDateString()
                  : "N/A"}
              </span>
            </p>

            <p className="mb-2">
              <span className="font-semibold text-gray-700">
                Reminder Email Sent:
              </span>{" "}
              <span className="text-gray-600">
                {selectedUser.documentExpiryReminderEmailSentOrNot ? "Yes" : "No"}
              </span>
            </p>
            <p className="mb-2">
              <span className="font-semibold text-gray-700">Image:</span>{" "}
              {selectedUser.image ? (
                <a
                  href={selectedUser.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:underline"
                >
                  View Image
                </a>
              ) : (
                <span className="text-gray-600">N/A</span>
              )}
            </p>
          </div>
        </div>

        <div className="w-full mt-5">
          <p className="mb-2 w-full border p-3 rounded-xl">
            <span className="font-semibold text-gray-700">Allowances:</span>{" "}
            <span className="text-gray-600">
              {selectedUser.allowances
                ? Object.entries(selectedUser.allowances)
                    .filter(([_, value]) => value === true)
                    .map(([key]) => key)
                    .join(", ") || "None"
                : "None"}
            </span>
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
