import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, Trash2, Edit, UserPlus, Mail } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminUser,
  fetchAllUsers,
  updateUser,
  deleteUser,
  sendNotificationToUser,
} from '@/lib/adminService';
import { toast } from '@/hooks/use-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState({ title: '', message: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const data = await fetchAllUsers();
    setUsers(data);
    setLoading(false);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleUpdateUser() {
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.uid, {
        name: selectedUser.name,
        role: selectedUser.role,
        phone: selectedUser.phone,
      });
      toast({ title: 'User updated successfully' });
      setEditOpen(false);
      loadUsers();
    } catch (err) {
      toast({ title: 'Error updating user', variant: 'destructive' });
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.uid);
      toast({ title: 'User deleted successfully' });
      setDeleteOpen(false);
      loadUsers();
    } catch (err) {
      toast({ title: 'Error deleting user', variant: 'destructive' });
    }
  }

  async function handleSendNotification() {
    if (!selectedUser) return;
    try {
      await sendNotificationToUser(selectedUser.uid, notifyMessage.title, notifyMessage.message);
      toast({ title: 'Notification sent successfully' });
      setNotifyOpen(false);
      setNotifyMessage({ title: '', message: '' });
    } catch (err) {
      toast({ title: 'Error sending notification', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-1">Manage all platform users</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
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
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'artist' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setNotifyOpen(true);
                            }}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
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

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={selectedUser?.name || ''}
                  onChange={(e) =>
                    setSelectedUser((prev) => prev && { ...prev, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={selectedUser?.role}
                  onValueChange={(value: 'user' | 'artist') =>
                    setSelectedUser((prev) => prev && { ...prev, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="artist">Artist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={selectedUser?.phone || ''}
                  onChange={(e) =>
                    setSelectedUser((prev) => prev && { ...prev, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action
              cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notify Dialog */}
        <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Notification to {selectedUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={notifyMessage.title}
                  onChange={(e) =>
                    setNotifyMessage((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Notification title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Input
                  value={notifyMessage.message}
                  onChange={(e) =>
                    setNotifyMessage((prev) => ({ ...prev, message: e.target.value }))
                  }
                  placeholder="Notification message"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotifyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendNotification}>Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
