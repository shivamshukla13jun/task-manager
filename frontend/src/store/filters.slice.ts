import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TaskPriority, TaskStatus } from '../types';

export interface FiltersState {
  status: '' | TaskStatus;
  priority: '' | TaskPriority;
  page: number;
}

const initialState: FiltersState = { status: '', priority: '', page: 1 };

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<FiltersState['status']>) {
      state.status = action.payload;
      state.page = 1;
    },
    setPriority(state, action: PayloadAction<FiltersState['priority']>) {
      state.priority = action.payload;
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const { setStatus, setPriority, setPage, resetFilters } = filtersSlice.actions;
export default filtersSlice.reducer;
