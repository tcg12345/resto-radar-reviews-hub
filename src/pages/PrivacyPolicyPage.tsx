import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export default function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  return (
    <>
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px] bg-background"></div>
      <div className="min-h-screen bg-background w-full">
        {/* Header */}
        <div className="border-b bg-card w-full">
          <div className="w-full max-w-none px-4 lg:px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Privacy Policy</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
          
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
              <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                Welcome to Grubby. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our restaurant discovery and travel planning platform.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Personal Information</h4>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Name, username, and email address</li>
                    <li>Phone number and address (optional)</li>
                    <li>Profile photos and preferences</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Usage Information</h4>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Restaurant ratings, reviews, and saved places</li>
                    <li>Travel itineraries and trip planning data</li>
                    <li>Search history and preferences</li>
                    <li>Location data (when permitted)</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Technical Information</h4>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Device information and browser type</li>
                    <li>IP address and approximate location</li>
                    <li>App usage analytics and performance data</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Your Information */}
          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Service Provision</h4>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Provide personalized restaurant recommendations</li>
                    <li>Enable trip planning and itinerary creation</li>
                    <li>Connect you with friends and their recommendations</li>
                    <li>Facilitate photo sharing and reviews</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Improvement and Analytics</h4>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Analyze usage patterns to improve our services</li>
                    <li>Personalize content and recommendations</li>
                    <li>Troubleshoot technical issues</li>
                    <li>Develop new features and functionality</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Communication</h4>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Send important service updates and notifications</li>
                    <li>Respond to your inquiries and support requests</li>
                    <li>Share relevant features and improvements (with your consent)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card>
            <CardHeader>
              <CardTitle>Information Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li><strong>With your consent:</strong> When you explicitly agree to share information</li>
                <li><strong>Friends and community:</strong> Information you choose to make public or share with friends</li>
                <li><strong>Service providers:</strong> Trusted partners who help us operate our service (under strict confidentiality agreements)</li>
                <li><strong>Legal requirements:</strong> When required by law or to protect our rights and users' safety</li>
                <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal data:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication systems</li>
                <li>Secure hosting infrastructure with industry-standard protection</li>
                <li>Employee training on data protection and privacy</li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle>Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">You have the following rights regarding your personal data:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Data portability:</strong> Request your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Privacy settings:</strong> Control what information is public or private</li>
              </ul>
              <p className="text-sm leading-relaxed mt-4">
                You can exercise these rights through your account settings or by contacting us directly.
              </p>
            </CardContent>
          </Card>

          {/* Cookies and Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li><strong>Essential cookies:</strong> Required for basic app functionality</li>
                <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Analytics cookies:</strong> Help us understand how you use our service</li>
                <li><strong>Location services:</strong> Provide location-based recommendations (with your permission)</li>
              </ul>
              <p className="text-sm leading-relaxed mt-4">
                You can manage cookie preferences through your browser settings.
              </p>
            </CardContent>
          </Card>

          {/* Children's Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. 
                If you believe we have collected information from a child under 13, please contact us immediately so we can remove such information.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Privacy Policy */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. 
                We will notify you of any material changes by posting the updated policy on our website and updating the "Last updated" date. 
                Your continued use of our service after such changes constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                If you have any questions about this privacy policy or our data practices, please contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> privacy@grubby.app</p>
                <p><strong>Subject:</strong> Privacy Policy Inquiry</p>
              </div>
              <p className="text-sm leading-relaxed mt-4">
                We are committed to addressing your privacy concerns and will respond to your inquiry within 30 days.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}