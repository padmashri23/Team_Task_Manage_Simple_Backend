import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { BiLogOut } from 'react-icons/bi'
import { toast } from 'sonner'
import { logoutUser } from '../../store/slices/authSlice'
import { fetchTeams, clearTeams } from '../../store/slices/teamsSlice'
import { clearTasks } from '../../store/slices/tasksSlice'
import TeamSidebar from '../../components/teams/TeamSidebar'
import TeamContent from '../../components/teams/TeamContent'

const Dashboard = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { profile } = useSelector((state) => state.auth)
  const { selectedTeam } = useSelector((state) => state.teams)
  const [activeTab, setActiveTab] = useState('tasks')

  useEffect(() => {
    dispatch(fetchTeams())
  }, [dispatch])

  const handleLogout = async () => {
    const result = await dispatch(logoutUser())
    if (logoutUser.fulfilled.match(result)) {
      dispatch(clearTeams())
      dispatch(clearTasks())
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }

  return (
    <div className="dashboard-bg min-h-screen">
      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Manager</h1>
          <p className="text-gray-600">Welcome, {profile?.name || 'User'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-white/50 rounded-lg transition"
        >
          <BiLogOut size={20} />
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="px-8 pb-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Teams */}
          <TeamSidebar />

          {/* Right Content - Tasks/Members */}
          <div className="flex-1">
            {selectedTeam ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 py-4 text-center font-medium transition ${
                      activeTab === 'tasks'
                        ? 'text-gray-900 border-b-2 border-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`flex-1 py-4 text-center font-medium transition ${
                      activeTab === 'members'
                        ? 'text-gray-900 border-b-2 border-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Members
                  </button>
                </div>

                {/* Tab Content */}
                <TeamContent activeTab={activeTab} />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-gray-300 mb-4">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className="text-gray-500">Select a team to view tasks</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
