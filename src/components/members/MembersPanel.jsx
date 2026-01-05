import { useEffect, useState, Fragment } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Listbox, Transition } from '@headlessui/react'
import { HiChevronDown, HiTrash } from 'react-icons/hi'
import { toast } from 'sonner'
import {
  fetchUsersNotInTeam,
  addTeamMember,
  removeTeamMember,
} from '../../store/slices/teamsSlice'

const MembersPanel = ({ team }) => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { availableUsers, loading } = useSelector((state) => state.teams)
  const [selectedUser, setSelectedUser] = useState(null)

  const members = team.team_members || []
  const currentUserMember = members.find((m) => m.user_id === user?.id)
  const isAdmin = currentUserMember?.role === 'admin'

  useEffect(() => {
    if (team.id) {
      dispatch(fetchUsersNotInTeam({ teamId: team.id }))
    }
  }, [dispatch, team.id, members.length])

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Please select a user')
      return
    }

    const result = await dispatch(
      addTeamMember({ teamId: team.id, userId: selectedUser.id })
    )
    if (addTeamMember.fulfilled.match(result)) {
      toast.success('Member added successfully!')
      setSelectedUser(null)
      dispatch(fetchUsersNotInTeam({ teamId: team.id }))
    } else {
      toast.error(result.payload || 'Failed to add member')
    }
  }

  const handleRemoveMember = async (userId) => {
    const result = await dispatch(
      removeTeamMember({ teamId: team.id, userId })
    )
    if (removeTeamMember.fulfilled.match(result)) {
      toast.success('Member removed successfully!')
      dispatch(fetchUsersNotInTeam({ teamId: team.id }))
    } else {
      toast.error(result.payload || 'Failed to remove member')
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Members</h3>

      {/* Add Member Section (Admin Only) */}
      {isAdmin && (
        <div className="flex items-center gap-3 mb-6">
          <Listbox value={selectedUser} onChange={setSelectedUser}>
            <div className="relative flex-1 max-w-xs">
              <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500">
                <span className="block truncate text-gray-700">
                  {selectedUser
                    ? `${selectedUser.name} (${selectedUser.email})`
                    : 'Select user to add'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <HiChevronDown className="h-5 w-5 text-gray-400" />
                </span>
              </Listbox.Button>

              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  {availableUsers.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No users available
                    </div>
                  ) : (
                    availableUsers.map((user) => (
                      <Listbox.Option
                        key={user.id}
                        value={user}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 px-4 ${
                            active ? 'bg-gray-100' : ''
                          }`
                        }
                      >
                        {({ selected }) => (
                          <span
                            className={`block truncate text-sm ${
                              selected ? 'font-medium text-blue-600' : 'text-gray-700'
                            }`}
                          >
                            {user.name} ({user.email})
                          </span>
                        )}
                      </Listbox.Option>
                    ))
                  )}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>

          <button
            onClick={handleAddMember}
            disabled={loading || !selectedUser}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {members.map((member) => {
          const profile = member.profiles
          const isMemberAdmin = member.role === 'admin'
          const canRemove = isAdmin && member.user_id !== user?.id

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border border-gray-100 rounded-xl"
            >
              <div>
                <h4 className="font-medium text-gray-900">{profile?.name}</h4>
                <p className="text-sm text-blue-500">{profile?.email}</p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    isMemberAdmin
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isMemberAdmin ? 'Admin' : 'Member'}
                </span>

                {canRemove && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <HiTrash size={18} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MembersPanel
