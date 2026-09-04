# DevOps Frontend

Backend API'ye istek atan, gelen cevabı ve gecikmeyi gösteren basit bir
React (Vite) uygulaması. DevOps projesi kapsamında Ubuntu VPS üzerinde
statik dosya olarak Nginx üzerinden servis edilecek ve GitHub Actions ile
otomatik deploy edilecek şekilde tasarlanmıştır.

## Amaç ve Teknolojiler

- **Amaç:** Backend'in `/`, `/api/health`, `/api/info` uçlarına istek atıp
  cevabı ekranda göstermek; frontend–backend bağlantısını doğrulamak.
- **Teknolojiler:** React 18, Vite.

## Özellikler

- Ana sayfa
- Backend'e istek atan bir konsol bölümü (üç endpoint için ayrı butonlar)
- Backend'den gelen cevabın (durum kodu, gecikme, JSON body) ekranda gösterilmesi
- Uygulama versiyonu ve son build zamanını gösteren alan (header ve footer)

## Local Ortamda Çalıştırma

```bash
git clone <bu-repo-url>
cd devops-frontend
cp .env.example .env   # VITE_API_URL değerini kendi backend adresine göre ayarla
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde açılır.

## Environment Variable'lar

| Değişken           | Açıklama                                              |
|--------------------|----------------------------------------------------------|
| `VITE_API_URL`     | Backend'in adresi (local'de `http://127.0.0.1:3000`, production'da `https://BACKEND_DOMAIN`) |
| `VITE_APP_VERSION` | Header/footer'da gösterilecek versiyon bilgisi         |

`.env` dosyası repository'ye eklenmez. Production build'i alınırken sunucuda
veya GitHub Actions içinde `VITE_API_URL` production backend adresine
ayarlanmış olarak set edilmelidir (Vite, build sırasında bu değerleri koda gömer).

## Production Build

```bash
npm run build
```

Çıktı `dist/` klasörüne yazılır; bu klasörün içeriği Nginx tarafından
`FRONTEND_DOMAIN` üzerinden statik olarak servis edilir.

## Domain

Frontend, `https://FRONTEND_DOMAIN` adresinden HTTPS üzerinden erişilebilir
olacak şekilde Nginx tarafından servis edilir. Backend'e yapılan istekler
`VITE_API_URL` üzerinden, yani `https://BACKEND_DOMAIN` adresine gider.

## Production'a Deploy

Deployment, `main` branch'ine yapılan her push sonrasında GitHub Actions
(`.github/workflows/deploy.yml`) tarafından otomatik olarak gerçekleştirilir:

1. Kod checkout edilir.
2. Bağımlılıklar kurulur (`npm ci`).
3. Varsa testler çalıştırılır.
4. `npm run build` ile production build alınır.
5. `dist/` klasörü SSH ile Ubuntu VPS üzerindeki `DEPLOY_PATH`
   (`/var/www/frontend-app`) dizinine gönderilir.
6. Nginx yapılandırması test edilir (`nginx -t`).
7. Gerekiyorsa Nginx reload edilir.

Sunucuya manuel bağlanıp `git pull` yapmak deployment yöntemi olarak
kullanılmaz; tüm süreç GitHub Actions üzerinden otomatik yürütülür.

### Gerekli GitHub Actions Secrets

| Secret            | Açıklama                                       |
|-------------------|---------------------------------------------------|
| `SERVER_HOST`     | VPS IP adresi                                   |
| `SERVER_USER`     | Deployment için kullanılan kısıtlı kullanıcı     |
| `SERVER_SSH_KEY`  | SSH private key (deployment kullanıcısına ait)   |
| `SERVER_PORT`     | SSH portu                                       |
| `DEPLOY_PATH`     | Sunucuda frontend dosyalarının bulunduğu dizin (`/var/www/frontend-app`) |
