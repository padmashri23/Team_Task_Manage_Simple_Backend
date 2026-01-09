import { useNavigate, useSearchParams } from 'react-router-dom'
import { HiXCircle, HiArrowLeft } from 'react-icons/hi'

const PaymentCancel = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const teamId = searchParams.get('team_id')

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                {/* Cancel Icon */}
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <HiXCircle className="w-12 h-12 text-red-500" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Payment Cancelled
                </h1>

                {/* Message */}
                <p className="text-gray-600 mb-6">
                    Your payment was cancelled. You haven't been charged and haven't joined the team yet.
                </p>

                {/* Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-700">
                        You can try again anytime. Just enter the Team ID again to rejoin.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition flex items-center justify-center gap-2"
                    >
                        <HiArrowLeft className="w-5 h-5" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PaymentCancel
