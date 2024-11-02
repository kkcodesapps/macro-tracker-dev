import React, { useState, useEffect, useRef } from "react";
import { Plus, Minus, X, Search, AlertCircle } from "lucide-react";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { useMeals } from "../MealsContext";
import { useData } from "../contexts/DataContext";
import { useToast } from "../contexts/ToastContext";
import { useLocation, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion, AnimatePresence } from "framer-motion";

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
    if (location.state?.meal) {
      const meal = location.state.meal;
      setEditingMealId(meal.id);
      setMealName(meal.name);
      setMealDate(new Date(meal.created_at));
      setProtein(meal.protein);
      setCarbs(meal.carbs);
      setFat(meal.fat);
      setCalories(meal.calories);

      if (meal.foods) {
        const transformedFoods = meal.foods.map((food) => ({
          id: food.food_id || food.id,
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
    input: `mt-1 block w-full rounded-xl px-4 py-3 z-50 ${
      darkMode
        ? "bg-zinc-800 border-zinc-700 text-white"
        : "bg-gray-50 border-gray-200"
    } shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`,
    popper: "mt-14 !z-[999]", // Added z-50 to bring the date picker to the front
  };

  const quickSelectOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold mb-6"
      >
        {editingMealId ? "Edit Meal" : "Add Meal"}
      </motion.h2>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <motion.div
          className={`p-6 rounded-2xl backdrop-blur-lg border relative z-10 ${
            darkMode
              ? "bg-zinc-900/80 border-zinc-800"
              : "bg-white/80 border-gray-200"
          }`}
        >
          <div className="space-y-4">
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
                className={`mt-1 px-4 py-3 block w-full rounded-xl transition-all duration-200 ${
                  darkMode
                    ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                    : "bg-gray-50 border-gray-200 focus:bg-white"
                } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                required
              />
              <div className="mt-4 mb-8 flex flex-wrap gap-2 justify-center">
                {quickSelectOptions.map((option) => (
                  <motion.button
                    key={option}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setMealName(option)}
                    className={`py-1.5 px-4 border border-transparent rounded-full text-sm font-medium transition-all duration-200 ${
                      darkMode
                        ? "bg-blue-900/50 text-blue-200 border border-blue-700 hover:bg-blue-800"
                        : "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
                    }`}
                  >
                    {option}
                  </motion.button>
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
              <div ref={datePickerRef} className="relative z-50">
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
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-2xl backdrop-blur-lg border ${
            darkMode
              ? "bg-zinc-900/80 border-zinc-800"
              : "bg-white/80 border-gray-200"
          }`}
        >
          <div>
            <label
              className={`block text-sm font-medium ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Foods
            </label>
            <AnimatePresence>
              {selectedFoods.map((food) => (
                <motion.div
                  key={food.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`mt-2 p-4 rounded-xl border ${
                    darkMode
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{food.name}</span>
                      {food.serving_size && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({food.serving_size}g per serving)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => updateFoodQuantity(food.id, -1)}
                        className={`p-1.5 rounded-full transition-all duration-200 ${
                          darkMode
                            ? "bg-red-900/50 text-red-200 border border-red-800 hover:bg-red-800"
                            : "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200"
                        }`}
                      >
                        <Minus className="h-4 w-4" />
                      </motion.button>
                      <span className="w-8 text-center font-medium">
                        {food.quantity}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => updateFoodQuantity(food.id, 1)}
                        className={`p-1.5 rounded-full transition-all duration-200 ${
                          darkMode
                            ? "bg-green-900/50 text-green-200 border border-green-800 hover:bg-green-800"
                            : "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200"
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => removeFoodFromMeal(food.id)}
                        className={`p-1.5 rounded-full transition-all duration-200 ${
                          darkMode
                            ? "bg-zinc-700 hover:bg-zinc-600"
                            : "bg-gray-200 hover:bg-gray-300"
                        }`}
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="mt-4 flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowFoodModal(true)}
                className={`flex-1 py-3 px-4 rounded-xl text-white transition-all duration-200 ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "bg-blue-500 hover:bg-blue-600"
                } shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40`}
              >
                Add Food
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowQuickMacroModal(true)}
                className={`flex-1 py-3 px-4 rounded-xl text-white transition-all duration-200 ${
                  darkMode
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-green-500 hover:bg-green-600"
                } shadow-lg shadow-green-500/20 hover:shadow-green-500/40`}
              >
                Quick Macro
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-2xl backdrop-blur-lg border ${
            darkMode
              ? "bg-zinc-900/80 border-zinc-800"
              : "bg-white/80 border-gray-200"
          }`}
        >
          <div className="grid grid-cols-3 gap-4 mb-6">
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
              className={`mt-1 text-2xl font-bold ${
                darkMode ? "text-gray-300" : "text-gray-900"
              }`}
            >
              {calories}
            </p>
          </div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className={`w-full flex justify-center py-4 px-4 rounded-xl text-white transition-all duration-200 ${
            darkMode
              ? "bg-green-600 hover:bg-green-500"
              : "bg-green-500 hover:bg-green-600"
          } shadow-lg shadow-green-500/20 hover:shadow-green-500/40`}
        >
          {editingMealId ? "Update Meal" : "Add Meal"}
        </motion.button>
      </motion.form>

      <AnimatePresence>
        {showFoodModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${
                darkMode ? "bg-zinc-900" : "bg-white"
              } rounded-2xl p-6 w-full max-w-md border ${
                darkMode ? "border-zinc-800" : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-medium mb-4">Add Food to Meal</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search foods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all duration-200 ${
                    darkMode
                      ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                      : "bg-gray-50 border-gray-200 focus:bg-white"
                  } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                <AnimatePresence>
                  {filteredFoods.map((food, index) => (
                    <motion.div
                      key={food.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => addFoodToMeal(food)}
                      className={`p-3 cursor-pointer rounded-xl transition-all duration-200 ${
                        darkMode
                          ? "hover:bg-zinc-800 border border-zinc-800"
                          : "hover:bg-gray-100 border border-gray-200"
                      } mb-2`}
                    >
                      <div className="font-medium">{food.name}</div>
                      <div className="flex space-x-4 mt-1 text-sm text-gray-500">
                        <span>P: {food.protein}g</span>
                        <span>C: {food.carbs}g</span>
                        <span>F: {food.fat}g</span>
                        {food.serving_size && (
                          <span>({food.serving_size}g per serving)</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFoodModal(false)}
                className={`mt-4 w-full py-3 px-4 rounded-xl text-white transition-all duration-200 ${
                  darkMode
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-red-500 hover:bg-red-600"
                } shadow-lg shadow-red-500/20 hover:shadow-red-500/40`}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {showQuickMacroModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${
                darkMode ? "bg-zinc-900" : "bg-white"
              } rounded-2xl p-6 w-full max-w-md border ${
                darkMode ? "border-zinc-800" : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-medium mb-4">Add Quick Macro</h3>
              <div className="space-y-4">
                {[
                  { label: "Name", id: "name", type: "text" },
                  {
                    label: "Serving Size (g)",
                    id: "serving_size",
                    type: "number",
                    optional: true,
                  },
                  { label: "Fat (g)", id: "fat", type: "number" },
                  { label: "Carbs (g)", id: "carbs", type: "number" },
                  { label: "Protein (g)", id: "protein", type: "number" },
                ].map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <label
                      className={`block text-sm font-medium ${
                        darkMode ? "text-gray-200" : "text-gray-700"
                      }`}
                    >
                      {field.label}
                      {field.optional && (
                        <span className="ml-2 text-xs text-gray-500">
                          (Optional)
                        </span>
                      )}
                    </label>
                    <input
                      type={field.type}
                      value={quickMacro[field.id] || ""}
                      onChange={(e) =>
                        setQuickMacro({
                          ...quickMacro,
                          [field.id]:
                            field.type === "number"
                              ? e.target.value
                                ? Number(e.target.value)
                                : undefined
                              : e.target.value,
                        })
                      }
                      className={`mt-1 px-4 py-3 block w-full rounded-xl transition-all duration-200 ${
                        darkMode
                          ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                          : "bg-gray-50 border-gray-200 focus:bg-white"
                      } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                      required={!field.optional}
                      min={field.type === "number" ? "0" : undefined}
                      step={field.type === "number" ? "0.1" : undefined}
                    />
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addQuickMacro}
                  className={`flex-1 py-3 px-4 rounded-xl text-white transition-all duration-200 ${
                    darkMode
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-green-500 hover:bg-green-600"
                  } shadow-lg shadow-green-500/20 hover:shadow-green-500/40`}
                >
                  Add
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowQuickMacroModal(false)}
                  className={`flex-1 py-3 px-4 rounded-xl text-white transition-all duration-200 ${
                    darkMode
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-red-500 hover:bg-red-600"
                  } shadow-lg shadow-red-500/20 hover:shadow-red-500/40`}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddMeal;
