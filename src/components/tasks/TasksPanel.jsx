import { useEffect, useState, Fragment } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { HiPlus } from 'react-icons/hi'
import { Menu, Transition } from '@headlessui/react'
import { HiChevronDown } from 'react-icons/hi'
import { fetchTasks, setStatusFilter } from '../../store/slices/tasksSlice'
import TaskItem from './TaskItem'
import CreateTaskModal from './CreateTaskModal'

const TasksPanel = ({ team }) => {
  const dispatch = useDispatch()
  const { tasks, statusFilter } = useSelector((state) => state.tasks)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const teamTasks = tasks[team.id] || []

  useEffect(() => {
    if (team.id) {
      dispatch(fetchTasks({ teamId: team.id }))
    }
  }, [dispatch, team.id])

  const filteredTasks =
    statusFilter === 'all'
      ? teamTasks
      : teamTasks.filter((task) => task.status === statusFilter)

  const filterOptions = [
    { value: 'all', label: 'All Tasks' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ]

  const currentFilter = filterOptions.find((f) => f.value === statusFilter)

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {team.name} Tasks
          </h3>
          <p className="text-sm text-gray-500">Team ID: {team.id}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
        >
          <HiPlus size={18} />
          New Task
        </button>
      </div>

      {/* Filter Dropdown */}
      <div className="mb-4">
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            {currentFilter?.label}
            <HiChevronDown size={16} />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 mt-2 w-40 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                {filterOptions.map((option) => (
                  <Menu.Item key={option.value}>
                    {({ active }) => (
                      <button
                        onClick={() => dispatch(setStatusFilter(option.value))}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } ${
                          statusFilter === option.value ? 'text-blue-600' : 'text-gray-700'
                        } flex w-full items-center px-4 py-2 text-sm`}
                      >
                        {option.label}
                        {statusFilter === option.value && (
                          <span className="ml-auto">✓</span>
                        )}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <p className="text-sm text-blue-500 py-4">No tasks found</p>
        ) : (
          filteredTasks.map((task) => <TaskItem key={task.id} task={task} />)
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        teamId={team.id}
      />
    </>
  )
}

export default TasksPanel
