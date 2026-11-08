import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mic2, Music, Video, CreditCard, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  fetchAllUsers,
  fetchAllArtists,
  fetchAllTracks,
  fetchAllVideos,
  fetchAllSubscriptions,
} from '@/lib/adminService';

interface DashboardStats {
  totalUsers: number;
  totalArtists: number;
  totalTracks: number;
  totalVideos: number;
  activeSubscriptions: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalArtists: 0,
    totalTracks: 0,
    totalVideos: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [users, artists, tracks, videos, subscriptions] = await Promise.all([
          fetchAllUsers(),
          fetchAllArtists(),
          fetchAllTracks(),
          fetchAllVideos(),
          fetchAllSubscriptions(),
        ]);

        const activeSubs = subscriptions.filter(s => s.status === 'active');

        setStats({
          totalUsers: users.length,
          totalArtists: artists.length,
          totalTracks: tracks.length,
          totalVideos: videos.length,
          activeSubscriptions: activeSubs.length,
          totalRevenue: activeSubs.length * 15000, // Approximate
        });
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Artists', value: stats.totalArtists, icon: Mic2, color: 'text-purple-500' },
    { title: 'Tracks', value: stats.totalTracks, icon: Music, color: 'text-green-500' },
    { title: 'Videos', value: stats.totalVideos, icon: Video, color: 'text-red-500' },
    { title: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'text-yellow-500' },
    { title: 'Est. Revenue (UGX)', value: stats.totalRevenue.toLocaleString(), icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Use the sidebar to manage users, artists, content, and subscriptions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">All systems operational</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
