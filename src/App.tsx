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

  return (
    <div
      className={`min-h-screen overflow-hidden pb-[5rem] ${
        darkMode ? "dark bg-black text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      <nav className={`${darkMode ? "bg-zinc-900" : "bg-white"} shadow-lg`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-semibold">
                <span className="italic font-thin text-base">based</span>
                MacroTracker
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${
                  darkMode
                    ? "bg-zinc-800 hover:bg-zinc-700"
                    : "bg-gray-200 hover:bg-gray-300"
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
      <nav className="fixed bottom-0 pb-6 left-0 right-0 bg-white dark:bg-zinc-900 shadow-lg">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className={`flex flex-col items-center ${
                location.pathname === "/" ? "text-blue-500" : ""
              }`}
            >
              <Home className="h-6 w-6" />
              <span className="text-xs mt-1">Home</span>
            </Link>
            <Link
              to="/meal-list"
              className={`flex flex-col items-center ${
                location.pathname === "/meal-list" ? "text-blue-500" : ""
              }`}
            >
              <List className="h-6 w-6" />
              <span className="text-xs mt-1">Meals</span>
            </Link>
            <Link
              to="/add-meal"
              className={`flex items-center justify-center w-12 h-12 rounded-full ${
                location.pathname === "/add-meal"
                  ? "bg-blue-500 text-white"
                  : darkMode
                  ? "bg-zinc-800"
                  : "bg-gray-200"
              }`}
            >
              <Plus className="h-6 w-6" />
            </Link>
            <Link
              to="/foods"
              className={`flex flex-col items-center ${
                location.pathname === "/foods" ? "text-blue-500" : ""
              }`}
            >
              <Apple className="h-6 w-6" />
              <span className="text-xs mt-1">Foods</span>
            </Link>
            <Link
              to="/settings"
              className={`flex flex-col items-center ${
                location.pathname === "/settings" ? "text-blue-500" : ""
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
