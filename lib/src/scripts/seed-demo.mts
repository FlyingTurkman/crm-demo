// Fills the database with realistic demo data: npm run db:seed -- --yes
// - Customers, blogs and notes are REPLACED with generated ones (spread over the last 90 days,
//   a few added today so the dashboard has something to show).
// - Users: only the demo accounts in constants.ts are kept (created if missing) with their
//   password and fixed API token. Every other user, all sessions and other API tokens are removed.
// This is a one-off setup / reset tool, so unlike the app it hard-deletes. Back up first
// (npm run db:backup) if the data matters. Without --yes it only prints what it would do.
import { createHash } from 'node:crypto'
import { PrismaClient, type PostStatus } from '@prisma/client'
import argon2 from 'argon2'
import { demoAccounts } from '../constants.ts'
import { backfillSearchText, searchTextExtension } from '../searchText.ts'

// The extension fills searchText of every created record, like the app's client does
const prisma = new PrismaClient().$extends(searchTextExtension)
const confirmed = process.argv.includes('--yes')

const customerCount = 60
const dayMs = 24 * 60 * 60 * 1000
const historyDays = 90

// Names of the demo accounts when they have to be created
const demoNames = {
    admin: { name: 'Test', surname: 'Kullanıcı' },
    moderator: { name: 'Test', surname: 'Moderatör' },
}

// ---------------------------------------------------------------- random helpers

// Seeded PRNG (mulberry32): the same data on every run
let seed = 20261122
function random() {
    seed = (seed + 0x6d2b79f5) | 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function pick<T>(items: readonly T[]): T {
    return items[Math.floor(random() * items.length)]
}

function between(min: number, max: number) {
    return min + Math.floor(random() * (max - min + 1))
}

function chance(probability: number) {
    return random() < probability
}

// A valid ObjectId whose timestamp matches the record's creation time
function objectId(date: Date) {
    const seconds = Math.floor(date.getTime() / 1000).toString(16).padStart(8, '0')
    const rest = Array.from({ length: 16 }, function () {
        return Math.floor(random() * 16).toString(16)
    }).join('')
    return seconds + rest
}

// Random moment between two dates, during working hours
function dateBetween(start: Date, end: Date) {
    const date = new Date(start.getTime() + random() * Math.max(0, end.getTime() - start.getTime()))
    if (date.getHours() < 9 || date.getHours() > 18) {
        date.setHours(between(9, 18), between(0, 59))
    }
    if (date.getTime() > end.getTime()) return end
    if (date.getTime() < start.getTime()) return start
    return date
}

function daysAgo(days: number) {
    return new Date(Date.now() - days * dayMs)
}

function slugify(text: string) {
    const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }
    return text
        .toLocaleLowerCase('tr-TR')
        .replace(/[çğıöşü]/g, function (letter) {
            return map[letter]
        })
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '')
}

function escapeHtml(text: string) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Plain text + editor-like HTML (one <div> per line, like serializeToHtml), bold first line optional
function richText(lines: string[], boldFirst: boolean) {
    const rawContent = lines
        .map((line, index) => {
            if (!line) return '<div><br></div>'
            const html = escapeHtml(line)
            return `<div>${boldFirst && index === 0 ? `<strong>${html}</strong>` : html}</div>`
        })
        .join('')
    return { content: lines.join('\n'), rawContent }
}

// ---------------------------------------------------------------- source data

const firstNames = [
    'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Emre', 'Burak', 'Can',
    'Murat', 'Serkan', 'Onur', 'Kerem', 'Barış', 'Cem', 'Tolga', 'Okan', 'Volkan', 'Kaan',
    'Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Merve', 'Esra', 'Selin', 'Deniz', 'Ece', 'Gizem',
    'Burcu', 'Derya', 'Pınar', 'Cansu', 'Tuğba', 'İrem', 'Seda', 'Ebru', 'Melis', 'Aslı',
]
const surnames = [
    'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir',
    'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
    'Polat', 'Erdoğan', 'Güneş', 'Aksoy', 'Tekin', 'Ünal', 'Korkmaz', 'Bulut', 'Keskin', 'Avcı',
]
const emailDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yandex.com', 'icloud.com']

