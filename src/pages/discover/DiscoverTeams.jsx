import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { HiUserGroup, HiSparkles, HiArrowLeft, HiSearch, HiFilter } from 'react-icons/hi'
import { toast } from 'sonner'
import { fetchAllTeams, createCheckoutSession, fetchTeams } from '../../store/slices/teamsSlice'
import { supabase } from '../../lib/supabase'
const DiscoverTeams = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { allTeams, discoverLoading, checkoutLoading } = useSelector((state) => state.teams)
    const { user } = useSelector((state) => state.auth)
    const [filter, setFilter] = useState('all') // 'all', 'free', 'paid'
    const [searchTerm, setSearchTerm] = useState('')
    const [joiningTeamId, setJoiningTeamId] = useState(null)
    useEffect(() => {
        dispatch(fetchAllTeams())
    }, [dispatch])
    const filteredTeams = allTeams.filter((team) => {
        if (filter === 'free' && team.subscription_type === 'paid') return false
        if (filter === 'paid' && team.subscription_type !== 'paid') return false
        if (searchTerm && !team.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false
        }

        return true
    })

    const handleJoinTeam = async (team) => {
        if (team.is_member) {
            toast.info('You are already a member of this team')
            return
        }

        setJoiningTeamId(team.id)

        try {
            if (team.subscription_type === 'paid') {
                // Paid team - initiate Stripe checkout with joining fee
                const result = await dispatch(createCheckoutSession({
                    teamId: team.id,
                    teamName: team.name,
                    joiningFee: team.joining_fee || 10,  // Use team's joining fee
                    userEmail: user?.email,
                })).unwrap()

                if (result?.url) {
                    window.location.href = result.url
                }
            } else {
                // Free team - join directly using Supabase insert
                const { error } = await supabase
                    .from('team_members')
                    .insert({
                        team_id: team.id,
                        user_id: user.id,
                        role: 'member',
                    })

                if (error) {
                    if (error.code === '23505') {
                        toast.info('You are already a member of this team')
                    } else {
                        throw new Error(error.message)
                    }
                } else {
                    toast.success(`Successfully joined ${team.name}!`)
                }

                dispatch(fetchTeams())
                dispatch(fetchAllTeams())
            }
        } catch (error) {
            toast.error(error.message || error || 'Failed to join team')
        } finally {
            setJoiningTeamId(null)
        }
    }
    const freeTeams = allTeams.filter(t => t.subscription_type !== 'paid')
    const paidTeams = allTeams.filter(t => t.subscription_type === 'paid')

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <HiArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Discover Teams</h1>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md flex-1 mx-8">
                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search teams..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Filter */}
                    <div className="flex items-center gap-2">
                        <HiFilter size={18} className="text-gray-500" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Teams ({allTeams.length})</option>
                            <option value="free">Free Teams ({freeTeams.length})</option>
                            <option value="paid">Paid Teams ({paidTeams.length})</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Bar */}
                <div className="flex items-center gap-6 mb-8">
                    <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Total Teams</p>
                        <p className="text-2xl font-bold text-gray-900">{allTeams.length}</p>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl px-6 py-4 text-white">
                        <p className="text-sm text-emerald-100">Free Teams</p>
                        <p className="text-2xl font-bold">{freeTeams.length}</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl px-6 py-4 text-white">
                        <p className="text-sm text-purple-100">Premium Teams</p>
                        <p className="text-2xl font-bold">{paidTeams.length}</p>
                    </div>
                </div>

                {/* Loading State */}
                {discoverLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                )}

                {/* Empty State */}
                {!discoverLoading && filteredTeams.length === 0 && (
                    <div className="text-center py-20">
                        <HiUserGroup size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700">No teams found</h3>
                        <p className="text-gray-500">Try adjusting your search or filter</p>
                    </div>
                )}
                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map((team) => (
                        <div
                            key={team.id}
                            className={`relative bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 ${team.subscription_type === 'paid'
                                ? 'border-purple-200 hover:border-purple-300'
                                : 'border-gray-100 hover:border-emerald-200'
                                }`}
                        >
                            {/* Badge */}
                            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${team.subscription_type === 'paid'
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                }`}>
                                {team.subscription_type === 'paid' ? (
                                    <span className="flex items-center gap-1">
                                        <HiSparkles size={12} /> Premium
                                    </span>
                                ) : (
                                    '🆓 Free'
                                )}
                            </div>

                            {/* Card Content */}
                            <div className="p-6">
                                {/* Team Icon */}
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${team.subscription_type === 'paid'
                                    ? 'bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-600'
                                    : 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600'
                                    }`}>
                                    <HiUserGroup size={28} />
                                </div>

                                {/* Team Name */}
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{team.name}</h3>

                                {/* Admin */}
                                <p className="text-sm text-gray-500 mb-4">
                                    by {team.admin_name || 'Unknown'}
                                </p>

                                {/* Stats */}
                                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <HiUserGroup size={16} />
                                        {team.member_count} members
                                    </span>
                                    {team.subscription_type === 'paid' && (
                                        <span className="font-semibold text-purple-600">
                                            ${team.joining_fee || 10}/mo
                                        </span>
                                    )}
                                </div>

                                {/* Action Button */}
                                {team.is_member ? (
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition"
                                    >
                                        ✓ Already Joined
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleJoinTeam(team)}
                                        disabled={joiningTeamId === team.id || checkoutLoading}
                                        className={`w-full py-2.5 rounded-lg font-medium transition disabled:opacity-50 ${team.subscription_type === 'paid'
                                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700'
                                            }`}
                                    >
                                        {joiningTeamId === team.id ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                {team.subscription_type === 'paid' ? 'Redirecting...' : 'Joining...'}
                                            </span>
                                        ) : team.subscription_type === 'paid' ? (
                                            `Join for $${team.joining_fee || 10}/mo`
                                        ) : (
                                            'Join Team'
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
export default DiscoverTeams
