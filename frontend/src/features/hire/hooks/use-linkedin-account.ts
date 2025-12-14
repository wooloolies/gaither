import { useSession, listAccounts } from '@/lib/auth/auth-client'
import { useQuery } from '@tanstack/react-query'

export function useLinkedInAccount() {
  const { data: session } = useSession()

  const { data: isLinkedIn } = useQuery({
    queryKey: ['accounts', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null
      return await listAccounts()
    },
    enabled: !!session?.user,
    select: (accountsResult) => {
      if (!accountsResult || !('data' in accountsResult)) return false
      const accounts = accountsResult.data
      if (!Array.isArray(accounts)) return false
      return accounts.some(
        (account: { providerId: string }) => account.providerId === 'linkedin'
      )
    },
  })

  return { isLinkedIn: isLinkedIn ?? false, session }
}
