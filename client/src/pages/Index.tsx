import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Index() {
  const rotatingPhrases = [
    "AI-Powered X-Ray Analysis",
    "One-Click Treatment Plan Generation",
    "Personalized Patient Explainer Videos"
  ];

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [nextPhraseIndex, setNextPhraseIndex] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setNextPhraseIndex((currentPhraseIndex + 1) % rotatingPhrases.length);
      
      setTimeout(() => {
        setCurrentPhraseIndex((prev) => (prev + 1) % rotatingPhrases.length);
      }, 300); // Switch phrase mid-animation
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 800); // Complete animation duration
    }, 3500); // Show each phrase for 3.5 seconds

    return () => clearInterval(interval);
  }, [currentPhraseIndex, rotatingPhrases.length]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center p-1.5">
                <img 
                  src="/scanwise-logo.png" 
                  alt="ScanWise Logo" 
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-blue-600">ScanWise</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/login" className="text-sm sm:text-base text-gray-700 hover:text-gray-900 font-medium">
                Sign In
              </Link>
              <Link to="/register-improved">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base px-3 sm:px-4 py-2">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-teal-50 py-12 sm:py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-full text-sm sm:text-base font-semibold mb-6 sm:mb-8 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              AI-Powered Dental Report Generation
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight px-4 sm:px-0">
              Automate Treatment Plan Generation &<br />
              Increase Case Acceptance With<br />
              <span className="relative inline-block" style={{ minHeight: '1.2em', verticalAlign: 'bottom', overflow: 'hidden' }}>
                {/* Current phrase sliding out */}
                <span 
                  className={`inline-block bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent transition-all duration-500 ease-in-out ${
                    isAnimating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
                  }`}
                  style={{ 
                    position: isAnimating ? 'absolute' : 'relative',
                    top: 0,
                    left: 0
                  }}
                >
                  {rotatingPhrases[currentPhraseIndex]}
                </span>
                {/* Next phrase sliding in from below with bounce */}
                <span 
                  className={`inline-block bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent ${
                    isAnimating ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ 
                    position: isAnimating ? 'relative' : 'absolute',
                    animation: isAnimating ? 'slideInBounce 0.5s ease-out forwards' : 'none',
                    transform: isAnimating ? 'none' : 'translateY(100%)'
                  }}
                >
                  {rotatingPhrases[nextPhraseIndex]}
                </span>
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed px-4 sm:px-0">
              Connect your imaging software, let AI analyze X-rays, and generate comprehensive patient reports 
              with annotated images, treatment plans, insurance codes, and educational videos—all automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Link to="/register-improved" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-lg">
                  Start Free Trial →
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg border-2">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How ScanWise Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From X-ray to patient-ready report in four simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Auto-Connect</h3>
              <p className="text-gray-600">
                Seamlessly connects to your imaging software via AWS. New X-rays automatically flow into ScanWise.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis</h3>
              <p className="text-gray-600">
                Advanced AI analyzes your panoramic X-rays in seconds, detecting conditions, mapping teeth, and identifying treatment needs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Review & Customize</h3>
              <p className="text-gray-600">
                Review AI findings, adjust treatments, organize into stages, and customize pricing—all in one intuitive interface.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">4</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Report</h3>
              <p className="text-gray-600">
                One click generates a professional PDF report with annotated X-rays, treatment plans, insurance codes, and patient education videos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 via-blue-100 to-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose ScanWise?</h2>
            <p className="text-xl text-gray-700">Everything you need for professional patient reports</p>
          </div>

          <div className="space-y-6">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">AI-Enhanced Analysis</h3>
                  <p className="text-gray-600 mb-4 text-lg">
                    Advanced machine learning algorithms analyze panoramic X-rays and highlight potential issues with precision.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Automated tooth mapping</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Condition detection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Tooth-aware treatment suggestions</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">Streamlined Workflow</h3>
                  <p className="text-gray-600 mb-4 text-lg">
                    Generate comprehensive reports in minutes, not hours. Focus on patient care, not paperwork.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">One-click report generation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Treatment stage organization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Automated insurance code mapping</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">HIPAA Compliant</h3>
                  <p className="text-gray-600 mb-4 text-lg">
                    Enterprise-grade security for patient data protection. Built for healthcare compliance.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">End-to-end encryption</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Secure cloud storage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Audit trail logging</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Report Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What's Included in Every Report</h2>
            <p className="text-xl text-gray-600">Professional, comprehensive patient communication tools</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">📊 Annotated X-Ray Images</h4>
              <p className="text-gray-600 text-sm">AI-highlighted conditions with color-coded legend</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">📋 Treatment Plan Stages</h4>
              <p className="text-gray-600 text-sm">Organized treatment phases with duration and cost</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">💡 Condition Explanations</h4>
              <p className="text-gray-600 text-sm">Patient-friendly explanations of each condition</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">🏥 Insurance Codes</h4>
              <p className="text-gray-600 text-sm">ADA codes automatically mapped to treatments</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">🎥 Educational Videos</h4>
              <p className="text-gray-600 text-sm">AI-generated personalized patient education videos</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">📧 Email-Ready PDFs</h4>
              <p className="text-gray-600 text-sm">Professional PDF reports ready to email to patients</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join dental clinics already using ScanWise to streamline their report generation workflow 
            and improve patient communication.
          </p>
          <Link to="/register-improved">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold">
              Start Your Free Trial Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center p-1.5">
              <img 
                src="/scanwise-logo.png" 
                alt="ScanWise Logo" 
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-xl font-bold text-white">ScanWise</span>
          </div>
          <p className="text-center text-sm">
            © {new Date().getFullYear()} ScanWise. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
