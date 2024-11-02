import React, { useState, useEffect } from "react";
import { useTheme } from "../ThemeContext";
import { supabase } from "../supabase";
import { useData } from "../contexts/DataContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Save, PlayCircle, Package } from "lucide-react";
import packageInfo from "../../package.json";

interface SettingsProps {
  className?: string;
}

const Settings: React.FC<SettingsProps> = ({ className }) => {
  const [proteinGoal, setProteinGoal] = useState("150");
  const [carbGoal, setCarbGoal] = useState("250");
  const [fatGoal, setFatGoal] = useState("70");
  const [calorieGoal, setCalorieGoal] = useState("0");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const { darkMode } = useTheme();
  const { userSettings, fetchUserSettings } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (userSettings) {
      setProteinGoal(userSettings.protein_goal.toString());
      setCarbGoal(userSettings.carb_goal.toString());
      setFatGoal(userSettings.fat_goal.toString());
      setCalorieGoal(userSettings.calorie_goal.toString());
    }
    fetchUserEmail();
  }, [userSettings]);

  useEffect(() => {
    const protein = parseInt(proteinGoal) || 0;
    const carbs = parseInt(carbGoal) || 0;
    const fat = parseInt(fatGoal) || 0;
    const calories = protein * 4 + carbs * 4 + fat * 9;
    setCalorieGoal(calories.toString());
  }, [proteinGoal, carbGoal, fatGoal]);

  const fetchUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserEmail(user.email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const newSettings = {
        user_id: user.id,
        calorie_goal: parseInt(calorieGoal),
        protein_goal: parseInt(proteinGoal),
        carb_goal: parseInt(carbGoal),
        fat_goal: parseInt(fatGoal),
      };

      const { error } = await supabase
        .from("user_settings")
        .upsert(newSettings, { onConflict: "user_id" })
        .select();

      if (error) throw error;

      await fetchUserSettings();
      alert("Settings updated successfully!");
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings. Please try again.");
    }
  };

  const handleStartClick = () => setShowConfirmation(true);

  const handleConfirmStart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const startDate = new Date().toISOString();

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            bulk_cut_start_date: startDate,
            calorie_goal: parseInt(calorieGoal),
            protein_goal: parseInt(proteinGoal),
            carb_goal: parseInt(carbGoal),
            fat_goal: parseInt(fatGoal),
          },
          { onConflict: "user_id" }
        )
        .select();

      if (error) throw error;

      await fetchUserSettings();
      setShowConfirmation(false);
      alert("Bulk/Cut tracking started successfully!");
    } catch (error) {
      console.error("Error starting bulk/cut tracking:", error);
      alert("Failed to start tracking. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold mb-6"
      >
        Settings
      </motion.h2>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className={`p-6 rounded-2xl backdrop-blur-lg border ${
          darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-gray-200"
        }`}>
          <h3 className="text-lg font-medium mb-4">Macro Goals</h3>
          <div className="space-y-4">
            {[
              { label: "Daily Protein Goal (g)", value: proteinGoal, setter: setProteinGoal },
              { label: "Daily Carb Goal (g)", value: carbGoal, setter: setCarbGoal },
              { label: "Daily Fat Goal (g)", value: fatGoal, setter: setFatGoal },
              { label: "Daily Calorie Goal", value: calorieGoal, disabled: true },
            ].map((field, index) => (
              <motion.div
                key={field.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <label className={`block text-sm font-medium ${
                  darkMode ? "text-gray-200" : "text-gray-700"
                }`}>
                  {field.label}
                </label>
                <input
                  type="number"
                  value={field.value}
                  onChange={field.setter ? (e) => field.setter(e.target.value) : undefined}
                  disabled={field.disabled}
                  className={`mt-1 px-4 py-3 block w-full rounded-xl transition-all duration-200 ${
                    darkMode
                      ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                      : "bg-gray-50 border-gray-200 focus:bg-white"
                  } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                  required
                />
              </motion.div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className={`mt-6 w-full flex items-center justify-center py-3 px-4 rounded-xl text-white transition-all duration-200 ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-blue-500 hover:bg-blue-600"
            } shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40`}
          >
            <Save className="w-5 h-5 mr-2" />
            Save Settings
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-2xl backdrop-blur-lg border ${
            darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-gray-200"
          }`}
        >
          <h3 className="text-lg font-medium mb-4">Bulk/Cut Tracking</h3>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartClick}
            className={`w-full flex items-center justify-center py-3 px-4 rounded-xl text-white transition-all duration-200 ${
              darkMode
                ? "bg-green-600 hover:bg-green-500"
                : "bg-green-500 hover:bg-green-600"
            } shadow-lg shadow-green-500/20 hover:shadow-green-500/40`}
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            Start Bulk/Cut Tracking
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-2xl backdrop-blur-lg border ${
            darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-gray-200"
          }`}
        >
          <h3 className="text-lg font-medium mb-4">Account</h3>
          <div className={`p-4 rounded-xl ${
            darkMode ? "bg-zinc-800" : "bg-gray-50"
          } mb-6`}>
            <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Email: {userEmail}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className={`w-full flex items-center justify-center py-3 px-4 rounded-xl text-white transition-all duration-200 ${
              darkMode
                ? "bg-red-600 hover:bg-red-500"
                : "bg-red-500 hover:bg-red-600"
            } shadow-lg shadow-red-500/20 hover:shadow-red-500/40`}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full text-center"
        >
          <span className="flex items-center justify-center text-sm text-gray-500">
            <Package className="w-4 h-4 mr-2" />
            version {packageInfo.version}
          </span>
        </motion.div>
      </motion.form>

      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${
                darkMode ? "bg-zinc-900" : "bg-white"
              } p-6 rounded-2xl shadow-xl max-w-sm w-full border ${
                darkMode ? "border-zinc-800" : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-medium mb-4">Confirm Start</h3>
              <p className="mb-6 text-sm text-gray-500">
                Are you sure you want to start tracking? Today will be set as Day 1.
              </p>
              <div className="flex justify-end space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirmation(false)}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                    darkMode
                      ? "bg-zinc-800 hover:bg-zinc-700"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmStart}
                  className={`px-4 py-2 rounded-xl text-white transition-all duration-200 ${
                    darkMode
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  Confirm
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;