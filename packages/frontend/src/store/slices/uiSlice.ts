import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  darkMode: boolean;
  currentPage: string;
}

const initialState: UiState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  darkMode: localStorage.getItem('darkMode') === 'true',
  currentPage: 'dashboard',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; },
    toggleSidebarCollapse(state) { state.sidebarCollapsed = !state.sidebarCollapsed; },
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', String(state.darkMode));
      document.documentElement.classList.toggle('dark', state.darkMode);
    },
    setCurrentPage(state, action: PayloadAction<string>) { state.currentPage = action.payload; },
  },
});

export const { toggleSidebar, toggleSidebarCollapse, toggleDarkMode, setCurrentPage } = uiSlice.actions;
export default uiSlice.reducer;
