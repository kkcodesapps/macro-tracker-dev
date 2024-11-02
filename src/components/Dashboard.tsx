import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { ChevronLeft, ChevronRight, RefreshCw, RotateCw } from "lucide-react";
import { useTheme } from "../ThemeContext";
import {
  format,
  addDays,
  subDays,
  differenceInDays,
  parseISO,
  startOfDay,
  isToday,
} from "date-fns";
import { useData } from "../contexts/DataContext";
import { useToast } from "../contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [showRemaining, setShowRemaining] = useState(() => {
    const savedPreference = localStorage.getItem("showRemaining");
    return savedPreference ? JSON.parse(savedPreference) : false;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { darkMode } = useTheme();
  const {
    userSettings,
    dailyTotals,
    getDailyTotals,
    prefetchDailyTotals,
    fetchUserSettings,
    fetchFoods,
  } = useData();
  const { showToast } = useToast();

  const panelCount = 3;
  const panelWidthPercentage = 100;
  const [currentIndex, setCurrentIndex] = useState(1);
  const [dates, setDates] = useState([]);
  const containerRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const translateOffset = (100 - panelWidthPercentage) / 2;

  useEffect(() => {
    const initialDates = [
      subDays(selectedDate, 1),
      selectedDate,
      addDays(selectedDate, 1),
    ];
    setDates(initialDates);
  }, [selectedDate]);

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
    dates.forEach((date) => {
      if (!dailyTotals[date.toISOString().split("T")[0]]) {
        fetchDailyTotals(date);
      }
    });
    prefetchDailyTotals(selectedDate);
  }, [dates, fetchDailyTotals, prefetchDailyTotals, dailyTotals, selectedDate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventVerticalScroll = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    document.body.style.overflow = "hidden";
    window.addEventListener("touchmove", preventVerticalScroll, {
      passive: false,
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchmove", preventVerticalScroll);
      document.body.style.overflow = "auto";
    };
  }, [currentIndex]);

  const updateDates = (direction) => {
    setDates((prevDates) => {
      if (direction === "next") {
        return [prevDates[1], prevDates[2], addDays(prevDates[2], 1)];
      } else {
        return [subDays(prevDates[0], 1), prevDates[0], prevDates[1]];
      }
    });
    setSelectedDate((prevDate) =>
      direction === "next" ? addDays(prevDate, 1) : subDays(prevDate, 1)
    );
  };

  const moveCarousel = (direction) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    containerRef.current.style.transition =
      "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

    if (direction === "next") {
      setCurrentIndex((prevIndex) => prevIndex + 1);
      containerRef.current.style.transform = `translateX(-${
        (currentIndex + 1) * panelWidthPercentage + translateOffset
      }%)`;
    } else {
      setCurrentIndex((prevIndex) => prevIndex - 1);
      containerRef.current.style.transform = `translateX(-${
        (currentIndex - 1) * panelWidthPercentage + translateOffset
      }%)`;
    }

    setTimeout(() => {
      setIsTransitioning(false);
      repositionIfNeeded(direction);
    }, 300);
  };

  const repositionIfNeeded = (direction) => {
    containerRef.current.style.transition = "none";
    setCurrentIndex(1);
    containerRef.current.style.transform = `translateX(-${
      panelWidthPercentage + translateOffset
    }%)`;
    updateDates(direction);
  };

  const nextSlide = () => moveCarousel("next");
  const prevSlide = () => moveCarousel("prev");

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    if (touchStartX.current - touchEndX.current > 50) {
      nextSlide();
    } else if (touchEndX.current - touchStartX.current > 50) {
      prevSlide();
    }
  };

  const toggleRemainingMacros = () => {
    setShowRemaining((prev) => !prev);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchUserSettings(),
        fetchFoods(),
        ...dates.map((date) => getDailyTotals(date, true)),
      ]);

      await prefetchDailyTotals(selectedDate);
      showToast("All data refreshed successfully", "success");
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

  const renderProgressBars = (date: Date) => {
    const dateKey = date.toISOString().split("T")[0];
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
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {macros.map((macro, index) => {
          const percentage = Math.min((macro.current / macro.goal) * 100, 100);
          const remaining = macro.goal - macro.current;
          const displayValue = showRemaining
            ? remaining < 0
              ? remaining
              : remaining
            : `${macro.current} / ${macro.goal}`;

          return (
            <motion.div
              key={macro.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex mb-3 items-center justify-between">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span
                    className={`text-sm font-medium inline-block py-1.5 px-3 rounded-full transition-all duration-200 ${
                      darkMode
                        ? `text-${macro.color}-200 bg-${macro.color}-900/50`
                        : `text-${macro.color}-700 bg-${macro.color}-100 border border-${macro.color}-200`
                    }`}
                  >
                    {macro.name}
                  </span>
                </motion.div>
                <div
                  className={`text-right ${
                    showRemaining && remaining < 0 ? "text-red-500" : ""
                  }`}
                >
                  <span className="text-sm font-medium">
                    {displayValue}
                    {macro.name !== "Calories" ? "g" : ""}
                  </span>
                </div>
              </div>
              <div
                className={`overflow-hidden h-2.5 text-xs flex rounded-full transition-all duration-300 ${
                  darkMode ? "bg-gray-800" : "bg-gray-200"
                }`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${showRemaining ? 100 - percentage : percentage}%`,
                  }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-${macro.color}-500 transition-all duration-300`}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  const renderPanel = (date: Date, index: number) => (
    <div
      key={index}
      className={`flex-shrink-0 transition-transform duration-300 ease-out p-4`}
      style={{ width: `${panelWidthPercentage}%` }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`${
          darkMode ? "bg-zinc-900/80" : "bg-white/80"
        } backdrop-blur-lg rounded-2xl p-6 relative border ${
          darkMode ? "border-zinc-800" : "border-gray-200"
        }`}
      >
        <div className="text-left mb-8">
          <div className="space-x-4 mb-4">
            <div className="text-lg flex justify-center font-medium relative">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="text-sm text-gray-500 w-fit m-auto pt-8"
              >
                {format(date, "MMMM d, yyyy")}
              </motion.div>
              {isToday(date) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute -top-2 w-fit px-3 py-1 text-xs font-semibold rounded-full m-auto mt-2 ${
                    darkMode
                      ? "bg-blue-900/50 text-blue-200 border border-blue-700"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  Today
                </motion.div>
              )}
            </div>
          </div>
          <div
            className={`flex items-center ${
              bulkCutDay >= 1 ? "justify-between" : "justify-end"
            }`}
          >
            {bulkCutDay !== null && bulkCutDay >= 1 && bulkCutDay !== 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-lg font-medium ${
                  bulkCutDay === 0 && "hidden"
                }`}
              >
                Day {bulkCutDay + differenceInDays(date, selectedDate)}
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRemainingMacros}
              className={`flex items-center p-2.5 text-sm rounded-full transition-all duration-200 ${
                darkMode
                  ? "bg-blue-900/50 text-blue-200 border border-blue-700 hover:bg-blue-800"
                  : "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
              }`}
            >
              <RefreshCw className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
        {isLoading && !dailyTotals[date.toISOString().split("T")[0]] ? (
          <div className="flex justify-center items-center h-40">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"
            />
          </div>
        ) : (
          renderProgressBars(date)
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-semibold"
        >
          Dashboard
        </motion.h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
            darkMode
              ? "bg-blue-900/50 text-blue-200 border border-blue-700 hover:bg-blue-800"
              : "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
          }`}
        >
          <RotateCw
            className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="ml-2 font-medium">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </span>
        </motion.button>
      </div>
      <div className="overflow-hidden rounded-2xl">
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${panelWidthPercentage}%)`,
            width: `${panelWidthPercentage}%`,
          }}
        >
          {dates.map((date, index) => renderPanel(date, index))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
