import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function WhatsAppRedirectPage() {
  redirect('https://wa.me/5493834225445')
}
