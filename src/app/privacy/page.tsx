import {ServiceInformation} from '@/components/service-information';

export const metadata = {title:'Privacy — Dear Tomorrow'};

export default function PrivacyPage() {
  return <ServiceInformation title="Privacy">
    <section>
      <h2>Where your keepsakes live</h2>
      <p>Guest letters, books, Memory Trees and journeys are kept in this browser profile. Clearing browser data or changing browsers can make them unavailable. If you copy a guest item to My Space, the cloud copy and the original in your browser are separate.</p>
      <p>My Space stores your account details and cloud documents. Photos and recordings you attach can be stored as separate private files linked to those documents. Supabase provides account sign-in, the database and private file storage. The hosted preview uses Vercel to run the website. Choosing Google or Apple sign-in, where offered, involves that provider in the sign-in process.</p>
    </section>
    <section>
      <h2>Account ownership and partner access</h2>
      <p>Your account owns the items you save in My Space. Connecting with a partner does not share your library. You choose individual items to share. Revoking the grant or disconnecting ends future access through Dear Tomorrow. It cannot retrieve a copy someone already saved.</p>
    </section>
    <section>
      <h2>Exporting and recovering keepsakes</h2>
      <p>Export cloud keepsakes from Settings. Guest editors offer their own backups. Keep downloaded copies somewhere private. An export can contain your words, pictures and recordings. It does not recreate your account or partner connection, and it does not include changes that never reached the cloud. Password recovery restores access to an account when it succeeds.</p>
    </section>
    <section>
      <h2>Removing content or closing your account</h2>
      <p>Removing an attachment or deleting a cloud item removes it from the workspace after the change is saved. Some uploaded files can remain in storage after a failed save or removal. The storage and backup retention periods are still being verified for release.</p>
      <p>Password accounts can request deletion from Settings. This closes access and starts cleanup of owned cloud files and account records. If cleanup is interrupted, Settings asks you to confirm it again. Accounts created only through a sign-in provider may be unable to use the current password confirmation. Guest copies, exports and copies already kept by a partner are outside this process.</p>
    </section>
    <section>
      <h2>Managing your information</h2>
      <p>Use Settings to update your profile, manage partner access, and export your cloud keepsakes. The operator’s contact details and process for privacy and support requests are awaiting confirmation.</p>
    </section>
  </ServiceInformation>;
}
