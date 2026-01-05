import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import teamsReducer from './slices/teamsSlice'
import tasksReducer from './slices/tasksSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    teams: teamsReducer,
    tasks: tasksReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})
