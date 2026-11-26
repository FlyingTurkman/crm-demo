# CRM Demo REST API

Müşterileri, müşterilere bağlı içerikleri (sosyal medya, blog, web sayfası, ...), notları ve sistem kullanıcılarını yönetmek için RESTful JSON API.

| | |
|---|---|
| **Temel adres** | `https://crm-demo-plum.vercel.app/api/v1` |
| **Yerel adres** | `http://localhost:3000/api/v1` |
| **Kimlik doğrulama** | `Authorization: Bearer <token>` |
| **Gövde formatı** | JSON (`Content-Type: application/json`) |
| **CORS** | Her origin'e açık (tarayıcıdan, Postman'den, sunucudan çağrılabilir) |

---

## İçindekiler

- [Hızlı başlangıç](#hızlı-başlangıç)
- [Kimlik doğrulama](#kimlik-doğrulama)
- [CORS](#cors)
- [Yanıt formatı ve hatalar](#yanıt-formatı-ve-hatalar)
- [Ortak kurallar](#ortak-kurallar)
- [Hesap](#hesap)
  - [`GET /me`](#get-me)
  - [`GET /dashboard`](#get-dashboard)
  - [`GET /agenda`](#get-agenda)
- [Müşteriler](#müşteriler)
  - [`GET /customers`](#get-customers)
  - [`POST /customers`](#post-customers)
  - [`GET /customers/{customerId}`](#get-customerscustomerid)
  - [`PATCH /customers/{customerId}`](#patch-customerscustomerid)
  - [`DELETE /customers/{customerId}`](#delete-customerscustomerid)
- [İçerikler](#i̇çerikler)
  - [`POST /images`](#post-images)
  - [`GET /customers/{customerId}/posts`](#get-customerscustomeridposts)
  - [`POST /customers/{customerId}/posts`](#post-customerscustomeridposts)
  - [`GET /posts`](#get-posts)
  - [`GET /posts/{postId}`](#get-postspostid)
  - [`PATCH /posts/{postId}`](#patch-postspostid)
  - [`DELETE /posts/{postId}`](#delete-postspostid)
- [Notlar](#notlar)
  - [`GET /customers/{customerId}/notes`](#get-customerscustomeridnotes)
  - [`POST /customers/{customerId}/notes`](#post-customerscustomeridnotes)
  - [`GET /notes`](#get-notes)
  - [`GET /notes/{noteId}`](#get-notesnoteid)
  - [`PATCH /notes/{noteId}`](#patch-notesnoteid)
  - [`DELETE /notes/{noteId}`](#delete-notesnoteid)
- [Kullanıcılar (sadece admin)](#kullanıcılar-sadece-admin)
  - [`GET /users`](#get-users)
  - [`POST /users`](#post-users)
  - [`GET /users/{userId}`](#get-usersuserid)
  - [`PATCH /users/{userId}`](#patch-usersuserid)
  - [`DELETE /users/{userId}`](#delete-usersuserid)
  - [`GET /users/{userId}/api-token`](#get-usersuseridapi-token)
  - [`POST /users/{userId}/api-token`](#post-usersuseridapi-token)
- [Veri modelleri](#veri-modelleri)

---

## Hızlı başlangıç

Önce panele giriş yapıp **Profilim** sayfasından bir API token'ı oluşturun (token yalnızca bir kez gösterilir). Aşağıdaki satırlar o token'la müşteri listesinin ilk sayfasını getirir:

```bash
TOKEN=crm_...   # Profilim sayfasında oluşturduğunuz token
API=https://crm-demo-plum.vercel.app/api/v1

curl -H "Authorization: Bearer $TOKEN" "$API/customers"
```

Tarayıcı konsolundan (herhangi bir sitede) de aynı istek atılabilir:

```js
const response = await fetch('https://crm-demo-plum.vercel.app/api/v1/customers', {
    headers: { Authorization: 'Bearer crm_...' },
})
console.log(await response.json())
```

---

## Kimlik doğrulama

Her istekte bir API token'ı `Authorization` başlığıyla gönderilir:

```http
Authorization: Bearer crm_...
```

İstek, token'ın sahibi olan kullanıcının rolüyle çalışır.

| Rol | Yapabildikleri |
|---|---|
| `admin` | Her şey |
| `moderator` | Okuma, ekleme, güncelleme. Silme (`DELETE`) ve `/users/**` istekleri `403` döner. |

### Demo hesapları

Token'lar hiçbir yerde yayınlanmaz. Demo hesaplarıyla (`admin@testmail.com`, `moderator@testmail.com`, şifreler giriş sayfasında) panele girip **Profilim** sayfasından kendi token'ınızı oluşturun. Demo hesapları ortak kullanıldığı için yeni token bir önceki ziyaretçinin token'ını geçersiz kılar; panel girişi bundan etkilenmez.

Demo verileri herkese açıktır ve zaman zaman sıfırlanabilir.

### Token hakkında

- Format: `crm_` + 128 karakterlik rastgele değer. JWT değildir, içinden bilgi okunamaz.
- Her kullanıcının tek bir aktif token'ı vardır. Yenisi üretilince eskisi anında geçersiz olur.
- Token sadece üretildiği anda bir kez gösterilir (sunucu yalnızca hash'ini saklar).
- Token'ınızı panelde **Profilim** sayfasından yenileyebilirsiniz.
- API, panelin oturum çerezini kabul etmez; sadece `Authorization` başlığına bakar.

### Token hataları

| Durum | Kod | Mesaj |
|---|---|---|
| Başlık yok ya da `Bearer` ile başlamıyor | `401` | `API token gerekli: Authorization: Bearer <token>` |
| Token yanlış, yenilenmiş ya da kullanıcı silinmiş | `401` | `Bu işlem için giriş yapmalısınız` (`/me` için: `Geçersiz API token`) |
| Rolün bu işleme yetkisi yok | `403` | `Bu işlem için yetkiniz yok` |

`401` yanıtları `WWW-Authenticate: Bearer` başlığı da içerir.

---

## CORS

API her origin'den çağrılabilir. Bütün `/api/v1/**` yanıtları şu başlıkları içerir:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Expose-Headers: WWW-Authenticate
Access-Control-Max-Age: 86400
```

- Tarayıcının gönderdiği ön kontrol (`OPTIONS`) isteği `204` ile yanıtlanır ve 1 gün önbellekte tutulur.
- Çerez kullanılmadığı için `credentials: 'include'` gerekmez. Gönderilse de API çerezi okumaz.

---

## Yanıt formatı ve hatalar

Her yanıt bir JSON nesnesidir ve `status` alanı içerir.

**Başarılı:**

```json
{
    "status": true,
    "message": "Müşteri oluşturuldu",
    "customer": { "id": "6b0369e4e0b8722fcddf2eb0", "...": "..." }
}
```

**Hatalı:**

```json
{
    "status": false,
    "message": "Müşteri bulunamadı"
}
```

- `status`: İşlem başarılıysa `true`.
- `message`: Türkçe, kullanıcıya gösterilebilir mesaj. Hatalarda her zaman, başarılı işlemlerde sadece değişiklik yapan isteklerde bulunur.
- Diğer alanlar (`customer`, `posts`, `stats`, ...) her uç noktanın bölümünde yazıyor.

### Durum kodları

| Kod | Anlamı | Örnek mesaj |
|---|---|---|
| `200` | Başarılı okuma, güncelleme ya da silme | |
| `201` | Kayıt oluşturuldu | `Müşteri oluşturuldu` |
| `400` | Geçersiz girdi, geçersiz JSON ya da geçersiz id | `Ad zorunludur`, `Geçersiz müşteri` |
| `401` | Token yok ya da geçersiz | `Bu işlem için giriş yapmalısınız` |
| `403` | Rolün yetkisi yok | `Bu işlem için yetkiniz yok` |
| `404` | Kayıt yok ya da silinmiş | `Müşteri bulunamadı` |
| `409` | Email başka bir kayıtta kullanılıyor | `Bu email ile kayıtlı bir müşteri zaten var` |

Doğrulama hatalarında sadece ilk hatanın mesajı döner.

---

## Ortak kurallar

### Kimlikler (id)

Bütün kimlikler 24 karakterlik onaltılık metinlerdir (MongoDB ObjectId), örneğin `6b0369e4e0b8722fcddf2eb0`. Bu biçimde olmayan bir id `400` döner (`Geçersiz müşteri`, `Geçersiz içerik`, ...).

### Sayfalama

Liste uç noktaları sayfa başına **en fazla 50** kayıt döner ve yanıta sayfalama bilgisi ekler:

```json
{ "status": true, "customers": [ ... ], "total": 60, "page": 1, "pageCount": 2 }
```

| Alan | Açıklama |
|---|---|
| `total` | Filtreye uyan toplam kayıt sayısı |
| `page` | Dönen sayfa |
| `pageCount` | Toplam sayfa sayısı (kayıt yoksa `1`) |

`page` son sayfadan büyükse son sayfa döner.

### Ortak query parametreleri

Her uç noktanın bölümünde hangilerini aldığı ayrıca yazıyor.

| Parametre | Değerler | Açıklama |
|---|---|---|
| `q` | metin, en fazla 100 karakter | Arama (büyük / küçük harf duyarsız) |
| `page` | `1`, `2`, ... | Sayfa numarası, varsayılan `1` |
| `sort` | `updated`, `created`, ... | Sıralama, varsayılan `updated` (son güncellenen önce) |
| `period` | `today`, `week`, `month` | Sadece bugün / son 7 gün / son 30 günde oluşturulanlar |

Geçersiz bir değer yok sayılmaz, `400` döner (`Geçersiz sıralama`, `Geçersiz tarih aralığı`, ...).

### İstek gövdesi

- Gövde bir JSON **nesnesi** olmalıdır; aksi halde `400`: `İstek gövdesi geçerli bir JSON nesnesi olmalıdır`.
- **`POST`:** Zorunlu alanların hepsi gönderilir.
- **`PATCH` kısmi günceller:** Sadece gönderilen alanlar değişir, diğerleri olduğu gibi kalır.
- Opsiyonel bir alanı boşaltmak için `null` gönderin (`"company": null`).
- Metin alanlarının başındaki ve sonundaki boşluklar kırpılır.
- Kimlikler URL'den alınır. Gövdedeki `customerId`, `postId`, `noteId`, `userId` alanları yok sayılır.
- Tanımlanmamış alanlar yok sayılır.

### Zengin metin (içerik ve not metni)

İçeriklerin ve notların metni iki alanda tutulur:

| Alan | İçerik |
|---|---|
| `content` | Düz metin (arama ve önizleme için) |
| `rawContent` | HTML (panelde bu gösterilir) |

İstekte ikisinden birini göndermeniz yeterli:

- Sadece `content` gönderilirse her satır bir `<div>` olacak şekilde HTML üretilir: `"A\nB"` → `<div>A</div><div>B</div>`.
- Sadece `rawContent` gönderilirse düz metin HTML'den çıkarılır.
- HTML her zaman sunucuda temizlenir; `<script>`, `onclick` gibi tehlikeli etiketler ve öznitelikler kaydedilmez.

### Silme

`DELETE` kaydı kalıcı olarak silmez, gizler (soft delete). Silinen kayıt bir daha hiçbir uç noktada görünmez ve `404` döner. Silme işlemleri sadece `admin` içindir.

---

## Hesap

### `GET /me`

Token'ın sahibi olan kullanıcıyı döner. Token'ı denemek için en kolay istek budur.

**Yetki:** admin, moderator

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/me"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "user": {
        "id": "6b0065ebbfa5807b0f9326d1",
        "name": "Test",
        "surname": "Kullanıcı",
        "fullName": "Test Kullanıcı",
        "email": "a***@testmail.com",
        "password": "***",
        "role": "admin",
        "createdAt": "2026-11-20T15:23:19.637Z",
        "updatedAt": "2026-11-22T15:00:08.219Z"
    }
}
```

`email` maskelenir, `password` her zaman `***` döner.

---

### `GET /dashboard`

Panel ana sayfasındaki istatistikler.

**Yetki:** admin, moderator

**Query parametreleri:**

| Parametre | Zorunlu | Değerler | Açıklama |
|---|---|---|---|
| `date` | hayır | `YYYY-MM-DD` | İstatistiklerin hesaplanacağı gün. Varsayılan bugün; ileri bir tarih bugüne çekilir. |
| `period` | hayır | `today` (varsayılan), `week`, `month` | "Son eklenenler" listelerinin ve `inPeriod` sayılarının aralığı (`date` ile biter) |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/dashboard?period=week"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "stats": {
        "customers": { "total": 60, "onDay": 0, "inPeriod": 7 },
        "posts": {
            "total": 141,
            "onDay": 0,
            "inPeriod": 50,
            "byStatus": { "draft": 44, "inReview": 33, "published": 64 },
            "overdue": 12,
            "upcoming": 18
        },
        "notes": { "total": 97, "onDay": 0, "inPeriod": 30 },
        "recentCustomers": [ { "id": "...", "fullName": "Ayşe Yılmaz", "...": "..." } ],
        "recentPosts": [ { "id": "...", "title": "...", "customer": { "...": "..." } } ],
        "recentNotes": [ { "id": "...", "content": "...", "customer": { "...": "..." } } ],
        "topCustomers": [ { "customer": { "id": "...", "fullName": "Zeynep Koç", "...": "..." }, "postCount": 8 } ],
        "overduePosts": [ { "id": "...", "title": "...", "dueDate": "...", "customer": { "...": "..." }, "assignee": { "...": "..." } } ],
        "upcomingPosts": [ { "id": "...", "title": "...", "dueDate": "...", "customer": { "...": "..." }, "assignee": { "...": "..." } } ]
    }
}
```

| Alan | Açıklama |
|---|---|
| `total` | `date` gününün sonuna kadar oluşturulan kayıt sayısı |
| `onDay` | Sadece `date` gününde oluşturulanlar |
| `inPeriod` | `period` aralığında oluşturulanlar |
| `byStatus` | İçeriklerin duruma göre dağılımı |
| `overdue` | Geciken içerik sayısı: teslim günü geçmiş, henüz `published` olmayan (her zaman güncel durum, `date`'ten bağımsız) |
| `upcoming` | Bugün ve sonraki 7 gün içinde teslim edilecek, henüz `published` olmayan içerik sayısı |
| `recentCustomers`, `recentPosts`, `recentNotes` | `period` aralığında eklenen son 5 kayıt (içerik ve notlarda `customer` dahil) |
| `topCustomers` | En çok içeriği olan 5 müşteri |
| `overduePosts`, `upcomingPosts` | Teslim gününe göre sıralı ilk 5 geciken / yaklaşan içerik (`customer` ve `assignee` dahil) |

---

### `GET /agenda`

Ajanda: `date` gününden başlayan 7 gün içinde yayın zamanı (`scheduledAt`) olan içerikler ve aynı günlerde teslim edilecek içerikler. Her içerikte `customer` ve `assignee` döner.

**Yetki:** admin, moderator

**Query parametreleri:**

| Parametre | Zorunlu | Değerler | Açıklama |
|---|---|---|---|
| `date` | hayır | `YYYY-MM-DD` | Haftanın ilk günü. Varsayılan bugün; geçmiş ve ileri tarihler kabul edilir |
| `assignee` | hayır | `me`, `none`, kullanıcı id'si | `me`: token sahibinin işleri, `none`: sorumlusu olmayanlar, id: o kullanıcının işleri. Hem zamanlanmış hem teslim listesine uygulanır |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/agenda?date=2026-11-30&assignee=me"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "start": "2026-11-30",
    "scheduledPosts": [ { "id": "...", "title": "...", "scheduledAt": "2026-12-01T07:30:00.000Z", "customer": { "...": "..." }, "assignee": { "...": "..." } } ],
    "duePosts": [ { "id": "...", "title": "...", "dueDate": "2026-12-02T21:00:00.000Z", "customer": { "...": "..." } } ],
    "isTruncated": false
}
```

`isTruncated`: listelerden biri sayfa sınırına (50) ulaştıysa `true`; o hafta için gösterilmeyen içerik var demektir.

**Hatalar:** `400` (`Geçersiz tarih`, `Geçersiz sorumlu`).

---

## Müşteriler

Müşteri nesnesinin alanları için bkz. [Customer](#customer).

### `GET /customers`

Müşteri listesi.

**Yetki:** admin, moderator

**Query parametreleri:**

| Parametre | Zorunlu | Değerler | Açıklama |
|---|---|---|---|
| `q` | hayır | metin | Ad soyad, email, telefon ya da firmada arar |
| `postStatus` | hayır | `draft`, `inReview`, `published` | Sadece bu durumda en az bir içeriği olan müşteriler |
| `period` | hayır | `today`, `week`, `month` | Oluşturulma tarihi |
| `sort` | hayır | `updated` (varsayılan), `created`, `name` | `name`: ada göre A→Z |
| `page` | hayır | `1`, `2`, ... | Sayfa |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/customers?q=ahmet&sort=name&page=1"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "customers": [
        {
            "id": "6ae85187cb49afe9b2c383b1",
            "name": "Ahmet",
            "surname": "Avcı",
            "fullName": "Ahmet Avcı",
            "email": "ahmet.avci@ankaradis.com.tr",
            "phone": "0533 570 45 56",
            "company": "Ankara Diş Polikliniği",
            "isDeleted": false,
            "createdAt": "2026-11-02T09:01:59.292Z",
            "updatedAt": "2026-11-22T13:41:04.462Z",
            "_count": { "notes": 1, "posts": 2 }
        }
    ],
    "total": 1,
    "page": 1,
    "pageCount": 1
}
```

`_count`: müşterinin not ve içerik sayısı.

---

### `POST /customers`

Yeni müşteri ekler.

**Yetki:** admin, moderator

**Gövde:**

| Alan | Tip | Zorunlu | Kural |
|---|---|---|---|
| `name` | string | evet | 1–50 karakter |
| `surname` | string | evet | 1–50 karakter |
| `email` | string | evet | Geçerli email; başka bir müşteride kullanılıyorsa `409` |
| `phone` | string | hayır | En fazla 20 karakter |
| `company` | string | hayır | En fazla 100 karakter |

**İstek:**

```bash
curl -X POST "$API/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ayşe","surname":"Demir","email":"ayse@example.com","company":"Demir Ltd."}'
```

**Yanıt `201`:**

```json
{
    "status": true,
    "message": "Müşteri oluşturuldu",
    "customer": {
        "id": "6b0369e4e0b8722fcddf2eb0",
        "name": "Ayşe",
        "surname": "Demir",
        "fullName": "Ayşe Demir",
        "email": "ayse@example.com",
        "phone": null,
        "company": "Demir Ltd.",
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:08.874Z",
        "updatedAt": "2026-11-22T22:17:08.874Z"
    }
}
```

**Hatalar:**

| Kod | Mesaj |
|---|---|
| `400` | `Ad zorunludur`, `Geçerli bir email girin`, ... |
| `409` | `Bu email ile kayıtlı bir müşteri zaten var` |

---

### `GET /customers/{customerId}`

Tek bir müşteri; not / içerik sayıları ve içeriklerin durum dağılımıyla.

**Yetki:** admin, moderator

**Yol parametreleri:**

| Parametre | Açıklama |
|---|---|
| `customerId` | Müşterinin id'si |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/customers/6b0369e4e0b8722fcddf2eb0"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "customer": {
        "id": "6b0369e4e0b8722fcddf2eb0",
        "name": "Ayşe",
        "surname": "Demir",
        "fullName": "Ayşe Demir",
        "email": "ayse@example.com",
        "phone": null,
        "company": "Demir Ltd.",
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:08.874Z",
        "updatedAt": "2026-11-22T22:17:08.874Z",
        "_count": { "notes": 0, "posts": 0 }
    },
    "postStatusCounts": { "draft": 0, "inReview": 0, "published": 0 }
}
```

**Hatalar:** `400` `Geçersiz müşteri` (id biçimi yanlış), `404` `Müşteri bulunamadı`.

---

### `PATCH /customers/{customerId}`

Müşteriyi günceller. Sadece gönderilen alanlar değişir.

**Yetki:** admin, moderator

**Yol parametreleri:** `customerId`

**Gövde:** [`POST /customers`](#post-customers) ile aynı alanlar, hepsi opsiyonel. `phone` ve `company` `null` gönderilerek boşaltılır.

**İstek:**

```bash
curl -X PATCH "$API/customers/6b0369e4e0b8722fcddf2eb0" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+90 555 000 00 00","company":null}'
```

**Yanıt `200`:**

```json
{
    "status": true,
    "message": "Müşteri güncellendi",
    "customer": {
        "id": "6b0369e4e0b8722fcddf2eb0",
        "name": "Ayşe",
        "surname": "Demir",
        "fullName": "Ayşe Demir",
        "email": "ayse@example.com",
        "phone": "+90 555 000 00 00",
        "company": null,
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:08.874Z",
        "updatedAt": "2026-11-22T22:17:13.634Z"
    }
}
```

**Hatalar:** `400`, `404` `Müşteri bulunamadı`, `409` (email başka bir müşteride).

---

### `DELETE /customers/{customerId}`

Müşteriyi, bütün içeriklerini ve notlarını birlikte siler.

**Yetki:** admin

**Yol parametreleri:** `customerId`

**İstek:**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" "$API/customers/6b0369e4e0b8722fcddf2eb0"
```

**Yanıt `200`:**

```json
{ "status": true, "message": "Müşteri silindi" }
```

**Hatalar:** `403` (moderatör), `404` `Müşteri bulunamadı`.

---

## İçerikler

Ajansın müşteriye teslim ettiği işler (sosyal medya gönderisi, blog yazısı, web sayfası, e-bülten, ...). Alanlar için bkz. [Post](#post).

- **Durum:** `draft` (taslak), `inReview` (onayda), `published` (yayında)
- **Tür:** `socialMedia`, `blog`, `webPage`, `newsletter`, `other`
- **Kanallar** (`platforms`, birden fazla olabilir): `instagram`, `tiktok`, `facebook`, `x`, `linkedin`, `youtube`, `pinterest`, `website`, `email`, `other`
- **Teslim tarihi** (`dueDate`): gün olarak gönderilir (`YYYY-MM-DD`). Günü geçmiş ve hâlâ `published` olmayan içerik **gecikmiş** sayılır.
- **Sorumlu** (`assigneeId`): içeriği teslim edecek sistem kullanıcısı. Yanıtta `assignee` olarak sadece herkese açık alanlarıyla döner (`id`, `name`, `surname`, `fullName`, `createdAt`).
- **Görseller** (`images`): önce [`POST /images`](#post-images) ile S3'e yüklenir, dönen `{ key, name }` içeriğin `images` dizisine yazılır.

### `POST /images`

Bir görseli S3'e yükler. Görsel bir içeriğe ancak içerik kaydedilirken (`images` alanıyla) bağlanır.

**Yetki:** admin, moderator

**Gövde:** `multipart/form-data`, tek bir `file` alanı. JPG, PNG, WEBP veya GIF, en fazla 4 MB. Dosya türü uzantıya ya da `Content-Type`'a değil, dosyanın ilk baytlarına bakılarak belirlenir.

**İstek:**

```bash
curl -X POST "$API/images" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@kapak.png"
```

**Yanıt `201`:**

```json
{
    "status": true,
    "message": "Görsel yüklendi",
    "image": { "key": "posts/3f1c2b9e-5a77-4c3e-9d0a-2b8f6e1d4c55.png", "name": "kapak.png", "contentType": "image/png", "size": 48213 },
    "url": "https://<bucket>.s3.<region>.amazonaws.com/posts/3f1c2b9e-5a77-4c3e-9d0a-2b8f6e1d4c55.png"
}
```

**Hatalar:** `400` (`Görsel seçin`, `Görsel en fazla 4 MB olabilir`, `Yalnızca JPG, PNG, WEBP veya GIF görseller yüklenebilir`).

---

### `GET /customers/{customerId}/posts`

Bir müşterinin içerikleri.

**Yetki:** admin, moderator

**Yol parametreleri:** `customerId`

**Query parametreleri:**

| Parametre | Zorunlu | Değerler | Açıklama |
|---|---|---|---|
| `q` | hayır | metin | Başlık ve içerikte arar |
| `status` | hayır | `draft`, `inReview`, `published` | Duruma göre filtre |
| `type` | hayır | `socialMedia`, `blog`, `webPage`, `newsletter`, `other` | Türe göre filtre |
| `platform` | hayır | `instagram`, `tiktok`, `facebook`, `x`, `linkedin`, `youtube`, `pinterest`, `website`, `email`, `other` | Bu kanal için üretilen içerikler |
| `due` | hayır | `overdue`, `week`, `none` | `overdue`: gecikenler, `week`: 7 gün içinde teslim, `none`: teslim tarihi yok |
| `assignee` | hayır | `me`, `none` | `me`: token sahibine atananlar, `none`: sorumlusu olmayanlar |
| `period` | hayır | `today`, `week`, `month` | Oluşturulma tarihi |
| `sort` | hayır | `updated` (varsayılan), `created`, `title` | `title`: başlığa göre A→Z |
| `page` | hayır | `1`, `2`, ... | Sayfa |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/customers/6b0369e4e0b8722fcddf2eb0/posts?status=draft"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "posts": [
        {
            "id": "6b0369ece0b8722fcddf2eb2",
            "title": "Yeni ürünümüz",
            "content": "Birinci satır\nİkinci satır",
            "rawContent": "<div>Birinci satır</div><div>İkinci satır</div>",
            "status": "draft",
            "type": "socialMedia",
            "platforms": ["instagram", "tiktok"],
            "dueDate": "2026-11-27T21:00:00.000Z",
            "assigneeId": "6b0369d1e0b8722fcddf2ea1",
            "images": [],
            "customerId": "6b0369e4e0b8722fcddf2eb0",
            "isDeleted": false,
            "createdAt": "2026-11-22T22:17:16.313Z",
            "updatedAt": "2026-11-22T22:17:16.313Z",
            "assignee": { "id": "6b0369d1e0b8722fcddf2ea1", "name": "Test", "surname": "Moderatör", "fullName": "Test Moderatör", "createdAt": "2026-11-20T10:00:00.000Z" }
        }
    ],
    "total": 1,
    "page": 1,
    "pageCount": 1
}
```

**Hatalar:** `400` `Geçersiz müşteri`. Müşteri yoksa ya da silinmişse boş liste döner.

---

### `POST /customers/{customerId}/posts`

Müşteriye içerik ekler.

**Yetki:** admin, moderator

**Yol parametreleri:** `customerId`

**Gövde:**

| Alan | Tip | Zorunlu | Kural |
|---|---|---|---|
| `title` | string | evet | 1–200 karakter |
| `content` | string | `content` ya da `rawContent` | Düz metin, en fazla 20.000 karakter |
| `rawContent` | string | `content` ya da `rawContent` | HTML ([zengin metin](#zengin-metin-i̇çerik-ve-not-metni)) |
| `status` | string | hayır | `draft` (varsayılan), `inReview`, `published` |
| `type` | string | hayır | `blog` (varsayılan), `socialMedia`, `webPage`, `newsletter`, `other` |
| `platforms` | string[] | hayır | Kanallar, ör. `["instagram","tiktok"]`. Varsayılan `[]`. Gönderilen dizi mevcut listenin yerine geçer |
| `dueDate` | string \| null | hayır | Teslim günü, `YYYY-MM-DD`. `null` teslim tarihini kaldırır |
| `scheduledAt` | string \| null | hayır | Planlanan yayın zamanı, `YYYY-MM-DDTHH:mm` (Türkiye saati). Ajandada bu zamanda görünür. `null` kaldırır |
| `assigneeId` | string \| null | hayır | Sorumlu kullanıcının id'si. `null` sorumluyu kaldırır |
| `images` | `{ key, name }[]` | hayır | [`POST /images`](#post-images) ile yüklenen görseller, sırasıyla. En fazla 10. Gönderilen dizi mevcut listenin yerine geçer |

**İstek:**

```bash
curl -X POST "$API/customers/6b0369e4e0b8722fcddf2eb0/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Yeni ürünümüz","content":"Birinci satır\nİkinci satır","type":"socialMedia","platforms":["instagram","tiktok"],"dueDate":"2026-11-28"}'
```

**Yanıt `201`:**

```json
{
    "status": true,
    "message": "İçerik oluşturuldu",
    "post": {
        "id": "6b0369ece0b8722fcddf2eb2",
        "title": "Yeni ürünümüz",
        "content": "Birinci satır\nİkinci satır",
        "rawContent": "<div>Birinci satır</div><div>İkinci satır</div>",
        "status": "draft",
        "customerId": "6b0369e4e0b8722fcddf2eb0",
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:16.313Z",
        "updatedAt": "2026-11-22T22:17:16.313Z"
    }
}
```

**Hatalar:** `400` (`Başlık zorunludur`, `İçerik zorunludur`, `Geçersiz teslim tarihi`, `Görsellerden biri bulunamadı, lütfen tekrar yükleyin`, ...), `404` (`Müşteri bulunamadı`, `Sorumlu kullanıcı bulunamadı`).

---

### `GET /posts`

Bütün müşterilerin içerikleri. Her içerikte sahibi olan müşteri (`customer`) de döner.

**Yetki:** admin, moderator

**Query parametreleri:**

| Parametre | Zorunlu | Değerler | Açıklama |
|---|---|---|---|
| `q` | hayır | metin | Başlık ve içerikte arar |
| `status` | hayır | `draft`, `inReview`, `published` | Duruma göre filtre |
| `type` | hayır | `socialMedia`, `blog`, `webPage`, `newsletter`, `other` | Türe göre filtre |
| `platform` | hayır | `instagram`, `tiktok`, `facebook`, `x`, `linkedin`, `youtube`, `pinterest`, `website`, `email`, `other` | Bu kanal için üretilen içerikler |
| `due` | hayır | `overdue`, `week`, `none` | `overdue`: gecikenler, `week`: 7 gün içinde teslim, `none`: teslim tarihi yok |
| `assignee` | hayır | `me`, `none` | `me`: token sahibine atananlar, `none`: sorumlusu olmayanlar |
| `period` | hayır | `today`, `week`, `month` | Oluşturulma tarihi |
| `sort` | hayır | `updated` (varsayılan), `created`, `title` | Sıralama |
| `page` | hayır | `1`, `2`, ... | Sayfa |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/posts?status=published&page=2"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "posts": [
        {
            "id": "6b0369ece0b8722fcddf2eb2",
            "title": "Yeni ürünümüz",
            "content": "Birinci satır\nİkinci satır",
            "rawContent": "<div>Birinci satır</div><div>İkinci satır</div>",
            "status": "published",
            "customerId": "6b0369e4e0b8722fcddf2eb0",
            "isDeleted": false,
            "createdAt": "2026-11-22T22:17:16.313Z",
            "updatedAt": "2026-11-22T22:17:20.563Z",
            "customer": {
                "id": "6b0369e4e0b8722fcddf2eb0",
                "fullName": "Ayşe Demir",
                "...": "Customer alanları"
            }
        }
    ],
    "total": 65,
    "page": 2,
    "pageCount": 2
}
```

---

### `GET /posts/{postId}`

Tek bir içerik (`assignee` dahil).

**Yetki:** admin, moderator

**Yol parametreleri:** `postId`

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/posts/6b0369ece0b8722fcddf2eb2"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "post": {
        "id": "6b0369ece0b8722fcddf2eb2",
        "title": "Yeni ürünümüz",
        "content": "Birinci satır\nİkinci satır",
        "rawContent": "<div>Birinci satır</div><div>İkinci satır</div>",
        "status": "published",
        "customerId": "6b0369e4e0b8722fcddf2eb0",
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:16.313Z",
        "updatedAt": "2026-11-22T22:17:20.563Z"
    }
}
```

**Hatalar:** `400` `Geçersiz içerik`, `404` `İçerik bulunamadı`.

---

### `PATCH /posts/{postId}`

İçeriği günceller. Sadece gönderilen alanlar değişir.

**Yetki:** admin, moderator

**Yol parametreleri:** `postId`

**Gövde:** [`POST /customers/{customerId}/posts`](#post-customerscustomeridposts) ile aynı alanlar, hepsi opsiyonel.

Gövdede **sadece** `status` varsa yalnızca içeriğin durumu değişir (diğer alanlar hiç işlenmez). Mesaj `İçerik durumu güncellendi` olur.

**İstek (yayına alma):**

```bash
curl -X PATCH "$API/posts/6b0369ece0b8722fcddf2eb2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"published"}'
```

**İstek (başlık değiştirme):**

```bash
curl -X PATCH "$API/posts/6b0369ece0b8722fcddf2eb2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Yeni başlık"}'
```

**Yanıt `200`:**

```json
{
    "status": true,
    "message": "İçerik güncellendi",
    "post": {
        "id": "6b0369ece0b8722fcddf2eb2",
        "title": "Yeni başlık",
        "content": "Birinci satır\nİkinci satır",
        "rawContent": "<div>Birinci satır</div><div>İkinci satır</div>",
        "status": "published",
        "customerId": "6b0369e4e0b8722fcddf2eb0",
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:16.313Z",
        "updatedAt": "2026-11-22T22:17:20.563Z"
    }
}
```

**Hatalar:** `400` (`Geçersiz durum`, `Başlık zorunludur`, ...), `404` `İçerik bulunamadı`.

---

### `DELETE /posts/{postId}`

İçeriği siler (görselleri S3'te kalır).

**Yetki:** admin

**Yol parametreleri:** `postId`

**İstek:**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" "$API/posts/6b0369ece0b8722fcddf2eb2"
```

**Yanıt `200`:**

```json
{ "status": true, "message": "İçerik silindi" }
```

**Hatalar:** `403` (moderatör), `404` `İçerik bulunamadı`.

---

## Notlar

Not nesnesinin alanları için bkz. [Note](#note).

### `GET /customers/{customerId}/notes`

Bir müşterinin notları.

**Yetki:** admin, moderator

**Yol parametreleri:** `customerId`

**Query parametreleri:**

| Parametre | Zorunlu | Değerler | Açıklama |
|---|---|---|---|
| `q` | hayır | metin | Not içeriğinde arar |
| `sort` | hayır | `updated` (varsayılan), `created` | Sıralama |
| `page` | hayır | `1`, `2`, ... | Sayfa |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/customers/6b0369e4e0b8722fcddf2eb0/notes"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "notes": [
        {
            "id": "6b0369f4e0b8722fcddf2eb3",
            "content": "Müşteri geri arama istedi",
            "rawContent": "<div>Müşteri geri arama istedi</div>",
            "customerId": "6b0369e4e0b8722fcddf2eb0",
            "isDeleted": false,
            "createdAt": "2026-11-22T22:17:24.322Z",
            "updatedAt": "2026-11-22T22:17:24.322Z"
        }
    ],
    "total": 1,
    "page": 1,
    "pageCount": 1
}
```

**Hatalar:** `400` `Geçersiz müşteri`. Müşteri yoksa ya da silinmişse boş liste döner.

---

### `POST /customers/{customerId}/notes`

Müşteriye not ekler.

**Yetki:** admin, moderator

**Yol parametreleri:** `customerId`

**Gövde:**

| Alan | Tip | Zorunlu | Kural |
|---|---|---|---|
| `content` | string | `content` ya da `rawContent` | Düz metin, en fazla 5.000 karakter |
| `rawContent` | string | `content` ya da `rawContent` | HTML ([zengin metin](#zengin-metin-i̇çerik-ve-not-metni)) |

**İstek:**

```bash
curl -X POST "$API/customers/6b0369e4e0b8722fcddf2eb0/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Müşteri geri arama istedi"}'
```

**Yanıt `201`:**

```json
{
    "status": true,
    "message": "Not oluşturuldu",
    "note": {
        "id": "6b0369f4e0b8722fcddf2eb3",
        "content": "Müşteri geri arama istedi",
        "rawContent": "<div>Müşteri geri arama istedi</div>",
        "customerId": "6b0369e4e0b8722fcddf2eb0",
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:24.322Z",
        "updatedAt": "2026-11-22T22:17:24.322Z"
    }
}
```

**Hatalar:** `400` `Not zorunludur`, `404` `Müşteri bulunamadı`.

---

### `GET /notes`

Bütün müşterilerin notları. Her notta sahibi olan müşteri (`customer`) de döner.

**Yetki:** admin, moderator

**Query parametreleri:**

| Parametre | Zorunlu | Değerler | Açıklama |
|---|---|---|---|
| `q` | hayır | metin | Not içeriğinde arar |
| `period` | hayır | `today`, `week`, `month` | Oluşturulma tarihi |
| `sort` | hayır | `updated` (varsayılan), `created` | Sıralama |
| `page` | hayır | `1`, `2`, ... | Sayfa |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/notes?period=month"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "notes": [
        {
            "id": "6b0369f4e0b8722fcddf2eb3",
            "content": "Müşteri geri arama istedi",
            "rawContent": "<div>Müşteri geri arama istedi</div>",
            "customerId": "6b0369e4e0b8722fcddf2eb0",
            "isDeleted": false,
            "createdAt": "2026-11-22T22:17:24.322Z",
            "updatedAt": "2026-11-22T22:17:24.322Z",
            "customer": {
                "id": "6b0369e4e0b8722fcddf2eb0",
                "fullName": "Ayşe Demir",
                "...": "Customer alanları"
            }
        }
    ],
    "total": 74,
    "page": 1,
    "pageCount": 2
}
```

---

### `GET /notes/{noteId}`

Tek bir not.

**Yetki:** admin, moderator

**Yol parametreleri:** `noteId`

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/notes/6b0369f4e0b8722fcddf2eb3"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "note": {
        "id": "6b0369f4e0b8722fcddf2eb3",
        "content": "Müşteri geri arama istedi",
        "rawContent": "<div>Müşteri geri arama istedi</div>",
        "customerId": "6b0369e4e0b8722fcddf2eb0",
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:24.322Z",
        "updatedAt": "2026-11-22T22:17:24.322Z"
    }
}
```

**Hatalar:** `400` `Geçersiz not`, `404` `Not bulunamadı`.

---

### `PATCH /notes/{noteId}`

Notu günceller.

**Yetki:** admin, moderator

**Yol parametreleri:** `noteId`

**Gövde:** [`POST /customers/{customerId}/notes`](#post-customerscustomeridnotes) ile aynı alanlar.

**İstek:**

```bash
curl -X PATCH "$API/notes/6b0369f4e0b8722fcddf2eb3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Müşteri yarın 14:00 için arandı"}'
```

**Yanıt `200`:**

```json
{
    "status": true,
    "message": "Not güncellendi",
    "note": {
        "id": "6b0369f4e0b8722fcddf2eb3",
        "content": "Müşteri yarın 14:00 için arandı",
        "rawContent": "<div>Müşteri yarın 14:00 için arandı</div>",
        "customerId": "6b0369e4e0b8722fcddf2eb0",
        "isDeleted": false,
        "createdAt": "2026-11-22T22:17:24.322Z",
        "updatedAt": "2026-11-22T22:17:27.762Z"
    }
}
```

**Hatalar:** `400`, `404` `Not bulunamadı`.

---

### `DELETE /notes/{noteId}`

Notu siler.

**Yetki:** admin

**Yol parametreleri:** `noteId`

**İstek:**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" "$API/notes/6b0369f4e0b8722fcddf2eb3"
```

**Yanıt `200`:**

```json
{ "status": true, "message": "Not silindi" }
```

**Yanıt `403` (moderatör token'ıyla):**

```json
{ "status": false, "message": "Bu işlem için yetkiniz yok" }
```

---

## Kullanıcılar (sadece admin)

Panele giriş yapan sistem kullanıcıları. Bu bölümdeki bütün istekler moderatör token'ıyla `403` döner. Kullanıcı nesnesinin alanları için bkz. [User](#user).

### `GET /users`

Kullanıcı listesi.

**Yetki:** admin

**Query parametreleri:**

| Parametre | Zorunlu | Değerler | Açıklama |
|---|---|---|---|
| `q` | hayır | metin | Ad soyad ya da email'de arar |
| `role` | hayır | `admin`, `moderator` | Role göre filtre |
| `period` | hayır | `today`, `week`, `month` | Oluşturulma tarihi |
| `sort` | hayır | `updated` (varsayılan), `created`, `name` | Sıralama |
| `page` | hayır | `1`, `2`, ... | Sayfa |

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/users?role=admin"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "users": [
        {
            "id": "6b0065ebbfa5807b0f9326d1",
            "name": "Test",
            "surname": "Kullanıcı",
            "fullName": "Test Kullanıcı",
            "email": "admin@testmail.com",
            "role": "admin",
            "createdAt": "2026-11-20T15:23:19.637Z",
            "updatedAt": "2026-11-22T15:00:08.219Z"
        }
    ],
    "total": 1,
    "page": 1,
    "pageCount": 1
}
```

---

### `POST /users`

Yeni kullanıcı ekler ve ona bir API token'ı üretir.

**Yetki:** admin

**Gövde:**

| Alan | Tip | Zorunlu | Kural |
|---|---|---|---|
| `name` | string | evet | 1–50 karakter |
| `surname` | string | evet | 1–50 karakter |
| `email` | string | evet | Geçerli email; başka bir kullanıcıda varsa `409` |
| `role` | string | evet | `admin`, `moderator` |
| `password` | string | evet | 8–50 karakter |

**İstek:**

```bash
curl -X POST "$API/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mehmet","surname":"Kaya","email":"mehmet@example.com","role":"moderator","password":"guclu-sifre-123"}'
```

**Yanıt `201`:**

```json
{
    "status": true,
    "message": "Kullanıcı oluşturuldu",
    "user": {
        "id": "6b036a2fe0b8722fcddf2eb5",
        "name": "Mehmet",
        "surname": "Kaya",
        "fullName": "Mehmet Kaya",
        "email": "mehmet@example.com",
        "role": "moderator",
        "createdAt": "2026-11-22T22:18:23.000Z",
        "updatedAt": "2026-11-22T22:18:23.000Z"
    },
    "apiToken": "crm_Xk2...128 karakter"
}
```

`apiToken` yeni kullanıcının API token'ıdır ve **sadece bu yanıtta** döner. Kaybolursa [`POST /users/{userId}/api-token`](#post-usersuseridapi-token) ile yenisi üretilir.

**Hatalar:** `400`, `409` `Bu email ile kayıtlı bir kullanıcı zaten var`.

---

### `GET /users/{userId}`

Tek bir kullanıcı. Şifre hiçbir zaman dönmez.

**Yetki:** admin

**Yol parametreleri:** `userId`

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/users/6b0065ebbfa5807b0f9326d1"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "user": {
        "id": "6b0065ebbfa5807b0f9326d1",
        "name": "Test",
        "surname": "Kullanıcı",
        "fullName": "Test Kullanıcı",
        "email": "admin@testmail.com",
        "role": "admin",
        "createdAt": "2026-11-20T15:23:19.637Z",
        "updatedAt": "2026-11-22T15:00:08.219Z"
    }
}
```

**Hatalar:** `400` `Geçersiz kullanıcı`, `404` `Kullanıcı bulunamadı`.

---

### `PATCH /users/{userId}`

Kullanıcıyı günceller.

**Yetki:** admin

**Yol parametreleri:** `userId`

**Gövde:** [`POST /users`](#post-users) ile aynı alanlar, hepsi opsiyonel. `password` gönderilmezse şifre değişmez; gönderilirse kullanıcının açık oturumları kapanır.

**İstek:**

```bash
curl -X PATCH "$API/users/6b036a2fe0b8722fcddf2eb5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

**Yanıt `200`:**

```json
{
    "status": true,
    "message": "Kullanıcı güncellendi",
    "user": { "id": "6b036a2fe0b8722fcddf2eb5", "role": "admin", "...": "User alanları" }
}
```

**Hatalar:**

| Kod | Mesaj |
|---|---|
| `400` | `Kendi admin rolünüzü kaldıramazsınız`, doğrulama hataları |
| `404` | `Kullanıcı bulunamadı` |
| `409` | `Bu email ile kayıtlı başka bir kullanıcı var` |

---

### `DELETE /users/{userId}`

Kullanıcıyı siler. Kullanıcının oturumları ve API token'ı anında geçersiz olur.

**Yetki:** admin

**Yol parametreleri:** `userId`

**İstek:**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" "$API/users/6b036a2fe0b8722fcddf2eb5"
```

**Yanıt `200`:**

```json
{ "status": true, "message": "Kullanıcı silindi" }
```

**Hatalar:** `400` `Kendi hesabınızı silemezsiniz`, `404` `Kullanıcı bulunamadı`.

---

### `GET /users/{userId}/api-token`

Kullanıcının API token'ının ne zaman oluşturulduğu ve en son ne zaman kullanıldığı. Token'ın kendisi dönmez.

**Yetki:** admin

**Yol parametreleri:** `userId`

**İstek:**

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/users/6b0065ebbfa5807b0f9326d1/api-token"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "apiToken": {
        "createdAt": "2026-11-22T18:12:49.856Z",
        "lastUsedAt": "2026-11-22T22:17:37.747Z"
    }
}
```

Kullanıcının token'ı yoksa `apiToken` `null` döner. Hiç kullanılmamış bir token'da `lastUsedAt` `null`'dır.

---

### `POST /users/{userId}/api-token`

Kullanıcıya yeni bir API token'ı üretir. **Eski token anında çalışmaz hale gelir.** Gövde gerekmez.

**Yetki:** admin

**Yol parametreleri:** `userId`

**İstek:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" "$API/users/6b036a2fe0b8722fcddf2eb5/api-token"
```

**Yanıt `200`:**

```json
{
    "status": true,
    "message": "Yeni API token oluşturuldu, eskisi artık çalışmaz",
    "token": "crm_Q9v...128 karakter",
    "apiToken": { "createdAt": "2026-11-22T22:20:00.000Z", "lastUsedAt": null }
}
```

`token` yeni token'dır ve **sadece bu yanıtta** döner.

> Demo hesapların token'ını yenilemeyin; diğer ziyaretçiler giriş sayfasındaki token'ı kullanamaz hale gelir.

**Hatalar:** `404` `Kullanıcı bulunamadı`.

---

## Veri modelleri

Tarihler ISO 8601 biçiminde, UTC olarak döner (`2026-11-22T22:17:08.874Z`).

### Customer

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | Kimlik |
| `name` | string | Ad |
| `surname` | string | Soyad |
| `fullName` | string | Ad soyad (sunucu üretir) |
| `email` | string | Email (müşteriler arasında benzersiz) |
| `phone` | string \| null | Telefon |
| `company` | string \| null | Firma |
| `isDeleted` | boolean | API'de her zaman `false` (silinenler dönmez) |
| `createdAt` | string | Oluşturulma zamanı |
| `updatedAt` | string | Son güncelleme zamanı |
| `_count` | `{ notes, posts }` | Sadece listede ve tek müşteri isteğinde |

### Post

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | Kimlik |
| `title` | string | Başlık |
| `content` | string | Düz metin içerik |
| `rawContent` | string | HTML içerik (temizlenmiş) |
| `status` | `draft` \| `inReview` \| `published` | Durum |
| `type` | `socialMedia` \| `blog` \| `webPage` \| `newsletter` \| `other` | İçerik türü |
| `platforms` | string[] | Kanallar (`instagram`, `tiktok`, `facebook`, `x`, `linkedin`, `youtube`, `pinterest`, `website`, `email`, `other`) |
| `dueDate` | string \| null | Teslim günü (sunucu saat diliminde günün başlangıcı) |
| `scheduledAt` | string \| null | Planlanan yayın zamanı |
| `assigneeId` | string \| null | Sorumlu kullanıcı |
| `assignee` | `{ id, name, surname, fullName, createdAt }` \| null | Sorumlu kullanıcının herkese açık bilgileri (listelerde, tek içerikte ve dashboard'da) |
| `images` | `{ key, name, contentType, size }[]` | Görseller. Adres: `<bucket adresi>/<key>` (`POST /images` yanıtındaki `url`) |
| `customerId` | string | Sahibi olan müşteri |
| `isDeleted` | boolean | Her zaman `false` |
| `createdAt` | string | Oluşturulma zamanı |
| `updatedAt` | string | Son güncelleme zamanı |
| `customer` | Customer | Sadece `GET /posts` ve dashboard'da |

### Note

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | Kimlik |
| `content` | string | Düz metin içerik |
| `rawContent` | string | HTML içerik (temizlenmiş) |
| `customerId` | string | Sahibi olan müşteri |
| `isDeleted` | boolean | Her zaman `false` |
| `createdAt` | string | Oluşturulma zamanı |
| `updatedAt` | string | Son güncelleme zamanı |
| `customer` | Customer | Sadece `GET /notes` ve dashboard'da |

### User

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | Kimlik |
| `name` | string | Ad |
| `surname` | string | Soyad |
| `fullName` | string | Ad soyad |
| `email` | string | Email (`/me`'de maskeli: `a***@testmail.com`) |
| `role` | `admin` \| `moderator` | Rol |
| `createdAt` | string | Oluşturulma zamanı |
| `updatedAt` | string | Son güncelleme zamanı |

Şifre hiçbir yanıtta dönmez (`/me`'de sadece `***`).
