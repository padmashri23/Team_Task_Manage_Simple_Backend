import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { HiCheckCircle, HiXCircle, HiRefresh } from 'react-icons/hi'
import { fetchTeams } from '../../store/slices/teamsSlice'
import { supabase } from '../../lib/supabase'

const PaymentSuccess = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { user } = useSelector((state) => state.auth)
    const [searchParams] = useSearchParams()
    const [status, setStatus] = useState('processing')
    const [message, setMessage] = useState('Processing your payment...')
    const [countdown, setCountdown] = useState(5)
    const [teamName, setTeamName] = useState('')

    const urlTeamId = searchParams.get('team_id')
    const sessionId = searchParams.get('session_id')

    useEffect(() => {
        const processPayment = async () => {
            // Get pending join info from localStorage
            const pendingJoinStr = localStorage.getItem('pendingTeamJoin')
            let pendingJoin = null

            if (pendingJoinStr) {
                try {
                    pendingJoin = JSON.parse(pendingJoinStr)
                    setTeamName(pendingJoin.teamName || '')
                } catch (e) {
                    console.error('Failed to parse pending join:', e)
                }
            }

            // Use URL team_id or localStorage team_id
            const teamId = urlTeamId || pendingJoin?.teamId
            const userId = user?.id || pendingJoin?.userId
            const price = pendingJoin?.price || 0

            if (!teamId || !userId) {
                setStatus('error')
                setMessage('Missing team or user information. Please try joining the team again.')
                return
            }

            try {
                console.log('Processing payment for team:', teamId, 'user:', userId)

                // Step 1: Create subscription record
                const { error: subError } = await supabase
                    .from('team_subscriptions')
                    .upsert({
                        team_id: teamId,
                        user_id: userId,
                        stripe_session_id: sessionId || 'manual',
                        amount_paid: parseFloat(price) || 0,
                        status: 'active',
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'team_id,user_id',
                    })

                if (subError) {
                    console.error('Subscription error:', subError)
                    // Continue anyway - try to join team
                }

                // Step 2: Add user to team
                const { error: joinError } = await supabase
                    .from('team_members')
                    .insert({
                        team_id: teamId,
                        user_id: userId,
                        role: 'member',
                    })

                if (joinError) {
                    if (joinError.code === '23505' || joinError.message?.includes('duplicate')) {
                        console.log('Already a team member - that is OK')
                    } else {
                        console.error('Join error:', joinError)
                        // Log the error but show success since payment went through
                    }
                }

                // Clear pending join from localStorage
                localStorage.removeItem('pendingTeamJoin')

                // Success!
                setStatus('success')
                setMessage(`You have successfully joined ${teamName || 'the team'}!`)

                // Refresh teams list
                dispatch(fetchTeams())

                // Start countdown for redirect
                let count = 5
                const timer = setInterval(() => {
                    count--
                    setCountdown(count)
                    if (count <= 0) {
                        clearInterval(timer)
                        navigate('/dashboard')
                    }
                }, 1000)

                return () => clearInterval(timer)
            } catch (error) {
                console.error('Error processing payment:', error)
                setStatus('error')
                setMessage(error.message || 'An error occurred. Please contact support.')
            }
        }

        if (user) {
            processPayment()
        }
    }, [urlTeamId, sessionId, user, dispatch, navigate, teamName])

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${status === 'success'
                ? 'bg-gradient-to-br from-emerald-50 to-teal-100'
                : status === 'error'
                    ? 'bg-gradient-to-br from-red-50 to-rose-100'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-100'
            }`}>
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                {/* Status Icon */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'success'
                        ? 'bg-emerald-100'
                        : status === 'error'
                            ? 'bg-red-100'
                            : 'bg-blue-100'
                    }`}>
                    {status === 'success' && (
                        <HiCheckCircle className="w-12 h-12 text-emerald-500" />
                    )}
                    {status === 'error' && (
                        <HiXCircle className="w-12 h-12 text-red-500" />
                    )}
                    {status === 'processing' && (
                        <HiRefresh className="w-12 h-12 text-blue-500 animate-spin" />
                    )}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {status === 'success' && 'Payment Successful! 🎉'}
                    {status === 'error' && 'Something went wrong'}
                    {status === 'processing' && 'Processing...'}
                </h1>

                {/* Message */}
                <p className="text-gray-600 mb-6">
                    {message}
                </p>

                {/* Team Name Display */}
                {teamName && status === 'success' && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-500 mb-1">Team Joined</p>
                        <p className="font-medium text-gray-800">{teamName}</p>
                    </div>
                )}

                {/* Countdown (only on success) */}
                {status === 'success' && (
                    <div className="flex items-center justify-center gap-2 text-gray-500 mb-6">
                        <HiRefresh className="w-4 h-4 animate-spin" />
                        <span>Redirecting to dashboard in {countdown}s...</span>
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`w-full px-6 py-3 rounded-lg font-medium transition ${status === 'success'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : status === 'error'
                                ? 'bg-gray-600 text-white hover:bg-gray-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700 cursor-wait'
                        }`}
                    disabled={status === 'processing'}
                >
                    {status === 'processing' ? 'Please wait...' : 'Go to Dashboard'}
                </button>
            </div>
        </div>
    )
}

export default PaymentSuccess
