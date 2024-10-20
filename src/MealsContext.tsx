import React, { createContext, useState, useContext } from 'react';
import { supabase } from './supabase';
import { useData } from './contexts/DataContext';

interface Food {
  id: number;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  user_id: string;
}

interface Meal {
  id: number;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  created_at: string;
  user_id: string;
}

interface MealsContextType {
  meals: Meal[];
  loading: boolean;
  error: string | null;
  fetchMeals: (startDate: string, endDate: string) => Promise<void>;
  addMeal: (meal: Omit<Meal, 'id'>, foods: { food_id: number; quantity: number; isQuickMacro?: boolean; name?: string; protein?: number; carbs?: number; fat?: number }[]) => Promise<void>;
  deleteMeal: (id: number) => Promise<void>;
}

const MealsContext = createContext<MealsContextType | undefined>(undefined);

export const MealsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateDailyTotals } = useData();

  const fetchMeals = async (startDate: string, endDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setError('Failed to fetch meals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addMeal = async (meal: Omit<Meal, 'id'>, foods: { food_id: number; quantity: number; isQuickMacro?: boolean; name?: string; protein?: number; carbs?: number; fat?: number }[]) => {
    try {
      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .insert([meal])
        .select();

      if (mealError) throw mealError;

      if (mealData && mealData.length > 0) {
        const newMeal = mealData[0];
        setMeals([newMeal, ...meals]);

        for (const food of foods) {
          let foodDetails;
          if (food.isQuickMacro) {
            foodDetails = {
              food_id: null,
              food_name: food.name,
              food_protein: food.protein,
              food_carbs: food.carbs,
              food_fat: food.fat,
              is_quick_macro: true
            };
          } else {
            const { data: foodData, error: foodError } = await supabase
              .from('foods')
              .select('name, protein, carbs, fat')
              .eq('id', food.food_id)
              .single();

            if (foodError) throw foodError;

            foodDetails = {
              food_id: food.food_id,
              food_name: foodData.name,
              food_protein: foodData.protein,
              food_carbs: foodData.carbs,
              food_fat: foodData.fat,
              is_quick_macro: false
            };
          }

          const { error: mealFoodsError } = await supabase
            .from('meal_foods')
            .insert({
              meal_id: newMeal.id,
              quantity: food.quantity,
              ...foodDetails
            });

          if (mealFoodsError) throw mealFoodsError;
        }

        // Update daily totals
        updateDailyTotals(new Date(newMeal.created_at), {
          calories: newMeal.calories,
          protein: newMeal.protein,
          carbs: newMeal.carbs,
          fat: newMeal.fat,
        });
      }
    } catch (error) {
      console.error('Error adding meal:', error);
      throw error;
    }
  };

  const deleteMeal = async (id: number) => {
    try {
      const mealToDelete = meals.find(meal => meal.id === id);
      if (!mealToDelete) throw new Error('Meal not found');

      // Delete related meal_foods entries
      const { error: mealFoodsError } = await supabase
        .from('meal_foods')
        .delete()
        .eq('meal_id', id);

      if (mealFoodsError) throw mealFoodsError;

      // Delete the meal
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMeals(meals.filter(meal => meal.id !== id));

      // Update daily totals
      updateDailyTotals(new Date(mealToDelete.created_at), {
        calories: -mealToDelete.calories,
        protein: -mealToDelete.protein,
        carbs: -mealToDelete.carbs,
        fat: -mealToDelete.fat,
      });
    } catch (error) {
      console.error('Error deleting meal:', error);
      throw error;
    }
  };

  return (
    <MealsContext.Provider value={{ meals, loading, error, fetchMeals, addMeal, deleteMeal }}>
      {children}
    </MealsContext.Provider>
  );
};

export const useMeals = () => {
  const context = useContext(MealsContext);
  if (context === undefined) {
    throw new Error('useMeals must be used within a MealsProvider');
  }
  return context;
};