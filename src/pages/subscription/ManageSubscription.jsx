import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { HiArrowLeft, HiXCircle, HiCheckCircle, HiExclamation } from 'react-icons/hi'
import { toast } from 'sonner'
import { fetchMySubscriptions, cancelSubscription } from '../../store/slices/teamsSlice'

const ManageSubscription = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { mySubscriptions, loading } = useSelector((state) => state.teams)
    const [cancellingId, setCancellingId] = useState(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [selectedSub, setSelectedSub] = useState(null)

    useEffect(() => {
        dispatch(fetchMySubscriptions())
    }, [dispatch])

    const handleCancelClick = (sub) => {
        setSelectedSub(sub)
        setShowConfirmModal(true)
    }

    const handleConfirmCancel = async () => {
        if (!selectedSub) return

        setCancellingId(selectedSub.stripe_subscription_id)
        setShowConfirmModal(false)

        const result = await dispatch(cancelSubscription({
            subscriptionId: selectedSub.stripe_subscription_id,
            teamId: selectedSub.team_id,
        }))

        if (cancelSubscription.fulfilled.match(result)) {
            toast.success('Subscription cancelled successfully')
            dispatch(fetchMySubscriptions()) // Refresh list
        } else {
            toast.error(result.payload || 'Failed to cancel subscription')
        }

        setCancellingId(null)
        setSelectedSub(null)
    }

    const getStatusBadge = (status) => {
        if (status === 'active') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <HiCheckCircle size={14} />
                    Active
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                <HiXCircle size={14} />
                Cancelled
            </span>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="px-6 py-4">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition"
                >
                    <HiArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </button>
            </header>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold text-white mb-2">Manage Subscriptions</h1>
                <p className="text-white/60 mb-8">View and manage your team subscriptions</p>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-white/60 mt-4">Loading subscriptions...</p>
                    </div>
                ) : mySubscriptions?.length === 0 ? (
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center">
                        <HiExclamation size={48} className="mx-auto text-white/30 mb-4" />
                        <p className="text-white/60">You don't have any active subscriptions</p>
                        <button
                            onClick={() => navigate('/discover')}
                            className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                        >
                            Discover Teams
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {mySubscriptions?.map((sub) => (
                            <div
                                key={sub.id}
                                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            {sub.team_name || 'Team'}
                                        </h3>
                                        <p className="text-white/60 text-sm mt-1">
                                            ${sub.amount_paid}/month
                                        </p>
                                        <div className="mt-2">
                                            {getStatusBadge(sub.status)}
                                        </div>
                                        {sub.expires_at && (
                                            <p className="text-white/50 text-xs mt-2">
                                                Next billing: {new Date(sub.expires_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>

                                    {sub.status === 'active' && sub.stripe_subscription_id && (
                                        <button
                                            onClick={() => handleCancelClick(sub)}
                                            disabled={cancellingId && cancellingId === sub.stripe_subscription_id}
                                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
                                        >
                                            {cancellingId && cancellingId === sub.stripe_subscription_id ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription?</h2>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to cancel your subscription to{' '}
                            <strong>{selectedSub?.team_name}</strong>?
                            You will be removed from the team.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                Keep Subscription
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                            >
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ManageSubscription
