import { GuestTicketSubmitForm } from '@/components/tickets/GuestTicketSubmitForm'
import { PageHeader } from '@/components/ui'

export const metadata = { title: 'New Service Request' }

export default function GuestSubmitTicketPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="New Service Request"
        subtitle="Submit a request to the ICT or Media team. No account required."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'New Request' },
        ]}
      />
      <GuestTicketSubmitForm />
    </div>
  )
}
