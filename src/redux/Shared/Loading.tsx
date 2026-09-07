import React from "react";

interface LoadingSpinnerProps {
  title?: string;
  message?: string;
  showProgressDots?: boolean;
  spinnerSize?: "sm" | "md" | "lg";
}

const Loading: React.FC<LoadingSpinnerProps> = ({
  title = "Loading Prospects",
  message = "Fetching your latest data and updates...",
  showProgressDots = true,
  spinnerSize = "md",
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 border-3",
    md: "w-12 h-12 border-4",
    lg: "w-16 h-16 border-[5px]",
  };

  return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="relative">
        {/* Outer ring */}
        <div
          className={`${sizeClasses[spinnerSize]} border-gray-200 rounded-full animate-spin`}
        ></div>
        {/* Inner spinning element */}
        <div
          className={`absolute top-0 left-0 ${sizeClasses[spinnerSize]} border-transparent border-t-primary rounded-full animate-spin`}
        ></div>
        {/* Center dot */}
        <div
          className={`absolute top-1/2 left-1/2 ${
            spinnerSize === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"
          } bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse`}
        ></div>
      </div>

      <div className="mt-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {message && <p className="text-sm text-gray-500 max-w-sm">{message}</p>}
      </div>

      {/* Progress dots */}
      {showProgressDots && (
        <div className="flex space-x-1 mt-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default Loading;