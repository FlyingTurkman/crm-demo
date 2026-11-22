// Creates a user from the terminal: npm run user:create
import { createHash, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
import { apiTokenPrefix, maxPasswordLength, minPasswordLength } from '../constants.ts'

const prisma = new PrismaClient()

async function main() {
    const rl = createInterface({ input: process.stdin })
    const lines = rl[Symbol.asyncIterator]()

    async function ask(question: string) {
        process.stdout.write(question)
        const line = await lines.next()
        return line.done ? '' : line.value
    }

    const name = (await ask('Ad: ')).trim()
    const surname = (await ask('Soyad: ')).trim()
    const email = (await ask('Email: ')).trim()
    const password = await ask(`Şifre (${minPasswordLength}-${maxPasswordLength} karakter): `)
    const roleInput = (await ask('Rol (admin / moderator) [moderator]: ')).trim()
    rl.close()

    const role = roleInput === 'admin' ? 'admin' : 'moderator'

    if (!name || !surname || !email) {
        throw new Error('Ad, soyad ve email zorunludur')
    }
    if (password.length < minPasswordLength) {
        throw new Error(`Şifreniz en az ${minPasswordLength} karakter uzunluğunda olmalıdır`)
    }
    if (password.length > maxPasswordLength) {
        throw new Error(`Şifreniz en fazla ${maxPasswordLength} karakter uzunluğunda olmalıdır`)
    }

    const user = await prisma.user.create({
        data: {
            name,
            surname,
            fullName: `${name} ${surname}`,
            email,
            password: await argon2.hash(password, { type: argon2.argon2id }),
            role,
        },
    })

    // Every user gets a REST API token, only its hash is stored (same format as lib/auth/apiToken.ts)
    const apiToken = `${apiTokenPrefix}${randomBytes(96).toString('base64url')}`
    await prisma.apiToken.create({
        data: { userId: user.id, tokenHash: createHash('sha256').update(apiToken).digest('hex') },
    })

    console.log(`Kullanıcı oluşturuldu: ${user.email} (${user.role})`)
    console.log(`API token (bir daha gösterilmeyecek): ${apiToken}`)
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
