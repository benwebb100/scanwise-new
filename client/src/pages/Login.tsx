import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/services/supabase";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        toast({
          title: "Welcome back!",
          description: "Successfully logged in to Scanwise.",
        });
        
        // Navigate to dashboard
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Handle specific error cases
      let errorMessage = "Failed to sign in. Please try again.";
      
      if (error.message) {
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please verify your email before signing in";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!credentials.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first",
        variant: "destructive"
      });
      return;
    }

    setIsResettingPassword(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(credentials.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Check if user is already logged in
  useState(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  });

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
              Scanwise
            </span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Login Form */}
      <div className="py-20 px-6">
        <div className="container mx-auto max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-lg">
                Sign in to your Scanwise account
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    placeholder="doctor@clinic.com"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg py-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                
                <div className="text-center space-y-2">
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResettingPassword || isLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
                  >
                    {isResettingPassword ? "Sending reset email..." : "Forgot your password?"}
                  </button>
                  
                  <p className="text-sm text-gray-500">
                    Don't have an account?{" "}
                    <button 
                      type="button"
                      onClick={() => navigate("/register")}
                      className="text-blue-600 hover:text-blue-700 underline"
                      disabled={isLoading}
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </form>

              {/* Demo credentials for testing */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Demo Credentials:</p>
                  <p className="text-xs font-mono">Email: test@example.com</p>
                  <p className="text-xs font-mono">Password: TestPassword123!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;