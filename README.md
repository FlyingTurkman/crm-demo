# CRM Demo

Müşterileri ve müşterilere bağlı içerikleri (blog yazıları ve notlar) yönetmek için hazırlanmış bir CRM paneli. Next.js 16 (App Router), React 19, MongoDB (Prisma) ve shadcn/ui ile yazıldı.

**Ne yapılabiliyor?**

- Müşteri ekleme, listeleme, düzenleme, silme
- Müşteriye bağlı blog yazıları ve notlar (zengin metin editörüyle)
- Blog durumu (`Taslak` → `İncelemede` → `Yayında`) güncelleme ve duruma göre filtreleme
- Genel durumu özetleyen dashboard
- Rol tabanlı yetki (admin / moderatör) ve kullanıcı yönetimi (Admin Paneli)

## Demo hesapları

Giriş sayfasında da yazıyor; **Bilgileri doldur** butonu formu otomatik doldurur.

| Rol | Email | Şifre | Yapabildikleri |
|---|---|---|---|
| Admin | `admin@testmail.com` | `12345678` | Her şey: silme ve Admin Paneli dahil |
| Moderatör | `moderator@testmail.com` | `12345678` | Ekleme ve düzenleme; silme yok, Admin Paneli yok |

---

## İçindekiler

- [Teknolojiler](#teknolojiler)
- [Mimari](#mimari)
  - [İstek akışı](#istek-akışı)
  - [Klasör yapısı](#klasör-yapısı)
  - [Veri modeli](#veri-modeli)
  - [Kimlik doğrulama](#kimlik-doğrulama)
  - [Yetkilendirme](#yetkilendirme)
  - [Veri erişim kuralları](#veri-erişim-kuralları)
  - [Zengin metin (blog ve notlar)](#zengin-metin-blog-ve-notlar)
  - [Arama, filtre ve sayfalama](#arama-filtre-ve-sayfalama)
  - [Arayüz](#arayüz)
- [Kurulum](#kurulum)
- [Komutlar](#komutlar)
- [Güvenlik notları](#güvenlik-notları)
- [Bilinen kısıtlar](#bilinen-kısıtlar)

---

## Teknolojiler

| Alan | Kullanılan |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Veritabanı | MongoDB (replica set, ör. MongoDB Atlas) |
| ORM | Prisma **6.x** (Prisma 7 MongoDB'yi desteklemediği için 6'da kalındı) |
| Arayüz | shadcn/ui (`base-nova` stili, Base UI), Tailwind CSS 4, react-icons |
| Formlar | react-hook-form (istemci), zod (sunucu) |
| Grafik | Recharts (shadcn `chart` bileşeni üzerinden) |
| Zengin metin | [RTE](https://github.com/FlyingTurkman/rich-text-editor) (shadcn registry), sanitize-html |
| URL durumu | [use-search-query](https://github.com/FlyingTurkman/use-search-query) |
| Şifreleme | argon2 (`argon2id`) |
| Bildirimler | sonner |

---

## Mimari

### İstek akışı

Uygulamada **API route yok**; tüm veri işlemleri **Server Action** ile yapılıyor. Her sayfa iki dosyadan oluşuyor: veriyi sunucuda yükleyen `page.tsx` ve arayüzü çizen `page.client.tsx`.

```mermaid
flowchart LR
    B[Tarayıcı] -->|her istek| P[proxy.ts<br/>token kontrolü / yenileme]
    P --> S[page.tsx<br/>Server Component]
    S -->|props| C[page.client.tsx<br/>Client Component]
    C -->|form, buton| A
    S -->|veri okuma| A[Server Action<br/>actions/*.ts]
    A --> Z{authorize<br/>giriş + rol}
    Z -->|yetkisiz| R1[status: false]
    Z --> V{zod<br/>safeParse}
    V -->|geçersiz| R2[status: false]
    V --> DB[(Prisma → MongoDB)]
    DB --> D[DTO / sansür]
    D --> R3["status: true + veri"]
    R3 --> C
```

Her Server Action aynı sırayı izler:

1. `authorize('<model>:<işlem>')` → giriş yapılmış mı, rolün bu yetkisi var mı?
2. `zod.safeParse` → girdi geçerli mi? (istemci doğrulamasına asla güvenilmez)
3. Prisma sorgusu → her okumada `isDeleted: false`, her listede en fazla `pageLimit` kayıt
4. Mutasyondan sonra `revalidatePath` → ilgili sayfalar yenilenir
5. Global `Response` tipi döner: `{ status: boolean, message?: string }` (+ action'a özel alanlar, ör. `href`)

Mesajlar istemcide **sonner toast** ile gösterilir; alan hataları ilgili alanın altında kalır.

### Klasör yapısı

```
├── actions/                 Server Action'lar (model başına bir dosya, 'use server')
│   ├── auth.ts              login / logout
│   ├── customer.ts          müşteri CRUD, liste, arama
│   ├── post.ts              blog CRUD, durum güncelleme, liste, arama
│   ├── note.ts              not CRUD, liste, arama
│   ├── user.ts              sistem kullanıcıları (Admin Paneli)
│   └── dashboard.ts         dashboard istatistikleri
├── app/
│   ├── page.tsx             / → giriş sayfası
│   └── app/                 /app/** → korumalı panel
│       ├── page.tsx         dashboard
│       ├── customers/       müşteriler, [customerId]/{blogs,notes,edit}
│       ├── blogs/           tüm bloglar
│       ├── notes/           tüm notlar
│       ├── admin/           kullanıcı yönetimi (sadece admin)
│       └── profile/
├── components/
│   ├── ui/                  shadcn bileşenleri (üretilmiş, elle düzenlenmez)
│   ├── rte/                 zengin metin editörü (registry'den, Base UI'ye uyarlandı)
│   └── app/                 projenin kendi bileşenleri (alana göre klasörlü)
├── dtos/                    DTO sınıfları (hassas veriyi istemciye göndermeden sansürler)
├── lib/
│   ├── auth/                token, şifre, oturum, yetki (permissions, authorize)
│   ├── data.ts              istek başına önbelleklenmiş okumalar (React cache)
│   ├── richText.ts          HTML temizleme (sanitize)
│   ├── period.ts            "Bugün / Son 7 gün / Son 30 gün" filtresi
│   ├── search.ts            Mongo regex kaçırma
│   └── src/
│       ├── constants.ts     tüm sınırlar ve sabitler
│       └── scripts/         CLI script'leri (npm run user:create)
├── prisma/schema.prisma
├── proxy.ts                 her istekte çalışan kimlik kontrolü (Next 16 middleware)
└── types.d.ts               model tipleri
```

### Veri modeli

```mermaid
erDiagram
    Customer ||--o{ Post : "blogları"
    Customer ||--o{ Note : "notları"
    User ||--o{ Session : "oturumları"

    Customer {
        ObjectId id
        string name
        string surname
        string fullName
        string email UK
        string phone "opsiyonel"
        string company "opsiyonel"
        boolean isDeleted
    }
    Post {
        ObjectId id
        string title
        string content "düz metin"
        string rawContent "HTML"
        PostStatus status "draft | inReview | published"
        ObjectId customerId FK
        boolean isDeleted
    }
    Note {
        ObjectId id
        string content "düz metin"
        string rawContent "HTML"
        ObjectId customerId FK
        boolean isDeleted
    }
    User {
        ObjectId id
        string fullName
        string email UK
        string password "argon2id hash"
        UserRole role "admin | moderator"
        boolean isDeleted
    }
    Session {
        ObjectId id
        ObjectId userId FK
        string accessTokenHash UK "SHA-256"
        string refreshTokenHash UK "SHA-256"
        datetime accessTokenExpiresAt
        datetime refreshTokenExpiresAt
        boolean isDeleted
    }
```

Tüm modellerde `createdAt` / `updatedAt` vardır. Müşteriler sisteme giriş yapmaz; giriş sadece `User` (admin / moderatör) içindir.

### Kimlik doğrulama

JWT kullanılmıyor. Token'lar kendi üreticimizden (`lib/auth/token.ts`) gelen **opak rastgele değerler**: 96 rastgele bayt → 128 karakter base64url.

- Veritabanında token'ın kendisi değil, sadece **SHA-256 hash'i** saklanır. Veritabanı sızsa bile token'lar kullanılamaz.
- Token'lar **httpOnly** çerezlerde tutulur (`secure` production'da, `sameSite: lax`). JavaScript bunlara erişemez.
  - `access_token`: 15 dakika
  - `refresh_token`: 30 gün
- Şifreler **argon2id** ile hash'lenir. Hash hiçbir zaman istemciye gönderilmez; kullanıcı sorgularında `omit: { password: true }` kullanılır.

`proxy.ts` her istekte çalışır:

```mermaid
sequenceDiagram
    participant T as Tarayıcı
    participant P as proxy.ts
    participant DB as MongoDB
    T->>P: istek + çerezler
    P->>DB: access token hash'i geçerli mi?
    alt geçerli
        P-->>T: sayfaya devam
    else süresi dolmuş, refresh token geçerli
        P->>DB: iki token'ı da yenile (rotation)
        P-->>T: yeni çerezler + sayfa
    else ikisi de geçersiz
        P-->>T: çerezleri sil, /app/** ise / adresine yönlendir
    end
```

- Giriş yapmamış biri `/app/**` açarsa `/` adresine, giriş yapmış biri `/` açarsa `/app` adresine yönlendirilir.
- Token yenilenince eski token'lar **anında** geçersiz olur.
- Çıkış yapınca oturum soft delete edilir ve çerezler silinir.
- Silinen bir kullanıcının ya da admin tarafından şifresi değiştirilen bir kullanıcının tüm oturumları kapatılır.

### Yetkilendirme

Roller ve yetkiler tek bir dosyada tanımlı: `lib/auth/permissions.ts`. Her Server Action (login / logout hariç) `authorize(yetki)` ile başlar:

```ts
const auth = await authorize('customer:delete')
if (!auth.user) {
    return { status: false, message: auth.message }   // "giriş yapmalısınız" / "yetkiniz yok"
}
```

| Yetki | Admin | Moderatör |
|---|:---:|:---:|
| `customer` / `post` / `note` → `read`, `create`, `update` | ✓ | ✓ |
| `customer` / `post` / `note` → `delete` | ✓ | – |
| `dashboard:read` | ✓ | ✓ |
| `user:*` (Admin Paneli) | ✓ | – |

- Arayüz de aynı tabloyu kullanır: moderatör "Sil" seçeneğini ve "Admin Paneli" menüsünü görmez. Bu sadece görünümdür; **asıl kontrol her zaman sunucudadır**. Action doğrudan çağrılsa bile yetki yoksa işlem yapılmaz.
- `/app/admin` layout'u yetkisi olmayanlara 404 döner.
- Admin kendi hesabını silemez ve kendi admin rolünü kaldıramaz, böylece panel adminsiz kalmaz.

### Veri erişim kuralları

| Kural | Neden |
|---|---|
| **Sadece soft delete**: kayıtlar `isDeleted: true` yapılır, `delete` hiç kullanılmaz | Veri kaybı olmaz, geçmiş korunur |
| Bir müşteri silinince notları ve blogları da tek bir transaction'da soft delete edilir | Yetim kayıt kalmaz |
| Her okuma `isDeleted: false` filtreler | Silinen kayıt hiçbir yerde görünmez |
| Her liste sorgusu en fazla **`pageLimit` (50)** kayıt çeker, büyüyebilen listeler sayfalanır | Sınırsız sorgu yok |
| Hassas veri (ör. `User`) istemciye **DTO** ile gider (`dtos/userDTO.ts`) | Şifre hash'i asla çıkmaz, email gerektiği yerde maskelenir |
| Layout, sayfa ve `generateMetadata` aynı kaydı `lib/data.ts` içindeki `cache()`'li fonksiyonlarla okur | İstek başına tek sorgu |
| Bütün sınırlar ve mesajları `lib/src/constants.ts`'den gelir | Kod içinde sihirli sayı yok |
| MongoDB `contains` sorguları regex'e çevrildiği için arama metni kaçırılır (`lib/search.ts`) | `(` gibi karakterler sorguyu bozmaz, `.` her şeyle eşleşmez |

### Zengin metin (blog ve notlar)

```mermaid
flowchart LR
    E[RTE editörü] -->|serializeToPlainText| T[content<br/>düz metin]
    E -->|serializeToHtml| H[rawContent<br/>HTML]
    H --> S[sanitizeRichTextHtml<br/>sunucuda]
    S --> DB[(MongoDB)]
    T --> DB
    DB -->|rawContent| V[RichTextView<br/>görüntüleme]
    DB -->|rawContent| P[htmlToDocument<br/>düzenleme formu]
    DB -->|content| L[liste önizleme, arama]
```

- **İki alan:** `content` stilsiz düz metindir; arama ve önizlemelerde kullanılır. `rawContent` editörün ürettiği HTML'dir; sayfada biçimiyle gösterilir.
- **XSS koruması:** HTML istemciden geldiği için kaydedilmeden önce sunucuda temizlenir. Sadece editörün üretebileceği etiketler (`div`, `span`, `strong`, `em`, `u`, `s`, `br`) ve stiller kalır. `<script>`, `on*` öznitelikleri ve `url(...)` atılır.
- **Düzenleme:** Editör HTML okuyamadığı için `htmlToDocument` kayıtlı HTML'i editörün kendi belge formatına geri çevirir.
- **Uyarlama:** Editör Radix tabanlı shadcn için yazılmıştı. `components/rte/` içindeki toggle group ve select'ler Base UI'ye uyarlandı.

### Arama, filtre ve sayfalama

- **Liste filtreleri URL'de tutulur**, örneğin `/app/blogs?q=seo&status=published&period=week&sort=title&page=2`. Linkler paylaşılabilir; geri tuşu ve sayfa yenileme filtreleri korur. URL'yi [use-search-query](https://github.com/FlyingTurkman/use-search-query) günceller.
- **Ortak bileşenler:**
  - `ListFilters`: arama kutusu ve açılır filtreler
  - `ListPagination`: shadcn Pagination
- **Filtreler:** Tüm listelerde arama, sıralama ve eklenme zamanı (Bugün / Son 7 gün / Son 30 gün) var. Bloglarda durum filtresi de var. Müşterilerde "belirli durumda blogu olanlar" filtresi var.
- **Hızlı arama:** Her bölümün üst çubuğundaki arama butonları shadcn `Popover` + `Command` ile çalışır. Yazmayı bıraktıktan 300 ms sonra arama yapılır ve geç gelen eski sonuçlar yok sayılır.
- **Geçersiz değerler:** URL'deki geçersiz değerler (`?status=xyz`, `?page=abc`) hata vermez, yok sayılır. Son sayfadan büyük bir sayfa son sayfaya düşer.

### Arayüz

- **shadcn/ui** (`base-nova`): `components/ui` üretilmiş bileşenlerdir; projenin kendi bileşenleri `components/app` altındadır.
- **Bölüm düzeni:** Her bölümde (Müşteriler, Bloglar, Notlar, Admin) aynı düzen var:
  - shadcn **Sidebar** (son güncellenenler listesiyle)
  - üst çubukta aç/kapat butonu, arama ve breadcrumb
- **Dashboard:**
  - Başlıktaki takvimden bir gün seçilebilir (`?date=`). Bütün sayılar o günün sonundaki duruma göre hesaplanır; gelecek günler seçilemez.
  - Sayı kartları; her birinden filtrelenmiş listeye gidilir.
  - Blog durumlarını gösteren halka grafik; bir dilime tıklayınca o durum filtrelenir. Renkler renk körlüğü testinden geçirilmiş bir paletten gelir, açık ve koyu tema için ayrı tanımlıdır.
  - En çok blogu olan müşteriler.
  - Tarih aralığı seçilebilen "eklenenler" bölümü.
- **Mobil uyum:**
  - Ana menü soldan, profil menüsü sağdan **Sheet** olarak açılır.
  - Bölüm sidebar'ları telefonda Sheet'e dönüşür.
  - Tablolar dar ekranda gereksiz sütunları gizler.
- **Sayfa başlıkları:** Her sayfanın kendi başlığı var (`Ahmet Yılmaz - Bloglar | CRM` gibi).

---

## Kurulum

**Gereksinimler**

- **Node.js 22.18 veya üstü.** `npm run user:create` TypeScript dosyasını doğrudan Node ile çalıştırıyor.
- **Replica set olarak çalışan bir MongoDB.** Prisma transaction'lar için buna ihtiyaç duyuyor; [MongoDB Atlas](https://www.mongodb.com/atlas) ücretsiz katmanı yeterli.

```bash
git clone https://github.com/FlyingTurkman/crm-demo.git
cd crm-demo
npm install                 # postinstall: prisma generate

cp .env.example .env        # DATABASE_URL'yi kendi bağlantı adresinizle doldurun
npm run db:push             # şemayı MongoDB'ye uygular (Mongo'da migration yok)
npm run user:create         # ilk admin kullanıcıyı oluşturur (interaktif)

npm run dev                 # http://localhost:3000
```

`.env` örneği:

```env
DATABASE_URL="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/crm-demo"
```

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Production derleme ve çalıştırma |
| `npm run lint` | ESLint |
| `npm run db:push` | Prisma şemasını MongoDB'ye uygular |
| `npm run db:studio` | Prisma Studio (veritabanını tarayıcıda görüntüleme) |
| `npm run user:create` | Terminalden admin veya moderatör kullanıcı oluşturur |

---

## Güvenlik notları

- **Sunucu doğrulaması:** Her Server Action sunucuda yetkiyi ve girdiyi kontrol eder; istemci tarafındaki kontroller sadece kullanıcı deneyimi içindir.
- **Token'lar:** Hiçbir zaman istemci JavaScript'ine ya da action yanıtlarına çıkmaz.
- **Şifre hash'i:** Hiçbir sorguda seçilmez (giriş doğrulaması hariç).
- **HTML içerik:** Kaydedilmeden önce beyaz listeyle temizlenir.
- **Giriş hataları:** Bilinmeyen email ve yanlış şifre için aynı mesaj döner, böylece kayıtlı email'ler tahmin edilemez.
- **Gizli bilgiler:** `.env` repoya eklenmez; sadece `.env.example` var.

## Bilinen kısıtlar

- **Demo hesapları herkese açık.** Uygulama yayındaysa giriş sayfasındaki bilgilerle herkes admin olarak girebilir. Gerçek kullanımda bu hesaplar silinmeli ya da şifreleri değiştirilmelidir (`lib/src/constants.ts` → `demoAccounts`).
- **Email'ler benzersiz.** Soft delete edilmiş bir müşteri ya da kullanıcının email'i veritabanında kaldığı için aynı email ile yeniden kayıt açılamaz.
- **"Bugün" filtresi sunucunun saat dilimine göre hesaplanır.** Sunucu UTC'de çalışıyorsa Türkiye saatiyle 3 saat kayar.
- **Büyük/küçük harf duyarsız arama Türkçe `ı/i` dönüşümünü yapmaz.** "yilmaz" araması "Yılmaz"ı ad alanında bulmaz.
