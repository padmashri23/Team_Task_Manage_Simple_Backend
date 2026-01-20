import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiCheck, HiArrowLeft, HiSparkles } from 'react-icons/hi'

const plans = [
    {
        name: 'Basic',
        price: 5,
        description: 'Perfect for small teams getting started',
        color: 'from-blue-500 to-blue-600',
        features: [
            'Up to 5 team members',
            'Up to 50 tasks',
            'Basic task management',
            'Email support',
        ],
        popular: false,
    },
    {
        name: 'Pro',
        price: 15,
        description: 'Best for growing teams with more needs',
        color: 'from-purple-500 to-purple-600',
        features: [
            'Up to 20 team members',
            'Unlimited tasks',
            'Advanced task management',
            'Priority support',
            'Team analytics',
        ],
        popular: true,
    },
    {
        name: 'Enterprise',
        price: 49,
        description: 'For large organizations that need it all',
        color: 'from-amber-500 to-orange-600',
        features: [
            'Unlimited team members',
            'Unlimited tasks',
            'Advanced permissions',
            '24/7 priority support',
            'Custom integrations',
            'Dedicated account manager',
        ],
        popular: false,
    },
]

const PlansPage = () => {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="px-6 py-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition"
                >
                    <HiArrowLeft size={20} />
                    <span>Back</span>
                </button>
            </header>

            {/* Hero */}
            <div className="text-center py-12 px-4">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Choose Your Team Plan
                </h1>
                <p className="text-lg text-white/70 max-w-2xl mx-auto">
                    Create a team with the features you need. Team owners pay for capacity,
                    members pay a joining fee you set.
                </p>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-6xl mx-auto px-4 pb-20">
                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-white/40 transition ${plan.popular ? 'ring-2 ring-purple-500 scale-105' : ''
                                }`}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1">
                                        <HiSparkles size={16} />
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            {/* Plan Header */}
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                                <p className="text-white/60 text-sm">{plan.description}</p>
                                <div className="mt-4">
                                    <span className="text-5xl font-bold text-white">${plan.price}</span>
                                    <span className="text-white/60">/month</span>
                                </div>
                                <p className="text-xs text-white/50 mt-2">Owner pays this for team capacity</p>
                                {/* Trial Badge */}
                                <div className="mt-3">
                                    <span className="inline-block bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1 rounded-full">
                                        🎁 2-day free trial
                                    </span>
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-white/80">
                                        <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center`}>
                                            <HiCheck size={12} className="text-white" />
                                        </div>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <button
                                onClick={() => navigate('/dashboard')}
                                className={`w-full py-3 rounded-xl font-semibold transition ${plan.popular
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                Get Started
                            </button>
                        </div>
                    ))}
                </div>

                {/* How it works */}
                <div className="mt-20 text-center">
                    <h3 className="text-2xl font-bold text-white mb-8">How It Works</h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white/5 rounded-xl p-6">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">1️⃣</span>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">Owner Creates Team</h4>
                            <p className="text-white/60 text-sm">
                                Choose a tier and pay for team capacity. Set a joining fee for members.
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">2️⃣</span>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">Members Join</h4>
                            <p className="text-white/60 text-sm">
                                Members discover your team and pay the joining fee you set.
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6">
                            <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">3️⃣</span>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">Collaborate</h4>
                            <p className="text-white/60 text-sm">
                                Manage tasks, track progress, and achieve goals together.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlansPage
