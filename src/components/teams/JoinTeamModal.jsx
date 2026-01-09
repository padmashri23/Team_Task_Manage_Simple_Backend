import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { HiX, HiUsers, HiCurrencyDollar, HiArrowLeft, HiLockClosed } from 'react-icons/hi'
import { toast } from 'sonner'
import { joinTeam, getTeamInfo, createCheckoutSession, clearTeamInfo } from '../../store/slices/teamsSlice'

const JoinTeamModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const { loading, checkoutLoading, teamInfo, error } = useSelector((state) => state.teams)
  const { user } = useSelector((state) => state.auth)
  const [step, setStep] = useState('lookup') // 'lookup' or 'confirm'

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm()

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('lookup')
      dispatch(clearTeamInfo())
      reset()
    }
  }, [isOpen, dispatch, reset])

  // Handle team ID lookup
  const onLookup = async (data) => {
    const result = await dispatch(getTeamInfo({ teamId: data.teamId }))
    if (getTeamInfo.fulfilled.match(result)) {
      setStep('confirm')
    } else {
      toast.error(result.payload || 'Team not found')
    }
  }

  // Handle free team join
  const handleFreeJoin = async () => {
    const teamId = getValues('teamId')
    const result = await dispatch(joinTeam({ teamId }))
    if (joinTeam.fulfilled.match(result)) {
      toast.success('Joined team successfully!')
      handleClose()
    } else {
      toast.error(result.payload || 'Failed to join team')
    }
  }

  // Handle paid team checkout
  const handlePaidJoin = async () => {
    if (!teamInfo) return

    const result = await dispatch(createCheckoutSession({
      teamId: teamInfo.id,
      teamName: teamInfo.name,
      price: teamInfo.subscription_price,
      userEmail: user?.email,
    }))

    if (createCheckoutSession.fulfilled.match(result) && result.payload?.url) {
      // Redirect to Stripe Checkout
      window.location.href = result.payload.url
    } else {
      toast.error(result.payload || 'Failed to create checkout session')
    }
  }

  const handleBack = () => {
    setStep('lookup')
    dispatch(clearTeamInfo())
  }

  const handleClose = () => {
    reset()
    setStep('lookup')
    dispatch(clearTeamInfo())
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
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {step === 'confirm' && (
                      <button
                        onClick={handleBack}
                        className="p-1 hover:bg-gray-100 rounded-lg transition"
                      >
                        <HiArrowLeft size={20} />
                      </button>
                    )}
                    <div>
                      <Dialog.Title className="text-xl font-semibold text-gray-900">
                        {step === 'lookup' ? 'Join Team' : 'Confirm Join'}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 mt-1">
                        {step === 'lookup'
                          ? 'Enter team ID to join'
                          : 'Review team details before joining'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1 hover:bg-gray-100 rounded-lg transition"
                  >
                    <HiX size={20} />
                  </button>
                </div>

                {/* Step 1: Team ID Lookup */}
                {step === 'lookup' && (
                  <form onSubmit={handleSubmit(onLookup)}>
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
                        placeholder="Enter the team ID"
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
                        {loading ? 'Looking up...' : 'Continue'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 2: Confirm Join */}
                {step === 'confirm' && teamInfo && (
                  <div>
                    {/* Team Info Card */}
                    <div className="bg-gray-50 rounded-xl p-5 mb-5">
                      <h3 className="font-semibold text-lg text-gray-900 mb-3">
                        {teamInfo.name}
                      </h3>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <HiUsers className="text-gray-400" />
                          <span>{teamInfo.member_count} {teamInfo.member_count === 1 ? 'member' : 'members'}</span>
                        </div>

                        {/* Subscription Badge */}
                        <div className="flex items-center gap-2">
                          {teamInfo.subscription_type === 'free' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                              🆓 Free to Join
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">
                              💎 Paid Team
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Paid Team - Show Price */}
                    {teamInfo.subscription_type === 'paid' && (
                      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5 mb-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-violet-600 font-medium">Membership Fee</p>
                            <p className="text-3xl font-bold text-violet-900">
                              ${parseFloat(teamInfo.subscription_price).toFixed(2)}
                            </p>
                            <p className="text-xs text-violet-500 mt-1">One-time payment</p>
                          </div>
                          <div className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center">
                            <HiCurrencyDollar className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-sm text-violet-600">
                          <HiLockClosed className="w-4 h-4" />
                          <span>Secure payment via Stripe</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>

                      {teamInfo.subscription_type === 'free' ? (
                        <button
                          onClick={handleFreeJoin}
                          disabled={loading}
                          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Joining...' : 'Join Team'}
                        </button>
                      ) : (
                        <button
                          onClick={handlePaidJoin}
                          disabled={checkoutLoading}
                          className="px-6 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {checkoutLoading ? (
                            'Preparing checkout...'
                          ) : (
                            <>
                              <HiCurrencyDollar className="w-5 h-5" />
                              Pay ${parseFloat(teamInfo.subscription_price).toFixed(2)} to Join
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default JoinTeamModal
