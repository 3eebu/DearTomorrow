import {ServiceInformation} from '@/components/service-information';

export const metadata = {title:'Service information — Dear Tomorrow'};

export default function TermsPage() {
  return <ServiceInformation title="Service information">
    <section>
      <h2>Using the preview</h2>
      <p>Dear Tomorrow lets you write letters, make books, record memories and choose keepsakes to share with a partner. A timed letter becomes available to an authorized viewer in Dear Tomorrow when its release condition is met. The preview does not deliver messages or send reminders.</p>
    </section>
    <section>
      <h2>Your account and content</h2>
      <p>Keep your sign-in details and recovery links private. Use fictional information in the preview. Only upload photographs, audio and other material you have permission to store or share. Review each item before sharing it and consider who can keep a copy.</p>
    </section>
    <section>
      <h2>Keeping a copy</h2>
      <p>Use your workspace exports to keep copies of anything you need to retain. Guest data depends on the browser profile. Cloud access depends on your account and the connected service. Recovery from a service outage or deleted attachment has not been verified for launch.</p>
    </section>
    <section>
      <h2>Support and terms of service</h2>
      <p>The operator, support contact, and final terms of service are awaiting approval. These preview notes do not ask you to accept terms.</p>
    </section>
  </ServiceInformation>;
}
