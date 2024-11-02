import React, { useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { useData } from "../contexts/DataContext";
import { useToast } from "../contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

interface FoodListProps {
  className?: string;
}

const FoodList: React.FC<FoodListProps> = ({ className }) => {
  const [newFood, setNewFood] = useState({
    name: "",
    protein: "",
    carbs: "",
    fat: "",
    quantity: "",
  });
  const [error, setError] = useState<string | null>(null);
  const { darkMode } = useTheme();
  const { foods, fetchFoods } = useData();
  const { showToast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const addFood = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const quantity = parseFloat(newFood.quantity);
      const protein = parseFloat(newFood.protein);
      const carbs = parseFloat(newFood.carbs);
      const fat = parseFloat(newFood.fat);

      const { error } = await supabase
        .from("foods")
        .insert([
          {
            name: newFood.name,
            protein: Math.round(protein * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
            serving_size: quantity || null,
            user_id: user.id,
          },
        ])
        .select();

      if (error) throw error;
      await fetchFoods();
      setNewFood({ name: "", protein: "", carbs: "", fat: "", quantity: "" });
      showToast("Food added successfully!", "success");
    } catch (error) {
      console.error("Error adding food:", error);
      setError("Failed to add food. Please try again.");
      showToast("Failed to add food. Please try again.", "error");
    }
  };

  const openDeleteModal = (id: number, name: string) => {
    setFoodToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setFoodToDelete(null);
  };

  const deleteFood = async () => {
    if (!foodToDelete) return;

    try {
      const { error } = await supabase
        .from("foods")
        .delete()
        .eq("id", foodToDelete.id);

      if (error) throw error;
      await fetchFoods();
      showToast(`${foodToDelete.name} has been removed from your food list.`, "success");
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting food:", error);
      setError("Failed to delete food. Please try again.");
      showToast("Failed to delete food. Please try again.", "error");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setNewFood(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold mb-6"
      >
        Food List
      </motion.h2>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={addFood}
        className={`mb-8 p-6 rounded-2xl backdrop-blur-lg border ${
          darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <label
              htmlFor="name"
              className={`block text-sm font-medium ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Food Name
            </label>
            <input
              type="text"
              id="name"
              value={newFood.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`mt-1 px-4 py-3 block w-full rounded-xl transition-all duration-200 ${
                darkMode
                  ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                  : "bg-gray-50 border-gray-200 focus:bg-white"
              } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label
              htmlFor="quantity"
              className={`block text-sm font-medium ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Serving Size (g)
              <span className="ml-2 text-xs text-gray-500">(Optional)</span>
            </label>
            <input
              type="number"
              id="quantity"
              value={newFood.quantity}
              onChange={(e) => handleInputChange("quantity", e.target.value)}
              step="0.1"
              min="0.1"
              className={`mt-1 px-4 py-3 block w-full rounded-xl transition-all duration-200 ${
                darkMode
                  ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                  : "bg-gray-50 border-gray-200 focus:bg-white"
              } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
            />
          </motion.div>

          {[
            { label: "Fat (g)", id: "fat" },
            { label: "Carbs (g)", id: "carbs" },
            { label: "Protein (g)", id: "protein" },
          ].map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (index + 2) * 0.1 }}
            >
              <label
                htmlFor={field.id}
                className={`block text-sm font-medium ${
                  darkMode ? "text-gray-200" : "text-gray-700"
                }`}
              >
                {field.label}
              </label>
              <input
                type="number"
                id={field.id}
                value={newFood[field.id]}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                step="0.1"
                min="0"
                className={`mt-1 px-4 py-3 block w-full rounded-xl transition-all duration-200 ${
                  darkMode
                    ? "bg-zinc-800 border-zinc-700 focus:bg-zinc-700"
                    : "bg-gray-50 border-gray-200 focus:bg-white"
                } border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                required
              />
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className={`mt-6 w-full flex items-center justify-center py-3 px-4 rounded-xl text-white transition-all duration-200 ${
            darkMode
              ? "bg-blue-600 hover:bg-blue-500"
              : "bg-blue-500 hover:bg-blue-600"
          } shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40`}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Food
        </motion.button>
      </motion.form>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl mb-4 flex items-center ${
            darkMode ? "bg-red-900/50 text-red-200" : "bg-red-100 text-red-800"
          }`}
        >
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </motion.div>
      )}

      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold mb-4"
      >
        Your Foods
      </motion.h3>

      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <AnimatePresence>
          {foods.map((food, index) => (
            <motion.li
              key={food.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border backdrop-blur-lg ${
                darkMode
                  ? "bg-zinc-900/80 border-zinc-800"
                  : "bg-white/80 border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h4 className="font-medium">{food.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                        darkMode
                          ? "bg-red-900/50 text-red-200 border border-red-800"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      P: {food.protein}g
                    </span>
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                        darkMode
                          ? "bg-green-900/50 text-green-200 border border-green-800"
                          : "bg-green-100 text-green-800 border border-green-200"
                      }`}
                    >
                      C: {food.carbs}g
                    </span>
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                        darkMode
                          ? "bg-amber-900/50 text-amber-200 border border-amber-800"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      F: {food.fat}g
                    </span>
                  </div>
                  {food.serving_size && (
                    <div className="text-xs text-gray-500">
                      Serving size: {food.serving_size}g
                    </div>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => openDeleteModal(food.id, food.name)}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    darkMode
                      ? "bg-red-900/50 text-red-200 border border-red-800 hover:bg-red-800"
                      : "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200"
                  }`}
                  aria-label={`Delete ${food.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence>
        {showDeleteModal && (
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
              } p-6 rounded-2xl shadow-xl max-w-sm w-full border ${
                darkMode ? "border-zinc-800" : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-medium mb-4">Confirm Deletion</h3>
              <p className="mb-2">
                Are you sure you want to delete{" "}
                <span className="font-bold">{foodToDelete?.name}</span>?
              </p>
              <p className="mb-6 text-sm text-gray-500">
                This will only remove the food from your list of available foods,
                but will not affect any meals you've already logged with this
                food.
              </p>
              <div className="flex justify-end space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={closeDeleteModal}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                    darkMode
                      ? "bg-zinc-800 hover:bg-zinc-700"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={deleteFood}
                  className={`px-4 py-2 rounded-xl text-white transition-all duration-200 ${
                    darkMode
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FoodList;