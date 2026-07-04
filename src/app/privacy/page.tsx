import type { Metadata } from "next";
import {
  LegalList,
  LegalMail,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — ReplyPilot AI",
  description:
    "How ReplyPilot AI collects, uses, and protects your data when you analyze conversations and draft replies for X.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="ReplyPilot AI (“ReplyPilot”, “we”, “us”) helps you find conversations worth replying to on X and draft replies in your own voice. This policy explains what we collect, why, and the choices you have. We keep data collection to what the product actually needs."
    >
      <LegalSection heading="Information we collect">
        <p>We collect the following when you use ReplyPilot:</p>
        <LegalList
          items={[
            <>
              <strong className="text-foreground">Your X account.</strong> When
              you connect X via OAuth, we receive your X user ID, username,
              display name, and profile image, plus the access and refresh
              tokens needed to post on your behalf when you click to publish.
            </>,
            <>
              <strong className="text-foreground">Content you analyze.</strong>{" "}
              The tweets you paste or fetch (text, author details, engagement
              metrics, top replies), the analyses and scores we generate, the
              replies and quote tweets we draft, and any drafts you save or
              publish.
            </>,
            <>
              <strong className="text-foreground">Voice profiles.</strong> If
              you train a voice, we import your recent public tweets to measure
              writing style (sentence length, punctuation, common phrases, and
              similar) and store the resulting profile and sample tweets.
            </>,
            <>
              <strong className="text-foreground">Usage data.</strong> Counts of
              analyses, generations, tokens, and publish events, used to run the
              product and measure quality (for example, how often a drafted
              reply is sent without edits).
            </>,
          ]}
        />
        <p>
          In demo mode we use deterministic sample data and do not connect to
          your X account.
        </p>
      </LegalSection>

      <LegalSection heading="How we use your information">
        <LegalList
          items={[
            "Provide the service: analyze conversations, score them, and draft replies and quote tweets in your voice.",
            "Publish to X only when you explicitly click to send or schedule a specific piece of text. There is no automatic posting.",
            "Send tweet content and your voice examples to our AI provider to generate analyses and drafts.",
            "Measure and improve product quality using aggregate usage metrics.",
            "Keep your account secure and prevent abuse.",
          ]}
        />
        <p>
          We do not sell your personal information, and we do not use your data
          to train our own AI models.
        </p>
      </LegalSection>

      <LegalSection heading="Service providers we share with">
        <p>
          We share data with a small number of processors strictly to operate
          the service:
        </p>
        <LegalList
          items={[
            <>
              <strong className="text-foreground">X (X Corp.)</strong> — for
              sign-in and to publish the posts you approve. Your use of X
              remains subject to X&apos;s own terms and privacy policy.
            </>,
            <>
              <strong className="text-foreground">Anthropic</strong> — processes
              the tweet content and voice examples we send to generate analyses
              and drafts. Anthropic&apos;s API does not use this data to train
              its models.
            </>,
            <>
              <strong className="text-foreground">Convex</strong> — our database
              and backend, where your account, analyses, drafts, and voice
              profiles are stored.
            </>,
            <>
              <strong className="text-foreground">
                Our hosting provider
              </strong>{" "}
              — serves the application. We may also disclose data if required by
              law.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Storage and security">
        <p>
          Your data is stored with Convex. X access tokens are kept separate
          from your profile record and are never returned to the browser by our
          product queries; your session is held in a secure, HTTP-only cookie.
          No system is perfectly secure, but we take reasonable measures to
          protect your information, and every post to X requires your explicit
          click.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention and deletion">
        <p>
          We keep your data while your account is active. You can disconnect X
          at any time in Settings, which revokes our stored tokens. To delete
          your account and associated data, email us at <LegalMail /> and we
          will remove it. You can also revoke ReplyPilot&apos;s access from your
          X account settings under connected apps.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access,
          correct, export, or delete your personal information, and to withdraw
          consent. To exercise any of these, contact us at <LegalMail />.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          ReplyPilot is not directed to anyone under 16, and we do not knowingly
          collect data from children. If you believe a child has provided us
          data, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy as the product evolves. When we make
          material changes, we will update the date above and, where
          appropriate, notify you in the app.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about this policy or your data? Email <LegalMail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
