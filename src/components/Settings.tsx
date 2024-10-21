import React, { useState, useEffect } from "react";
import { useTheme } from "../ThemeContext";
import { supabase } from "../supabase";
import { useData } from "../contexts/DataContext";
import { useNavigate } from "react-router-dom";
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.email) {
      setUserEmail(user.email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const newSettings = {
        user_id: user.id,
        calorie_goal: parseInt(calorieGoal),
        protein_goal: parseInt(proteinGoal),
        carb_goal: parseInt(carbGoal),
        fat_goal: parseInt(fatGoal),
      };

      const { data, error } = await supabase
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

  const handleStartClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmStart = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const startDate = new Date().toISOString();

      const { data, error } = await supabase
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

  const inputLayoutClasses = "py-2 px-4";

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <h2 className="text-2xl font-semibold mb-6">Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="proteinGoal"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Daily Protein Goal (g)
          </label>
          <input
            type="number"
            id="proteinGoal"
            value={proteinGoal}
            onChange={(e) => setProteinGoal(e.target.value)}
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
          />
        </div>
        <div>
          <label
            htmlFor="carbGoal"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Daily Carb Goal (g)
          </label>
          <input
            type="number"
            id="carbGoal"
            value={carbGoal}
            onChange={(e) => setCarbGoal(e.target.value)}
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
          />
        </div>
        <div>
          <label
            htmlFor="fatGoal"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Daily Fat Goal (g)
          </label>
          <input
            type="number"
            id="fatGoal"
            value={fatGoal}
            onChange={(e) => setFatGoal(e.target.value)}
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
          />
        </div>
        <div>
          <label
            htmlFor="calorieGoal"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Daily Calorie Goal
          </label>
          <input
            type="number"
            id="calorieGoal"
            value={calorieGoal}
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            disabled
          />
        </div>
        <button
          type="submit"
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            darkMode
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-500 hover:bg-blue-600"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          Save Settings
        </button>
      </form>

      <div className="mt-8">
        <button
          onClick={handleStartClick}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            darkMode
              ? "bg-green-600 hover:bg-green-700"
              : "bg-green-500 hover:bg-green-600"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
        >
          Start Bulk/Cut Tracking
        </button>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div
            className={`${
              darkMode ? "bg-gray-800" : "bg-white"
            } p-6 rounded-lg shadow-xl`}
          >
            <h3 className="text-lg font-medium mb-4">Confirm Start</h3>
            <p className="mb-4">
              Are you sure you want to start tracking? Today will be set as Day
              1.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className={`px-4 py-2 rounded ${
                  darkMode
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                className={`px-4 py-2 rounded text-white ${
                  darkMode
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 border rounded-md">
        <h3
          className={`text-lg font-medium mb-2 ${
            darkMode ? "text-gray-200" : "text-gray-700"
          }`}
        >
          User Information
        </h3>
        <p
          className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Email: {userEmail}
        </p>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSignOut}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            darkMode
              ? "bg-red-600 hover:bg-red-700"
              : "bg-red-500 hover:bg-red-600"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
        >
          Sign Out
        </button>
      </div>

      <div className="w-full text-center mt-8">
        <span className="font-normal text-sm ml-2 text-gray-500">
          version {packageInfo.version}
        </span>
      </div>
    </div>
  );
};

export default Settings;
