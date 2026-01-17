import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Legal
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: January 17, 2026
          </p>
          <p className="text-sm text-muted-foreground pt-2">
            Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Admin Dashboard (the "Service") operated by our organization ("us", "we", or "our"). Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms.
          </p>
        </div>

        <div className="h-px bg-border" />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="text-sm text-muted-foreground">
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service. These Terms apply to all users who access or use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            2. Use of the Service
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              The Admin Dashboard is an internal tool intended for authorized administrative use only. You agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service only for lawful purposes and in accordance with these Terms.</li>
              <li>Maintain the confidentiality of your account and credentials.</li>
              <li>Notify the administrator immediately of any unauthorized use of your account or any other breach of security.</li>
              <li>Not attempt to gain unauthorized access to any portion of the Service, other accounts, or computer systems connected to the Service.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            3. User Conduct and Responsibilities
          </h2>
          <p className="text-sm text-muted-foreground">
            You are responsible for all activity that occurs under your account. You agree not to engage in any activity that interferes with or disrupts the Service or the servers and networks which are connected to the Service. Any misuse of data or unauthorized modification of system settings is strictly prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            4. Intellectual Property
          </h2>
          <p className="text-sm text-muted-foreground">
            The Service and its original content, features, and functionality are and will remain the exclusive property of our organization and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            5. Termination
          </h2>
          <p className="text-sm text-muted-foreground">
            We may terminate or suspend your access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            6. Limitation of Liability
          </h2>
          <p className="text-sm text-muted-foreground">
            In no event shall our organization, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            7. Disclaimer
          </h2>
          <p className="text-sm text-muted-foreground italic">
            Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            8. Governing Law
          </h2>
          <p className="text-sm text-muted-foreground">
            These Terms shall be governed and construed in accordance with the laws of our jurisdiction, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            9. Changes to Terms
          </h2>
          <p className="text-sm text-muted-foreground">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice before any new terms take effect. What constitutes a material change will be determined at our sole discretion.
          </p>
        </section>

        <div className="h-px bg-border" />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
          <p className="text-sm text-muted-foreground">
            If you have any questions about these Terms, please contact the administrator responsible for this dashboard or reach out via:
          </p>
          <p className="text-sm font-medium text-foreground">
            behzodmusurmonqulov@gmail.com
          </p>
        </section>

        <div className="h-px bg-border" />
        
        <div className="flex justify-center">
          <Link href="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
