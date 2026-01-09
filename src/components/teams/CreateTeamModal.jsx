import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { HiX, HiCurrencyDollar } from 'react-icons/hi'
import { toast } from 'sonner'
import { createTeam } from '../../store/slices/teamsSlice'

const CreateTeamModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const { loading } = useSelector((state) => state.teams)
  const [subscriptionType, setSubscriptionType] = useState('free')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      teamName: '',
      subscriptionPrice: '',
    },
  })

  const onSubmit = async (data) => {
    const teamData = {
      name: data.teamName,
      subscriptionType,
      subscriptionPrice: subscriptionType === 'paid' ? parseFloat(data.subscriptionPrice) : 0,
    }

    const result = await dispatch(createTeam(teamData))
    if (createTeam.fulfilled.match(result)) {
      toast.success('Team created successfully!')
      reset()
      setSubscriptionType('free')
      onClose()
    } else {
      toast.error(result.payload || 'Failed to create team')
    }
  }

  const handleClose = () => {
    reset()
    setSubscriptionType('free')
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
                      Create Team
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      Create a new team to manage tasks
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
                  {/* Team Name Input */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Name
                    </label>
                    <input
                      type="text"
                      {...register('teamName', {
                        required: 'Team name is required',
                      })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="My Awesome Team"
                    />
                    {errors.teamName && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.teamName.message}
                      </p>
                    )}
                  </div>

                  {/* Subscription Type Selection */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Team Access
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Free Option */}
                      <button
                        type="button"
                        onClick={() => setSubscriptionType('free')}
                        className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${subscriptionType === 'free'
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${subscriptionType === 'free' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                          <span className="text-lg">🆓</span>
                        </div>
                        <span className={`font-medium ${subscriptionType === 'free' ? 'text-emerald-700' : 'text-gray-700'
                          }`}>
                          Free
                        </span>
                        <span className="text-xs text-gray-500 mt-1">Anyone can join</span>
                      </button>

                      {/* Paid Option */}
                      <button
                        type="button"
                        onClick={() => setSubscriptionType('paid')}
                        className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${subscriptionType === 'paid'
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${subscriptionType === 'paid' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                          <span className="text-lg">💎</span>
                        </div>
                        <span className={`font-medium ${subscriptionType === 'paid' ? 'text-violet-700' : 'text-gray-700'
                          }`}>
                          Paid
                        </span>
                        <span className="text-xs text-gray-500 mt-1">Requires payment</span>
                      </button>
                    </div>
                  </div>

                  {/* Price Input (shown only for paid teams) */}
                  {subscriptionType === 'paid' && (
                    <div className="mb-5 animate-fadeIn">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Membership Price (USD)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <HiCurrencyDollar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.50"
                          {...register('subscriptionPrice', {
                            required: subscriptionType === 'paid' ? 'Price is required for paid teams' : false,
                            min: {
                              value: 0.50,
                              message: 'Minimum price is $0.50',
                            },
                          })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                          placeholder="9.99"
                        />
                      </div>
                      {errors.subscriptionPrice && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.subscriptionPrice.message}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Members will pay this one-time fee to join your team
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-6 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${subscriptionType === 'paid'
                          ? 'bg-violet-600 hover:bg-violet-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                        }`}
                    >
                      {loading ? 'Creating...' : 'Create Team'}
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

export default CreateTeamModal
