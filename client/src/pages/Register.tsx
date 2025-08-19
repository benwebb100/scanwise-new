
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Brain, Upload, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/services/supabase";
import { api } from "@/services/api";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    clinicName: "",
    clinicWebsite: "",
    country: "",
    pricingSheet: null as File | null
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData({ ...formData, pricingSheet: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.name || !formData.clinicName || !formData.country) {
      toast({ title: "Missing information", description: "Please complete all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) Sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            clinic_name: formData.clinicName,
            clinic_website: formData.clinicWebsite,
            country: formData.country,
          }
        }
      });
      if (signUpError) throw signUpError;

      // If email confirmation is required, there will be no session
      if (!signUpData.session) {
        toast({
          title: "Confirm your email",
          description: "We've sent a verification link. After confirming, sign in to continue to payment.",
        });
        navigate("/login");
        return;
      }

      // 2) Optionally save branding basics (non-blocking)
      try {
        await api.saveClinicBranding({ clinic_name: formData.clinicName, website: formData.clinicWebsite });
      } catch {}

      // 3) Create Stripe checkout and redirect
      const checkout = await api.createCheckout('monthly');
      window.location.assign(checkout.url);
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message || String(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
              Scanwise
            </span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Registration Form */}
      <div className="py-12 px-6">
        <div className="container mx-auto max-w-2xl">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Create Your Account
              </CardTitle>
              <CardDescription className="text-lg">
                Join the future of dental diagnostics
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input 
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. John Smith"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input 
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="doctor@clinic.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicName">Clinic Name *</Label>
                  <Input 
                    id="clinicName"
                    value={formData.clinicName}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                    placeholder="Bright Smile Dental Clinic"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="clinicWebsite">Clinic Website</Label>
                    <Input 
                      id="clinicWebsite"
                      type="url"
                      value={formData.clinicWebsite}
                      onChange={(e) => setFormData({ ...formData, clinicWebsite: e.target.value })}
                      placeholder="https://brightsmile.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="au">Australia</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricingSheet">Clinic Pricing Sheet</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <Label htmlFor="pricingSheet" className="cursor-pointer text-blue-600 hover:text-blue-700">
                        Click to upload your pricing sheet
                      </Label>
                      <p className="text-sm text-gray-500">
                        PDF, Excel, or Word document (Max 10MB)
                      </p>
                      <Input 
                        id="pricingSheet"
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.xlsx,.xls,.doc,.docx"
                        className="hidden"
                      />
                    </div>
                    {formData.pricingSheet && (
                      <p className="mt-2 text-sm text-green-600">
                        ✓ {formData.pricingSheet.name} uploaded
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Optional: Upload your current pricing structure. Scanwise will handle insurance mapping separately.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg py-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</span>
                  ) : (
                    "Create Account & Subscribe"
                  )}
                </Button>
                
                <p className="text-center text-sm text-gray-500">
                  Already have an account?{" "}
                  <button 
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