// Fictional companies by sector, the sector picks the blog topics
const companies = [
    { name: 'Mavi Yazılım', sector: 'software', domain: 'maviyazilim.com.tr' },
    { name: 'Kuzey Bilişim', sector: 'software', domain: 'kuzeybilisim.com' },
    { name: 'Pixel Dijital Ajans', sector: 'marketing', domain: 'pixeldijital.com' },
    { name: 'Atlas Lojistik', sector: 'logistics', domain: 'atlaslojistik.com.tr' },
    { name: 'Yeşilvadi Organik Gıda', sector: 'food', domain: 'yesilvadi.com.tr' },
    { name: 'Lale Mimarlık', sector: 'architecture', domain: 'lalemimarlik.com' },
    { name: 'Ege Turizm', sector: 'tourism', domain: 'egeturizm.com.tr' },
    { name: 'Bosphorus Danışmanlık', sector: 'consulting', domain: 'bosphorusdanismanlik.com' },
    { name: 'Anadolu Tekstil', sector: 'retail', domain: 'anadolutekstil.com.tr' },
    { name: 'Sağlıklı Yaşam Kliniği', sector: 'health', domain: 'saglikliyasam.com.tr' },
    { name: 'Demir Otomotiv', sector: 'automotive', domain: 'demirotomotiv.com' },
    { name: 'Kartal Eğitim Kurumları', sector: 'education', domain: 'kartalegitim.com.tr' },
    { name: 'Nova Enerji', sector: 'energy', domain: 'novaenerji.com.tr' },
    { name: 'Papatya Kozmetik', sector: 'retail', domain: 'papatyakozmetik.com' },
    { name: 'Zirve İnşaat', sector: 'architecture', domain: 'zirveinsaat.com.tr' },
    { name: 'Karadeniz Su Ürünleri', sector: 'food', domain: 'karadenizsu.com.tr' },
    { name: 'Orbit Yazılım Çözümleri', sector: 'software', domain: 'orbityazilim.com' },
    { name: 'Moda Butik', sector: 'retail', domain: 'modabutik.com.tr' },
    { name: 'Pera Hukuk Bürosu', sector: 'consulting', domain: 'perahukuk.com' },
    { name: 'Gökyüzü Seyahat', sector: 'tourism', domain: 'gokyuzuseyahat.com' },
    { name: 'Ankara Diş Polikliniği', sector: 'health', domain: 'ankaradis.com.tr' },
    { name: 'Lezzet Durağı Restoran', sector: 'food', domain: 'lezzetduragi.com' },
    { name: 'Vira Denizcilik', sector: 'logistics', domain: 'viradenizcilik.com.tr' },
    { name: 'Kod Akademi', sector: 'education', domain: 'kodakademi.com.tr' },
    { name: 'Güneş Panel Sistemleri', sector: 'energy', domain: 'gunespanel.com.tr' },
    { name: 'Hız Kargo', sector: 'logistics', domain: 'hizkargo.com.tr' },
    { name: 'Marmara Mobilya', sector: 'retail', domain: 'marmaramobilya.com' },
    { name: 'Data Analitik', sector: 'consulting', domain: 'dataanalitik.com.tr' },
] as const
type Sector = (typeof companies)[number]['sector']

