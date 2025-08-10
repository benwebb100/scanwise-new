import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

const BillingSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        toast({
          title: "Invalid Session",
          description: "No payment session found. Please try again.",
          variant: "destructive"
        });
        navigate('/register');
        return;
      }

      try {
        // Verify the payment session with your backend
        const response = await api.verifyPayment(sessionId);
        
        if (response.success) {
          setVerified(true);
          toast({
            title: "Payment Successful!",
            description: "Your subscription is now active. Welcome to Scanwise!",
          });
          
          // Redirect to dashboard after short delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          title: "Verification Failed",
          description: "We couldn't verify your payment. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate, toast]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Verifying Payment...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              Please wait while we confirm your subscription.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            {verified ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-600" />
            )}
          </div>
          <CardTitle>
            {verified ? "Payment Successful!" : "Payment Issue"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {verified ? (
            <>
              <p className="text-gray-600">
                Welcome to Scanwise! Your subscription is now active.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to dashboard in a few seconds...
              </p>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                There was an issue verifying your payment. Please contact support if your payment was charged.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => navigate('/register')}
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Sign In Instead
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSuccess;
