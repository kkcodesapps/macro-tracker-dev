import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, RotateCw } from "lucide-react";
import { useTheme } from "../ThemeContext";
import {
  format,
  addDays,
  subDays,
  differenceInDays,
  parseISO,
  startOfDay,
} from "date-fns";
import { useData } from "../contexts/DataContext";
import { useToast } from "../contexts/ToastContext";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [showRemaining, setShowRemaining] = useState(() => {
    const savedPreference = localStorage.getItem("showRemaining");
    return savedPreference ? JSON.parse(savedPreference) : false;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { darkMode } = useTheme();
  const { userSettings, dailyTotals, getDailyTotals, prefetchDailyTotals } =
    useData();
  const { showToast } = useToast();

  const fetchDailyTotals = useCallback(
    async (date: Date) => {
      setIsLoading(true);
      try {
        await getDailyTotals(date);
      } catch (error) {
        console.error("Error fetching daily totals:", error);
        showToast("Failed to fetch daily totals", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [getDailyTotals, showToast]
  );

  useEffect(() => {
    if (!dailyTotals[selectedDate.toISOString().split("T")[0]]) {
      fetchDailyTotals(selectedDate);
    }
    prefetchDailyTotals(selectedDate);
  }, [selectedDate, fetchDailyTotals, prefetchDailyTotals, dailyTotals]);

  useEffect(() => {
    localStorage.setItem("showRemaining", JSON.stringify(showRemaining));
  }, [showRemaining]);

  const goToPreviousDay = () => {
    setSelectedDate((prevDate) => subDays(prevDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate((prevDate) => addDays(prevDate, 1));
  };

  const toggleRemainingMacros = () => {
    setShowRemaining((prev) => !prev);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDailyTotals(selectedDate);
      showToast("Data refreshed successfully", "success");
    } catch (error) {
      console.error("Error refreshing data:", error);
      showToast("Failed to refresh data", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const bulkCutDay = useMemo(() => {
    if (userSettings?.bulk_cut_start_date) {
      const startDate = parseISO(userSettings.bulk_cut_start_date);
      const localStartDate = startOfDay(
        new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000)
      );
      const localSelectedDate = startOfDay(selectedDate);
      const diffDays = differenceInDays(localSelectedDate, localStartDate);
      return diffDays + 1;
    }
    return null;
  }, [userSettings, selectedDate]);

  const memoizedProgressBars = useMemo(() => {
    const dateKey = selectedDate.toISOString().split("T")[0];
    const dailyTotal = dailyTotals[dateKey] || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    if (!userSettings) return null;

    const macros = [
      {
        name: "Calories",
        current: dailyTotal.calories,
        goal: userSettings.calorie_goal,
        color: "blue",
      },
      {
        name: "Protein",
        current: dailyTotal.protein,
        goal: userSettings.protein_goal,
        color: "red",
      },
      {
        name: "Carbs",
        current: dailyTotal.carbs,
        goal: userSettings.carb_goal,
        color: "green",
      },
      {
        name: "Fat",
        current: dailyTotal.fat,
        goal: userSettings.fat_goal,
        color: "amber",
      },
    ];

    return (
      <div className="space-y-4">
        {macros.map((macro) => {
          const percentage = Math.min((macro.current / macro.goal) * 100, 100);
          const remaining = macro.goal - macro.current;
          const displayValue = showRemaining
            ? remaining < 0
              ? remaining
              : remaining
            : `${macro.current} / ${macro.goal}`;

          return (
            <div key={macro.name} className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span
                    className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                      darkMode
                        ? `text-${macro.color}-200 bg-${macro.color}-900`
                        : `text-${macro.color}-600 bg-${macro.color}-200`
                    }`}
                  >
                    {macro.name}
                  </span>
                </div>
                <div
                  className={`text-right ${
                    showRemaining && remaining < 0 ? "text-red-500" : ""
                  }`}
                >
                  <span className="text-sm font-normal inline-block">
                    {displayValue}
                    {macro.name !== "Calories" ? "g" : ""}
                  </span>
                </div>
              </div>
              <div
                className={`overflow-hidden h-2 mb-4 text-xs flex rounded ${
                  darkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <div
                  style={{
                    width: `${showRemaining ? 100 - percentage : percentage}%`,
                  }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-${macro.color}-500`}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [dailyTotals, userSettings, showRemaining, darkMode, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <button
          onClick={handleRefresh}
          className={`flex items-center p-2 rounded ${
            darkMode
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-100 hover:bg-blue-200"
          } text-blue-900 transition-colors duration-200`}
          disabled={isRefreshing}
        >
          <RotateCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="ml-2">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
      <div
        className={`${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow rounded-lg p-6`}
      >
        <div className="text-left mb-8">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <button
              onClick={goToPreviousDay}
              className={`p-1 rounded-full ${
                darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="text-lg font-medium">
              <div className="text-sm text-gray-500">
                {format(selectedDate, "MMMM d, yyyy")}
              </div>
            </div>
            <button
              onClick={goToNextDay}
              className={`p-1 rounded-full ${
                darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          <div className="flex justify-between">
            {bulkCutDay > 0 && <div className="text-lg">Day {bulkCutDay}</div>}
            <button
              onClick={toggleRemainingMacros}
              className={`flex items-center p-2 text-sm rounded-full ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-blue-100 hover:bg-blue-200"
              } text-blue-900`}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        {isLoading && !dailyTotals[selectedDate.toISOString().split("T")[0]] ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          memoizedProgressBars
        )}
      </div>
    </div>
  );
};

export default Dashboard;