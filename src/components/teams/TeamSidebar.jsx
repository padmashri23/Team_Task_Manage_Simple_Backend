import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { HiPlus, HiUserGroup } from 'react-icons/hi'
import clsx from 'clsx'
import { setSelectedTeam } from '../../store/slices/teamsSlice'
import CreateTeamModal from './CreateTeamModal'
import JoinTeamModal from './JoinTeamModal'

const TeamSidebar = () => {
  const dispatch = useDispatch()
  const { teams, selectedTeam } = useSelector((state) => state.teams)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const handleSelectTeam = (team) => {
    dispatch(setSelectedTeam(team))
  }

  return (
    <>
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Teams</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Create Team"
            >
              <HiPlus size={18} />
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Join Team"
            >
              <HiUserGroup size={18} />
            </button>
          </div>
        </div>

        {/* Teams List */}
        <div className="space-y-2">
          {teams.length === 0 ? (
            <p className="text-sm text-blue-500 py-2">
              No teams yet. Create or join one!
            </p>
          ) : (
            teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition text-left',
                  selectedTeam?.id === team.id
                    ? 'bg-gray-900 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                )}
              >
                <HiUserGroup size={18} />
                <span className="font-medium truncate flex-1">{team.name}</span>
                {/* Subscription Badge */}
                {team.subscription_type === 'paid' ? (
                  <span className="text-xs" title="Paid Team">💎</span>
                ) : (
                  <span className="text-xs opacity-50" title="Free Team">🆓</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <JoinTeamModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </>
  )
}

export default TeamSidebar
