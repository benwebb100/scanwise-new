import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle, AlertCircle, Clock, DollarSign, Calendar, User, Phone, Globe } from "lucide-react";

interface InsuranceProvider {
  id: string;
  name: string;
  phone: string;
  website: string;
}

interface PatientInsurance {
  patient_id: string;
  patient_name: string;
  insurance_provider: string;
  policy_number: string;
  group_number?: string;
  subscriber_name: string;
  subscriber_relationship: string;
  effective_date: string;
  expiration_date: string;
  copay_amount?: number;
  deductible_remaining?: number;
  max_annual_benefit?: number;
  last_verified?: string;
}

interface VerificationResult {
  verification_id: string;
  status: string;
  coverage_details?: any;
  estimated_costs?: any;
  verification_date: string;
  next_verification_due?: string;
  notes?: string;
}

const InsuranceVerification = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("verify");
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [patientInsurance, setPatientInsurance] = useState<PatientInsurance | null>(null);

  // Form states
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberRelationship, setSubscriberRelationship] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [copayAmount, setCopayAmount] = useState("");
  const [deductibleRemaining, setDeductibleRemaining] = useState("");
  const [maxAnnualBenefit, setMaxAnnualBenefit] = useState("");

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await api.getInsuranceProviders();
      setProviders(response.providers || []);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
      toast({
        title: "Error",
        description: "Failed to load insurance providers",
        variant: "destructive",
      });
    }
  };

  const handleVerifyInsurance = async () => {
    if (!patientId || !selectedProvider || !policyNumber || !subscriberName || !dateOfBirth) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await api.verifyInsurance({
        patient_id: patientId,
        insurance_provider: selectedProvider,
        policy_number: policyNumber,
        group_number: groupNumber || undefined,
        subscriber_name: subscriberName,
        subscriber_relationship: subscriberRelationship,
        date_of_birth: dateOfBirth,
        treatment_codes: ["D0150", "D0210", "D2330"], // Common dental codes
      });

      setVerificationResult(result);
      toast({
        title: "Verification Complete",
        description: "Insurance verification completed successfully",
      });
    } catch (error) {
      console.error("Verification failed:", error);
      toast({
        title: "Verification Failed",
        description: "Failed to verify insurance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInsurance = async () => {
    if (!patientId || !patientName || !selectedProvider || !policyNumber || !subscriberName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.savePatientInsurance({
        patient_id: patientId,
        patient_name: patientName,
        insurance_provider: selectedProvider,
        policy_number: policyNumber,
        group_number: groupNumber || undefined,
        subscriber_name: subscriberName,
        subscriber_relationship: subscriberRelationship,
        effective_date: effectiveDate,
        expiration_date: expirationDate,
        copay_amount: copayAmount ? parseFloat(copayAmount) : undefined,
        deductible_remaining: deductibleRemaining ? parseFloat(deductibleRemaining) : undefined,
        max_annual_benefit: maxAnnualBenefit ? parseFloat(maxAnnualBenefit) : undefined,
      });

      toast({
        title: "Insurance Saved",
        description: "Patient insurance information saved successfully",
      });

      // Reset form
      setPatientId("");
      setPatientName("");
      setSelectedProvider("");
      setPolicyNumber("");
      setGroupNumber("");
      setSubscriberName("");
      setSubscriberRelationship("");
      setEffectiveDate("");
      setExpirationDate("");
      setCopayAmount("");
      setDeductibleRemaining("");
      setMaxAnnualBenefit("");
    } catch (error) {
      console.error("Save failed:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save insurance information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLookupInsurance = async () => {
    if (!patientId) {
      toast({
        title: "Missing Patient ID",
        description: "Please enter a patient ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.getPatientInsurance(patientId);
      setPatientInsurance(response.insurance_data);
      toast({
        title: "Insurance Found",
        description: "Patient insurance information retrieved",
      });
    } catch (error) {
      console.error("Lookup failed:", error);
      toast({
        title: "Lookup Failed",
        description: "No insurance information found for this patient",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Insurance Verification</h1>
            <p className="text-gray-600">Verify patient insurance coverage and manage insurance information</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="verify" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Verify Coverage
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Manage Insurance
            </TabsTrigger>
            <TabsTrigger value="lookup" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Lookup Patient
            </TabsTrigger>
          </TabsList>

          {/* Verify Coverage Tab */}
          <TabsContent value="verify" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Verify Insurance Coverage
                </CardTitle>
                <CardDescription>
                  Enter patient and insurance information to verify coverage and get cost estimates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientId">Patient ID *</Label>
                    <Input
                      id="patientId"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="Enter patient ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider">Insurance Provider *</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policyNumber">Policy Number *</Label>
                    <Input
                      id="policyNumber"
                      value={policyNumber}
                      onChange={(e) => setPolicyNumber(e.target.value)}
                      placeholder="Enter policy number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupNumber">Group Number</Label>
                    <Input
                      id="groupNumber"
                      value={groupNumber}
                      onChange={(e) => setGroupNumber(e.target.value)}
                      placeholder="Enter group number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subscriberName">Subscriber Name *</Label>
                    <Input
                      id="subscriberName"
                      value={subscriberName}
                      onChange={(e) => setSubscriberName(e.target.value)}
                      placeholder="Enter subscriber name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship *</Label>
                    <Select value={subscriberRelationship} onValueChange={setSubscriberRelationship}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self">Self</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Dependent">Dependent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleVerifyInsurance}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Verifying..." : "Verify Coverage"}
                </Button>
              </CardContent>
            </Card>

            {/* Verification Results */}
            {verificationResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Verification Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(verificationResult.status)}>
                      {verificationResult.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Verified on {new Date(verificationResult.verification_date).toLocaleDateString()}
                    </span>
                  </div>

                  {verificationResult.coverage_details && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Coverage Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <Badge variant="outline">{verificationResult.coverage_details.eligibility_status}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Annual Maximum:</span>
                            <span>${verificationResult.coverage_details.annual_maximum}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Deductible Remaining:</span>
                            <span>${verificationResult.coverage_details.deductible.remaining}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Benefits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {Object.entries(verificationResult.coverage_details.benefits).map(([type, benefit]: [string, any]) => (
                            <div key={type} className="flex justify-between">
                              <span className="capitalize">{type}:</span>
                              <span>{benefit.coverage}%</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {verificationResult.estimated_costs && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Cost Estimates</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(verificationResult.estimated_costs).map(([code, cost]: [string, any]) => (
                            <div key={code} className="flex justify-between items-center p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{cost.treatment_name}</div>
                                <div className="text-sm text-gray-600">Code: {code}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">${cost.total_cost}</div>
                                <div className="text-sm text-green-600">
                                  Insurance: ${cost.insurance_coverage}
                                </div>
                                <div className="text-sm text-red-600">
                                  Patient: ${cost.patient_responsibility}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Manage Insurance Tab */}
          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Manage Patient Insurance
                </CardTitle>
                <CardDescription>
                  Add or update patient insurance information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="managePatientId">Patient ID *</Label>
                    <Input
                      id="managePatientId"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="Enter patient ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managePatientName">Patient Name *</Label>
                    <Input
                      id="managePatientName"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter patient name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manageProvider">Insurance Provider *</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managePolicyNumber">Policy Number *</Label>
                    <Input
                      id="managePolicyNumber"
                      value={policyNumber}
                      onChange={(e) => setPolicyNumber(e.target.value)}
                      placeholder="Enter policy number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manageGroupNumber">Group Number</Label>
                    <Input
                      id="manageGroupNumber"
                      value={groupNumber}
                      onChange={(e) => setGroupNumber(e.target.value)}
                      placeholder="Enter group number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manageSubscriberName">Subscriber Name *</Label>
                    <Input
                      id="manageSubscriberName"
                      value={subscriberName}
                      onChange={(e) => setSubscriberName(e.target.value)}
                      placeholder="Enter subscriber name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manageRelationship">Relationship *</Label>
                    <Select value={subscriberRelationship} onValueChange={setSubscriberRelationship}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self">Self</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Dependent">Dependent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effectiveDate">Effective Date *</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expirationDate">Expiration Date *</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="copayAmount">Copay Amount</Label>
                    <Input
                      id="copayAmount"
                      type="number"
                      value={copayAmount}
                      onChange={(e) => setCopayAmount(e.target.value)}
                      placeholder="Enter copay amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deductibleRemaining">Deductible Remaining</Label>
                    <Input
                      id="deductibleRemaining"
                      type="number"
                      value={deductibleRemaining}
                      onChange={(e) => setDeductibleRemaining(e.target.value)}
                      placeholder="Enter deductible remaining"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAnnualBenefit">Max Annual Benefit</Label>
                    <Input
                      id="maxAnnualBenefit"
                      type="number"
                      value={maxAnnualBenefit}
                      onChange={(e) => setMaxAnnualBenefit(e.target.value)}
                      placeholder="Enter max annual benefit"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveInsurance}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Saving..." : "Save Insurance Information"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lookup Patient Tab */}
          <TabsContent value="lookup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Lookup Patient Insurance
                </CardTitle>
                <CardDescription>
                  Search for existing patient insurance information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lookupPatientId">Patient ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="lookupPatientId"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="Enter patient ID"
                    />
                    <Button
                      onClick={handleLookupInsurance}
                      disabled={loading}
                    >
                      {loading ? "Searching..." : "Search"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lookup Results */}
            {patientInsurance && (
              <Card>
                <CardHeader>
                  <CardTitle>Patient Insurance Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Patient Name</Label>
                      <div className="p-2 bg-gray-50 rounded">{patientInsurance.patient_name}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Insurance Provider</Label>
                      <div className="p-2 bg-gray-50 rounded">{patientInsurance.insurance_provider}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Policy Number</Label>
                      <div className="p-2 bg-gray-50 rounded">{patientInsurance.policy_number}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Group Number</Label>
                      <div className="p-2 bg-gray-50 rounded">{patientInsurance.group_number || "N/A"}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Subscriber Name</Label>
                      <div className="p-2 bg-gray-50 rounded">{patientInsurance.subscriber_name}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <div className="p-2 bg-gray-50 rounded">{patientInsurance.subscriber_relationship}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Effective Date</Label>
                      <div className="p-2 bg-gray-50 rounded">{patientInsurance.effective_date}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Expiration Date</Label>
                      <div className="p-2 bg-gray-50 rounded">{patientInsurance.expiration_date}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Copay Amount</Label>
                      <div className="p-2 bg-gray-50 rounded">
                        ${patientInsurance.copay_amount || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Deductible Remaining</Label>
                      <div className="p-2 bg-gray-50 rounded">
                        ${patientInsurance.deductible_remaining || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Annual Benefit</Label>
                      <div className="p-2 bg-gray-50 rounded">
                        ${patientInsurance.max_annual_benefit || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Last Verified</Label>
                      <div className="p-2 bg-gray-50 rounded">
                        {patientInsurance.last_verified ? 
                          new Date(patientInsurance.last_verified).toLocaleDateString() : 
                          "Never"
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InsuranceVerification;
