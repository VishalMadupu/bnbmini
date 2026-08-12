import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";

const content = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "BitsNdBricks collects only the information necessary to publish and manage construction opportunities. When you submit a job or tender, we collect the opportunity details along with your submitter contact information (name, company, email and phone).",
      "Submitter contact information is used solely for internal review and verification and is not displayed publicly on the platform.",
      "We do not require visitors to create accounts, and we do not sell personal information to third parties.",
      "For any privacy-related requests, please contact the BitsNdBricks team.",
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    body: [
      "BitsNdBricks is an information and discovery platform for construction jobs and tenders. We aggregate and publish opportunities to help construction professionals and organizations find relevant information quickly.",
      "BitsNdBricks does not employ candidates, issue tenders, or process applications. We are not responsible for the accuracy, legitimacy, or outcome of any listed opportunity.",
      "Users must independently verify all opportunity details with the original employer, recruiter, organization or issuing authority before acting.",
      "For tenders, always use the official issuing authority portal to submit applications and confirm requirements. Where an official tender URL is available, BitsNdBricks directs you to it.",
      "A \"Verified Source\" badge indicates that BitsNdBricks has reviewed the source of a listing. It is not a guarantee of the opportunity's terms or outcome.",
    ],
  },
  terms: {
    title: "Terms of Use",
    body: [
      "By using BitsNdBricks, you agree to use the platform for lawful purposes related to discovering construction opportunities.",
      "All listings are provided for informational purposes. BitsNdBricks reserves the right to review, edit, archive, or remove any listing.",
      "Submissions are reviewed before publication. BitsNdBricks does not guarantee that any submitted opportunity will be published.",
      "You agree not to misuse the platform, scrape data at scale, or submit false or misleading information.",
      "BitsNdBricks may update these terms as the platform evolves.",
    ],
  },
};

export default function Legal({ page }) {
  const c = content[page];
  return (
    <Layout>
      <Seo title={`${c.title} | BitsNdBricks`} description={c.body[0].slice(0, 150)} />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">{c.title}</h1>
        <div className="mt-6 space-y-4">
          {c.body.map((p, i) => (
            <p key={i} className="leading-relaxed text-slate-600">{p}</p>
          ))}
        </div>
      </div>
    </Layout>
  );
}
