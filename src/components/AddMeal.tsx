import React, { useState, useEffect, useRef } from "react";
import { Plus, Minus, X } from "lucide-react";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { useMeals } from "../MealsContext";
import { useData } from "../contexts/DataContext";
import { useToast } from "../contexts/ToastContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Food {
  id: number;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
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
  const [quickMacro, setQuickMacro] = useState<QuickMacro>({
    name: "Quick Macro",
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const { darkMode } = useTheme();
  const { addMeal } = useMeals();
  const { foods, fetchFoods } = useData();
  const { showToast } = useToast();
  const datePickerRef = useRef(null);

  useEffect(() => {
    fetchFoods();
    fetchRecentFoods();
  }, [fetchFoods]);

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

      const newMeal = {
        name: mealName,
        protein,
        carbs,
        fat,
        calories,
        user_id: user.id,
        created_at: mealDate.toISOString(),
      };

      const foodsToAdd = selectedFoods.map((food) => ({
        food_id: food.id,
        quantity: food.quantity,
        isQuickMacro: food.isQuickMacro,
        name: food.name,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      }));

      await addMeal(newMeal, foodsToAdd);

      setMealName("");
      setSelectedFoods([]);
      setProtein(0);
      setCarbs(0);
      setFat(0);
      setCalories(0);
      setMealDate(new Date());

      showToast("Meal added successfully!", "success");
    } catch (error) {
      console.error("Error adding meal:", error);
      showToast("Failed to add meal. Please try again.", "error");
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
      id: Date.now(), // Use timestamp as a temporary ID
      name: quickMacro.name,
      protein: quickMacro.protein,
      carbs: quickMacro.carbs,
      fat: quickMacro.fat,
      quantity: 1,
      isQuickMacro: true,
    };
    setSelectedFoods([...selectedFoods, newQuickMacro]);
    setShowQuickMacroModal(false);
    setQuickMacro({ name: "Quick Macro", protein: 0, carbs: 0, fat: 0 });
  };

  const filteredFoods = searchTerm
    ? foods.filter((food) =>
        food.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : foods;

  const datePickerStyles = {
    input: `mt-1 block w-full rounded-md px-4 py-2 ${
      darkMode
        ? "bg-gray-700 border-gray-600 text-white"
        : "bg-white border-gray-300"
    } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`,
    popper: "mt-14",
  };

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <h2 className="text-2xl font-semibold mb-6">Add Meal</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Meal Name Input */}
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
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
          />
        </div>

        {/* Meal Date Picker */}
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
              showPopperArrow={false} // This line removes the tooltip-esq icon
            />
          </div>
        </div>

        {/* Selected Foods List */}
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
                  darkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <span>{food.name}</span>
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
                        ? "bg-gray-600 hover:bg-gray-500"
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

        {/* Macronutrient Totals */}
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
            darkMode ? "border-gray-500" : "border-gray-400"
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
          Add Meal
        </button>
      </form>

      {/* Food Selection Modal */}
      {showFoodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div
            className={`${
              darkMode ? "bg-gray-800" : "bg-white"
            } rounded-lg p-6 w-full max-w-md`}
          >
            <h3 className="text-lg font-medium mb-4">Add Food to Meal</h3>
            <input
              type="text"
              placeholder="Search foods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 mb-4 rounded ${
                darkMode ? "bg-gray-700 text-white" : "bg-gray-100"
              }`}
            />
            <ul className="max-h-60 overflow-y-auto">
              {filteredFoods.map((food) => (
                <li
                  key={food.id}
                  onClick={() => addFoodToMeal(food)}
                  className={`p-2 cursor-pointer ${
                    darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  }`}
                >
                  {food.name} - P: {food.protein}g, C: {food.carbs}g, F:{" "}
                  {food.fat}g
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

      {/* Quick Macro Modal */}
      {showQuickMacroModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div
            className={`${
              darkMode ? "bg-gray-800" : "bg-white"
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
                      ? "bg-gray-700 border-gray-600"
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
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={quickMacro.protein}
                  onChange={(e) =>
                    setQuickMacro({
                      ...quickMacro,
                      protein: Number(e.target.value),
                    })
                  }
                  className={`mt-1 py-2 px-4 block w-full rounded-md ${
                    darkMode
                      ? "bg-gray-700 border-gray-600"
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
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={quickMacro.carbs}
                  onChange={(e) =>
                    setQuickMacro({
                      ...quickMacro,
                      carbs: Number(e.target.value),
                    })
                  }
                  className={`mt-1 py-2 px-4 block w-full rounded-md ${
                    darkMode
                      ? "bg-gray-700 border-gray-600"
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
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={quickMacro.fat}
                  onChange={(e) =>
                    setQuickMacro({
                      ...quickMacro,
                      fat: Number(e.target.value),
                    })
                  }
                  className={`mt-1 py-2 px-4 block w-full rounded-md ${
                    darkMode
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-300"
                  } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
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
