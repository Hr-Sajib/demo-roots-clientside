import React from "react";
import PrimaryButton from "./PrimaryButton";


interface ErrorStateProps {
  title?: string;
  message?: string;
  errorDetails?: string;
  showReloadButton?: boolean;
  showBackButton?: boolean;
  showSupportText?: boolean;
  onReload?: () => void;
  onBack?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Oops! Something went wrong",
  message = "We couldn't load your projects right now. This might be a temporary issue.",
  errorDetails,
  showReloadButton = true,
  showBackButton = true,
  showSupportText = true,
  onReload = () => window.location.reload(),
  onBack = () => window.history.back(),
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className=" rounded-xl p-8 max-w-md w-full text-center border shadow-lg">
        {/* Error icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

        <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>

        {errorDetails && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {errorDetails}
          </div>
        )}

        <div className="space-y-3">
          {showReloadButton && (
            <PrimaryButton onClick={onReload}>
              <span className="flex items-center justify-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </span>
            </PrimaryButton>
          )}

          {showBackButton && (
            <button
              onClick={onBack}
              className="w-full px-6 py-2 bg-secondary/80 hover:bg-secondary text-white font-medium rounded-full transition-colors"
            >
              Go Back
            </button>
          )}
        </div>

        {showSupportText && (
          <p className="text-xs text-gray-500 mt-4">
            If the problem persists, please contact support
          </p>
        )}
      </div>
    </div>
  );
};

export default ErrorState;