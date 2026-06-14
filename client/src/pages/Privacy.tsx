import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Gamepad2 } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <h1 className="font-display text-xl font-bold">RetroArch Web</h1>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">Back to Home</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="font-display text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              RetroArch Web is designed with privacy in mind. We collect minimal information necessary to provide
              the service:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li><strong>Session Data:</strong> A temporary session ID stored in your browser's session storage</li>
              <li><strong>Uploaded Files:</strong> ROM files you upload (stored temporarily)</li>
              <li><strong>Usage Data:</strong> Basic anonymous analytics about service usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
            <div className="text-muted-foreground space-y-2">
              <p>We use the collected information to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide the emulator service and store your uploaded ROMs temporarily</li>
                <li>Manage your gaming session</li>
                <li>Improve the service and fix bugs</li>
                <li>Monitor service performance and uptime</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Data Storage and Retention</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Temporary Storage:</strong> All ROM files you upload are stored temporarily in Vercel Blob
              storage and are automatically deleted when you close your browser tab or end your session.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Session Data:</strong> Your session ID is stored in your browser's sessionStorage and is
              automatically cleared when you close the tab.
            </p>
            <p className="text-muted-foreground">
              <strong>No Permanent Storage:</strong> We do not permanently store your ROM files, game library,
              or personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use sessionStorage (not cookies) to maintain your session. This data is only stored locally in
              your browser and is never transmitted to third parties. We do not use tracking cookies or persistent
              identifiers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Third-Party Services</h2>
            <div className="text-muted-foreground space-y-2">
              <p>This service uses the following third-party services:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Vercel:</strong> Hosting and blob storage provider</li>
                <li><strong>EmulatorJS:</strong> Browser-based emulation library (loaded from CDN)</li>
                <li><strong>Google Fonts:</strong> Typography resources</li>
              </ul>
              <p className="mt-2">
                These services may collect their own data according to their privacy policies. We do not control
                or have access to data collected by these third parties.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data Security</h2>
            <p className="text-muted-foreground">
              We implement reasonable security measures to protect your data, including HTTPS encryption for all
              data transmission. However, no method of transmission over the internet is 100% secure, and we
              cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Your Rights</h2>
            <div className="text-muted-foreground space-y-2">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Delete your session data by closing your browser tab</li>
                <li>Clear your browser's sessionStorage manually at any time</li>
                <li>Not use the service if you disagree with this privacy policy</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              This service is not intended for children under 13 years of age. We do not knowingly collect
              personal information from children under 13. If you believe we have collected information from
              a child under 13, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell, trade, or share your data with third parties for marketing purposes. Your uploaded
              ROM files are private and only accessible to you during your session. We may share anonymized,
              aggregated data about service usage for analytical purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. International Users</h2>
            <p className="text-muted-foreground">
              This service is hosted on Vercel's global infrastructure. Your data may be processed in different
              countries where Vercel operates. By using this service, you consent to the transfer of your data
              to these locations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. Changes will be posted on this page with an
              updated "Last Updated" date. Continued use of the service after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
            <p className="text-muted-foreground">
              If you have questions or concerns about this privacy policy, please visit our website at abcw.xyz.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </main>
    </div>
  );
}
