import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/services/supabase";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Reset Link Sent!",
        description: "Check your email for the password reset link.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              ScanWise
            </span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/login")} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </div>
      </header>

      {/* Forgot Password Form */}
      <div className="py-20 px-6">
        <div className="container mx-auto max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                {emailSent ? "Check Your Email" : "Reset Password"}
              </CardTitle>
              <CardDescription className="text-lg">
                {emailSent 
                  ? "We've sent you a password reset link"
                  : "Enter your email to receive a reset link"
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {emailSent ? (
                <div className="text-center space-y-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm">
                      A password reset link has been sent to <strong>{email}</strong>
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Didn't receive the email? Check your spam folder or try again.
                    </p>
                    
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEmailSent(false);
                          setEmail("");
                        }}
                        className="w-full"
                      >
                        Try Different Email
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        onClick={() => navigate("/login")}
                        className="w-full"
                      >
                        Back to Login
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@clinic.com"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                    <p className="text-sm text-gray-500">
                      Enter the email address associated with your account
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg py-3"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Reset Link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Remember your password?{" "}
                      <button 
                        type="button"
                        onClick={() => navigate("/login")}
                        className="text-blue-600 hover:text-blue-700 underline"
                        disabled={isLoading}
                      >
                        Sign in here
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
