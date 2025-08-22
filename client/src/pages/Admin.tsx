import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Cloud, 
  Users, 
  Activity,
  Eye,
  Edit,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

interface Clinic {
  clinic_name: string;
  clinic_id: string;
  status: string;
  setup_completed: boolean;
  created_at?: string;
  imaging_provider?: string;
  setup_notes?: string;
  setup_completed_at?: string;
}

interface AdminDashboard {
  total_clinics: number;
  pending_setup: number;
  setup_completed: number;
  active_clinics: number;
  recent_clinics: number;
}

const Admin = () => {
  const { toast } = useToast();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [imagingProvider, setImagingProvider] = useState('');
  const [setupNotes, setSetupNotes] = useState('');
  const [s3Status, setS3Status] = useState<any>(null);

  // Admin credentials (you can move these to environment variables later)
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'scanwise2025';

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data
      const dashboardResponse = await fetch('/api/v1/admin/dashboard', {
        headers: {
          'username': ADMIN_USERNAME,
          'password': ADMIN_PASSWORD
        }
      });
      
      if (dashboardResponse.ok) {
        try {
          const dashboardData = await dashboardResponse.json();
          setDashboard(dashboardData.dashboard);
        } catch (parseError) {
          console.error('Failed to parse dashboard response:', parseError);
          const responseText = await dashboardResponse.text();
          console.error('Response text:', responseText);
        }
      } else {
        console.error('Dashboard response not ok:', dashboardResponse.status, dashboardResponse.statusText);
        const responseText = await dashboardResponse.text();
        console.error('Response text:', responseText);
      }

      // Fetch clinics list
      const clinicsResponse = await fetch('/api/v1/admin/clinics', {
        headers: {
          'username': ADMIN_USERNAME,
          'password': ADMIN_PASSWORD
        }
      });
      
      if (clinicsResponse.ok) {
        try {
          const clinicsData = await clinicsResponse.json();
          setClinics(clinicsData.clinics);
        } catch (parseError) {
          console.error('Failed to parse clinics response:', parseError);
          const responseText = await clinicsResponse.text();
          console.error('Response text:', responseText);
        }
      } else {
        console.error('Clinics response not ok:', clinicsResponse.status, clinicsResponse.statusText);
        const responseText = await clinicsResponse.text();
        console.error('Response text:', responseText);
      }

      // Fetch S3 status
      const s3Response = await fetch('/api/v1/admin/s3/status', {
        headers: {
          'username': ADMIN_USERNAME,
          'password': ADMIN_PASSWORD
        }
      });
      
      if (s3Response.ok) {
        try {
          const s3Data = await s3Response.json();
          setS3Status(s3Data);
        } catch (parseError) {
          console.error('Failed to parse S3 status response:', parseError);
          const responseText = await s3Response.text();
          console.error('Response text:', responseText);
        }
      } else {
        console.error('S3 status response not ok:', s3Response.status, s3Response.statusText);
        const responseText = await s3Response.text();
        console.error('Response text:', responseText);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin data. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = async (clinicId: string) => {
    try {
      const response = await fetch(`/api/v1/admin/clinics/${clinicId}/setup-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'username': ADMIN_USERNAME,
          'password': ADMIN_PASSWORD
        },
        body: JSON.stringify({
          imaging_provider: imagingProvider,
          notes: setupNotes
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Clinic setup marked as completed"
        });
        setShowSetupModal(false);
        setSelectedClinic(null);
        setImagingProvider('');
        setSetupNotes('');
        fetchAdminData(); // Refresh data
      } else {
        throw new Error('Failed to update clinic status');
      }
    } catch (error) {
      console.error('Error updating clinic status:', error);
      toast({
        title: "Error",
        description: "Failed to update clinic status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_setup':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'setup_completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_setup':
        return <Clock className="w-4 h-4" />;
      case 'setup_completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'active':
        return <Activity className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredClinics = clinics.filter(clinic =>
    clinic.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.clinic_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin panel...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage clinics and monitor S3 integration</p>
        </div>

        {/* Dashboard Overview */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clinics</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.total_clinics}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{dashboard.pending_setup}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Setup Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboard.setup_completed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clinics</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboard.active_clinics}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* S3 Status */}
        {s3Status && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                S3 Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge 
                  className={s3Status.connection_test ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                >
                  {s3Status.s3_connection}
                </Badge>
                <span className="text-sm text-gray-600">
                  Bucket: {s3Status.bucket_name} | Region: {s3Status.region}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clinics Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Clinics Management</CardTitle>
                <CardDescription>
                  Monitor clinic setup progress and manage S3 integration
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search clinics..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" onClick={fetchAdminData}>
                  <Filter className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredClinics.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No clinics found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClinics.map((clinic) => (
                  <div key={clinic.clinic_id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{clinic.clinic_name}</h3>
                          <p className="text-sm text-gray-600">ID: {clinic.clinic_id}</p>
                          {clinic.imaging_provider && (
                            <p className="text-sm text-gray-500">
                              Imaging: {clinic.imaging_provider}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(clinic.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(clinic.status)}
                            {clinic.status.replace('_', ' ')}
                          </div>
                        </Badge>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClinic(clinic);
                              setShowSetupModal(true);
                            }}
                            disabled={clinic.setup_completed}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {!clinic.setup_completed && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedClinic(clinic);
                                setShowSetupModal(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {clinic.setup_notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Setup Notes:</strong> {clinic.setup_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Complete Modal */}
        {showSetupModal && selectedClinic && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                Mark Setup Complete - {selectedClinic.clinic_name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="imaging-provider">Imaging Provider</Label>
                  <Input
                    id="imaging-provider"
                    value={imagingProvider}
                    onChange={(e) => setImagingProvider(e.target.value)}
                    placeholder="e.g., Carestream, Planmeca, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="setup-notes">Setup Notes</Label>
                  <Textarea
                    id="setup-notes"
                    value={setupNotes}
                    onChange={(e) => setSetupNotes(e.target.value)}
                    placeholder="Any additional notes about the setup..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => handleSetupComplete(selectedClinic.clinic_id)}
                  disabled={!imagingProvider.trim()}
                >
                  Mark Complete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSetupModal(false);
                    setSelectedClinic(null);
                    setImagingProvider('');
                    setSetupNotes('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
