import type { Metadata } from "next";
import {
  LegalList,
  LegalMail,
  LegalOperator,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — ReplyPilot AI",
  description:
    "The terms that govern your use of ReplyPilot AI, including acceptable use, AI-generated content, and your responsibilities on X.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms are an agreement between you and ReplyPilot AI (“ReplyPilot”, “we”, “us”), operated by the ReplyPilot private beta operator, governing your use of the app. By using ReplyPilot, you agree to them. If you use ReplyPilot on behalf of an organization, you agree on its behalf."
    >
      <LegalSection heading="What ReplyPilot is">
        <p>
          ReplyPilot helps you find conversations worth replying to on X, scores
          them, and drafts replies and quote tweets in your voice. It is a tool
          that assists your writing — you review and approve everything. It does
          not run your account for you.
        </p>
      </LegalSection>

      <LegalSection heading="Eligibility">
        <p>
          You must be at least 16 years old and able to form a binding contract.
          You must also comply with X&apos;s terms when connecting your X
          account and publishing through ReplyPilot.
        </p>
      </LegalSection>

      <LegalSection heading="Your account and X connection">
        <p>
          You are responsible for activity under your account and for keeping
          your credentials secure. When you connect X, you authorize ReplyPilot
          to publish posts on your behalf — but only the specific text you
          explicitly click to send or schedule. There is no auto-posting.
        </p>
        <p>
          Disconnecting X in Settings removes stored X authorization, turns off
          X-dependent scanner and notification settings, and stops scheduled X
          publishes that have not run yet. Your saved drafts remain available.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>You agree not to use ReplyPilot to:</p>
        <LegalList
          items={[
            "Send spam, run automated engagement, or otherwise violate X's rules or developer terms.",
            "Publish content that is unlawful, harassing, deceptive, or infringes others' rights.",
            "Impersonate any person or misrepresent your affiliation.",
            "Attempt to disrupt, reverse engineer, or gain unauthorized access to the service.",
          ]}
        />
        <p>
          You are solely responsible for the content you publish, including
          anything drafted with ReplyPilot&apos;s help.
        </p>
      </LegalSection>

      <LegalSection heading="Relationship with X">
        <p>
          ReplyPilot is not affiliated with, endorsed by, or sponsored by X
          Corp. Your use of X is governed by X&apos;s own terms. If those terms
          conflict with how you would use ReplyPilot, X&apos;s terms control
          your use of X, and you must not use ReplyPilot in a way that breaks
          them.
        </p>
      </LegalSection>

      <LegalSection heading="AI-generated content">
        <p>
          ReplyPilot uses AI to generate analyses and drafts. Outputs can be
          inaccurate, incomplete, or unsuitable — treat every draft as a
          starting point, review it, and edit as needed before publishing. You,
          not ReplyPilot, are responsible for what you post. Scores and reasons
          are heuristics to aid your judgment, not guarantees of performance.
        </p>
        <p>
          ReplyPilot may send X content, voice examples, and draft context to
          Anthropic to generate those outputs. Product analytics and error data
          may be processed by PostHog and Sentry so the beta can be operated
          safely.
        </p>
      </LegalSection>

      <LegalSection heading="Beta and availability">
        <p>
          ReplyPilot is in private beta and is offered on an “as is” and “as
          available” basis. Beta access may be time-limited, revoked, or changed
          as we prepare the first design-partner rollout. We may change,
          suspend, or discontinue features at any time, and we do not warrant
          that the service will be uninterrupted or error-free.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the maximum extent permitted by law, ReplyPilot and its operators
          will not be liable for any indirect, incidental, or consequential
          damages, or for lost profits, data, or goodwill, arising from your use
          of the service — including any action taken on your X account or any
          content you publish. Our total liability for any claim is limited to
          the amount you paid us in the twelve months before the claim, or, if
          you paid nothing, to USD 100.
        </p>
      </LegalSection>

      <LegalSection heading="Suspension and termination">
        <p>
          You may stop using ReplyPilot at any time and disconnect X in
          Settings. We may suspend or terminate access if you violate these
          terms or use the service in a way that risks harm to you, other users,
          or the platform.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to these terms">
        <p>
          We may update these terms as the product evolves. When we make
          material changes, we will update the date above and, where
          appropriate, notify you in the app. Continued use after changes take
          effect means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          ReplyPilot is operated by <LegalOperator /> during the private beta.
          Questions about these terms? Email <LegalMail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
