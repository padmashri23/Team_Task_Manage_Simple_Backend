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
  async ({ name, subscriptionType = 'free', subscriptionTier = 'free', subscriptionPrice = 0, joiningFee = 0 }, { rejectWithValue }) => {
    try {
      // Using the new INVOKER-only function
      const { data: teamId, error } = await supabase.rpc('create_team_and_join', {
        p_team_name: name,
      })

      if (error) throw error

      // Update team with subscription info if it's a paid team
      if (subscriptionType === 'paid' && subscriptionPrice > 0) {
        const { error: updateError } = await supabase
          .from('teams')
          .update({
            subscription_type: subscriptionType,
            subscription_tier: subscriptionTier,
            subscription_price: subscriptionPrice,
            joining_fee: joiningFee,
          })
          .eq('id', teamId)

        if (updateError) throw updateError
      }

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

// Get team info for joining (includes subscription details)
export const getTeamInfo = createAsyncThunk(
  'teams/getTeamInfo',
  async ({ teamId }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.rpc('get_team_info', {
        p_team_id: teamId,
      })

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Team not found')
      }
      return data[0]
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Create Stripe checkout session for paid team (Member pays joining fee)
export const createCheckoutSession = createAsyncThunk(
  'teams/createCheckoutSession',
  async ({ teamId, teamName, joiningFee, userEmail }, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Store pending join info in localStorage for PaymentSuccess page
      localStorage.setItem('pendingTeamJoin', JSON.stringify({
        teamId,
        teamName,
        joiningFee,
        userId: user.id,
        userEmail: userEmail || user.email,
        timestamp: Date.now(),
      }))

      // Call Supabase Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          teamId,
          teamName,
          joiningFee,  // Pass the custom joining fee
          userId: user.id,
          userEmail: userEmail || user.email,
        },
      })

      if (error) throw error
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Create Stripe checkout session for team OWNER (pays for tier before team creation)
export const createOwnerCheckoutSession = createAsyncThunk(
  'teams/createOwnerCheckoutSession',
  async ({ teamName, tier, tierPrice, joiningFee }, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Store pending team creation info in localStorage for after payment
      localStorage.setItem('pendingTeamCreation', JSON.stringify({
        teamName,
        tier,
        tierPrice,
        joiningFee,
        userId: user.id,
        userEmail: user.email,
        timestamp: Date.now(),
      }))

      // Call Supabase Edge Function to create owner checkout session
      const { data, error } = await supabase.functions.invoke('create-owner-checkout', {
        body: {
          teamName,
          tier,
          tierPrice,
          joiningFee,
          userId: user.id,
          userEmail: user.email,
        },
      })

      if (error) throw error
      return data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Fetch all teams for discover page
export const fetchAllTeams = createAsyncThunk(
  'teams/fetchAllTeams',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.rpc('get_all_teams')
      if (error) throw error
      return data || []
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Fetch user's subscriptions
export const fetchMySubscriptions = createAsyncThunk(
  'teams/fetchMySubscriptions',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('team_subscriptions')
        .select(`
          *,
          teams:team_id (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Flatten team name
      const subscriptions = (data || []).map(sub => ({
        ...sub,
        team_name: sub.teams?.name || 'Unknown Team',
      }))

      return subscriptions
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

// Cancel subscription
export const cancelSubscription = createAsyncThunk(
  'teams/cancelSubscription',
  async ({ subscriptionId, teamId }, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId,
          teamId,
          userId: user.id,
        },
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
  allTeams: [], // All teams for discover page
  selectedTeam: null,
  availableUsers: [],
  teamInfo: null,
  mySubscriptions: [], // User's subscriptions
  loading: false,
  checkoutLoading: false,
  discoverLoading: false,
  subscriptionsLoading: false,
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
    clearTeamInfo: (state) => {
      state.teamInfo = null
      state.error = null
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
      // Get Team Info (for joining)
      .addCase(getTeamInfo.pending, (state) => {
        state.loading = true
        state.error = null
        state.teamInfo = null
      })
      .addCase(getTeamInfo.fulfilled, (state, action) => {
        state.loading = false
        state.teamInfo = action.payload
      })
      .addCase(getTeamInfo.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create Checkout Session
      .addCase(createCheckoutSession.pending, (state) => {
        state.checkoutLoading = true
        state.error = null
      })
      .addCase(createCheckoutSession.fulfilled, (state) => {
        state.checkoutLoading = false
      })
      .addCase(createCheckoutSession.rejected, (state, action) => {
        state.checkoutLoading = false
        state.error = action.payload
      })
      // Fetch All Teams (for discover page)
      .addCase(fetchAllTeams.pending, (state) => {
        state.discoverLoading = true
        state.error = null
      })
      .addCase(fetchAllTeams.fulfilled, (state, action) => {
        state.discoverLoading = false
        state.allTeams = action.payload
      })
      .addCase(fetchAllTeams.rejected, (state, action) => {
        state.discoverLoading = false
        state.error = action.payload
      })
      // Fetch My Subscriptions
      .addCase(fetchMySubscriptions.pending, (state) => {
        state.subscriptionsLoading = true
        state.error = null
      })
      .addCase(fetchMySubscriptions.fulfilled, (state, action) => {
        state.subscriptionsLoading = false
        state.mySubscriptions = action.payload
      })
      .addCase(fetchMySubscriptions.rejected, (state, action) => {
        state.subscriptionsLoading = false
        state.error = action.payload
      })
      // Cancel Subscription
      .addCase(cancelSubscription.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { setSelectedTeam, clearTeamsError, clearTeams, clearTeamInfo } = teamsSlice.actions
export default teamsSlice.reducer
