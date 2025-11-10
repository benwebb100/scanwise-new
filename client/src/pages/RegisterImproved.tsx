import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";

// Country codes for phone numbers
const COUNTRY_CODES = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
  { code: "+34", country: "ES", flag: "🇪🇸" },
  { code: "+31", country: "NL", flag: "🇳🇱" },
  { code: "+46", country: "SE", flag: "🇸🇪" },
  { code: "+47", country: "NO", flag: "🇳🇴" },
  { code: "+45", country: "DK", flag: "🇩🇰" },
  { code: "+41", country: "CH", flag: "🇨🇭" },
  { code: "+43", country: "AT", flag: "🇦🇹" },
  { code: "+32", country: "BE", flag: "🇧🇪" },
  { code: "+351", country: "PT", flag: "🇵🇹" },
  { code: "+30", country: "GR", flag: "🇬🇷" },
  { code: "+48", country: "PL", flag: "🇵🇱" },
  { code: "+420", country: "CZ", flag: "🇨🇿" },
  { code: "+421", country: "SK", flag: "🇸🇰" },
  { code: "+36", country: "HU", flag: "🇭🇺" },
  { code: "+40", country: "RO", flag: "🇷🇴" },
  { code: "+359", country: "BG", flag: "🇧🇬" },
  { code: "+385", country: "HR", flag: "🇭🇷" },
  { code: "+386", country: "SI", flag: "🇸🇮" },
  { code: "+372", country: "EE", flag: "🇪🇪" },
  { code: "+371", country: "LV", flag: "🇱🇻" },
  { code: "+370", country: "LT", flag: "🇱🇹" },
  { code: "+358", country: "FI", flag: "🇫🇮" },
  { code: "+7", country: "RU", flag: "🇷🇺" },
  { code: "+380", country: "UA", flag: "🇺🇦" },
  { code: "+90", country: "TR", flag: "🇹🇷" },
  { code: "+972", country: "IL", flag: "🇮🇱" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
  { code: "+966", country: "SA", flag: "🇸🇦" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+82", country: "KR", flag: "🇰🇷" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
  { code: "+60", country: "MY", flag: "🇲🇾" },
  { code: "+66", country: "TH", flag: "🇹🇭" },
  { code: "+84", country: "VN", flag: "🇻🇳" },
  { code: "+63", country: "PH", flag: "🇵🇭" },
  { code: "+62", country: "ID", flag: "🇮🇩" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
  { code: "+52", country: "MX", flag: "🇲🇽" },
  { code: "+54", country: "AR", flag: "🇦🇷" },
  { code: "+56", country: "CL", flag: "🇨🇱" },
  { code: "+57", country: "CO", flag: "🇨🇴" },
  { code: "+51", country: "PE", flag: "🇵🇪" },
  { code: "+27", country: "ZA", flag: "🇿🇦" },
  { code: "+20", country: "EG", flag: "🇪🇬" },
  { code: "+234", country: "NG", flag: "🇳🇬" },
  { code: "+254", country: "KE", flag: "🇰🇪" },
];

const RegisterImproved = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    clinicName: "",
    clinicWebsite: "",
    phoneCountryCode: "+1",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.name || !formData.clinicName || 
        !formData.phoneNumber || !formData.streetAddress || !formData.city || !formData.country) {
      toast({ 
        title: "Missing information", 
        description: "Please complete all required fields.", 
        variant: "destructive" 
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ 
        title: "Password mismatch", 
        description: "Passwords do not match.", 
        variant: "destructive" 
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast({ 
        title: "Weak password", 
        description: "Password must be at least 6 characters long.", 
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Combine phone number with country code
      const fullPhoneNumber = `${formData.phoneCountryCode} ${formData.phoneNumber}`;
      
      // Combine address fields
      const fullAddress = [
        formData.streetAddress,
        formData.city,
        formData.state,
        formData.postalCode
      ].filter(Boolean).join(', ');

      // Prepare user data for registration
      const userData = {
        ...formData,
        phone: fullPhoneNumber,
        address: fullAddress
      };

      // Store registration data temporarily and create checkout session
      // The account will only be created after successful payment
      const checkoutData = await api.createRegistrationCheckout({
        userData: userData,
        interval: 'monthly'
      });
      
      // Redirect to Stripe checkout
      window.location.assign(checkoutData.url);
      
    } catch (error: any) {
      toast({ 
        title: "Registration failed", 
        description: error.message || String(error), 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
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

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">Create Your Account</CardTitle>
              <CardDescription>
                Join Scanwise and start creating professional dental reports
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Create a password (min 6 characters)"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>

                {/* Clinic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Clinic Information</h3>
                  
                  <div>
                    <Label htmlFor="clinicName">Clinic Name *</Label>
                    <Input
                      id="clinicName"
                      type="text"
                      value={formData.clinicName}
                      onChange={(e) => handleInputChange('clinicName', e.target.value)}
                      placeholder="Enter your clinic name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select value={formData.phoneCountryCode} onValueChange={(value) => handleInputChange('phoneCountryCode', value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {COUNTRY_CODES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <span className="flex items-center gap-2">
                                <span>{country.flag}</span>
                                <span>{country.code}</span>
                                <span className="text-xs text-gray-500">{country.country}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        placeholder="Enter phone number"
                        className="flex-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Clinic Address *</Label>
                    
                    <div>
                      <Input
                        id="streetAddress"
                        type="text"
                        value={formData.streetAddress}
                        onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                        placeholder="Street address"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City"
                        required
                      />
                      <Input
                        id="state"
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="State/Province"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="postalCode"
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        placeholder="Postal/Zip code"
                      />
                      <Input
                        id="country"
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        placeholder="Country"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="clinicWebsite">Clinic Website</Label>
                    <Input
                      id="clinicWebsite"
                      type="url"
                      value={formData.clinicWebsite}
                      onChange={(e) => handleInputChange('clinicWebsite', e.target.value)}
                      placeholder="https://your-clinic.com (optional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Enter your country"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-blue-600 hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Complete secure payment with Stripe</li>
                  <li>2. Your account will be created automatically</li>
                  <li>3. Start creating professional reports immediately</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterImproved;