const blogTitles: Record<Sector, string[]> = {
    software: [
        'Bulut Altyapısına Geçişte Dikkat Edilmesi Gerekenler', 'Yeni Mobil Uygulamamız Yayında',
        'Siber Güvenlikte 2026 Trendleri', 'Yapay Zeka ile Müşteri Desteğini Hızlandırmak',
        'Yazılım Projelerinde Agile Dönüşüm', 'KOBİ\'ler için Dijital Dönüşüm Rehberi',
    ],
    marketing: [
        'Sosyal Medyada Organik Erişimi Artırmanın Yolları', 'SEO Uyumlu İçerik Nasıl Yazılır?',
        'Influencer İş Birliklerinde Ölçülebilir Sonuçlar', 'E-posta Pazarlamasında Açılma Oranını Yükseltin',
        'Marka Kimliği Oluştururken Yapılan 5 Hata',
    ],
    logistics: [
        'Son Kilometre Teslimatında Yeni Dönem', 'Depo Yönetiminde Otomasyonun Faydaları',
        'Uluslararası Taşımacılıkta Gümrük Süreçleri', 'Filo Takip Sistemi ile Yakıt Tasarrufu',
    ],
    food: [
        'Organik Ürünlerde Sertifikasyon Süreci', 'Mevsim Sebzeleriyle Sağlıklı Menüler',
        'Yerel Üreticilerle Çalışmanın Avantajları', 'Gıda Güvenliğinde Soğuk Zincir',
        'Yeni Şube Açılışımız Hakkında',
    ],
    architecture: [
        'Sürdürülebilir Yapı Malzemeleri', 'Küçük Ofisler için Verimli Tasarım Fikirleri',
        'Depreme Dayanıklı Yapılarda Yeni Yönetmelik', 'Kentsel Dönüşümde Sık Sorulan Sorular',
    ],
    tourism: [
        'Ege\'nin Keşfedilmemiş Koyları', 'Erken Rezervasyonun Avantajları',
        'Kültür Turlarında Bu Sezon', 'Kapadokya\'da Balon Turu Rehberi',
    ],
    consulting: [
        'Şirket Kuruluşunda Bilinmesi Gerekenler', 'KVKK Uyumunda Sık Yapılan Hatalar',
        'Veriye Dayalı Karar Almanın Önemi', 'Büyüme Stratejisi Belirlerken Sorulacak Sorular',
    ],
    retail: [
        'Yeni Sezon Koleksiyonumuz Yayında', 'E-ticarette İade Oranlarını Düşürmek',
        'Mağaza İçi Deneyimi Güçlendirmenin Yolları', 'Sadakat Programımız Yenilendi',
    ],
    health: [
        'Düzenli Check-up\'ın Önemi', 'Ağız ve Diş Sağlığında Doğru Bilinen Yanlışlar',
        'Online Randevu Sistemimiz Hizmette', 'Kış Aylarında Bağışıklığı Güçlendirmek',
    ],
    automotive: [
        'Elektrikli Araçlarda Bakım Rehberi', 'Kışlık Lastiğe Geçiş Zamanı',
        'İkinci El Araç Alırken Kontrol Listesi', 'Filo Kiralamanın Şirketlere Faydaları',
    ],
    education: [
        'Yeni Dönem Kayıtlarımız Başladı', 'Çocuklar için Kodlama Eğitimi',
        'Uzaktan Eğitimde Verimliliği Artırmak', 'Sınav Döneminde Motivasyon Önerileri',
    ],
    energy: [
        'Çatı Tipi Güneş Enerjisi Sistemleri', 'Enerji Verimliliğinde Devlet Destekleri',
        'Yenilenebilir Enerjide Yatırım Fırsatları', 'Sanayide Enerji Tasarrufu İpuçları',
    ],
}

const blogIntros = [
    'Bu yazımızda sizlere sıkça sorulan bir konuyu ele alıyoruz.',
    'Sektördeki son gelişmeleri sizin için derledik.',
    'Müşterilerimizden gelen sorular üzerine bu rehberi hazırladık.',
    'Son dönemde en çok konuşulan konulardan birine birlikte bakalım.',
]
const blogBodies = [
    'Doğru planlama ile hem zamandan hem maliyetten tasarruf etmek mümkün. İlk adım, mevcut durumu net bir şekilde analiz etmek.',
    'Uzman ekibimiz süreç boyunca her adımda yanınızda. Sorularınız için bizimle iletişime geçebilirsiniz.',
    'Yapılan araştırmalar, bu alandaki yatırımların kısa sürede geri döndüğünü gösteriyor.',
    'Özellikle küçük ve orta ölçekli işletmeler için uygulanabilir, adım adım bir yol haritası öneriyoruz.',
    'Unutulmaması gereken en önemli nokta, sürecin tek seferlik değil sürekli bir iyileştirme olduğu.',
    'Geçen yıl hayata geçirdiğimiz projelerden edindiğimiz deneyimleri de bu yazıda paylaşıyoruz.',
]
const blogOutros = [
    'Detaylı bilgi için web sitemizi ziyaret edebilirsiniz.',
    'Görüş ve önerilerinizi bekliyoruz.',
    'Bir sonraki yazımızda görüşmek üzere.',
]

