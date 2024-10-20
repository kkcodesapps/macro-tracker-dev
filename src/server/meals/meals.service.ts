import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class MealsService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      'YOUR_SUPABASE_URL',
      'YOUR_SUPABASE_ANON_KEY'
    );
  }

  async create(createMealDto: any) {
    const { data, error } = await this.supabase
      .from('meals')
      .insert(createMealDto);
    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('meals')
      .select('*');
    if (error) throw error;
    return data;
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase
      .from('meals')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async remove(id: number) {
    const { data, error } = await this.supabase
      .from('meals')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { message: 'Meal deleted successfully' };
  }
}