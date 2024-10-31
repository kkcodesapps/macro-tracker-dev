import React, { useState, useEffect, useRef } from "react";
import { Plus, Minus, X } from "lucide-react";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { useMeals } from "../MealsContext";
import { useData } from "../contexts/DataContext";
import { useToast } from "../contexts/ToastContext";
import { useLocation, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Food {
  id: number;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  serving_size?: number;
}

interface SelectedFood extends Food {
  quantity: number;
  isQuickMacro?: boolean;
}

interface QuickMacro {
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  serving_size?: number;
}

interface AddMealProps {
  className?: string;
}

const AddMeal: React.FC<AddMealProps> = ({ className }) => {
  const [mealName, setMealName] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [calories, setCalories] = useState(0);
  const [mealDate, setMealDate] = useState(new Date());
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showQuickMacroModal, setShowQuickMacroModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [quickMacro, setQuickMacro] = useState<QuickMacro>({
    name: "",
    protein: undefined,
    carbs: undefined,
    fat: undefined,
    serving_size: undefined,
  });

  const { darkMode } = useTheme();
  const { addMeal, updateMeal } = useMeals();
  const { foods, fetchFoods } = useData();
  const { showToast } = useToast();
  const datePickerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFoods();
    // Check if we're editing an existing meal
    if (location.state?.meal) {
      const meal = location.state.meal;
      setEditingMealId(meal.id);
      setMealName(meal.name);
      setMealDate(new Date(meal.created_at));
      setProtein(meal.protein);
      setCarbs(meal.carbs);
      setFat(meal.fat);
      setCalories(meal.calories);
      console.log("testst", meal);

      if (meal.foods) {
        const transformedFoods = meal.foods.map((food) => ({
          id: food.food_id || food.id, // Handle both regular foods and quick macros
          name: food.food_name || food.name,
          protein: food.food_protein || food.protein,
          carbs: food.food_carbs || food.carbs,
          fat: food.food_fat || food.fat,
          quantity: food.quantity,
          serving_size: food.serving_size,
          isQuickMacro: food.is_quick_macro,
        }));
        setSelectedFoods(transformedFoods);
      }
    }
  }, [location.state, fetchFoods]);

  useEffect(() => {
    calculateTotals();
  }, [selectedFoods]);

  const fetchRecentFoods = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const recentFoodIds = [...new Set(data.map((item) => item.food_id))];
      const recentFoodsData = foods.filter((food) =>
        recentFoodIds.includes(food.id)
      );
      setRecentFoods(recentFoodsData);
    } catch (error) {
      console.error("Error fetching recent foods:", error);
    }
  };

  const calculateTotals = () => {
    const totals = selectedFoods.reduce(
      (acc, food) => {
        acc.protein += food.protein * food.quantity;
        acc.carbs += food.carbs * food.quantity;
        acc.fat += food.fat * food.quantity;
        return acc;
      },
      { protein: 0, carbs: 0, fat: 0 }
    );

    setProtein(Math.round(totals.protein));
    setCarbs(Math.round(totals.carbs));
    setFat(Math.round(totals.fat));
    setCalories(
      Math.round(totals.protein * 4 + totals.carbs * 4 + totals.fat * 9)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const mealData = {
        name: mealName,
        protein,
        carbs,
        fat,
        calories,
        user_id: user.id,
        created_at: mealDate.toISOString(),
      };

      const foodsToAdd = selectedFoods.map((food) => ({
        food_id: food.isQuickMacro ? null : food.id,
        quantity: food.quantity,
        isQuickMacro: food.isQuickMacro,
        name: food.name,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        serving_size: food.serving_size,
      }));

      if (editingMealId) {
        await updateMeal(editingMealId, {
          ...mealData,
          foods: foodsToAdd,
        });
        showToast("Meal updated successfully!", "success");
      } else {
        await addMeal(mealData, foodsToAdd);
        showToast("Meal added successfully!", "success");
      }

      navigate("/meal-list");
    } catch (error) {
      console.error("Error saving meal:", error);
      showToast(
        `Failed to ${editingMealId ? "update" : "add"} meal. Please try again.`,
        "error"
      );
    }
  };

  const addFoodToMeal = (food: Food) => {
    const existingFood = selectedFoods.find((f) => f.id === food.id);
    if (existingFood) {
      setSelectedFoods(
        selectedFoods.map((f) =>
          f.id === food.id ? { ...f, quantity: f.quantity + 1 } : f
        )
      );
    } else {
      setSelectedFoods([...selectedFoods, { ...food, quantity: 1 }]);
    }
    setShowFoodModal(false);
    setSearchTerm("");
  };

  const removeFoodFromMeal = (foodId: number) => {
    setSelectedFoods(selectedFoods.filter((f) => f.id !== foodId));
  };

  const updateFoodQuantity = (foodId: number, change: number) => {
    setSelectedFoods(
      selectedFoods
        .map((f) => {
          if (f.id === foodId) {
            const newQuantity = Math.max(f.quantity + change, 0);
            return newQuantity === 0 ? null : { ...f, quantity: newQuantity };
          }
          return f;
        })
        .filter((f): f is SelectedFood => f !== null)
    );
  };

  const addQuickMacro = () => {
    const newQuickMacro: SelectedFood = {
      id: Date.now(),
      name: quickMacro.name || "Quick Macro",
      protein: quickMacro.protein || 0,
      carbs: quickMacro.carbs || 0,
      fat: quickMacro.fat || 0,
      quantity: 1,
      serving_size: quickMacro.serving_size,
      isQuickMacro: true,
    };

    setSelectedFoods([...selectedFoods, newQuickMacro]);
    setShowQuickMacroModal(false);
    setQuickMacro({
      name: "",
      protein: undefined,
      carbs: undefined,
      fat: undefined,
      serving_size: undefined,
    });
  };

  const filteredFoods = searchTerm
    ? foods.filter((food) =>
        food.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : foods;

  const datePickerStyles = {
    input: `mt-1 block w-full rounded-md px-4 py-2 ${
      darkMode
        ? "bg-zinc-800 border-zinc-700 text-white"
        : "bg-white border-gray-300"
    } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`,
    popper: "mt-14",
  };

  const quickSelectOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <h2 className="text-2xl font-semibold mb-6">
        {editingMealId ? "Edit Meal" : "Add Meal"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="mealName"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Meal Name
          </label>
          <input
            type="text"
            id="mealName"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            className={`mt-1 block w-full rounded-md px-4 py-2 ${
              darkMode
                ? "bg-zinc-800 border-zinc-700"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
          />
          <div className="mt-4 mb-8 flex space-x-3 w-full justify-center">
            {quickSelectOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMealName(option)}
                className={`py-1 px-4 border border-transparent rounded-full text-sm font-medium text-white ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-500 hover:bg-blue-600"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="mealDate"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Meal Date
          </label>
          <div ref={datePickerRef} className="relative">
            <DatePicker
              selected={mealDate}
              onChange={(date: Date) => setMealDate(date)}
              className={datePickerStyles.input}
              dateFormat="MMMM d, yyyy"
              wrapperClassName="w-full"
              popperClassName={`${darkMode ? "dark-theme" : ""} ${
                datePickerStyles.popper
              }`}
              popperPlacement="bottom-start"
              popperModifiers={[
                {
                  name: "offset",
                  options: {
                    offset: [0, 8],
                  },
                },
                {
                  name: "preventOverflow",
                  options: {
                    rootBoundary: "viewport",
                    tether: false,
                    altAxis: true,
                  },
                },
              ]}
              showPopperArrow={false}
            />
          </div>
        </div>

        <div>
          <label
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Foods
          </label>
          <ul className="mt-1 space-y-2">
            {selectedFoods.map((food) => (
              <li
                key={food.id}
                className={`flex items-center justify-between p-2 rounded ${
                  darkMode ? "bg-zinc-800" : "bg-gray-100"
                }`}
              >
                <div>
                  <span>{food.name}</span>
                  {food.serving_size && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({food.serving_size}g per serving)
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => updateFoodQuantity(food.id, -1)}
                    className={`p-1 rounded-full ${
                      darkMode
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-red-100 hover:bg-red-200"
                    }`}
                  >
                    <Minus
                      className={`h-4 w-4 ${
                        darkMode ? "text-white" : "text-red-600"
                      }`}
                    />
                  </button>
                  <span>{food.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateFoodQuantity(food.id, 1)}
                    className={`p-1 rounded-full ${
                      darkMode
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-green-100 hover:bg-green-200"
                    }`}
                  >
                    <Plus
                      className={`h-4 w-4 ${
                        darkMode ? "text-white" : "text-green-600"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFoodFromMeal(food.id)}
                    className={`p-1 rounded-full ${
                      darkMode
                        ? "bg-zinc-700 hover:bg-zinc-600"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    <X
                      className={`h-4 w-4 ${
                        darkMode ? "text-white" : "text-gray-600"
                      }`}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex space-x-2">
            <button
              type="button"
              onClick={() => setShowFoodModal(true)}
              className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-blue-500 hover:bg-blue-600"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              Add Food
            </button>
            <button
              type="button"
              onClick={() => setShowQuickMacroModal(true)}
              className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                darkMode
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-green-500 hover:bg-green-600"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            >
              Quick Macro
            </button>
          </div>
        </div>

        <div className="flex w-full justify-between pt-4">
          <div>
            <label
              className={`block text-sm font-medium ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Protein
            </label>
            <p
              className={`mt-1 text-lg font-semibold ${
                darkMode ? "text-gray-300" : "text-gray-900"
              }`}
            >
              {protein}g
            </p>
          </div>
          <div>
            <label
              className={`block text-sm font-medium ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Carbs
            </label>
            <p
              className={`mt-1 text-lg font-semibold ${
                darkMode ? "text-gray-300" : "text-gray-900"
              }`}
            >
              {carbs}g
            </p>
          </div>
          <div>
            <label
              className={`block text-sm font-medium ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Fat
            </label>
            <p
              className={`mt-1 text-lg font-semibold ${
                darkMode ? "text-gray-300" : "text-gray-900"
              }`}
            >
              {fat}g
            </p>
          </div>
        </div>
        <div
          className={`w-full text-right border-t border-dashed ${
            darkMode ? "border-zinc-700" : "border-gray-400"
          } pt-4`}
        >
          <label
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Calories
          </label>
          <p
            className={`mt-1 text-lg font-semibold ${
              darkMode ? "text-gray-300" : "text-gray-900"
            }`}
          >
            {calories}
          </p>
        </div>
        <button
          type="submit"
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
            darkMode
              ? "bg-green-600 hover:bg-green-700"
              : "bg-green-500 hover:bg-green-600"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
        >
          {editingMealId ? "Update Meal" : "Add Meal"}
        </button>
      </form>

      {showFoodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div
            className={`${
              darkMode ? "bg-zinc-900" : "bg-white"
            } rounded-lg p-6 w-full max-w-md`}
          >
            <h3 className="text-lg font-medium mb-4">Add Food to Meal</h3>
            <input
              type="text"
              placeholder="Search foods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 mb-4 rounded ${
                darkMode ? "bg-zinc-800 text-white" : "bg-gray-100"
              }`}
            />
            <ul className="max-h-60 overflow-y-auto">
              {filteredFoods.map((food) => (
                <li
                  key={food.id}
                  onClick={() => addFoodToMeal(food)}
                  className={`p-2 cursor-pointer ${
                    darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"
                  }`}
                >
                  {food.name} - P: {food.protein}g, C: {food.carbs}g, F:{" "}
                  {food.fat}g
                  {food.serving_size && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({food.serving_size}g per serving)
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowFoodModal(false)}
              className={`mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                darkMode
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showQuickMacroModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div
            className={`${
              darkMode ? "bg-zinc-900" : "bg-white"
            } rounded-lg p-6 w-full max-w-md`}
          >
            <h3 className="text-lg font-medium mb-4">Add Quick Macro</h3>
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${
                    darkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={quickMacro.name}
                  onChange={(e) =>
                    setQuickMacro({ ...quickMacro, name: e.target.value })
                  }
                  className={`mt-1 py-2 px-4 block w-full rounded-md ${
                    darkMode
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-white border-gray-300"
                  } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    darkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Serving Size (g)
                </label>
                <input
                  type="number"
                  value={quickMacro.serving_size || ""}
                  onChange={(e) =>
                    setQuickMacro({
                      ...quickMacro,
                      serving_size: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className={`mt-1 py-2 px-4 block w-full rounded-md ${
                    darkMode
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-white border-gray-300"
                  } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
                  min="0.1"
                  step="0.1"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    darkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={quickMacro.fat || ""}
                  onChange={(e) =>
                    setQuickMacro({
                      ...quickMacro,
                      fat: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className={`mt-1 py-2 px-4 block w-full rounded-md ${
                    darkMode
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-white border-gray-300"
                  } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
                  step="0.1"
                  min="0"
                  placeholder="Enter fat (g)"
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    darkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={quickMacro.carbs || ""}
                  onChange={(e) =>
                    setQuickMacro({
                      ...quickMacro,
                      carbs: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className={`mt-1 py-2 px-4 block w-full rounded-md ${
                    darkMode
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-white border-gray-300"
                  } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
                  step="0.1"
                  min="0"
                  placeholder="Enter carbs (g)"
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    darkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={quickMacro.protein || ""}
                  onChange={(e) =>
                    setQuickMacro({
                      ...quickMacro,
                      protein: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className={`mt-1 py-2 px-4 block w-full rounded-md ${
                    darkMode
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-white border-gray-300"
                  } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
                  step="0.1"
                  min="0"
                  placeholder="Enter protein (g)"
                />
              </div>
            </div>
            <div className="mt-8 flex space-x-2">
              <button
                onClick={addQuickMacro}
                className={`flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  darkMode
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-500 hover:bg-green-600"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
              >
                Add
              </button>
              <button
                onClick={() => setShowQuickMacroModal(false)}
                className={`flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  darkMode
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-red-500 hover:bg-red-600"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMeal;