const noteTexts = [
    ['Telefon görüşmesi yapıldı.', 'Yeni dönem bütçesini ay sonunda netleştireceklerini söyledi.'],
    ['Teklif e-posta ile gönderildi.', 'Bir hafta içinde dönüş yapılacak.'],
    ['Toplantı notları:', '- Blog içeriklerinin ayda 4 yazıya çıkarılması istendi', '- Görsel kullanımı artırılacak'],
    ['Fatura bilgileri güncellendi, yeni vergi numarası sisteme girildi.'],
    ['Müşteri yayın takviminden memnun.', 'Bir sonraki çeyrek için sözleşme yenileme görüşmesi planlanacak.'],
    ['Yeni yazı konuları için müşteriden brif istendi.'],
    ['İnceleme bekleyen yazılar müşteriye hatırlatıldı.'],
    ['Ödeme gecikmesi hakkında muhasebe ile görüşüldü.', 'Önümüzdeki hafta tekrar kontrol edilecek.'],
    ['Online demo yapıldı.', 'Panel kullanımı anlatıldı, ek kullanıcı talebi var.'],
    ['Kampanya dönemi için özel içerik talep edildi.', 'Taslaklar cuma gününe kadar hazırlanacak.'],
    ['Yetkili kişi değişti, yeni iletişim kişisi: muhasebe müdürü.'],
    ['Referans olarak web sitelerinde logomuzu kullanmayı kabul ettiler.'],
]

// ---------------------------------------------------------------- generation

type CustomerSeed = {
    id: string
    name: string
    surname: string
    fullName: string
    email: string
    phone: string | null
    company: string | null
    sector: Sector
    createdAt: Date
    updatedAt: Date
}

function generateCustomers() {
    const customers: CustomerSeed[] = []
    const usedEmails = new Set<string>()

    for (let index = 0; index < customerCount; index++) {
        const name = pick(firstNames)
        const surname = pick(surnames)
        const company = chance(0.8) ? pick(companies) : null
        // A few customers are added today and this week, the rest over the last 90 days
        const createdAt = index < 3
            ? dateBetween(new Date(new Date().setHours(0, 0, 0, 0)), new Date())
            : index < 8
                ? dateBetween(daysAgo(7), daysAgo(1))
                : dateBetween(daysAgo(historyDays), daysAgo(7))

        let email = `${slugify(name)}.${slugify(surname)}@${company ? company.domain : pick(emailDomains)}`
        let suffix = 2
        while (usedEmails.has(email)) {
            email = email.replace(/(\d*)@/, `${suffix}@`)
            suffix++
        }
        usedEmails.add(email)

        customers.push({
            id: objectId(createdAt),
            name,
            surname,
            fullName: `${name} ${surname}`,
            email,
            phone: chance(0.85) ? `05${pick(['32', '33', '35', '42', '44', '05', '06', '52', '54'])} ${between(100, 999)} ${between(10, 99)} ${between(10, 99)}` : null,
            company: company ? company.name : null,
            sector: company ? company.sector : pick(Object.keys(blogTitles) as Sector[]),
            createdAt,
            updatedAt: createdAt,
        })
    }
    return customers
}

function generatePosts(customers: CustomerSeed[]) {
    const posts = []
    for (const customer of customers) {
        // Some customers are very active, so "top customers" on the dashboard has a clear order
        const count = chance(0.15) ? between(5, 8) : chance(0.25) ? 0 : between(1, 3)
        for (let index = 0; index < count; index++) {
            const createdAt = dateBetween(customer.createdAt, new Date())
            const roll = random()
            const status: PostStatus = roll < 0.45 ? 'published' : roll < 0.65 ? 'inReview' : 'draft'
            const updatedAt = chance(0.4) ? dateBetween(createdAt, new Date()) : createdAt
            const lines = [pick(blogIntros), '', pick(blogBodies), pick(blogBodies), '', pick(blogOutros)]
            posts.push({
                id: objectId(createdAt),
                title: pick(blogTitles[customer.sector]),
                ...richText(lines, false),
                status,
                customerId: customer.id,
                createdAt,
                updatedAt,
            })
            if (updatedAt > customer.updatedAt) customer.updatedAt = updatedAt
        }
    }
    return posts
}

