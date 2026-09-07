/* eslint-disable @typescript-eslint/no-explicit-any */
import { Loader } from "lucide-react";
import React from "react";

const PrimaryButton = ({
  text,
  onClick,
  children,
  loading = false,
}: {
  text?: string;
  loading?: boolean;
  onClick: any;
  children?: React.ReactNode;
}) => {
  return children ? (
    <div
      onClick={onClick}
      className="px-2 cursor-pointer text-center py-2 rounded-full bg-primary/80 transition-all duration-300 text-white hover:bg-primary shadow"
    >
      {children}
    </div>
  ) : (
    <button
      type="submit"
      disabled={loading}
      onClick={onClick}
      className="px-3 py-2 text-center rounded-full bg-primary/80 transition-all duration-300 text-white hover:bg-primary shadow cursor-pointer"
    >
      <div className={`flex items-center justify-center gap-2`}>
        <Loader
          className={`${
            loading ? "opacity-100" : "opacity-0"
          } animate-spin text-center absolute`}
        />
        <span className={`${loading ? "opacity-0" : "opacity-100"}`}>
          {text}
        </span>
      </div>
    </button>
  );
};

export default PrimaryButton;