import React, { useState, useEffect, useRef } from "react";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { useMeals } from "../MealsContext";
import { format, addDays, subDays, startOfDay, endOfDay } from "date-fns";
import { useToast } from "../contexts/ToastContext";

interface MealFood {
  id: number;
  name: string;
  quantity: number;
  protein: number;
  carbs: number;
  fat: number;
  is_quick_macro: boolean;
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
            is_quick_macro
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
        }));

        setLocalMeals((prevMeals) =>
          prevMeals.map((meal) => {
            if (meal.id === mealId) {
              return {
                ...meal,
                foods: mealFoodsWithDetails,
              };
            }
            return meal;
          })
        );

        setExpandedMeals([...expandedMeals, mealId]);
      } catch (error) {
        console.error("Error fetching meal foods:", error);
        showToast("Failed to fetch meal details", "error");
      }
    }
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
    }, 300); // Adjust this timeout to match your transition duration
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

  const handleMealClick = (e: React.MouseEvent, mealId: number) => {
    // Check if the click is not on the expand/collapse button or delete button
    // and the meal is not currently swiped
    if (
      !(e.target as HTMLElement).closest(".meal-action-button") &&
      swipedMealId !== mealId &&
      !isClosingSwipe.current
    ) {
      toggleMealExpansion(mealId);
    }
  };

  if (loading) {
    return <div>Loading meals...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Meal List</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousDay}
            className={`p-1 rounded-full ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
            }`}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="text-lg font-medium">
            {format(selectedDate, "MMMM d, yyyy")}
          </span>
          <button
            onClick={goToNextDay}
            className={`p-1 rounded-full ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
            }`}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
      {localMeals.length === 0 ? (
        <p>No meals found for this day. Add some meals to see them here.</p>
      ) : (
        <div className={`overflow-hidden`}>
          <ul className="space-y-4">
            {localMeals.map((meal) => (
              <li
                key={meal.id}
                className={`shadow px-6 py-4 rounded-lg ${
                  darkMode ? "bg-gray-800" : "bg-white"
                } ${
                  darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                } relative transition-all duration-200 ease-in-out cursor-pointer ${
                  swipedMealId === meal.id && "rounded-r-none"
                }`}
                style={{
                  transform:
                    swipedMealId === meal.id
                      ? "translateX(-60px)"
                      : "translateX(0)",
                }}
                onClick={(e) => handleMealClick(e, meal.id)}
                onMouseDown={(e) => handleDragStart(e, meal.id)}
                onMouseMove={(e) => handleDragMove(e, meal.id)}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={(e) => handleDragStart(e, meal.id)}
                onTouchMove={(e) => handleDragMove(e, meal.id)}
                onTouchEnd={handleDragEnd}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3
                    className={`text-lg font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {meal.name}
                  </h3>
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (swipedMealId !== meal.id) {
                          toggleMealExpansion(meal.id);
                        }
                      }}
                      className={`meal-action-button mr-2 p-1 rounded-full ${
                        darkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"
                      }`}
                    >
                      {expandedMeals.includes(meal.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-2">
                  <div
                    className={`p-2 rounded ${
                      darkMode ? "bg-blue-900" : "bg-blue-100"
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
                    className={`p-2 rounded ${
                      darkMode ? "bg-red-900" : "bg-red-100"
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
                    className={`p-2 rounded ${
                      darkMode ? "bg-green-900" : "bg-green-100"
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
                    className={`p-2 rounded ${
                      darkMode ? "bg-yellow-900" : "bg-yellow-100"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        darkMode ? "text-yellow-200" : "text-yellow-800"
                      }`}
                    >
                      Fat
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        darkMode ? "text-yellow-100" : "text-yellow-900"
                      }`}
                    >
                      {meal.fat}g
                    </p>
                  </div>
                </div>
                {expandedMeals.includes(meal.id) && meal.foods && (
                  <div className="mt-4">
                    <h4
                      className={`text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Foods in this meal:
                    </h4>
                    <ul className="space-y-2">
                      {meal.foods.map((food) => (
                        <li
                          key={food.id}
                          className={`text-sm ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {food.name} (x{food.quantity}) - Protein:{" "}
                          {Math.round(food.protein * food.quantity)}g, Carbs:{" "}
                          {Math.round(food.carbs * food.quantity)}g, Fat:{" "}
                          {Math.round(food.fat * food.quantity)}g
                          {food.is_quick_macro && (
                            <span className="ml-2 text-xs italic">
                              (Quick Macro)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMeal(meal.id);
                  }}
                  className={`meal-action-button absolute -right-[60px] top-0 bottom-0 w-16 flex items-center justify-center transition-200 transition-all rounded-r-lg ${
                    darkMode ? "bg-red-600" : "bg-red-500"
                  }`}
                  style={{
                    transform:
                      swipedMealId === meal.id
                        ? "translateX(0)"
                        : "translateX(100%)",
                  }}
                >
                  <Trash2 className="h-5 w-5 text-white" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MealList;
