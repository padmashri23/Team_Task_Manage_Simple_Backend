import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../lib/supabase'

// Fetch tasks for a team
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async ({ teamId }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { teamId, tasks: data }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Create a new task
export const createTask = createAsyncThunk(
  'tasks/createTask',
  async ({ teamId, title, description }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState()
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          team_id: teamId,
          title,
          description,
          status: 'pending',
          created_by: auth.user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Update task status
export const updateTaskStatus = createAsyncThunk(
  'tasks/updateTaskStatus',
  async ({ taskId, status }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Delete task
export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async ({ taskId }, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      return taskId
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  tasks: {},
  loading: false,
  error: null,
  statusFilter: 'all',
}

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload
    },
    clearTasksError: (state) => {
      state.error = null
    },
    clearTasks: (state) => {
      state.tasks = {}
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false
        state.tasks[action.payload.teamId] = action.payload.tasks
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create Task
      .addCase(createTask.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false
        const teamId = action.payload.team_id
        if (!state.tasks[teamId]) {
          state.tasks[teamId] = []
        }
        state.tasks[teamId].unshift(action.payload)
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Update Task Status
      .addCase(updateTaskStatus.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.loading = false
        const teamId = action.payload.team_id
        const taskIndex = state.tasks[teamId]?.findIndex(
          (t) => t.id === action.payload.id
        )
        if (taskIndex !== -1) {
          state.tasks[teamId][taskIndex] = action.payload
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Delete Task
      .addCase(deleteTask.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading = false
        Object.keys(state.tasks).forEach((teamId) => {
          state.tasks[teamId] = state.tasks[teamId].filter(
            (t) => t.id !== action.payload
          )
        })
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { setStatusFilter, clearTasksError, clearTasks } = tasksSlice.actions
export default tasksSlice.reducer
