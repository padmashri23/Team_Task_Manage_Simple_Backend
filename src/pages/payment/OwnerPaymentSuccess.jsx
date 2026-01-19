import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { HiCheckCircle, HiXCircle, HiRefresh } from 'react-icons/hi'
import { createTeam, fetchTeams } from '../../store/slices/teamsSlice'

const OwnerPaymentSuccess = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [status, setStatus] = useState('processing')
    const [message, setMessage] = useState('Processing your payment...')
    const hasRun = useRef(false) // Prevent double execution in React Strict Mode

    useEffect(() => {
        // Prevent running twice (React Strict Mode issue)
        if (hasRun.current) return
        hasRun.current = true

        const handlePaymentSuccess = async () => {
            try {
                const sessionId = searchParams.get('session_id')

                if (!sessionId) {
                    setStatus('error')
                    setMessage('Invalid session')
                    return
                }

                // Get pending team creation info from localStorage
                const pendingData = localStorage.getItem('pendingTeamCreation')
                if (!pendingData) {
                    // Already processed or no data - redirect to dashboard
                    setStatus('success')
                    setMessage('Team already created!')
                    setTimeout(() => navigate('/dashboard'), 2000)
                    return
                }

                const { teamName, tier, tierPrice, joiningFee } = JSON.parse(pendingData)

                // IMPORTANT: Clear localStorage BEFORE creating team to prevent duplicates
                localStorage.removeItem('pendingTeamCreation')

                // Create the team now that payment is successful
                const result = await dispatch(createTeam({
                    name: teamName,
                    subscriptionType: 'paid',
                    subscriptionTier: tier,
                    subscriptionPrice: tierPrice,
                    joiningFee: joiningFee,
                }))

                if (createTeam.fulfilled.match(result)) {
                    setStatus('success')
                    setMessage(`Team "${teamName}" created successfully!`)
                    toast.success('Team created successfully!')

                    // Refresh teams list
                    await dispatch(fetchTeams())

                    // Redirect after delay
                    setTimeout(() => {
                        navigate('/dashboard')
                    }, 3000)
                } else {
                    throw new Error(result.payload || 'Failed to create team')
                }
            } catch (error) {
                console.error('Owner payment success error:', error)
                setStatus('error')
                setMessage(error.message || 'An error occurred')
            }
        }

        handlePaymentSuccess()
    }, [searchParams, dispatch, navigate])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                {status === 'processing' && (
                    <>
                        <HiRefresh className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Creating Your Team</h1>
                        <p className="text-gray-600">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <HiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
                        <p className="text-gray-600 mb-4">{message}</p>
                        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <HiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                        >
                            Go to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default OwnerPaymentSuccess
