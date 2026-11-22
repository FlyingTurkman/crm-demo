# CRM Demo

Müşterileri ve müşterilere bağlı içerikleri (blog yazıları ve notlar) yönetmek için hazırlanmış bir CRM paneli. Next.js 16 (App Router), React 19, MongoDB (Prisma) ve shadcn/ui ile yazıldı.

**Ne yapılabiliyor?**

- Müşteri ekleme, listeleme, düzenleme, silme
- Müşteriye bağlı blog yazıları ve notlar (zengin metin editörüyle)
- Blog durumu (`Taslak` → `İncelemede` → `Yayında`) güncelleme ve duruma göre filtreleme
- Genel durumu özetleyen dashboard
- Rol tabanlı yetki (admin / moderatör) ve kullanıcı yönetimi (Admin Paneli)
- Kullanıcı başına API token'ı ile çalışan RESTful API (`/api/v1`)
- Profil sayfası: ad-soyad, şifre, kişisel API token'ı ve açık oturumlar

## Demo hesapları

Giriş sayfasında da yazıyor; **Bilgileri doldur** butonu formu otomatik doldurur. API token'ı [REST API](#rest-api) istekleri içindir.

| Rol | Email | Şifre | API token | Yapabildikleri |
|---|---|---|---|---|
| Admin | `admin@testmail.com` | `12345678` | `crm_demo_admin_api_token` | Her şey: silme ve Admin Paneli dahil |
| Moderatör | `moderator@testmail.com` | `12345678` | `crm_demo_moderator_api_token` | Ekleme ve düzenleme; silme yok, Admin Paneli yok |

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
- [REST API](#rest-api)
  - [API token'ları](#api-tokenları)
  - [Yanıt formatı ve durum kodları](#yanıt-formatı-ve-durum-kodları)
  - [Uç noktalar](#uç-noktalar)
  - [Örnekler](#örnekler)
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
│   ├── post.ts              blog CRUD, durum güncelleme, liste, arama
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
│       ├── blogs/           tüm bloglar
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
│   ├── period.ts            "Bugün / Son 7 gün / Son 30 gün" filtresi
│   ├── search.ts            Mongo regex kaçırma
│   └── src/
│       ├── constants.ts     tüm sınırlar ve sabitler
│       └── scripts/         CLI script'leri (user:create, api:tokens)
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
    User ||--o{ ApiToken : "API token'ları"

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
- **Profilim (`/app/profile`):**
  - Ad-soyad güncellenir; menüdeki isim hemen değişir. Email ve rolü sadece bir admin değiştirebilir.
  - Şifre değiştirmek için mevcut şifre istenir. Şifre değişince diğer cihazlardaki oturumlar kapatılır, bu oturum açık kalır.
  - Kişinin kendi API token'ı yenilenebilir.
  - Diğer cihazlardaki açık oturumların sayısı görünür ve hepsi tek tuşla kapatılabilir.
  - **Demo hesaplarında** şifre, API token'ı ve oturum kapatma kilitlidir. Hesaplar herkese açık olduğu için bir ziyaretçi diğerlerini dışarıda bırakamaz (`lib/auth/demo.ts`).
- **Yükleme iskeletleri:** Her sayfanın bir `loading.tsx` dosyası var ve veri gelene kadar o sayfanın şeklinde shadcn `Skeleton` gösteriliyor. Hangi iskeletin çizileceğini `RouteSkeleton` adrese bakarak seçiyor. Örneğin dashboard'dan bir müşteriye geçerken sidebar, müşteri başlığı ve içerik birlikte iskelet olarak görünür; bölüm içinde gezerken sadece değişen kısım iskelete döner.
- **Sayfa başlıkları:** Her sayfanın kendi başlığı var (`Ahmet Yılmaz - Bloglar | CRM` gibi).

## REST API

Panelin dışındaki sistemler (entegrasyonlar, script'ler, mobil uygulama vb.) için `/api/v1` altında RESTful bir API var. Route'lar (`app/api/v1/**/route.ts`) iş mantığını kendileri yazmaz; panelin kullandığı **aynı Server Action'ları** çağırır. Bu yüzden zod doğrulaması, rol yetkileri, soft delete, `pageLimit` ve HTML temizleme API'de de birebir aynıdır. Route'lar sadece HTTP ile action'lar arasında çeviri yapar (`lib/api.ts`).

### API token'ları

Her istek, kullanıcının API token'ıyla gönderilir:

```http
Authorization: Bearer <token>
```

- **Kullanıcı başına bir token.** İstek o kullanıcının rolüyle çalışır; admin token'ı her şeyi yapabilir, moderatör token'ı silme ve kullanıcı yönetimi yapamaz.
- **Format:** `crm_` + 128 karakterlik opak rastgele değer. JWT değildir, içinde bilgi taşımaz.
- **Saklama:** Veritabanında sadece token'ın **SHA-256 hash'i** tutulur (`ApiToken` modeli). Token bu yüzden sadece oluşturulduğu anda bir kez gösterilir.
- **Oluşturma:**
  - Admin Paneli'nden kullanıcı eklenince token otomatik oluşturulur ve bir pencerede gösterilir.
  - `npm run user:create` token'ı terminale yazar.
  - `npm run api:tokens` token'ı olmayan bütün kullanıcılara token verir, demo hesaplara sabit token'larını yazar.
- **Yenileme:** Kullanıcı kendi token'ını **Profilim** sayfasından, admin herhangi bir kullanıcınınkini Admin Paneli → kullanıcıyı düzenle → **API Token** kartından yeniler (*Yeni Token Oluştur*). Eski token anında geçersiz olur. Kart, token'ın ne zaman oluşturulduğunu ve en son ne zaman kullanıldığını da gösterir.
- **Çerez kabul edilmez.** API sadece `Authorization` başlığıyla çalışır; panelin oturum çerezi API'de geçmez. Bu sayede başka bir siteden tarayıcı üzerinden istek atılamaz (CSRF).
- **Silinen kullanıcı:** Kullanıcı silinince token'ı da soft delete edilir.

**Demo token'ları** (giriş sayfasında da yazıyor):

| Hesap | Token |
|---|---|
| Admin | `crm_demo_admin_api_token` |
| Moderatör | `crm_demo_moderator_api_token` |

Demo token'ları herkese açık olsun diye sabittir (`lib/src/constants.ts` → `demoAccounts`). Panelden yenilenirlerse `npm run api:tokens` onları geri yükler.

### Yanıt formatı ve durum kodları

Yanıtlar, Server Action'ların döndüğü `Response` yapısıyla aynıdır: `{ status: boolean, message?: string, ...veri }`.

```json
{ "status": true, "customers": [ ... ], "total": 52, "page": 1, "pageCount": 2 }
{ "status": false, "message": "Müşteri bulunamadı" }
```

| Kod | Ne zaman |
|---|---|
| `200` | Başarılı okuma, güncelleme ya da silme |
| `201` | Kayıt oluşturuldu |
| `400` | Geçersiz girdi (zod mesajı döner), geçersiz JSON, geçersiz id |
| `401` | Token yok, hatalı ya da geçersiz |
| `403` | Token geçerli ama rolün bu işleme yetkisi yok |
| `404` | Kayıt bulunamadı (silinmiş kayıtlar da bulunamaz) |
| `409` | Aynı email ile kayıt zaten var |

Hata mesajları Türkçedir, panelde gösterilen mesajlarla aynıdır.

### Uç noktalar

Bütün yollar `/api/v1` ile başlar.

| Metot | Yol | Yetki | Açıklama |
|---|---|---|---|
| `GET` | `/me` | – | Token'ın sahibi (email maskeli) |
| `GET` | `/dashboard` | `dashboard:read` | Dashboard istatistikleri (`?date=YYYY-MM-DD&period=`) |
| `GET` | `/customers` | `customer:read` | Müşteri listesi |
| `POST` | `/customers` | `customer:create` | Müşteri ekle |
| `GET` | `/customers/{customerId}` | `customer:read` | Müşteri, not / blog sayıları ve blog durum dağılımı |
| `PATCH` | `/customers/{customerId}` | `customer:update` | Müşteriyi güncelle |
| `DELETE` | `/customers/{customerId}` | `customer:delete` | Müşteriyi bloglarıyla ve notlarıyla birlikte soft delete et |
| `GET` | `/customers/{customerId}/posts` | `post:read` | Müşterinin blogları |
| `POST` | `/customers/{customerId}/posts` | `post:create` | Müşteriye blog ekle |
| `GET` | `/customers/{customerId}/notes` | `note:read` | Müşterinin notları |
| `POST` | `/customers/{customerId}/notes` | `note:create` | Müşteriye not ekle |
| `GET` | `/posts` | `post:read` | Tüm müşterilerin blogları |
| `GET` | `/posts/{postId}` | `post:read` | Blog |
| `PATCH` | `/posts/{postId}` | `post:update` | Blogu güncelle; sadece `{ "status" }` gönderilirse sadece durum değişir |
| `DELETE` | `/posts/{postId}` | `post:delete` | Blogu soft delete et |
| `GET` | `/notes` | `note:read` | Tüm müşterilerin notları |
| `GET` | `/notes/{noteId}` | `note:read` | Not |
| `PATCH` | `/notes/{noteId}` | `note:update` | Notu güncelle |
| `DELETE` | `/notes/{noteId}` | `note:delete` | Notu soft delete et |
| `GET` | `/users` | `user:read` | Sistem kullanıcıları |
| `POST` | `/users` | `user:create` | Kullanıcı ekle; yanıtta yeni kullanıcının `apiToken`'ı bir kez döner |
| `GET` | `/users/{userId}` | `user:read` | Kullanıcı (şifre hiçbir zaman dönmez) |
| `PATCH` | `/users/{userId}` | `user:update` | Kullanıcıyı güncelle (`password` opsiyonel) |
| `DELETE` | `/users/{userId}` | `user:delete` | Kullanıcıyı soft delete et; oturumları ve API token'ı kapanır |
| `GET` | `/users/{userId}/api-token` | `apiToken:read` | Token'ın oluşturulma ve son kullanım zamanı (token'ın kendisi değil) |
| `POST` | `/users/{userId}/api-token` | `apiToken:create` | Yeni token üret, eskisini geçersiz kıl; yeni token yanıtta bir kez döner |

**Liste parametreleri**

Listeler panel listeleriyle aynı filtreleri query string ile alır ve en fazla `pageLimit` (50) kayıt döner:

| Parametre | Değerler | Geçerli olduğu yer |
|---|---|---|
| `q` | Arama metni | hepsi |
| `page` | `1`, `2`, ... (son sayfadan büyükse son sayfa döner) | hepsi |
| `sort` | `updated` (varsayılan), `created`; müşteri ve kullanıcıda `name`, blogda `title` | hepsi |
| `period` | `today`, `week`, `month` | müşteri, blog, not, kullanıcı |
| `status` | `draft`, `inReview`, `published` | bloglar |
| `postStatus` | `draft`, `inReview`, `published` (o durumda blogu olan müşteriler) | müşteriler |
| `role` | `admin`, `moderator` | kullanıcılar |

Panelin aksine API geçersiz bir değeri sessizce yok saymaz; `400` ile hata mesajı döner.

**Gövde (JSON) kuralları**

- **`PATCH` kısmi günceller:** Sadece gönderilen alanlar değişir, diğerleri olduğu gibi kalır. Opsiyonel bir alanı (`phone`, `company`) boşaltmak için `null` gönderin.
- **Kimlikler URL'den gelir:** Gövdede gönderilen `customerId`, `postId` gibi alanlar yok sayılır.
- **Zengin metin:** Blog ve notlar için `rawContent` (HTML) ve / veya `content` (düz metin) gönderilebilir.
  - Sadece `rawContent` gönderilirse düz metin ondan çıkarılır.
  - Sadece `content` gönderilirse her satır bir `<div>` olacak şekilde HTML üretilir.
  - HTML her durumda panelde olduğu gibi sunucuda temizlenir; `<script>` gibi etiketler kaydedilmez.
- **Blog durumu:** Yeni blogda `status` gönderilmezse `draft` olur.

### Örnekler

```bash
TOKEN=crm_demo_admin_api_token
API=http://localhost:3000/api/v1

# Token kimin?
curl -H "Authorization: Bearer $TOKEN" $API/me

# Adında "ahmet" geçen müşteriler, ada göre sıralı
curl -H "Authorization: Bearer $TOKEN" "$API/customers?q=ahmet&sort=name"

# Müşteri ekle
curl -X POST $API/customers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Ayşe","surname":"Demir","email":"ayse@example.com","company":"Demir Ltd."}'

# Müşteriye blog ekle (sadece düz metin; HTML otomatik üretilir)
curl -X POST $API/customers/<customerId>/posts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Yeni ürünümüz","content":"Birinci satır\nİkinci satır"}'

# Blogu yayına al
curl -X PATCH $API/posts/<postId> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"published"}'

# Yayındaki bloglar
curl -H "Authorization: Bearer $TOKEN" "$API/posts?status=published"

# Notu sil (moderatör token'ıyla 403 döner)
curl -X DELETE -H "Authorization: Bearer $TOKEN" $API/notes/<noteId>
```

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
npm run user:create         # ilk admin kullanıcıyı oluşturur (interaktif), API token'ını da yazar
npm run api:tokens          # (opsiyonel) token'ı olmayan kullanıcılara token verir, demo token'larını yükler
npm run db:seed -- --yes    # (opsiyonel) demo hesapları + 60 müşteri, ~140 blog, ~100 not ile örnek veri

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
| `npm run user:create` | Terminalden admin veya moderatör kullanıcı oluşturur, API token'ını bir kez gösterir |
| `npm run db:seed -- --yes` | Demo verisi oluşturur: müşteri, blog ve notları **silip** yeniden üretir (son 90 güne yayılmış, birkaçı bugün), sadece demo hesaplarını bırakır. `--yes` olmadan sadece ne yapacağını yazar |
| `npm run db:backup` | Bütün koleksiyonları `backups/<tarih>/` altına JSON (Extended JSON) olarak yedekler |
| `npm run db:restore -- backups/<tarih>` | Yedeği `DATABASE_URL`'deki veritabanına yükler; sadece boş koleksiyonları doldurur |
| `npm run api:tokens` | Token'ı olmayan kullanıcılara API token'ı verir, demo hesaplara sabit token'larını yazar (`--force` ile demo dışındakileri yeniler) |

---

## Güvenlik notları

- **Sunucu doğrulaması:** Her Server Action sunucuda yetkiyi ve girdiyi kontrol eder; istemci tarafındaki kontroller sadece kullanıcı deneyimi içindir.
- **Oturum token'ları:** Hiçbir zaman istemci JavaScript'ine ya da action yanıtlarına çıkmaz.
- **API token'ları:** Veritabanında sadece SHA-256 hash'leri tutulur; token sadece oluşturulduğu anda bir kez gösterilir. API çerez kabul etmez, sadece `Authorization: Bearer` başlığıyla çalışır.
- **Şifre hash'i:** Hiçbir sorguda seçilmez (giriş doğrulaması hariç).
- **HTML içerik:** Kaydedilmeden önce beyaz listeyle temizlenir.
- **Giriş hataları:** Bilinmeyen email ve yanlış şifre için aynı mesaj döner, böylece kayıtlı email'ler tahmin edilemez.
- **Gizli bilgiler:** `.env` repoya eklenmez; sadece `.env.example` var.

## Bilinen kısıtlar

- **Demo hesapları herkese açık.** Uygulama yayındaysa giriş sayfasındaki bilgilerle herkes admin olarak girebilir, demo API token'larıyla API'yi kullanabilir. Gerçek kullanımda bu hesaplar silinmeli ya da şifreleri ve token'ları değiştirilmelidir (`lib/src/constants.ts` → `demoAccounts`).
- **API'de istek sınırı (rate limit) yok.** Yayına alınacaksa önüne bir rate limit katmanı eklenmeli.
- **Email'ler benzersiz.** Soft delete edilmiş bir müşteri ya da kullanıcının email'i veritabanında kaldığı için aynı email ile yeniden kayıt açılamaz.
- **"Bugün" filtresi sunucunun saat dilimine göre hesaplanır.** Sunucu UTC'de çalışıyorsa Türkiye saatiyle 3 saat kayar.
- **Büyük/küçük harf duyarsız arama Türkçe `ı/i` dönüşümünü yapmaz.** "yilmaz" araması "Yılmaz"ı ad alanında bulmaz.
