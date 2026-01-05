import { useSelector } from 'react-redux'
import TasksPanel from '../tasks/TasksPanel'
import MembersPanel from '../members/MembersPanel'

const TeamContent = ({ activeTab }) => {
  const { selectedTeam } = useSelector((state) => state.teams)

  if (!selectedTeam) return null

  return (
    <div className="p-6">
      {activeTab === 'tasks' ? (
        <TasksPanel team={selectedTeam} />
      ) : (
        <MembersPanel team={selectedTeam} />
      )}
    </div>
  )
}

export default TeamContent
