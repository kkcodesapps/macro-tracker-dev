import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { useData } from "../contexts/DataContext";
import { useToast } from "../contexts/ToastContext";

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const quantity = parseFloat(newFood.quantity);
      const protein = parseFloat(newFood.protein);
      const carbs = parseFloat(newFood.carbs);
      const fat = parseFloat(newFood.fat);

      const { data, error } = await supabase
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
      showToast(
        `${foodToDelete.name} has been removed from your food list.`,
        "success"
      );
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting food:", error);
      setError("Failed to delete food. Please try again.");
      showToast("Failed to delete food. Please try again.", "error");
    }
  };

  const inputLayoutClasses = "py-2 px-4";

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <h2 className="text-2xl font-semibold mb-6">Food List</h2>
      <form onSubmit={addFood} className="mb-8 space-y-4">
        <div>
          <label
            htmlFor="foodName"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Food Name
          </label>
          <input
            type="text"
            id="foodName"
            value={newFood.name}
            onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
          />
        </div>
        <div>
          <label
            htmlFor="quantity"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Serving Size (g)
          </label>
          <input
            type="number"
            id="quantity"
            value={newFood.quantity}
            onChange={(e) =>
              setNewFood({ ...newFood, quantity: e.target.value })
            }
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            min="0.1"
            step="0.1"
            placeholder="Optional"
          />
        </div>
        <div>
          <label
            htmlFor="fat"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Fat (g)
          </label>
          <input
            type="number"
            id="fat"
            value={newFood.fat}
            onChange={(e) => setNewFood({ ...newFood, fat: e.target.value })}
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
            min="0"
            step="0.1"
          />
        </div>
        <div>
          <label
            htmlFor="carbs"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Carbs (g)
          </label>
          <input
            type="number"
            id="carbs"
            value={newFood.carbs}
            onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
            min="0"
            step="0.1"
          />
        </div>
        <div>
          <label
            htmlFor="protein"
            className={`block text-sm font-medium ${
              darkMode ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Protein (g)
          </label>
          <input
            type="number"
            id="protein"
            value={newFood.protein}
            onChange={(e) =>
              setNewFood({ ...newFood, protein: e.target.value })
            }
            className={`mt-1 block w-full rounded-md ${inputLayoutClasses} ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            required
            min="0"
            step="0.1"
          />
        </div>

        <button
          type="submit"
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            darkMode
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-500 hover:bg-blue-600"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          <Plus className="h-5 w-5 mr-2" /> Add Food
        </button>
      </form>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <h3 className="text-xl font-semibold mb-4">Your Foods</h3>
      <ul className="space-y-2">
        {foods.map((food) => (
          <li
            key={food.id}
            className={`flex justify-between items-center p-3 rounded-lg border ${
              darkMode
                ? "bg-zinc-900 border-zinc-900"
                : "bg-gray-100  border-gray-200"
            }`}
          >
            <div>
              <h4 className="font-medium">{food.name}</h4>
              <div className="flex space-x-2 mt-1">
                <span
                  className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    darkMode
                      ? "bg-red-900 text-red-200"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  P: {food.protein}g
                </span>
                <span
                  className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    darkMode
                      ? "bg-green-900 text-green-200"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  C: {food.carbs}g
                </span>
                <span
                  className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    darkMode
                      ? "bg-amber-900 text-amber-200"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  F: {food.fat}g
                </span>
              </div>
              {food.serving_size && (
                <div className="text-xs text-gray-500 mt-1">
                  Serving size: {food.serving_size}g
                </div>
              )}
            </div>
            <button
              onClick={() => openDeleteModal(food.id, food.name)}
              className={`p-1 rounded-full ${
                darkMode
                  ? "bg-red-900 hover:bg-red-700"
                  : "bg-red-100 hover:bg-red-200"
              }`}
              aria-label={`Delete ${food.name}`}
            >
              <Trash2
                className={`h-5 w-5 ${
                  darkMode ? "text-red-400" : "text-red-600"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`${
              darkMode ? "bg-zinc-800" : "bg-white"
            } p-6 rounded-lg shadow-xl max-w-sm w-full mx-4`}
          >
            <h3 className="text-lg font-medium mb-4">Confirm Deletion</h3>
            <p className="mb-4">
              Are you sure you want to delete{" "}
              <span className={"font-bold"}>{foodToDelete?.name}</span>?
            </p>
            <p className="mb-4">
              This will only remove the food from your list of available foods,
              but will not affect any meals you've already logged with this
              food.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={closeDeleteModal}
                className={`px-4 py-2 rounded ${
                  darkMode
                    ? "bg-zinc-600 hover:bg-zinc-700"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={deleteFood}
                className={`px-4 py-2 rounded text-white ${
                  darkMode
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodList;
