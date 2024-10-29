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
  user_id: string;
  foods?: {
    id: number;
    name: string;
    quantity: number;
    protein: number;
    carbs: number;
    fat: number;
    is_quick_macro: boolean;
    serving_size?: number;
  }[];
}

interface MealsContextType {
  meals: Meal[];
  loading: boolean;
  error: string | null;
  fetchMeals: (startDate: string, endDate: string) => Promise<void>;
  addMeal: (meal: Omit<Meal, 'id'>, foods: { 
    food_id: number | null; 
    quantity: number; 
    isQuickMacro?: boolean; 
    name?: string; 
    protein?: number; 
    carbs?: number; 
    fat?: number;
    serving_size?: number;
  }[]) => Promise<void>;
  updateMeal: (id: number, updates: {
    name: string;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    created_at: string;
    foods: {
      food_id: number | null;
      quantity: number;
      isQuickMacro?: boolean;
      name?: string;
      protein?: number;
      carbs?: number;
      fat?: number;
      serving_size?: number;
    }[];
  }) => Promise<void>;
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
    // First fetch the meals
    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: false });

    if (mealsError) throw mealsError;

    // For each meal, fetch its foods
    const mealsWithFoods = await Promise.all(
      mealsData.map(async (meal) => {
        const { data: foodsData, error: foodsError } = await supabase
          .from('meal_foods')
          .select(`
            id,
            quantity,
            food_id,
            food_name,
            food_protein,
            food_carbs,
            food_fat,
            serving_size,
            is_quick_macro
          `)
          .eq('meal_id', meal.id);

        if (foodsError) throw foodsError;

        return {
          ...meal,
          foods: foodsData.map(food => ({
            id: food.id,
            food_id: food.food_id,
            name: food.food_name,
            quantity: food.quantity,
            protein: food.food_protein,
            carbs: food.food_carbs,
            fat: food.food_fat,
            serving_size: food.serving_size,
            is_quick_macro: food.is_quick_macro
          }))
        };
      })
    );

    setMeals(mealsWithFoods);
  } catch (error) {
    console.error('Error fetching meals:', error);
    setError('Failed to fetch meals. Please try again.');
  } finally {
    setLoading(false);
  }
};


  const addMeal = async (meal: Omit<Meal, 'id'>, foods: { 
    food_id: number | null; 
    quantity: number; 
    isQuickMacro?: boolean; 
    name?: string; 
    protein?: number; 
    carbs?: number; 
    fat?: number;
    serving_size?: number;
  }[]) => {
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
              serving_size: food.serving_size,
              is_quick_macro: true
            };
          } else {
            const { data: foodData, error: foodError } = await supabase
              .from('foods')
              .select('name, protein, carbs, fat, serving_size')
              .eq('id', food.food_id)
              .single();

            if (foodError) throw foodError;

            foodDetails = {
              food_id: food.food_id,
              food_name: foodData.name,
              food_protein: foodData.protein,
              food_carbs: foodData.carbs,
              food_fat: foodData.fat,
              serving_size: foodData.serving_size,
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

  const updateMeal = async (id: number, updates: {
    name: string;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    created_at: string;
    foods: {
      food_id: number | null;
      quantity: number;
      isQuickMacro?: boolean;
      name?: string;
      protein?: number;
      carbs?: number;
      fat?: number;
      serving_size?: number;
    }[];
  }) => {
    try {
      const mealToUpdate = meals.find(meal => meal.id === id);
      if (!mealToUpdate) throw new Error('Meal not found');

      const oldDate = new Date(mealToUpdate.created_at);
      const newDate = new Date(updates.created_at);

      // Delete existing meal_foods
      const { error: deleteError } = await supabase
        .from('meal_foods')
        .delete()
        .eq('meal_id', id);

      if (deleteError) throw deleteError;

      // Update meal
      const { error: mealError } = await supabase
        .from('meals')
        .update({
          name: updates.name,
          protein: updates.protein,
          carbs: updates.carbs,
          fat: updates.fat,
          calories: updates.calories,
          created_at: updates.created_at
        })
        .eq('id', id);

      if (mealError) throw mealError;

      // Add new meal_foods
      for (const food of updates.foods) {
        let foodDetails;
        if (food.isQuickMacro) {
          foodDetails = {
            food_id: null,
            food_name: food.name,
            food_protein: food.protein,
            food_carbs: food.carbs,
            food_fat: food.fat,
            serving_size: food.serving_size,
            is_quick_macro: true
          };
        } else {
          const { data: foodData, error: foodError } = await supabase
            .from('foods')
            .select('name, protein, carbs, fat, serving_size')
            .eq('id', food.food_id)
            .single();

          if (foodError) throw foodError;

          foodDetails = {
            food_id: food.food_id,
            food_name: foodData.name,
            food_protein: foodData.protein,
            food_carbs: foodData.carbs,
            food_fat: foodData.fat,
            serving_size: foodData.serving_size,
            is_quick_macro: false
          };
        }

        const { error: mealFoodsError } = await supabase
          .from('meal_foods')
          .insert({
            meal_id: id,
            quantity: food.quantity,
            ...foodDetails
          });

        if (mealFoodsError) throw mealFoodsError;
      }

      // Update daily totals if date changed
      if (oldDate.toISOString().split('T')[0] !== newDate.toISOString().split('T')[0]) {
        // Remove from old date
        updateDailyTotals(oldDate, {
          calories: -mealToUpdate.calories,
          protein: -mealToUpdate.protein,
          carbs: -mealToUpdate.carbs,
          fat: -mealToUpdate.fat,
        });

        // Add to new date
        updateDailyTotals(newDate, {
          calories: updates.calories,
          protein: updates.protein,
          carbs: updates.carbs,
          fat: updates.fat,
        });
      }

      // Update local state
      setMeals(meals.map(meal => 
        meal.id === id 
          ? { ...meal, ...updates }
          : meal
      ));
    } catch (error) {
      console.error('Error updating meal:', error);
      throw error;
    }
  };

  const deleteMeal = async (id: number) => {
    try {
      const mealToDelete = meals.find(meal => meal.id === id);
      if (!mealToDelete) throw new Error('Meal not found');

      const { error: mealFoodsError } = await supabase
        .from('meal_foods')
        .delete()
        .eq('meal_id', id);

      if (mealFoodsError) throw mealFoodsError;

      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMeals(meals.filter(meal => meal.id !== id));

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
    <MealsContext.Provider value={{ 
      meals, 
      loading, 
      error, 
      fetchMeals, 
      addMeal, 
      deleteMeal,
      updateMeal
    }}>
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