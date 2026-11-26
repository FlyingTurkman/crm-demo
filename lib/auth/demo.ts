import { demoAccounts } from '@/lib/src/constants'

// The demo accounts are published (login page, README): their password and other sessions can't be
// changed from the profile page, otherwise one visitor could lock everyone else out of the panel.
// Their API token is never published: visitors create one on the profile page.
export function isDemoAccountEmail(email: string) {
    return demoAccounts.some(function (account) {
        return account.email === email
    })
}
