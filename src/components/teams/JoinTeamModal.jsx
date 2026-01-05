import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { HiX } from 'react-icons/hi'
import { toast } from 'sonner'
import { joinTeam } from '../../store/slices/teamsSlice'

const JoinTeamModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const { loading } = useSelector((state) => state.teams)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    const result = await dispatch(joinTeam({ teamId: data.teamId }))
    if (joinTeam.fulfilled.match(result)) {
      toast.success('Joined team successfully!')
      reset()
      onClose()
    } else {
      toast.error(result.payload || 'Failed to join team')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-gray-900">
                      Join Team
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      Enter team ID to join
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1 hover:bg-gray-100 rounded-lg transition"
                  >
                    <HiX size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team ID
                    </label>
                    <input
                      type="text"
                      {...register('teamId', {
                        required: 'Team ID is required',
                      })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder=""
                    />
                    {errors.teamId && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.teamId.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default JoinTeamModal
