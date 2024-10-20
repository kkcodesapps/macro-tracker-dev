import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { useData } from "../contexts/DataContext";
import { useToast } from "../contexts/ToastContext";

const FoodList = () => {
  const [newFood, setNewFood] = useState({
    name: "",
    protein: "",
    carbs: "",
    fat: "",
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

      const { data, error } = await supabase
        .from("foods")
        .insert([
          {
            name: newFood.name,
            protein: Math.round(parseFloat(newFood.protein)),
            carbs: Math.round(parseFloat(newFood.carbs)),
            fat: Math.round(parseFloat(newFood.fat)),
            user_id: user.id,
          },
        ])
        .select();

      if (error) throw error;
      await fetchFoods();
      setNewFood({ name: "", protein: "", carbs: "", fat: "" });
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
    <div className="max-w-md mx-auto">
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
            className={`flex justify-between items-center p-3 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            <div>
              <h4 className="font-medium">{food.name}</h4>
              <p className="text-sm">
                P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g
              </p>
            </div>
            <button
              onClick={() => openDeleteModal(food.id, food.name)}
              className={`p-1 rounded-full ${
                darkMode
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-100 hover:bg-red-200"
              }`}
              aria-label={`Delete ${food.name}`}
            >
              <Trash2
                className={`h-5 w-5 ${
                  darkMode ? "text-white" : "text-red-600"
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
              darkMode ? "bg-gray-800" : "bg-white"
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
                    ? "bg-gray-600 hover:bg-gray-700"
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
