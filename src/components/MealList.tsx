import React, { useState, useEffect, useRef } from "react";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit,
} from "lucide-react";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { useMeals } from "../MealsContext";
import {
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isToday,
} from "date-fns";
import { useToast } from "../contexts/ToastContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface MealFood {
  id: number;
  name: string;
  quantity: number;
  protein: number;
  carbs: number;
  fat: number;
  is_quick_macro: boolean;
  serving_size?: number;
}

interface Meal {
  id: number;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  created_at: string;
  foods?: MealFood[];
}

interface MealListProps {
  className?: string;
}

const MealList: React.FC<MealListProps> = ({ className }) => {
  const { meals, loading, error, deleteMeal, fetchMeals } = useMeals();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedMeals, setExpandedMeals] = useState<number[]>([]);
  const [localMeals, setLocalMeals] = useState<Meal[]>([]);
  const { darkMode } = useTheme();
  const [swipedMealId, setSwipedMealId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const { showToast } = useToast();
  const isClosingSwipe = useRef(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dateOpacity, setDateOpacity] = useState(1);

  useEffect(() => {
    fetchUserId();
  }, []);

  useEffect(() => {
    fetchMealsForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setLocalMeals(meals);
  }, [meals]);

  const fetchUserId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const fetchMealsForDate = async (date: Date) => {
    const startDate = startOfDay(date).toISOString();
    const endDate = endOfDay(date).toISOString();
    await fetchMeals(startDate, endDate);
  };

  const goToPreviousDay = () => {
    setSelectedDate((prevDate) => subDays(prevDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate((prevDate) => addDays(prevDate, 1));
  };

  const handleDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    mealId: number
  ) => {
    e.stopPropagation();
    if (e.type === "mousedown") {
      dragStartX.current = (e as React.MouseEvent).clientX;
    } else if (e.type === "touchstart") {
      dragStartX.current = (e as React.TouchEvent).touches[0].clientX;
    }
    setIsDragging(true);
  };

  const handleDragMove = (
    e: React.MouseEvent | React.TouchEvent,
    mealId: number
  ) => {
    if (!isDragging || dragStartX.current === null) return;

    let currentX: number;
    if (e.type === "mousemove") {
      currentX = (e as React.MouseEvent).clientX;
    } else if (e.type === "touchmove") {
      currentX = (e as React.TouchEvent).touches[0].clientX;
    } else {
      return;
    }

    const diff = dragStartX.current - currentX;

    if (diff > 50) {
      setSwipedMealId(mealId);
    } else if (diff < -20) {
      isClosingSwipe.current = true;
      setSwipedMealId(null);
    } else {
      isClosingSwipe.current = false;
    }
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    dragStartX.current = null;
    setTimeout(() => {
      isClosingSwipe.current = false;
    }, 300);
  };

  const toggleMealExpansion = async (mealId: number) => {
    if (expandedMeals.includes(mealId)) {
      setExpandedMeals(expandedMeals.filter((id) => id !== mealId));
    } else {
      try {
        const { data: mealFoods, error: mealFoodsError } = await supabase
          .from("meal_foods")
          .select(
            `
            id,
            quantity,
            food_name,
            food_protein,
            food_carbs,
            food_fat,
            is_quick_macro,
            serving_size
          `
          )
          .eq("meal_id", mealId);

        if (mealFoodsError) throw mealFoodsError;

        const mealFoodsWithDetails: MealFood[] = mealFoods.map((mf) => ({
          id: mf.id,
          name: mf.food_name || "Unknown Food",
          quantity: mf.quantity,
          protein: mf.food_protein || 0,
          carbs: mf.food_carbs || 0,
          fat: mf.food_fat || 0,
          is_quick_macro: mf.is_quick_macro,
          serving_size: mf.serving_size,
        }));

        setLocalMeals((prevMeals) =>
          prevMeals.map((meal) =>
            meal.id === mealId ? { ...meal, foods: mealFoodsWithDetails } : meal
          )
        );

        setExpandedMeals([...expandedMeals, mealId]);
      } catch (error) {
        console.error("Error fetching meal foods:", error);
        showToast("Failed to fetch meal details", "error");
      }
    }
  };

  const handleDeleteMeal = async (mealId: number) => {
    try {
      await deleteMeal(mealId);
      setSwipedMealId(null);
      showToast("Meal deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting meal:", error);
      showToast("Failed to delete meal", "error");
    }
  };

  const handleEditMeal = (meal: Meal) => {
    const mealWithFoods = meals.find((m) => m.id === meal.id);
    navigate("/add-meal", {
      state: { meal: { ...meal, foods: mealWithFoods?.foods } },
    });
  };

  const handleMealClick = (e: React.MouseEvent, mealId: number) => {
    if (
      !(e.target as HTMLElement).closest(".meal-action-button") &&
      swipedMealId !== mealId &&
      !isClosingSwipe.current
    ) {
      toggleMealExpansion(mealId);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={`rounded-full h-16 w-16 border-4 border-t-4 ${
            darkMode
              ? "border-zinc-800 border-t-blue-500"
              : "border-gray-200 border-t-blue-500"
          }`}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-gray-500"
        >
          Loading meals...
        </motion.p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-red-500 text-center p-4"
      >
        {error}
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold mb-6"
      >
        Meal List
      </motion.h2>

      <div ref={containerRef} className="overflow-x-hidden pb-16">
        {localMeals.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-gray-500 py-8"
          >
            No meals found for this day. Add some meals to see them here.
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-hidden"
          >
            <ul className="space-y-4">
              <AnimatePresence>
                {localMeals.map((meal, index) => (
                  <motion.li
                    key={meal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{
                      opacity: 1,
                      x: swipedMealId === meal.id ? -160 : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                    className={`border border-gray-200 px-6 py-4 rounded-2xl ${
                      darkMode ? "bg-zinc-900/80" : "bg-white/80"
                    } ${
                      darkMode ? "hover:bg-zinc-800/80" : "hover:bg-gray-50/80"
                    } 
                 backdrop-blur-lg relative cursor-pointer 
                 border ${darkMode ? "border-zinc-800" : "border-gray-200"}
                 ${swipedMealId === meal.id && "rounded-r-none"}`}
                    onClick={(e) => handleMealClick(e, meal.id)}
                    onMouseDown={(e) => handleDragStart(e, meal.id)}
                    onMouseMove={(e) => handleDragMove(e, meal.id)}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={(e) => handleDragStart(e, meal.id)}
                    onTouchMove={(e) => handleDragMove(e, meal.id)}
                    onTouchEnd={handleDragEnd}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className={`text-lg font-medium ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {meal.name}
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (swipedMealId !== meal.id) {
                            toggleMealExpansion(meal.id);
                          }
                        }}
                        className={`meal-action-button mr-2 p-1.5 rounded-full transition-all duration-200 ${
                          darkMode
                            ? "hover:bg-zinc-700 text-gray-400 hover:text-white"
                            : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {expandedMeals.includes(meal.id) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </motion.button>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div
                        className={`p-3 rounded-xl transition-all duration-200 ${
                          darkMode
                            ? "bg-blue-900/30 border border-blue-800"
                            : "bg-blue-50 border border-blue-100"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? "text-blue-200" : "text-blue-800"
                          }`}
                        >
                          Calories
                        </p>
                        <p
                          className={`text-lg font-bold ${
                            darkMode ? "text-blue-100" : "text-blue-900"
                          }`}
                        >
                          {meal.calories}
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-xl transition-all duration-200 ${
                          darkMode
                            ? "bg-red-900/30 border border-red-800"
                            : "bg-red-50 border border-red-100"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? "text-red-200" : "text-red-800"
                          }`}
                        >
                          Protein
                        </p>
                        <p
                          className={`text-lg font-bold ${
                            darkMode ? "text-red-100" : "text-red-900"
                          }`}
                        >
                          {meal.protein}g
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-xl transition-all duration-200 ${
                          darkMode
                            ? "bg-green-900/30 border border-green-800"
                            : "bg-green-50 border border-green-100"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? "text-green-200" : "text-green-800"
                          }`}
                        >
                          Carbs
                        </p>
                        <p
                          className={`text-lg font-bold ${
                            darkMode ? "text-green-100" : "text-green-900"
                          }`}
                        >
                          {meal.carbs}g
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-xl transition-all duration-200 ${
                          darkMode
                            ? "bg-amber-900/30 border border-amber-800"
                            : "bg-amber-50 border border-amber-100"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? "text-amber-200" : "text-amber-800"
                          }`}
                        >
                          Fat
                        </p>
                        <p
                          className={`text-lg font-bold ${
                            darkMode ? "text-amber-100" : "text-amber-900"
                          }`}
                        >
                          {meal.fat}g
                        </p>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedMeals.includes(meal.id) && meal.foods && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <h4
                            className={`text-sm font-medium mb-2 ${
                              darkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            Foods in this meal:
                          </h4>
                          <ul className="space-y-2">
                            {meal.foods.map((food) => (
                              <motion.li
                                key={food.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`text-sm ${
                                  darkMode ? "text-gray-400" : "text-gray-600"
                                } p-2 rounded-lg ${
                                  darkMode ? "bg-zinc-800/50" : "bg-gray-50"
                                }`}
                              >
                                <span className="font-medium">{food.name}</span>{" "}
                                (x{food.quantity})
                                {food.serving_size && (
                                  <span className="mx-1">
                                    - {food.quantity * food.serving_size}g total
                                  </span>
                                )}
                                <div className="mt-1 flex space-x-4">
                                  <span>
                                    P:{" "}
                                    {Math.round(food.protein * food.quantity)}g
                                  </span>
                                  <span>
                                    C: {Math.round(food.carbs * food.quantity)}g
                                  </span>
                                  <span>
                                    F: {Math.round(food.fat * food.quantity)}g
                                  </span>
                                </div>
                                {food.is_quick_macro && (
                                  <span className="ml-2 text-xs italic text-blue-500">
                                    Quick Macro
                                  </span>
                                )}
                              </motion.li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      className="absolute -right-[160px] top-0 bottom-0 flex"
                      animate={{
                        x: swipedMealId === meal.id ? 0 : "100%",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMeal(meal);
                        }}
                        className="meal-action-button w-20 flex items-center justify-center bg-blue-500 transition-colors duration-200"
                      >
                        <Edit className="h-5 w-5 text-white" />
                      </motion.button>
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeal(meal.id);
                        }}
                        className="meal-action-button w-20 flex items-center justify-center rounded-r-xl bg-red-500 transition-colors duration-200"
                      >
                        <Trash2 className="h-5 w-5 text-white" />
                      </motion.button>
                    </motion.div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: dateOpacity, y: 0 }}
        className="fixed bottom-[5.5rem] left-0 right-0 transition-opacity duration-200"
      >
        <div
          className={`mx-auto w-full px-4 py-3 pb-6 ${
            darkMode ? "bg-zinc-900/80" : "bg-white/80"
          } backdrop-blur-lg shadow-lg border-t ${
            darkMode ? "border-zinc-800" : "border-gray-200"
          } flex items-center justify-between`}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToPreviousDay}
            className={`p-2 rounded-full transition-all duration-200 ${
              darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-200"
            }`}
          >
            <ChevronLeft className="h-6 w-6" />
          </motion.button>
          <span className="text-lg font-medium">
            {isToday(selectedDate)
              ? "Today"
              : format(selectedDate, "MMMM d, yyyy")}
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToNextDay}
            className={`p-2 rounded-full transition-all duration-200 ${
              darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-200"
            }`}
          >
            <ChevronRight className="h-6 w-6" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default MealList;
