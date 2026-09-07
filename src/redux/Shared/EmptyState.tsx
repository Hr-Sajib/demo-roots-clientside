import React from "react";
export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data available",
  description = "There are no items to display at this time.",
  icon = (
    <svg
      className="w-12 h-12 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="mb-4">{icon}</div>

      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>

      <p className="text-gray-500 max-w-md mb-4">{description}</p>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;