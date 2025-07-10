import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Brain, Plus, Calendar, FileText, User, Settings, LogOut, Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  patientName: string;
  patientId: string;
  scanDate: string;
  status: string;
  teethAnalyzed: number;
  conditions: string[];
  createdAt: string;
  summary?: string;
  imageUrl?: string;
  annotatedImageUrl?: string;
}

interface Stats {
  totalReports: number;
  thisMonth: number;
  avgProcessing: string;
  successRate: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Doctor");
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    thisMonth: 0,
    avgProcessing: "2.3min",
    successRate: "98.5%"
  });

  useEffect(() => {
    checkAuth();
    fetchDiagnoses();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        // Extract name from email or metadata
        const name = user.user_metadata?.name || user.email?.split('@')[0] || "Doctor";
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate("/");
    }
  };

  const fetchDiagnoses = async () => {
    try {
      setLoading(true);
      const data = await api.getDiagnoses(50, 0); // Fetch more for stats
      
      // Transform the data to match our Report interface
      const transformedReports: Report[] = data.diagnoses.map((diagnosis: any) => ({
        id: diagnosis.id || `RPT-${Date.now()}`,
        patientName: diagnosis.patientName,
        patientId: diagnosis.patientId,
        scanDate: diagnosis.createdAt,
        status: "Completed",
        teethAnalyzed: diagnosis.teethAnalyzed || 0,
        conditions: diagnosis.conditions || [],
        createdAt: diagnosis.createdAt,
        summary: diagnosis.summary,
        imageUrl: diagnosis.imageUrl,
        annotatedImageUrl: diagnosis.annotatedImageUrl
      }));
      
      setReports(transformedReports);
      
      // Calculate stats
      const now = new Date();
      const thisMonthReports = transformedReports.filter((report) => {
        const reportDate = new Date(report.createdAt);
        return reportDate.getMonth() === now.getMonth() && 
               reportDate.getFullYear() === now.getFullYear();
      });
      
      setStats({
        totalReports: transformedReports.length,
        thisMonth: thisMonthReports.length,
        avgProcessing: "2.3min", // This could be calculated from actual processing times
        successRate: "98.5%" // This could be calculated from actual success/failure rates
      });
      
    } catch (error) {
      console.error('Error fetching diagnoses:', error);
      toast({
        title: "Error",
        description: "Failed to load reports. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "In Progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const filteredReports = reports.filter(report =>
    report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewReport = (report: Report) => {
    // Navigate to report detail page or open modal
    navigate(`/report/${report.id}`, { state: { report } });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Scanwise
              </span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <button className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
                Dashboard
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                Reports
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                Analytics
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4 mr-2" />
              Dr. {userName}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, Dr. {userName}
            </h1>
            <p className="text-gray-600">
              {userEmail} • Last login: {formatDate(new Date().toISOString())}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Reports</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalReports}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.thisMonth}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-teal-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Processing</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgProcessing}</p>
                  </div>
                  <Brain className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.successRate}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Action Button */}
          <div className="mb-8">
            <Button 
              size="lg"
              onClick={() => navigate("/create-report")}
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg px-8 py-4"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Report
            </Button>
          </div>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Reports</CardTitle>
                  <CardDescription>
                    Your latest AI-generated diagnostic reports
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchDiagnoses}>
                    <Filter className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading reports...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {filteredReports.map((report) => (
                      <div 
                        key={report.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewReport(report)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">{report.patientName}</h3>
                              <p className="text-sm text-gray-600">Patient ID: {report.patientId}</p>
                            </div>
                            <Badge className={getStatusColor(report.status)}>
                              {report.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">Report #{report.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(report.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span>{report.teethAnalyzed} teeth analyzed</span>
                            {report.conditions.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-xs">
                                  {report.conditions.slice(0, 3).join(", ")}
                                  {report.conditions.length > 3 && ` +${report.conditions.length - 3} more`}
                                </span>
                              </>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReport(report);
                            }}
                          >
                            View Report
                          </Button>
                        </div>

                        {report.summary && (
                          <div className="mt-3 text-sm text-gray-500 line-clamp-2">
                            {report.summary}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {filteredReports.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">
                        {searchTerm 
                          ? "No reports found matching your search." 
                          : "No reports yet. Create your first report to get started."}
                      </p>
                      {!searchTerm && (
                        <Button onClick={() => navigate("/create-report")}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Report
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;