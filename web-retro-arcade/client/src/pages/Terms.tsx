import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Gamepad2 } from "lucide-react";

export default function Terms() {
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
        <h1 className="font-display text-4xl font-bold mb-8">Terms of Use</h1>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using RetroArch Web (abcw.xyz), you accept and agree to be bound by these Terms of Use.
              If you do not agree to these terms, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Service Description</h2>
            <p className="text-muted-foreground">
              RetroArch Web is a browser-based retro gaming emulator platform that allows users to upload and play
              ROM files from classic gaming consoles. This is a free service provided for educational and personal use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Responsibilities</h2>
            <div className="text-muted-foreground space-y-2">
              <p>Users agree to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Only upload ROM files they legally own or have permission to use</li>
                <li>Not upload copyrighted material without proper authorization</li>
                <li>Not use the service for any illegal purposes</li>
                <li>Not attempt to disrupt, hack, or compromise the service</li>
                <li>Comply with all applicable local, state, national, and international laws</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. ROM Files and Copyright</h2>
            <p className="text-muted-foreground">
              Users are solely responsible for ensuring they have the legal right to possess and use any ROM files
              they upload. Emulators are legal, but downloading copyrighted ROMs without owning the original game
              is illegal in most jurisdictions. We do not endorse or encourage piracy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Temporary Storage</h2>
            <p className="text-muted-foreground">
              All uploaded ROM files are stored temporarily and are automatically deleted when you close your browser tab
              or session. We do not permanently store your files. Your game library is session-based and will be cleared
              upon closing the browser.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. No Warranty</h2>
            <p className="text-muted-foreground">
              This service is provided "as is" without any warranties, express or implied. We do not guarantee
              uninterrupted service, error-free operation, or that the service will meet your requirements.
              Use at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              We shall not be liable for any damages arising from the use or inability to use this service,
              including but not limited to data loss, service interruptions, or any other direct or indirect damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Service Modifications</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify, suspend, or discontinue the service at any time without notice.
              We may also update these terms at any time, and continued use constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Third-Party Services</h2>
            <p className="text-muted-foreground">
              This service uses EmulatorJS, a third-party emulation library. We are not responsible for the
              functionality or accuracy of third-party components.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Age Restrictions</h2>
            <p className="text-muted-foreground">
              You must be at least 13 years old to use this service. By using this service, you represent that
              you meet this age requirement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these terms, please visit our website at abcw.xyz.
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
