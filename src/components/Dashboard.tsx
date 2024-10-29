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
    localStorage.setItem("showRemaining", JSON.stringify(showRemaining));
  }, [showRemaining]);

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
    containerRef.current.style.transition = "transform 0.2s ease-in-out";

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
    }, 200);
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

  useEffect(() => {
    const container = containerRef.current;
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    const preventVerticalScroll = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("touchmove", preventVerticalScroll, {
      passive: false,
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd, {
        passive: true,
      });
      window.removeEventListener("touchmove", preventVerticalScroll);
      document.body.style.overflow = "auto";
    };
  }, [currentIndex]);

  const toggleRemainingMacros = () => {
    setShowRemaining((prev) => !prev);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await getDailyTotals(selectedDate, true);
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
  };

  const renderPanel = (date: Date, index: number) => (
    <div
      key={index}
      className={`flex-shrink-0 transition-transform duration-200 ease-out p-4`}
      style={{ width: `${panelWidthPercentage}%` }}
    >
      <div
        className={`${
          darkMode ? "bg-zinc-800" : "bg-white"
        } shadow rounded-lg p-6 relative`}
      >
        <div className="text-left mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="text-lg font-medium relative">
              <div className="text-sm text-gray-500">
                {format(date, "MMMM d, yyyy")}
                {isToday(date) && (
                  <span
                    className={`absolute -right-16 top-0 px-2 py-0.5 text-xs font-semibold rounded-full ${
                      darkMode
                        ? "bg-blue-900 text-blue-200"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    Today
                  </span>
                )}
              </div>
            </div>
          </div>
          <div
            className={`flex items-center ${
              bulkCutDay >= 1 ? "justify-between" : "justify-end"
            }`}
          >
            {bulkCutDay !== null && bulkCutDay >= 1 && bulkCutDay !== 0 && (
              <div className={`text-lg ${bulkCutDay === 0 && "hidden"}`}>
                Day {bulkCutDay + differenceInDays(date, selectedDate)}
              </div>
            )}
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
        {isLoading && !dailyTotals[date.toISOString().split("T")[0]] ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          renderProgressBars(date)
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
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
          <RotateCw
            className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="ml-2">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </span>
        </button>
      </div>
      <div className="overflow-hidden rounded-lg">
        <div
          ref={containerRef}
          className="flex transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(-${panelWidthPercentage}%)`,
            width: `${panelWidthPercentage}%`,
          }}
        >
          {dates.map((date, index) => renderPanel(date, index))}
        </div>
        <button
          className="absolute left-4 -bottom-10 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 text-gray-800 font-bold py-2 px-4 rounded-full shadow-lg transition-all duration-200 hidden md:block"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          className="absolute right-4 -bottom-10 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 text-gray-800 font-bold py-2 px-4 rounded-full shadow-lg transition-all duration-200 hidden md:block"
          onClick={nextSlide}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;