function generateNotes(customers: CustomerSeed[]) {
    const notes = []
    for (const customer of customers) {
        const count = chance(0.3) ? 0 : between(1, 3)
        for (let index = 0; index < count; index++) {
            const createdAt = dateBetween(customer.createdAt, new Date())
            notes.push({
                id: objectId(createdAt),
                ...richText(pick(noteTexts), true),
                customerId: customer.id,
                createdAt,
                updatedAt: createdAt,
            })
            if (createdAt > customer.updatedAt) customer.updatedAt = createdAt
        }
    }
    return notes
}

// ---------------------------------------------------------------- users

function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

// Keeps (or creates) the demo accounts with their password and fixed API token
async function ensureDemoUsers() {
    const demoEmails = demoAccounts.map((account) => account.email)

    // Everything that isn't a demo account goes: other users, all sessions, other API tokens
    await prisma.session.deleteMany({})
    const otherUsers = await prisma.user.findMany({
        where: { email: { notIn: demoEmails } },
        select: { id: true },
    })
    const otherIds = otherUsers.map((user) => user.id)
    await prisma.apiToken.deleteMany({ where: { userId: { in: otherIds } } })
    await prisma.user.deleteMany({ where: { id: { in: otherIds } } })

    for (const account of demoAccounts) {
        let user = await prisma.user.findFirst({ where: { email: account.email } })
        if (!user) {
            const names = demoNames[account.role]
            user = await prisma.user.create({
                data: {
                    ...names,
                    fullName: `${names.name} ${names.surname}`,
                    email: account.email,
                    role: account.role,
                    password: await argon2.hash(account.password, { type: argon2.argon2id }),
                },
            })
        } else if (user.isDeleted || user.role !== account.role) {
            user = await prisma.user.update({ where: { id: user.id }, data: { isDeleted: false, role: account.role } })
        }

        // Exactly one active token: the published demo token
        await prisma.apiToken.deleteMany({ where: { userId: user.id, tokenHash: { not: hashToken(account.apiToken) } } })
        const token = await prisma.apiToken.findFirst({ where: { userId: user.id } })
        if (!token) {
            await prisma.apiToken.create({ data: { userId: user.id, tokenHash: hashToken(account.apiToken) } })
        } else if (token.isDeleted) {
            await prisma.apiToken.update({ where: { id: token.id }, data: { isDeleted: false } })
        }
        console.log(`Kullanıcı: ${user.email} (${user.role}) · API token: ${account.apiToken}`)
    }
}

// ---------------------------------------------------------------- main

async function main() {
    const customers = generateCustomers()
    const posts = generatePosts(customers)
    const notes = generateNotes(customers)

    if (!confirmed) {
        console.log('Bu komut müşteri, blog ve notları SİLİP yeniden oluşturur; demo hesapları dışındaki kullanıcıları ve bütün oturumları siler.')
        console.log(`Oluşturulacak: ${customers.length} müşteri, ${posts.length} blog, ${notes.length} not`)
        console.log('Devam etmek için: npm run db:seed -- --yes')
        return
    }

    await prisma.post.deleteMany({})
    await prisma.note.deleteMany({})
    await prisma.customer.deleteMany({})
    await ensureDemoUsers()

    await prisma.customer.createMany({
        data: customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            surname: customer.surname,
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            company: customer.company,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
        })),
    })
    await prisma.post.createMany({ data: posts })
    await prisma.note.createMany({ data: notes })

    // Kept demo users may predate the searchText field
    await backfillSearchText(prisma as unknown as PrismaClient)

    console.log(`Oluşturuldu: ${customers.length} müşteri, ${posts.length} blog, ${notes.length} not`)
}

main()
    .catch(function (error) {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(function () {
        return prisma.$disconnect()
    })
