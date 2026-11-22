import { demoAccounts } from '@/lib/src/constants'

// The demo accounts are published (login page, README): their password, API token and other
// sessions can't be changed from the profile page, otherwise one visitor could lock everyone else out.
export function isDemoAccountEmail(email: string) {
    return demoAccounts.some(function (account) {
        return account.email === email
    })
}
