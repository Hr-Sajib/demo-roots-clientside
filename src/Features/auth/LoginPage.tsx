
"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "@/redux/api/admin";
import { jwtDecode } from "jwt-decode";
import Image from "next/image";
import { useForgetPasswordSendEmailMutation, useSetNewPasswordMutation } from "@/redux/api/admin";
import { Label } from "@/components/ui/label";
import { HiUser, HiLockClosed, HiEye, HiEyeOff } from "react-icons/hi"; // ← Added react-icons
import { setUser, clearUser } from "@/redux/slices/userSlice";

interface DecodedToken {
  role: string;
  email: string;
  userId: string;
  iat?: number;
  exp?: number;
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading, isError }] = useLoginMutation();
  const [forgetEmail, setForgetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPass] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [isForgetModalOpen, setIsForgetModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [forgetPasswordSendEmail, { isLoading: isSendingOtp, isError: isOtpError }] = useForgetPasswordSendEmailMutation();
  const [setNewPassword, { isLoading: isResetting, isError: isResetError }] = useSetNewPasswordMutation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      const decodedToken = jwtDecode<DecodedToken>(result.data.accessToken);
      const role = decodedToken.role.toLowerCase();
      const userData = result.data.userData;

      Cookies.set("token", result.data.accessToken, { expires: 7 });
      Cookies.set("role", role, { expires: 7 });
      // Persist user profile in redux-persist so all consumers read
      // from a single source; no more localStorage.getItem("userData").
      dispatch(setUser(userData));

      // Honor the `next=` query param the middleware attached when it
      // redirected an unauthenticated visitor here. Same-origin only —
      // refuse to be redirected to an external URL by an attacker.
      const next = searchParams?.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard";
      router.push(safeNext);
    } catch (error: any) {
      alert("Login failed: " + (error?.data?.message || "Please try again"));
      Cookies.remove("token");
      Cookies.remove("role");
      dispatch(clearUser());
    }
  };

  const handleForgetPassword = () => setIsForgetModalOpen(true);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgetPasswordSendEmail({ email: forgetEmail }).unwrap();
      alert("OTP sent to your email!");
      setIsForgetModalOpen(false);
      setIsResetModalOpen(true);
      setResetEmail(forgetEmail);
    } catch (error: any) {
      alert("Failed to send OTP: " + (error?.data?.message || "Try again"));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setNewPassword({ email: resetEmail, otp, newPassword }).unwrap();
      alert("Password reset successfully! You can now log in.");
      setIsResetModalOpen(false);
      setForgetEmail("");
      setOtp("");
      setNewPass("");
      setResetEmail("");
    } catch (error: any) {
      alert("Failed to reset password: " + (error?.data?.message || "Try again"));
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative overflow-hidden"
      style={{ backgroundImage: `url('/dashboardIcons/login.jpg')` }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-transparent" />

      {/* Roots Beyond V2 Beta Badge */}
      <div className="absolute top-6 right-6 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
        Roots beyond V4 beta
      </div>

      {/* Login Card */}
      <div className="relative z-10 bg-gray-200 backdrop-blur-xl p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/30">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full mb-4">
            <Image
              src="/mainLogo.png"
              alt="Roots Beyond Logo"
              width={80}
              height={80}
              className="drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your Roots Beyond account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiUser className="w-5 h-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 
                         focus:outline-none focus:ring-0 focus:border-red-500 
                         transition-all duration-200 hover:border-red-300"
              required
            />
          </div>

          {/* Password Field with Eye Toggle */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiLockClosed className="w-5 h-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
            </div>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 
                         focus:outline-none focus:ring-0 focus:border-red-500 
                         transition-all duration-200 hover:border-red-300"
              required
            />

            {/* Eye Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <HiEyeOff className="w-5 h-5" />
              ) : (
                <HiEye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-red-800 to-red-800 text-white font-semibold 
                     rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 
                     transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "LOGIN"
            )}
          </button>

          {isError && (
            <p className="text-red-500 text-sm text-center animate-pulse">
              Invalid credentials. Please try again.
            </p>
          )}

          <div className="text-right">
            <button
              type="button"
              onClick={handleForgetPassword}
              className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>

      {/* Forget Password Modal */}
      {isForgetModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Reset Password</h2>
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <Label htmlFor="forgetEmail" className="text-gray-700 font-medium">Email Address</Label>
                <input
                  type="email"
                  id="forgetEmail"
                  value={forgetEmail}
                  onChange={(e) => setForgetEmail(e.target.value)}
                  className="mt-2 w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                           focus:outline-none focus:ring-0 focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl 
                           hover:bg-red-700 transition-colors disabled:opacity-70"
                >
                  {isSendingOtp ? "Sending..." : "Send OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsForgetModalOpen(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl 
                           hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Set New Password</h2>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <Label htmlFor="resetEmail" className="text-gray-700 font-medium">Email</Label>
                <input
                  type="email"
                  id="resetEmail"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="mt-2 w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                           focus:outline-none focus:ring-0 focus:border-red-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="otp" className="text-gray-700 font-medium">OTP Code</Label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-2 w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                           focus:outline-none focus:ring-0 focus:border-red-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword" className="text-gray-700 font-medium">New Password</Label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="mt-2 w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                           focus:outline-none focus:ring-0 focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl 
                           hover:bg-emerald-700 transition-colors disabled:opacity-70"
                >
                  {isResetting ? "Saving..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl 
                           hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;