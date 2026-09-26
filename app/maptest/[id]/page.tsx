import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MapTestIdPage({ params }: Props) {
  const resolvedParams = await params
  const id = resolvedParams?.id || ''
  redirect(`/maptest?id=${encodeURIComponent(id)}`)
}
