import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import _ from 'lodash';

interface UserSettings {
  id: number;
  user_id: string;
  calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
  bulk_cut_start_date: string | null;
}

interface Food {
  id: number;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  user_id: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DataContextType {
  userSettings: UserSettings | null;
  foods: Food[];
  dailyTotals: Record<string, DailyTotals>;
  fetchUserSettings: () => Promise<void>;
  fetchFoods: () => Promise<void>;
  getDailyTotals: (date: Date, forceRefresh?: boolean) => Promise<DailyTotals>;
  prefetchDailyTotals: (date: Date) => void;
  updateDailyTotalsOptimistically: (date: Date, newMeal: Partial<DailyTotals>) => void;
  updateDailyTotals: (date: Date, mealDiff: Partial<DailyTotals>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [dailyTotals, setDailyTotals] = useState<Record<string, DailyTotals>>({});

  const fetchUserSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserSettings(data);
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  }, []);

  const fetchFoods = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setFoods(data);
    } catch (error) {
      console.error('Error fetching foods:', error);
    }
  }, []);

  const getDailyTotals = useCallback(async (date: Date, forceRefresh: boolean = false): Promise<DailyTotals> => {
    const dateKey = date.toISOString().split('T')[0];
    if (!forceRefresh && dailyTotals[dateKey]) {
      return dailyTotals[dateKey];
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const startDate = startOfDay(date).toISOString();
      const endDate = endOfDay(date).toISOString();

      const { data, error } = await supabase
        .from('meals')
        .select('protein, carbs, fat, calories')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      if (error) throw error;

      const totals = data.reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setDailyTotals(prev => ({ ...prev, [dateKey]: totals }));
      return totals;
    } catch (error) {
      console.error('Error fetching daily totals:', error);
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
  }, [dailyTotals]);

  const prefetchDailyTotals = useCallback((date: Date) => {
    const yesterday = subDays(date, 1);
    const tomorrow = addDays(date, 1);
    getDailyTotals(yesterday);
    getDailyTotals(tomorrow);
  }, [getDailyTotals]);

  const updateDailyTotalsOptimistically = useCallback((date: Date, newMeal: Partial<DailyTotals>) => {
    const dateKey = date.toISOString().split('T')[0];
    setDailyTotals(prev => ({
      ...prev,
      [dateKey]: {
        calories: (prev[dateKey]?.calories || 0) + (newMeal.calories || 0),
        protein: (prev[dateKey]?.protein || 0) + (newMeal.protein || 0),
        carbs: (prev[dateKey]?.carbs || 0) + (newMeal.carbs || 0),
        fat: (prev[dateKey]?.fat || 0) + (newMeal.fat || 0),
      },
    }));
  }, []);

  const updateDailyTotals = useCallback((date: Date, mealDiff: Partial<DailyTotals>) => {
    const dateKey = date.toISOString().split('T')[0];
    setDailyTotals(prev => ({
      ...prev,
      [dateKey]: {
        calories: (prev[dateKey]?.calories || 0) + (mealDiff.calories || 0),
        protein: (prev[dateKey]?.protein || 0) + (mealDiff.protein || 0),
        carbs: (prev[dateKey]?.carbs || 0) + (mealDiff.carbs || 0),
        fat: (prev[dateKey]?.fat || 0) + (mealDiff.fat || 0),
      },
    }));
  }, []);

  useEffect(() => {
    fetchUserSettings();
    fetchFoods();
  }, [fetchUserSettings, fetchFoods]);

  const memoizedValue = useMemo(() => ({
    userSettings,
    foods,
    dailyTotals,
    fetchUserSettings,
    fetchFoods,
    getDailyTotals,
    prefetchDailyTotals,
    updateDailyTotalsOptimistically,
    updateDailyTotals,
  }), [userSettings, foods, dailyTotals, fetchUserSettings, fetchFoods, getDailyTotals, prefetchDailyTotals, updateDailyTotalsOptimistically, updateDailyTotals]);

  return (
    <DataContext.Provider value={memoizedValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};