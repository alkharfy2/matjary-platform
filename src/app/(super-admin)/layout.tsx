import { redirect } from 'next/navigation'
import { isSuperAdmin } from '@/lib/api/auth'
import { SuperAdminLayoutShell } from './super-admin-layout-shell'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAdmin = await isSuperAdmin()

  if (!isAdmin) {
    redirect('/')
  }

  return <SuperAdminLayoutShell>{children}</SuperAdminLayoutShell>
}
