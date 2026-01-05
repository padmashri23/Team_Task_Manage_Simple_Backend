import { Fragment } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Menu, Transition } from '@headlessui/react'
import { HiChevronDown, HiTrash } from 'react-icons/hi'
import { toast } from 'sonner'
import clsx from 'clsx'
import { updateTaskStatus, deleteTask } from '../../store/slices/tasksSlice'

const TaskItem = ({ task }) => {
  const dispatch = useDispatch()
  const { loading } = useSelector((state) => state.tasks)

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ]

  const currentStatus = statusOptions.find((s) => s.value === task.status)

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (newStatus) => {
    const result = await dispatch(
      updateTaskStatus({ taskId: task.id, status: newStatus })
    )
    if (updateTaskStatus.fulfilled.match(result)) {
      toast.success('Task status updated')
    } else {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    const result = await dispatch(deleteTask({ taskId: task.id }))
    if (deleteTask.fulfilled.match(result)) {
      toast.success('Task deleted')
    } else {
      toast.error('Failed to delete task')
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{task.title}</h4>
          <p className="text-sm text-blue-500 mt-1">{task.description || 'Description'}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
        >
          <HiTrash size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-4">
        {/* Status Badge */}
        <span
          className={clsx(
            'px-3 py-1 rounded-md text-sm font-medium',
            getStatusColor(task.status)
          )}
        >
          {currentStatus?.label}
        </span>

        {/* Status Dropdown */}
        <Menu as="div" className="relative">
          <Menu.Button className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
            {currentStatus?.label}
            <HiChevronDown size={14} />
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
            <Menu.Items className="absolute left-0 mt-2 w-36 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                {statusOptions.map((option) => (
                  <Menu.Item key={option.value}>
                    {({ active }) => (
                      <button
                        onClick={() => handleStatusChange(option.value)}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } ${
                          task.status === option.value
                            ? 'text-blue-600'
                            : 'text-gray-700'
                        } flex w-full items-center px-4 py-2 text-sm`}
                      >
                        {option.label}
                        {task.status === option.value && (
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
    </div>
  )
}

export default TaskItem
