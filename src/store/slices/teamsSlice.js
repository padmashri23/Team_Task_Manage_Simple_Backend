import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '../../lib/supabase'

// Fetch user's teams using RPC function
export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (_, { rejectWithValue }) => {
    try {
      // Get teams user is member of
      const { data: teams, error } = await supabase.rpc('get_my_teams')
      if (error) throw error

      // For each team, get members
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          const { data: members, error: membersError } = await supabase.rpc(
            'get_team_members',
            { p_team_id: team.id }
          )
          if (membersError) {
            console.error('Error fetching members:', membersError)
            return { ...team, team_members: [] }
          }
          // Transform to match expected structure (new schema uses different field names)
          const teamMembers = members.map((m) => ({
            id: m.membership_id,  // Changed from m.id
            role: m.role,
            user_id: m.user_id,
            profiles: {
              id: m.user_id,
              name: m.user_name,
              email: m.user_email,
            },
          }))
          return { ...team, team_members: teamMembers }
        })
      )

      return teamsWithMembers
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Create a new team
export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async ({ name }, { rejectWithValue }) => {
    try {
      // Using the new INVOKER-only function
      const { data: teamId, error } = await supabase.rpc('create_team_and_join', {
        p_team_name: name,
      })

      if (error) throw error

      // Fetch the created team with members using RPC
      const { data: members, error: membersError } = await supabase.rpc(
        'get_team_members',
        { p_team_id: teamId }
      )

      if (membersError) throw membersError

      // Get team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (teamError) throw teamError

      const teamMembers = members.map((m) => ({
        id: m.membership_id,  // New schema uses membership_id
        role: m.role,
        user_id: m.user_id,
        profiles: {
          id: m.user_id,
          name: m.user_name,
          email: m.user_email,
        },
      }))

      return { ...teamData, team_members: teamMembers }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Join a team by ID
export const joinTeam = createAsyncThunk(
  'teams/joinTeam',
  async ({ teamId }, { rejectWithValue }) => {
    try {
      // Using the new INVOKER-only function
      const { error } = await supabase.rpc('join_existing_team', {
        p_team_id: teamId,
      })

      if (error) throw error

      // Fetch the joined team with members using RPC
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (teamError) throw teamError

      const { data: members, error: membersError } = await supabase.rpc(
        'get_team_members',
        { p_team_id: teamId }
      )

      if (membersError) throw membersError

      const teamMembers = members.map((m) => ({
        id: m.membership_id,  // New schema uses membership_id
        role: m.role,
        user_id: m.user_id,
        profiles: {
          id: m.user_id,
          name: m.user_name,
          email: m.user_email,
        },
      }))

      return { ...teamData, team_members: teamMembers }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Add member to team
export const addTeamMember = createAsyncThunk(
  'teams/addTeamMember',
  async ({ teamId, userId }, { rejectWithValue }) => {
    try {
      // Using the new INVOKER-only function
      const { error } = await supabase.rpc('add_member_to_team', {
        p_team_id: teamId,
        p_user_id: userId,
      })

      if (error) throw error

      // Fetch updated team members using RPC
      const { data: members, error: fetchError } = await supabase.rpc(
        'get_team_members',
        { p_team_id: teamId }
      )

      if (fetchError) throw fetchError

      const teamMembers = members.map((m) => ({
        id: m.membership_id,  // New schema uses membership_id
        role: m.role,
        user_id: m.user_id,
        profiles: {
          id: m.user_id,
          name: m.user_name,
          email: m.user_email,
        },
      }))

      return { teamId, members: teamMembers }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Remove member from team
export const removeTeamMember = createAsyncThunk(
  'teams/removeTeamMember',
  async ({ teamId, userId }, { rejectWithValue }) => {
    try {
      // Using the new INVOKER-only function
      const { error } = await supabase.rpc('remove_member_from_team', {
        p_team_id: teamId,
        p_user_id: userId,
      })

      if (error) throw error

      return { teamId, userId }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Fetch users not in team
export const fetchUsersNotInTeam = createAsyncThunk(
  'teams/fetchUsersNotInTeam',
  async ({ teamId }, { rejectWithValue }) => {
    try {
      // Using the new INVOKER-only function
      const { data, error } = await supabase.rpc('get_available_users', {
        p_team_id: teamId,
      })

      if (error) throw error
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  teams: [],
  selectedTeam: null,
  availableUsers: [],
  loading: false,
  error: null,
}

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    setSelectedTeam: (state, action) => {
      state.selectedTeam = action.payload
    },
    clearTeamsError: (state) => {
      state.error = null
    },
    clearTeams: (state) => {
      state.teams = []
      state.selectedTeam = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Teams
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false
        state.teams = action.payload
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create Team
      .addCase(createTeam.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false
        state.teams.unshift(action.payload)
        state.selectedTeam = action.payload
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Join Team
      .addCase(joinTeam.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(joinTeam.fulfilled, (state, action) => {
        state.loading = false
        state.teams.unshift(action.payload)
        state.selectedTeam = action.payload
      })
      .addCase(joinTeam.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Add Team Member
      .addCase(addTeamMember.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(addTeamMember.fulfilled, (state, action) => {
        state.loading = false
        const { teamId, members } = action.payload
        const teamIndex = state.teams.findIndex((t) => t.id === teamId)
        if (teamIndex !== -1) {
          state.teams[teamIndex].team_members = members
          if (state.selectedTeam?.id === teamId) {
            state.selectedTeam.team_members = members
          }
        }
      })
      .addCase(addTeamMember.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Remove Team Member
      .addCase(removeTeamMember.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(removeTeamMember.fulfilled, (state, action) => {
        state.loading = false
        const { teamId, userId } = action.payload
        const teamIndex = state.teams.findIndex((t) => t.id === teamId)
        if (teamIndex !== -1) {
          state.teams[teamIndex].team_members = state.teams[
            teamIndex
          ].team_members.filter((m) => m.user_id !== userId)
          if (state.selectedTeam?.id === teamId) {
            state.selectedTeam.team_members =
              state.selectedTeam.team_members.filter((m) => m.user_id !== userId)
          }
        }
      })
      .addCase(removeTeamMember.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch Users Not In Team
      .addCase(fetchUsersNotInTeam.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchUsersNotInTeam.fulfilled, (state, action) => {
        state.loading = false
        state.availableUsers = action.payload
      })
      .addCase(fetchUsersNotInTeam.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { setSelectedTeam, clearTeamsError, clearTeams } = teamsSlice.actions
export default teamsSlice.reducer
