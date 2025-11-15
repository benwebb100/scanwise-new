import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface FollowUpReport {
  report_id: string;
  patient_name: string;
  patient_email: string;
  sent_at: string;
  urgency_level: 'high' | 'medium' | 'low';
  has_emergency_conditions: boolean;
  auto_followup_sent_at?: string;
  team_notification_sent_at?: string;
  patient_diagnosis?: {
    findings: any[];
  };
}

interface FollowUpsData {
  high: FollowUpReport[];
  medium: FollowUpReport[];
  low: FollowUpReport[];
  total: number;
}

export function FollowUpsTab() {
  const [followUps, setFollowUps] = useState<FollowUpsData>({
    high: [],
    medium: [],
    low: [],
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FollowUpReport | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadFollowUps();
  }, []);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      const data = await api.getFollowUps();
      setFollowUps(data);
    } catch (error) {
      console.error('Error loading follow-ups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load follow-ups',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteFollowUp = async () => {
    if (!selectedReport) return;

    try {
      setCompletingId(selectedReport.report_id);
      await api.markFollowUpComplete(selectedReport.report_id, notes || undefined);
      
      toast({
        title: 'Follow-up Completed',
        description: `Marked ${selectedReport.patient_name}'s follow-up as complete`,
      });

      // Reload data
      await loadFollowUps();
      
      // Close dialog
      setNotesDialogOpen(false);
      setSelectedReport(null);
      setNotes('');
    } catch (error) {
      console.error('Error completing follow-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark follow-up as complete',
        variant: 'destructive'
      });
    } finally {
      setCompletingId(null);
    }
  };

  const openNotesDialog = (report: FollowUpReport) => {
    setSelectedReport(report);
    setNotesDialogOpen(true);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getUrgencyEmoji = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const calculateTimeSince = (sentAt: string) => {
    const sent = new Date(sentAt);
    const now = new Date();
    const hours = Math.floor((now.getTime() - sent.getTime()) / (1000 * 60 * 60));
    
    if (hours < 24) {
      return `${hours}h ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderFollowUpCard = (report: FollowUpReport) => (
    <Card key={report.report_id} className="mb-4 hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg text-gray-900">
                {report.patient_name}
              </h3>
              <Badge className={getUrgencyColor(report.urgency_level)}>
                {getUrgencyEmoji(report.urgency_level)} {report.urgency_level.toUpperCase()}
              </Badge>
              {report.has_emergency_conditions && (
                <Badge className="bg-red-600 text-white">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  EMERGENCY
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-1">
              Email: {report.patient_email}
            </p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Sent {calculateTimeSince(report.sent_at)}</span>
              </div>
              
              {report.auto_followup_sent_at && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Follow-up Email Sent
                </Badge>
              )}
              
              {report.team_notification_sent_at && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  Team Notified
                </Badge>
              )}
            </div>
          </div>
          
          <Button
            onClick={() => openNotesDialog(report)}
            disabled={completingId === report.report_id}
            className="ml-4"
          >
            {completingId === report.report_id ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (followUps.total === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          All Caught Up!
        </h3>
        <p className="text-gray-600">
          No follow-ups needed at this time. All patients have opened their reports.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {followUps.total} Report{followUps.total !== 1 ? 's' : ''} Need Follow-Up
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  These patients haven't opened their treatment reports yet
                </p>
              </div>
              <Button onClick={loadFollowUps} variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* High Priority */}
        {followUps.high.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🔴 High Priority ({followUps.high.length})
              <span className="text-sm font-normal text-gray-600">
                - Emergency conditions detected
              </span>
            </h3>
            {followUps.high.map(renderFollowUpCard)}
          </div>
        )}

        {/* Medium Priority */}
        {followUps.medium.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🟡 Medium Priority ({followUps.medium.length})
              <span className="text-sm font-normal text-gray-600">
                - Complex treatment required
              </span>
            </h3>
            {followUps.medium.map(renderFollowUpCard)}
          </div>
        )}

        {/* Low Priority */}
        {followUps.low.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🟢 Low Priority ({followUps.low.length})
              <span className="text-sm font-normal text-gray-600">
                - Routine follow-up
              </span>
            </h3>
            {followUps.low.map(renderFollowUpCard)}
          </div>
        )}
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Follow-Up</DialogTitle>
            <DialogDescription>
              Mark this follow-up as complete. Add any notes about your interaction with {selectedReport?.patient_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Called patient, they will book appointment next week..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNotesDialogOpen(false);
                setSelectedReport(null);
                setNotes('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCompleteFollowUp}>
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

