import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import {
  Home,
  List,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Apple,
  Plus,
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import AddMeal from "./components/AddMeal";
import MealList from "./components/MealList";
import Settings from "./components/Settings";
import Auth from "./components/Auth";
import FoodList from "./components/FoodList";
import { supabase } from "./supabase";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { MealsProvider } from "./MealsContext";
import { DataProvider } from "./contexts/DataContext";
import { ToastProvider } from "./contexts/ToastContext";

function AppContent() {
  const [session, setSession] = useState<any>(null);
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!session) {
    return <Auth />;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      className={`min-h-screen overflow-hidden pb-[5rem] ${
        darkMode ? "dark bg-black text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <nav
        className={`${
          darkMode ? "bg-zinc-900/80" : "bg-white/80"
        } backdrop-blur-lg shadow-lg sticky top-0 z-50`}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-semibold group">
                <span className="italic font-thin text-base group-hover:text-blue-500 transition-colors">
                  based
                </span>
                <span className="group-hover:text-blue-500 transition-colors">
                  MacroTracker
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-all duration-300 ${
                  darkMode
                    ? "bg-zinc-800 hover:bg-zinc-700 hover:text-yellow-400"
                    : "bg-gray-100 hover:bg-gray-200 hover:text-blue-600"
                }`}
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto py-8 relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-meal" element={<AddMeal className="px-4" />} />
          <Route path="/meal-list" element={<MealList className="px-4" />} />
          <Route path="/settings" element={<Settings className="px-4" />} />
          <Route path="/foods" element={<FoodList className="px-4" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <nav
        className={`fixed bottom-0 left-0 right-0 ${
          darkMode ? "bg-zinc-900/80" : "bg-white/80"
        } backdrop-blur-lg shadow-lg pb-6`}
      >
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className={`flex flex-col items-center transition-all duration-200 w-12 ${
                isActive("/") ? "text-blue-500" : "hover:text-blue-500"
              }`}
            >
              <Home className="h-6 w-6" />
              <span className="text-xs mt-1">Home</span>
            </Link>
            <Link
              to="/meal-list"
              className={`flex flex-col items-center transition-all duration-200 w-12 ${
                isActive("/meal-list") ? "text-blue-500" : "hover:text-blue-500"
              }`}
            >
              <List className="h-6 w-6" />
              <span className="text-xs mt-1">Meals</span>
            </Link>
            <Link
              to="/add-meal"
              className={`flex items-center justify-center w-14 h-14 rounded-full transform -translate-y-6 transition-all duration-300 w-12 ${
                isActive("/add-meal")
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                  : darkMode
                  ? "bg-zinc-800 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/50"
                  : "bg-gray-200 hover:bg-blue-500 hover:text-white hover:shadow-lg hover:shadow-blue-500/50"
              }`}
            >
              <Plus className="h-6 w-6" />
            </Link>
            <Link
              to="/foods"
              className={`flex flex-col items-center transition-all duration-200 w-12 ${
                isActive("/foods") ? "text-blue-500" : "hover:text-blue-500"
              }`}
            >
              <Apple className="h-6 w-6" />
              <span className="text-xs mt-1">Foods</span>
            </Link>
            <Link
              to="/settings"
              className={`flex flex-col items-center transition-all duration-200 w-12 ${
                isActive("/settings") ? "text-blue-500" : "hover:text-blue-500"
              }`}
            >
              <SettingsIcon className="h-6 w-6" />
              <span className="text-xs mt-1">Settings</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <DataProvider>
          <MealsProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </MealsProvider>
        </DataProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
