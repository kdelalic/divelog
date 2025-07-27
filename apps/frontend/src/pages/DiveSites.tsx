import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { diveSitesApi, type DiveSite } from '@/lib/api';

const DiveSites = () => {
  const [diveSites, setDiveSites] = useState<DiveSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<DiveSite | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<DiveSite | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    description: '',
  });

  useEffect(() => {
    loadDiveSites();
  }, []);

  const loadDiveSites = async () => {
    setIsLoading(true);
    const result = await diveSitesApi.fetchDiveSites();
    if (result.error) {
      setError(result.error);
    } else {
      setDiveSites(result.data || []);
    }
    setIsLoading(false);
  };

  const handleCreate = () => {
    setEditingSite(null);
    setFormData({ name: '', latitude: '', longitude: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (site: DiveSite) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      latitude: site.latitude.toString(),
      longitude: site.longitude.toString(),
      description: site.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (site: DiveSite) => {
    setSiteToDelete(site);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!siteToDelete) return;

    const result = await diveSitesApi.deleteDiveSite(siteToDelete.id);
    if (result.error) {
      setError(result.error);
    } else {
      await loadDiveSites();
      setIsDeleteDialogOpen(false);
      setSiteToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const siteData = {
      name: formData.name,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      description: formData.description || undefined,
    };

    let result;
    if (editingSite) {
      result = await diveSitesApi.updateDiveSite({ ...editingSite, ...siteData });
    } else {
      result = await diveSitesApi.createDiveSite(siteData);
    }

    if (result.error) {
      setError(result.error);
    } else {
      await loadDiveSites();
      setIsDialogOpen(false);
      setEditingSite(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading dive sites...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dive Sites</h1>
          <p className="text-muted-foreground">
            Manage your dive site locations
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Dive Site
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {diveSites.map((site) => (
          <Card key={site.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {site.name}
              </CardTitle>
              <CardDescription>
                {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {site.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {site.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(site)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(site)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {diveSites.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No dive sites yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your first dive site location
          </p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Dive Site
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSite ? 'Edit Dive Site' : 'Create New Dive Site'}
            </DialogTitle>
            <DialogDescription>
              {editingSite 
                ? 'Update the dive site information below.' 
                : 'Add a new dive site location to your database.'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Blue Hole, Great Barrier Reef"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g., -15.123456"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g., 145.123456"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this dive site..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSite ? 'Update' : 'Create'} Dive Site
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dive Site</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{siteToDelete?.name}"? This action cannot be undone.
              {siteToDelete && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Note: This dive site can only be deleted if no dives are associated with it.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiveSites;