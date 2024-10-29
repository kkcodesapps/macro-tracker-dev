import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "../ThemeContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

interface EditMealModalProps {
  meal: {
    id: number;
    name: string;
    created_at: string;
    foods?: MealFood[];
  };
  onClose: () => void;
  onSave: (mealId: number, updates: { name: string; created_at: string }) => Promise<void>;
}

const EditMealModal: React.FC<EditMealModalProps> = ({ meal, onClose, onSave }) => {
  const [mealName, setMealName] = useState(meal.name);
  const [mealDate, setMealDate] = useState(new Date(meal.created_at));
  const [isSaving, setIsSaving] = useState(false);
  const { darkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(meal.id, {
        name: mealName,
        created_at: mealDate.toISOString(),
      });
      onClose();
    } catch (error) {
      console.error("Error saving meal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const datePickerStyles = {
    input: `mt-1 block w-full rounded-md px-4 py-2 ${
      darkMode
        ? "bg-zinc-800 border-zinc-700 text-white"
        : "bg-white border-gray-300"
    } shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50`,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`${
          darkMode ? "bg-zinc-900" : "bg-white"
        } rounded-lg p-6 w-full max-w-md relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold mb-6">Edit Meal</h2>
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
            <DatePicker
              selected={mealDate}
              onChange={(date: Date) => setMealDate(date)}
              className={datePickerStyles.input}
              dateFormat="MMMM d, yyyy"
              wrapperClassName="w-full"
              popperClassName={`${darkMode ? "dark-theme" : ""}`}
              showPopperArrow={false}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md ${
                darkMode
                  ? "bg-zinc-700 hover:bg-zinc-600"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-2 rounded-md text-white ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-blue-500 hover:bg-blue-600"
              } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMealModal;