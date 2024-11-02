import React, { useState } from "react";
import { signUp, signIn } from "../supabase";
import { useTheme } from "../ThemeContext";
import { motion } from "framer-motion";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const { darkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      alert(error.message);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-black" : "bg-gray-50"
      } flex flex-col gap-12 items-center justify-center p-4`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-semibold text-center mx-auto"
      >
        <span className="italic font-thin text-3xl">based</span>
        MacroTracker
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-base mt-2 font-thin"
        >
          Track your macros to{" "}
          <span className="italic font-thin text-blue-500">greatness</span>.
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className={`${
          darkMode ? "bg-zinc-900" : "bg-white"
        } p-8 rounded-2xl shadow-xl w-full max-w-md backdrop-blur-lg border ${
          darkMode ? "border-zinc-800" : "border-gray-100"
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className={`block text-sm font-medium ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-2 px-4 py-3 block w-full rounded-xl transition-all duration-200 ${
                darkMode
                  ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                  : "bg-gray-50 border-gray-200 focus:bg-white"
              } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className={`block text-sm font-medium ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-2 px-4 py-3 block w-full rounded-xl transition-all duration-200 ${
                darkMode
                  ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                  : "bg-gray-50 border-gray-200 focus:bg-white"
              } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
              required
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white transition-all duration-200 ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-blue-500 hover:bg-blue-600"
            } shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40`}
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </motion.button>
        </form>

        <p
          className={`mt-6 text-center text-sm ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className={`ml-2 font-medium transition-colors duration-200 ${
              darkMode
                ? "text-blue-400 hover:text-blue-300"
                : "text-blue-600 hover:text-blue-500"
            }`}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;