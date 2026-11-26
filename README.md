# CRM Demo

Bir ajansın hesap yöneticileri için hazırlanmış içerik takip paneli: müşteriler, müşterilere teslim edilecek içerikler (sosyal medya gönderisi, blog yazısı, web sayfası, e-bülten, ...) ve notlar. Next.js 16 (App Router), React 19, MongoDB (Prisma) ve shadcn/ui ile yazıldı.

Projede, benim geliştirdiğim iki açık kaynak proje de kullanılıyor:

- [**use-search-query**](https://github.com/FlyingTurkman/use-search-query): Liste filtrelerini, aramayı ve sayfa numarasını URL'de tutan React hook'u (npm paketi).
- [**RTE (rich-text-editor)**](https://github.com/FlyingTurkman/rich-text-editor): İçerik ve notlarda kullanılan, shadcn registry'si üzerinden kurulan zengin metin editörü.

**Ne yapılabiliyor?**

- Müşteri ekleme, listeleme, düzenleme, silme
- Müşteriye bağlı içerikler ve notlar (zengin metin editörüyle)
  - İçerik **türü** (sosyal medya, blog yazısı, web sayfası, e-bülten, diğer)
  - Üretildiği **kanallar** (Instagram, TikTok, Facebook, X, LinkedIn, YouTube, Pinterest, web sitesi, e-posta); birden fazla seçilebilir
  - Planlanan **yayın zamanı** (tarih ve saat)
  - **Teslim tarihi** ve **sorumlu kişi**; teslim günü geçmiş ve yayında olmayan içerikler **gecikmiş** olarak işaretlenir
  - **Görseller** (AWS S3'e yüklenir)
- İçerik durumu (`Taslak` → `İncelemede` → `Yayında`) güncelleme; durum, tür, kanal, teslim ve sorumluya göre filtreleme
- **Ajanda:** zamanlanmış içeriklerin haftalık, saat dilimli takvimi; her günün teslimleri en üst satırda, her hücreden o saate yeni içerik eklenebilir
- Genel durumu özetleyen dashboard: geciken içerikler, yaklaşan teslimler, durum dağılımı
- Rol tabanlı yetki (admin / moderatör) ve kullanıcı yönetimi (Admin Paneli)
- Kullanıcı başına API token'ı ile çalışan RESTful API (`/api/v1`)
- Profil sayfası: ad-soyad, şifre, kişisel API token'ı ve açık oturumlar

## Demo hesapları

Giriş sayfasında da yazıyor; **Bilgileri doldur** butonu formu otomatik doldurur.

| Rol | Email | Şifre | Yapabildikleri |
|---|---|---|---|
| Admin | `admin@testmail.com` | `12345678` | Her şey: silme ve Admin Paneli dahil |
| Moderatör | `moderator@testmail.com` | `12345678` | Ekleme ve düzenleme; silme yok, Admin Paneli yok |

[REST API](api.md) için API token'ı hiçbir yerde yayınlanmaz: giriş yaptıktan sonra **Profilim** sayfasından kendi token'ınızı oluşturun.

---

## İçindekiler

- [Teknolojiler](#teknolojiler)
- [Teknoloji Tercihleri](#teknoloji-tercihleri)
  - [Next.js](#nextjs)
  - [TypeScript](#typescript)
  - [MongoDB](#mongodb)
  - [Prisma ORM](#prisma-orm)
  - [AWS S3](#aws-s3)
  - [Auth Mimarisi](#auth-mimarisi)
  - [shadcn/ui ve Tailwind CSS](#shadcnui-ve-tailwind-css)
  - [react-hook-form ve zod](#react-hook-form-ve-zod)
  - [use-search-query](#use-search-query)
- [Mimari](#mimari)
  - [İstek akışı](#istek-akışı)
  - [Klasör yapısı](#klasör-yapısı)
  - [Veri modeli](#veri-modeli)
  - [Kimlik doğrulama](#kimlik-doğrulama)
  - [Yetkilendirme](#yetkilendirme)
  - [Veri erişim kuralları](#veri-erişim-kuralları)
  - [Zengin metin (içerik ve notlar)](#zengin-metin-içerik-ve-notlar)
  - [Görseller (S3)](#görseller-s3)
  - [Arama, filtre ve sayfalama](#arama-filtre-ve-sayfalama)
  - [Arayüz](#arayüz)
- [REST API](#rest-api) ([api.md](api.md))
- [Kurulum](#kurulum)
- [Komutlar](#komutlar)
- [Güvenlik notları](#güvenlik-notları)
- [Tasarım tercihleri](#tasarım-tercihleri)
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
| Dosya depolama | AWS S3 (`@aws-sdk/client-s3`) |

---

## Teknoloji Tercihleri

Her tercih için üç soruyu cevaplamaya çalıştım: **neden seçildi**, **alternatifi neydi** ve **bedeli ne oldu**.

### Next.js

**Neden:** Sunucu ve istemci tarafını tek projede, tek dilde yazabildiğim ve ekosistemi en geniş React framework'ü olduğu için tercih ettim. Bu projede doğrudan kullandığım özellikleri:

- **Server Actions:** Panelin bütün veri işlemleri ayrı bir API katmanı yazmadan Server Action'larla yapılıyor. REST API de (`app/api/v1`) aynı action'ları çağırıyor; doğrulama, yetki ve iş kuralları tek yerde duruyor, panel ile API birbirinden ayrışamıyor.
- **Server Components ve `cache()`:** Veri sunucuda yükleniyor, istemciye sadece gereken kısmı gidiyor. Layout, sayfa ve sayfa başlığı aynı kaydı istek başına tek sorguyla okuyor.
- **`proxy.ts`:** Her istekte token kontrolü ve yenileme tek bir dosyada.
- **`loading.tsx` ve `next/image`:** Sayfa iskeletleri ve görsel optimizasyonu framework'ten geliyor.
- **Vercel:** Ek ayar gerektirmeden deploy. Proje test case olduğu için hızlı deploy amacıyla tercih ettim diğer alternatifler de gerçek proje için değerlendirilebilir.

Yaygın kullanımın bir avantajı da kendi yazdığım kütüphaneleri kolayca paylaşabilmem: bu projede liste filtrelerini yöneten [use-search-query](https://github.com/FlyingTurkman/use-search-query) ve zengin metin editörü [RTE](https://github.com/FlyingTurkman/rich-text-editor), daha önce geliştirip yayınladığım kütüphaneler.


### MongoDB

**Neden:** Esnek şema ve yatay ölçeklenebilirlik (replica set, sharding, MongoDB Atlas'ın çok bölgeli kümeleri). Esnekliğin bu projede somut bir karşılığı oldu: içeriğe sonradan tür, kanal, teslim tarihi, yayın zamanı, sorumlu ve görsel alanları eklendi; migration yazmak gerekmedi, `db:push` ve eski kayıtlara varsayılan yazan bir backfill script'i yetti. İçerik görselleri gibi iç içe veriler de ayrı bir tablo yerine kaydın içinde (`PostImage[]`) tutulabiliyor.

**Alternatif:** PostgreSQL. Dürüst olmak gerekirse bu projenin verisi ilişkisel (müşteri → içerik → not) ve PostgreSQL de uygun olurdu. Mongo'yu, şemanın hızla değişeceği bir demo için esnekliği ve Atlas'ın ücretsiz katmanıyla kurulumun kolaylığı nedeniyle seçtim.

### Prisma ORM

**Neden:** MongoDB'nin uygulama tarafında taklit edilmesi gereken ilişkilerini (`include`, ilişkili sorgular, `onDelete` davranışı) tipli ve okunaklı bir API ile kullanmamı sağlıyor. Şema tek dosyada (`prisma/schema.prisma`) ve uygulamanın tipleri buradan üretiliyor. Global `omit` ve client extension'ları da işe yaradı: şifre hash'i ve arama alanı hiçbir sorguda varsayılan olarak dönmüyor, Türkçe karakterden bağımsız arama alanını (`searchText`) her yazmada bir extension kendisi güncelliyor.

**Alternatif:** MongoDB'nin resmî Node.js sürücüsü ya da Mongoose. İlişkisiz, belge odaklı bir tasarım yapıyor olsaydım Prisma'yı kullanmaz, resmî sürücüyü tercih ederdim.

### AWS S3

**Neden:** Yüksek dayanıklılık, düşük maliyet, IAM ile ince yetkilendirme ve dosya sayısından bağımsız ölçeklenme. Görseller veritabanında değil S3'te; içerik kaydında sadece anahtarı, adı, türü ve boyutu tutuluyor.

**Alternatif:** Vercel Blob, Cloudinary ya da görselleri veritabanında tutmak. Veritabanında tutmak belgeleri şişirirdi; S3 ise sağlayıcıdan bağımsız bir standart (Cloudflare R2, MinIO gibi S3 uyumlu servislere de taşınabilir).


### Auth Mimarisi

**Şifreler: argon2id.** md5 ya da SHA gibi hash fonksiyonları hızlı olmak için tasarlandı; parola saklamak için bu bir dezavantaj, çünkü sızan bir veritabanında saniyede milyarlarca deneme yapılabiliyor. argon2id ise bilerek yavaş ve bellek yoğun; GPU ile kaba kuvvet saldırısını çok pahalı hale getiriyor. Password Hashing Competition'ın kazananı ve OWASP'ın ilk önerisi olduğu için bcrypt yerine argon2id seçtim.

**Oturum: JWT değil, opak token.** Asıl tercih bu. JWT imzalı olduğu için sunucu onu veritabanına bakmadan doğrulayabilir, ama bu yüzden süresi dolana kadar iptal edilemez. Bu projede iptalin anında olması gereken durumlar var: çıkış, şifre değişimi, admin'in bir kullanıcıyı silmesi ya da şifresini sıfırlaması. Bu yüzden token'lar rastgele değerler (96 bayt) ve her istekte veritabanında kontrol ediliyor:

- Veritabanında token'ın kendisi değil, **SHA-256 hash'i** tutuluyor; veritabanı sızsa bile token'lar kullanılamaz.
- Token'lar **httpOnly** çerezde; JavaScript okuyamadığı için XSS ile çalınamaz. `sameSite: lax` CSRF'e karşı koruyor.
- Kısa ömürlü access token (15 dk) ve uzun ömürlü refresh token (30 gün); yenilemede ikisi birden değişiyor ve eskiler anında geçersiz oluyor.
- REST API için ayrı, kullanıcı başına bir API token'ı var; API çerez kabul etmediği için CORS her origin'e güvenle açılabiliyor.


Gerçek bir projede bunlara e-posta, SMS ya da authenticator uygulamasıyla **iki adımlı doğrulama (2FA)** ve giriş denemelerine hız sınırı (rate limit) eklerdim.


### react-hook-form ve zod

**Neden ikisi birden:** İstemci doğrulaması (react-hook-form) kullanıcı deneyimi içindir: hata anında, alanın altında görünür ve form gereksiz yere yeniden çizilmez. Sunucu doğrulaması (zod) ise güvenlik içindir: Server Action'lar ve REST API doğrudan çağrılabildiği için istemciden gelen hiçbir veriye güvenilmez. Bütün sınırlar ve mesajları `lib/src/constants.ts`'den geldiği için iki taraf birbirinden ayrışamıyor.

### use-search-query

**Neden:** Filtreler, arama ve sayfa numarası bileşen state'inde değil URL'de tutuluyor (`?status=inReview&due=overdue&page=2`). Böylece bir filtrelenmiş liste link olarak paylaşılabiliyor, geri tuşu ve sayfa yenileme filtreleri koruyor, sunucu sayfası da filtreyi doğrudan URL'den okuyor. Bunun için daha önce yazıp npm'de yayınladığım kendi kütüphanemi kullandım.

**Alternatif:** nuqs ya da `useSearchParams` ile elle yazılmış yardımcılar. Kendi kütüphanem bu projenin ihtiyacını (birden fazla parametreyi birlikte güncellemek, varsayılan değeri URL'den çıkarmak) zaten karşılıyordu.

## Mimari

### İstek akışı

Panelin tüm veri işlemleri **Server Action** ile yapılıyor. Her sayfa iki dosyadan oluşuyor: veriyi sunucuda yükleyen `page.tsx` ve arayüzü çizen `page.client.tsx`. Dış sistemler için tek istisna [REST API](#rest-api) (`app/api/v1`); o da aynı Server Action'ları çağırır.

```mermaid
flowchart LR
    B[Tarayıcı] -->|her istek| P[proxy.ts<br/>token kontrolü / yenileme]
    X[Dış sistem] -->|Bearer API token| API[app/api/v1<br/>route.ts]
    API --> A
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

1. `authorize('<model>:<işlem>')` → giriş yapılmış mı (oturum çerezi ya da API token'ı), rolün bu yetkisi var mı?
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
│   ├── post.ts              içerik CRUD, durum güncelleme, liste, arama, görsel yükleme
│   ├── note.ts              not CRUD, liste, arama
│   ├── user.ts              sistem kullanıcıları (Admin Paneli)
│   ├── apiToken.ts          kullanıcıların API token'ları (Admin Paneli)
│   ├── profile.ts           giriş yapan kullanıcının kendi hesabı (Profilim)
│   └── dashboard.ts         dashboard istatistikleri
├── app/
│   ├── page.tsx             / → giriş sayfası
│   ├── api/v1/              REST API (route.ts dosyaları, Server Action'ları çağırır)
│   └── app/                 /app/** → korumalı panel
│       ├── page.tsx         dashboard
│       ├── customers/       müşteriler, [customerId]/{blogs,notes,edit}
│       ├── blogs/           tüm içerikler (adres tarihsel olarak /blogs)
│       ├── agenda/          ajanda: zamanlanmış içeriklerin haftalık takvimi
│       ├── notes/           tüm notlar
│       ├── admin/           kullanıcı yönetimi (sadece admin)
│       └── profile/         Profilim: ad-soyad, şifre, API token'ı, oturumlar
├── components/
│   ├── ui/                  shadcn bileşenleri (üretilmiş, elle düzenlenmez)
│   ├── rte/                 zengin metin editörü (registry'den, Base UI'ye uyarlandı)
│   └── app/                 projenin kendi bileşenleri (alana göre klasörlü)
├── dtos/                    DTO sınıfları (hassas veriyi istemciye göndermeden sansürler)
├── lib/
│   ├── auth/                token, API token, şifre, oturum, yetki (permissions, authorize)
│   ├── api.ts               REST API yardımcıları (HTTP ↔ Server Action)
│   ├── data.ts              istek başına önbelleklenmiş okumalar (React cache)
│   ├── richText.ts          HTML temizleme (sanitize)
│   ├── period.ts            "Bugün / Son 7 gün / Son 30 gün" filtresi, teslim / gecikme kuralları
│   ├── s3.ts                S3 istemcisi (sadece sunucu)
│   ├── images.ts            görsel adresi ve dosya türü tespiti
│   ├── search.ts            Mongo regex kaçırma
│   └── src/
│       ├── constants.ts     tüm sınırlar ve sabitler
│       └── scripts/         CLI script'leri (user:create, api:tokens, db:posts-backfill, ...)
├── prisma/schema.prisma
├── proxy.ts                 her istekte çalışan kimlik kontrolü (Next 16 middleware)
└── types.d.ts               model tipleri
```

### Veri modeli

```mermaid
erDiagram
    Customer ||--o{ Post : "içerikleri"
    Customer ||--o{ Note : "notları"
    User ||--o{ Session : "oturumları"
    User ||--o{ ApiToken : "API token'ları"
    User |o--o{ Post : "sorumlu olduğu içerikler"

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
        PostType type "socialMedia | blog | webPage | newsletter | other"
        PostPlatform[] platforms "instagram, tiktok, ..."
        datetime dueDate "opsiyonel, teslim günü"
        datetime scheduledAt "opsiyonel, yayın zamanı"
        ObjectId assigneeId FK "opsiyonel, User"
        PostImage[] images "S3 key, ad, tür, boyut"
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
    ApiToken {
        ObjectId id
        ObjectId userId FK
        string tokenHash UK "SHA-256"
        datetime lastUsedAt "opsiyonel"
        boolean isDeleted
    }
```

Tüm modellerde `createdAt` / `updatedAt` vardır. Müşteriler sisteme giriş yapmaz; giriş sadece `User` (admin / moderatör) içindir. Her kullanıcının bir aktif `ApiToken` kaydı vardır; token yenilenince eskisi soft delete edilir.

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
- Silinen bir kullanıcının ya da admin tarafından şifresi değiştirilen bir kullanıcının tüm oturumları kapatılır. Silinen kullanıcının API token'ı da geçersiz olur.

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
| `apiToken:read`, `apiToken:create` (başkalarının token'ı, Admin Paneli) | ✓ | – |
| `profile:read`, `profile:update` (kendi hesabı) | ✓ | ✓ |

- Arayüz de aynı tabloyu kullanır: moderatör "Sil" seçeneğini ve "Admin Paneli" menüsünü görmez. Bu sadece görünümdür; **asıl kontrol her zaman sunucudadır**. Action doğrudan çağrılsa bile yetki yoksa işlem yapılmaz.
- REST API aynı action'ları çağırdığı için aynı tablo API için de geçerlidir: moderatör token'ıyla `DELETE` isteği `403` döner.
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

### Zengin metin (içerik ve notlar)

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

### Görseller (S3)

- İçerik formunda seçilen her görsel hemen `uploadPostImage` Server Action'ıyla sunucuya gönderilir; sunucu türünü ve boyutunu (en fazla 4 MB) kontrol edip S3'e `posts/<uuid>.<uzantı>` anahtarıyla yükler. Form sadece dönen anahtarları tutar, görseller içerik kaydedilince ona bağlanır.
- **Neden presigned URL değil?** Tarayıcıdan doğrudan S3'e yükleme bucket'ta CORS ayarı ister ve dosyanın gerçek türü sunucuda kontrol edilemez. 4 MB sınırı Vercel'in 4,5 MB istek limitinin altında kalıyor, bu yüzden sunucu üzerinden yükleme basit ve güvenli bir seçim.
- İçerikte sadece `{ key, name, contentType, size }` saklanır; adres `NEXT_PUBLIC_AWS_S3_BUCKET_URL` + key ile oluşturulur ve `next/image` ile gösterilir (`next.config.ts` sadece bu bucket'a izin verir).
- Silme yine soft delete: içerikten kaldırılan ya da silinen içeriğin görselleri S3'ten silinmez.

### Arama, filtre ve sayfalama

- **Türkçe karakterlere duyarsız arama:** `ŞAHİN` ile `sahin`, `IŞIK` ile `isik`, `GÜNEŞ` ile `gunes` aynı sonuçları bulur. Müşteri, içerik, not ve kullanıcılar aranabilir alanlarının sadeleştirilmiş bir kopyasını `searchText` alanında tutar; aranan metin de aynı şekilde sadeleştirilir (`lib/src/searchText.ts`). Bu alanı bir Prisma eklentisi her kayıt oluşturma ve güncellemede kendisi yeniden hesaplar, bu yüzden eskimez. Alan API yanıtlarında ve arayüzde görünmez.

- **Liste filtreleri URL'de tutulur**, örneğin `/app/blogs?q=seo&status=inReview&type=socialMedia&platform=instagram&due=overdue&assignee=me&page=2`. Linkler paylaşılabilir; geri tuşu ve sayfa yenileme filtreleri korur. URL'yi [use-search-query](https://github.com/FlyingTurkman/use-search-query) günceller.
- **Ortak bileşenler:**
  - `ListFilters`: arama kutusu ve açılır filtreler
  - `ListPagination`: shadcn Pagination
- **Filtreler:** Tüm listelerde arama, sıralama ve eklenme zamanı (Bugün / Son 7 gün / Son 30 gün) var. İçeriklerde durum, tür, kanal, teslim (gecikenler / 7 gün içinde / tarihsiz) ve sorumlu (bana atananlar / atanmamış) filtreleri de var. Müşterilerde "belirli durumda içeriği olanlar" filtresi var.
- **Hızlı arama:** Her bölümün üst çubuğundaki arama butonları shadcn `Popover` + `Command` ile çalışır. Yazmayı bıraktıktan 300 ms sonra arama yapılır ve geç gelen eski sonuçlar yok sayılır.
- **Geçersiz değerler:** URL'deki geçersiz değerler (`?status=xyz`, `?page=abc`) hata vermez, yok sayılır. Son sayfadan büyük bir sayfa son sayfaya düşer.

### Arayüz

- **shadcn/ui** (`base-nova`): `components/ui` üretilmiş bileşenlerdir; projenin kendi bileşenleri `components/app` altındadır.
- **Bölüm düzeni:** Her bölümde (Müşteriler, İçerikler, Notlar, Admin) aynı düzen var:
  - shadcn **Sidebar** (son güncellenenler listesiyle)
  - üst çubukta aç/kapat butonu, arama ve breadcrumb
- **Dashboard:**
  - Başlıktaki takvimden bir gün seçilebilir (`?date=`). Bütün sayılar o günün sonundaki duruma göre hesaplanır; gelecek günler seçilemez.
  - Sayı kartları; her birinden filtrelenmiş listeye gidilir. "Geciken içerik" kartı gecikenler listesine gider.
  - **Geciken içerikler** (en eski teslim günü önce) ve **yaklaşan teslimler** (7 gün) listeleri; müşteri, tür, durum ve sorumluyla. Bu ikisi seçilen günden bağımsız olarak her zaman güncel durumu gösterir.
  - İçerik durumlarını gösteren halka grafik; bir dilime tıklayınca o durum filtrelenir. Renkler renk körlüğü testinden geçirilmiş bir paletten gelir, açık ve koyu tema için ayrı tanımlıdır.
  - En çok içeriği olan müşteriler.
  - Tarih aralığı seçilebilen "eklenenler" bölümü.
- **Ajanda (`/app/agenda`):**
  - Seçilen günden başlayan 7 günlük tablo: sütunlar günler, satırlar saatler. Satırlar o haftanın ilk paylaşımının saatinden son paylaşımının saatine kadar uzanır (zamanlanmış içerik yoksa 08:00–20:00). Gün başlıkları ve saat sütunu kaydırırken sabit kalır. İçerikler yayın zamanına (`scheduledAt`) göre hücresine yerleşir; kartın sol kenar rengi durumu, sağ üstteki ikonlar kanalları gösterir.
  - Karta tıklayınca ayrıntılar açılır (mobilde alttan çekmece): müşteri, tür, kanallar, teslim, sorumlu, buradan durum değiştirme ve görüntüle / düzenle linkleri.
  - En üstteki **Teslim** satırı o gün teslim edilecek içerikleri gösterir; gecikenler kırmızıdır.
  - Her hücrenin **+** butonu o gün ve saat dolu olarak yeni içerik formunu açar.
  - Hafta `?date=` ile URL'de tutulur (önceki / sonraki hafta, takvimden gün seçme).
  - **Sorumlu filtresi** (`?assignee=`): diğer arama çubukları gibi `ResponsivePopover` + `Command`. Üstte Tüm sorumlular / Bana atananlar / Atanmamış, yazınca kullanıcılar sunucuda aranır (Türkçe karakterden bağımsız, sadece ada göre: moderatör e-posta yazarak kimin adresi olduğunu öğrenemez). Hem zamanlanmış içeriklere hem teslim satırına uygulanır; hafta değişince filtre korunur.
- **Mobil uyum:**
  - Ana menü soldan, profil menüsü sağdan **Sheet** olarak açılır.
  - Bölüm sidebar'ları telefonda Sheet'e dönüşür.
  - Tablolar dar ekranda gereksiz sütunları gizler.
- **Profilim (`/app/profile`):**
  - Ad-soyad güncellenir; menüdeki isim hemen değişir. Email ve rolü sadece bir admin değiştirebilir.
  - Şifre değiştirmek için mevcut şifre istenir. Şifre değişince diğer cihazlardaki oturumlar kapatılır, bu oturum açık kalır.
  - Kişinin kendi API token'ı oluşturulur / yenilenir.
  - Diğer cihazlardaki açık oturumların sayısı görünür ve hepsi tek tuşla kapatılabilir.
  - **Demo hesaplarında** şifre ve oturum kapatma kilitlidir. Hesaplar herkese açık olduğu için bir ziyaretçi diğerlerini panelden dışarıda bırakamaz (`lib/auth/demo.ts`). API token'ı ise demo hesaplarda da oluşturulabilir, çünkü token hiçbir yerde yayınlanmaz ve bir ziyaretçinin onu almasının tek yolu budur.
- **Yükleme iskeletleri:** Her sayfanın bir `loading.tsx` dosyası var ve veri gelene kadar o sayfanın şeklinde shadcn `Skeleton` gösteriliyor. Hangi iskeletin çizileceğini `RouteSkeleton` adrese bakarak seçiyor. Örneğin dashboard'dan bir müşteriye geçerken sidebar, müşteri başlığı ve içerik birlikte iskelet olarak görünür; bölüm içinde gezerken sadece değişen kısım iskelete döner.
- **Sayfa başlıkları:** Her sayfanın kendi başlığı var (`Ahmet Yılmaz - İçerikler | CRM` gibi).

## REST API

Panelin dışındaki sistemler (entegrasyonlar, script'ler, mobil uygulama vb.) için `/api/v1` altında RESTful bir API var. **Bütün uç noktalar, parametreler, istek gövdeleri ve örnekler [api.md](api.md) dosyasında.**

Mimari açıdan:

- Route'lar (`app/api/v1/**/route.ts`) iş mantığını kendileri yazmaz; panelin kullandığı **aynı Server Action'ları** çağırır. Bu yüzden zod doğrulaması, rol yetkileri, soft delete, `pageLimit` ve HTML temizleme API'de de birebir aynıdır. HTTP ile action'lar arasındaki çeviri `lib/api.ts` içindedir.
- İstekler `Authorization: Bearer <token>` ile gelir. Her kullanıcının bir API token'ı vardır; veritabanında sadece SHA-256 hash'i tutulur (`ApiToken` modeli). API oturum çerezini kabul etmez.
- **CORS** her origin'e açıktır (`next.config.ts` → `headers()`). API çerez kullanmadığı için bu güvenlidir: başka bir site ziyaretçinin oturumuyla istek atamaz, sadece kendi token'ıyla atabilir.
- Token'lar `npm run user:create` ve Admin Paneli'nde kullanıcı eklenirken, ya da Profilim sayfasında oluşturulur; `npm run api:tokens` token'ı olmayan kullanıcılara token verir. Kaynak kodda ya da sayfalarda sabit bir token yoktur.

---

## Kurulum

**Gereksinimler**

- **Node.js 22.18 veya üstü.** `npm run user:create` TypeScript dosyasını doğrudan Node ile çalıştırıyor.
- **Replica set olarak çalışan bir MongoDB.** Prisma transaction'lar için buna ihtiyaç duyuyor; [MongoDB Atlas](https://www.mongodb.com/atlas) ücretsiz katmanı yeterli.

```bash
git clone https://github.com/FlyingTurkman/crm-demo.git
cd crm-demo
npm install                 # postinstall: prisma generate

cp .env.example .env        # DATABASE_URL ve AWS bilgilerini doldurun
npm run db:push             # şemayı MongoDB'ye uygular (Mongo'da migration yok)
npm run user:create         # ilk admin kullanıcıyı oluşturur (interaktif), API token'ını da yazar
npm run api:tokens          # (opsiyonel) token'ı olmayan kullanıcılara token verir
npm run db:seed -- --yes    # (opsiyonel) demo hesapları + demo ekibi + 60 müşteri, ~140 içerik, ~100 not ile örnek veri

npm run dev                 # http://localhost:3000
```

`.env` örneği:

```env
DATABASE_URL="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/crm-demo"

# İçerik görselleri (sadece sunucu kullanır)
AWS_REGION="eu-central-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET_NAME="bucket-adi"
AWS_S3_BUCKET_URL="https://bucket-adi.s3.eu-central-1.amazonaws.com"
# Tarayıcının görselleri gösterdiği adres (gizli değildir)
NEXT_PUBLIC_AWS_S3_BUCKET_URL="https://bucket-adi.s3.eu-central-1.amazonaws.com"
```

Bucket'taki `posts/*` nesneleri herkese açık okunabilir olmalıdır (görseller doğrudan bucket adresinden gösterilir). Yükleme sunucudan yapıldığı için bucket'ta CORS ayarı gerekmez. IAM kullanıcısına `s3:PutObject` ve `s3:GetObject` (`HeadObject` için) yetkisi yeterlidir.

Bu sürümden önce oluşturulmuş bir veritabanı kullanıyorsanız `npm run db:push` sonrasında bir kez `npm run db:posts-backfill` çalıştırın: eski içeriklere varsayılan tür ve boş teslim / sorumlu / görsel alanlarını yazar.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Production derleme ve çalıştırma |
| `npm run lint` | ESLint |
| `npm run db:push` | Prisma şemasını MongoDB'ye uygular |
| `npm run db:studio` | Prisma Studio (veritabanını tarayıcıda görüntüleme) |
| `npm run user:create` | Terminalden admin veya moderatör kullanıcı oluşturur, API token'ını bir kez gösterir |
| `npm run db:seed -- --yes` | Demo verisi oluşturur: müşteri, içerik ve notları **silip** yeniden üretir (son 90 güne yayılmış, birkaçı bugün), sadece demo hesaplarını bırakır. `--yes` olmadan sadece ne yapacağını yazar |
| `npm run db:search-text` | Bütün kayıtların arama alanını (`searchText`) doldurur / onarır. Eski bir yedek geri yüklendiğinde ya da arama kuralı değiştiğinde gerekir; `db:restore` ve `db:seed` bunu kendisi çalıştırır |
| `npm run db:backup` | Bütün koleksiyonları `backups/<tarih>/` altına JSON (Extended JSON) olarak yedekler |
| `npm run db:restore -- backups/<tarih>` | Yedeği `DATABASE_URL`'deki veritabanına yükler; sadece boş koleksiyonları doldurur |
| `npm run api:tokens` | Token'ı olmayan kullanıcılara API token'ı verir ve bir kez yazar (`--force` ile hepsini yeniler) |
| `npm run db:schedule-demo` | Yayında olmayan ve zamanı olmayan içeriklerin yaklaşık yarısına önümüzdeki 14 gün içinde mesai saatlerinde bir yayın zamanı verir (ajandayı doldurmak için) |
| `npm run db:team-demo` | Demo ajans ekibini (`demoTeamMembers`, 6 moderatör, `@ajans.test`) oluşturur. Şifreleri rastgeledir ve yazdırılmaz; gerekirse Admin Paneli'nden sıfırlanır |
| `npm run db:platforms-demo` | Platformu boş içeriklere rastgele 1–3 sosyal medya platformu yazar; `-- --all` ile hepsini yeniler |
| `npm run db:assign-demo` | Sorumlusu olmayan içeriklere kullanıcıları sırayla atar; `-- --all` ile bütün içerikleri yeniden dağıtır |
| `npm run db:posts-backfill` | Tür / kanal / teslim tarihi / sorumlu / görsel alanları eklenmeden önce oluşturulmuş içeriklere varsayılan değerleri yazar (`updatedAt` değişmez) |

---

## Güvenlik notları

- **Sunucu doğrulaması:** Her Server Action sunucuda yetkiyi ve girdiyi kontrol eder; istemci tarafındaki kontroller sadece kullanıcı deneyimi içindir.
- **Oturum token'ları:** Hiçbir zaman istemci JavaScript'ine ya da action yanıtlarına çıkmaz.
- **API token'ları:** Veritabanında sadece SHA-256 hash'leri tutulur; token sadece oluşturulduğu anda bir kez gösterilir. API çerez kabul etmez, sadece `Authorization: Bearer` başlığıyla çalışır.
- **Şifre hash'i:** Hiçbir sorguda seçilmez (giriş doğrulaması hariç).
- **HTML içerik:** Kaydedilmeden önce beyaz listeyle temizlenir.
- **Giriş hataları:** Bilinmeyen email ve yanlış şifre için aynı mesaj döner, böylece kayıtlı email'ler tahmin edilemez.
- **Görsel yükleme:** Dosya türü tarayıcının bildirdiğine değil, dosyanın ilk baytlarına bakılarak belirlenir (JPG / PNG / WEBP / GIF); dosya adı S3 anahtarında kullanılmaz (`posts/<uuid>.<uzantı>`). İçerik kaydedilirken her yeni anahtarın biçimi kontrol edilir ve S3'te gerçekten var olduğu doğrulanır; boyut ve tür istemciden değil S3'ten okunur. AWS bilgileri sadece sunucudadır.
- **API token'ları sayfada yok:** Demo hesapların token'ları giriş sayfasında ya da kaynak kodda yazmaz; her ziyaretçi kendi token'ını Profilim'den oluşturur.
- **Gizli bilgiler:** `.env` repoya eklenmez; sadece `.env.example` var.

---



