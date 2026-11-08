import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, CheckCircle, XCircle, ArrowDown, Plus } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminSubscription,
  fetchAllSubscriptions,
  activateSubscription,
  updateSubscriptionStatus,
  downgradeSubscription,
  deleteSubscription,
  fetchAllArtists,
  AdminArtist,
} from '@/lib/adminService';
import { SUBSCRIPTION_PLANS, formatBytes, formatUGX } from '@/lib/subscriptionService';
import { toast } from '@/hooks/use-toast';

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<AdminSubscription | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [downgradeOpen, setDowngradeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newSub, setNewSub] = useState({
    artistId: '',
    planId: 'plan_1gb',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [subs, arts] = await Promise.all([fetchAllSubscriptions(), fetchAllArtists()]);
    setSubscriptions(subs);
    setArtists(arts);
    setLoading(false);
  }

  function getArtistName(artistId: string) {
    const artist = artists.find((a) => a.id === artistId || a.userId === artistId);
    return artist?.name || artistId;
  }

  const filteredSubs = subscriptions.filter((s) =>
    getArtistName(s.artistId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleActivate() {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === newSub.planId);
    if (!plan || !newSub.artistId) {
      toast({ title: 'Please select an artist and plan', variant: 'destructive' });
      return;
    }
    try {
      await activateSubscription(newSub.artistId, plan.id, plan.storageGB, plan.durationDays);
      toast({ title: 'Subscription activated' });
      setActivateOpen(false);
      setNewSub({ artistId: '', planId: 'plan_1gb' });
      loadData();
    } catch (err) {
      toast({ title: 'Error activating subscription', variant: 'destructive' });
    }
  }

  async function handleStatusChange(status: 'active' | 'expired') {
    if (!selectedSub) return;
    try {
      await updateSubscriptionStatus(selectedSub.artistId, status);
      toast({ title: `Subscription ${status === 'active' ? 'activated' : 'deactivated'}` });
      loadData();
    } catch (err) {
      toast({ title: 'Error updating subscription', variant: 'destructive' });
    }
  }

  async function handleDowngrade() {
    if (!selectedSub) return;
    try {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedSub.planId);
      if (!plan) return;
      await downgradeSubscription(selectedSub.artistId, plan.id, plan.storageGB);
      toast({ title: 'Subscription downgraded' });
      setDowngradeOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error downgrading subscription', variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!selectedSub) return;
    try {
      await deleteSubscription(selectedSub.artistId);
      toast({ title: 'Subscription deleted' });
      setDeleteOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting subscription', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Subscriptions</h1>
            <p className="text-muted-foreground mt-1">Manage artist storage subscriptions</p>
          </div>
          <Button onClick={() => setActivateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Activate Subscription
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Storage Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredSubs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubs.map((sub) => (
                    <TableRow key={sub.artistId}>
                      <TableCell className="font-medium">{getArtistName(sub.artistId)}</TableCell>
                      <TableCell>
                        {SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId)?.name || sub.planId}
                      </TableCell>
                      <TableCell>
                        {formatBytes(sub.storageUsedBytes || 0)} / {sub.storageGB} GB
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status !== 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSub(sub);
                                handleStatusChange('active');
                              }}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                          {sub.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSub(sub);
                                handleStatusChange('expired');
                              }}
                            >
                              <XCircle className="w-4 h-4 text-yellow-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedSub(sub);
                              setDowngradeOpen(true);
                            }}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setSelectedSub(sub);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Activate Dialog */}
        <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activate Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Artist</label>
                <Select
                  value={newSub.artistId}
                  onValueChange={(value) => setNewSub((prev) => ({ ...prev, artistId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.userId || artist.id}>
                        {artist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Plan</label>
                <Select
                  value={newSub.planId}
                  onValueChange={(value) => setNewSub((prev) => ({ ...prev, planId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatUGX(plan.priceUGX)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleActivate}>Activate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Downgrade Dialog */}
        <Dialog open={downgradeOpen} onOpenChange={setDowngradeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Downgrade Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Select a new plan for {getArtistName(selectedSub?.artistId || '')}
              </p>
              <Select
                value={selectedSub?.planId}
                onValueChange={(value) =>
                  setSelectedSub((prev) => {
                    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === value);
                    return prev && { ...prev, planId: value, storageGB: plan?.storageGB || 1 };
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDowngradeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDowngrade}>Update Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Subscription</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete the subscription for{' '}
              <strong>{getArtistName(selectedSub?.artistId || '')}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
