import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Legal
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: January 17, 2026
          </p>
          <p className="text-sm text-muted-foreground pt-2">
            This Privacy Policy describes how the Admin Dashboard ("we", "us",
            or "our") collects, uses, and discloses your information when you
            use our service. By accessing or using the Service, you consent to
            the collection, use, and disclosure of your information in
            accordance with this Privacy Policy.
          </p>
        </div>

        <div className="h-px bg-border" />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              We collect information that you provide directly to us, as well as
              information automatically collected when you use the dashboard.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground font-medium">
                  Account Information:
                </strong>{" "}
                When you sign in (e.g., via Google), we collect your name, email
                address, and profile picture to create and manage your account.
              </li>
              <li>
                <strong className="text-foreground font-medium">
                  Usage Data:
                </strong>{" "}
                We automatically collect information about how you interact with
                the dashboard, including pages visited, features used, time
                spent on pages, and actions taken (such as edits or deletions).
              </li>
              <li>
                <strong className="text-foreground font-medium">
                  Device & Log Data:
                </strong>{" "}
                We collect information about the device you use to access the
                dashboard, including your IP address, browser type, operating
                system, and unique device identifiers.
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            2. How We Use Information
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, maintain, and improve our dashboard services.</li>
              <li>
                To authenticate your identity and prevent unauthorized access.
              </li>
              <li>
                To manage user roles and permissions within the organization.
              </li>
              <li>
                To monitor the usage and performance of the dashboard to detect
                and fix technical issues.
              </li>
              <li>
                To maintain audit logs for security and compliance purposes.
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            3. Cookies and Tracking Technologies
          </h2>
          <p className="text-sm text-muted-foreground">
            We use cookies and similar tracking technologies to track the
            activity on our service and store certain information. Cookies are
            files with a small amount of data which may include an anonymous
            unique identifier. You can instruct your browser to refuse all
            cookies or to indicate when a cookie is being sent. However, if you
            do not accept cookies, you may not be able to use some portions of
            our Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            4. Data Sharing and Disclosure
          </h2>
          <p className="text-sm text-muted-foreground">
            We do not sell or rent your personal information to third parties.
            We may share your information in the following circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground font-medium">
                Service Providers:
              </strong>{" "}
              We may employ third-party companies and individuals to facilitate
              our Service (e.g., database hosting, authentication services like
              Supabase or Google Auth).
            </li>
            <li>
              <strong className="text-foreground font-medium">
                Legal Requirements:
              </strong>{" "}
              We may disclose your Personal Data if required to do so by law or
              in response to valid requests by public authorities.
            </li>
            <li>
              <strong className="text-foreground font-medium">
                Business Transfers:
              </strong>{" "}
              If we are involved in a merger, acquisition, or asset sale, your
              Personal Data may be transferred.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            5. Data Security
          </h2>
          <p className="text-sm text-muted-foreground">
            The security of your data is important to us, but remember that no
            method of transmission over the Internet, or method of electronic
            storage is 100% secure. While we strive to use commercially
            acceptable means to protect your Personal Data, we cannot guarantee
            its absolute security. We implement standard security practices
            including role-based access control (RBAC) and encryption where
            appropriate.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            6. Data Retention
          </h2>
          <p className="text-sm text-muted-foreground">
            We retain your Personal Data only for as long as is necessary for
            the purposes set out in this Privacy Policy. We will retain and use
            your Personal Data to the extent necessary to comply with our legal
            obligations (for example, if we are required to retain your data to
            comply with applicable laws), resolve disputes, and enforce our
            legal agreements and policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            7. Your Data Rights
          </h2>
          <p className="text-sm text-muted-foreground">
            Depending on your location, you may have rights regarding your
            personal data, including the right to access, correct, or delete the
            information we hold about you. As this is an internal administrative
            tool, please contact your organization's administrator to request
            changes to your profile or access rights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            8. Changes to This Privacy Policy
          </h2>
          <p className="text-sm text-muted-foreground">
            We may update our Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page.
            You are advised to review this Privacy Policy periodically for any
            changes. Changes to this Privacy Policy are effective when they are
            posted on this page.
          </p>
        </section>

        <div className="h-px bg-border" />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
          <p className="text-sm text-muted-foreground">
            If you have any questions about this Privacy Policy, please contact
            the administrator responsible for this dashboard or reach out via:
          </p>
          <p className="text-sm font-medium text-foreground">
            behzodmusurmonqulov@gmail.com
          </p>
        </section>

        <div className="h-px bg-border" />
        
        <div className="flex justify-center">
          <Link href="/terms-of-service" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
