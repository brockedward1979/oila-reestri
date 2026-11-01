# Oila reestri

Ijtimoiy reestrdagi oilalar va ularning a’zolarini yuritish, jami ko‘rsatkichlarni ko‘rish va jadvallarni Excel, PDF, Word ko‘rinishida yuklab olish uchun sayt.

| Qism | Texnologiya | Qayerda ishlaydi |
|---|---|---|
| Frontend | React 18 + Vite | Render (Static Site) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 | Render (Web Service) |
| Ma’lumotlar bazasi | PostgreSQL | Neon |

## Loyiha tuzilmasi

```
oila-reestri/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI ilovasi, login, CORS
│   │   ├── config.py        # muhit o‘zgaruvchilari
│   │   ├── db.py            # bazaga ulanish
│   │   ├── models.py        # jadvallar: families, members, custom_fields, export_presets, settings
│   │   ├── schemas.py       # kiruvchi ma’lumotlarni tekshirish
│   │   ├── serialize.py     # baza <-> JSON
│   │   ├── auth.py          # JWT token
│   │   ├── seed.py          # lokal bazaga boshlang‘ich ma’lumot yuklash
│   │   └── routers/
│   │       ├── families.py  # oilalar va a’zolar CRUD
│   │       └── meta.py      # ustunlar, shablonlar, sozlamalar, zaxira
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # asosiy sahifa
│   │   ├── api.js           # backend bilan ishlash
│   │   ├── lib/helpers.js   # JSHSHIR, yosh, ko‘rsatkichlar
│   │   ├── lib/exporters.js # Excel, PDF, Word
│   │   └── components/      # shakllar, oila qatori, sozlamalar, login
│   ├── package.json
│   └── .env.example
├── render.yaml              # Render Blueprint
└── README.md
```

## 1. Kompyuterda ishga tushirish

Kerak bo‘ladi: Python 3.12, Node.js 20 yoki undan yangi.

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
```

`.env` faylida `ADMIN_PASSWORD` va `JWT_SECRET` ni o‘zgartiring. `DATABASE_URL` bo‘sh qolsa, lokal SQLite bazasi (`local.db`) ishlatiladi. Neon bazasi bilan ishlamoqchi bo‘lsangiz, uning ulanish satrini qo‘ying.

Boshlang‘ich 51 oilani yuklash (fayl loyihaning ildiz papkasida turadi):

```powershell
python -m app.seed ..\boshlangich_malumot.json
```

Serverni ishga tushirish:

```powershell
uvicorn app.main:app --reload
```

API hujjatlari: http://localhost:8000/docs

### Frontend

Yangi terminalda:

```powershell
cd frontend
npm install
copy .env.example .env          # VITE_API_URL=http://localhost:8000
npm run dev
```

Sayt: http://localhost:5173

## 2. Neon’da baza ochish

1. https://neon.tech ga kiring va **New Project** bosing. Region sifatida **AWS Europe (Frankfurt)** ni tanlang, u O‘zbekistonga eng yaqini.
2. Loyiha ochilgach, **Connect** tugmasini bosing va ulanish satrini nusxalang. U taxminan shunday bo‘ladi:
   `postgresql://neondb_owner:PAROL@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Shu satr Render’dagi `DATABASE_URL` bo‘ladi. Jadvallar server birinchi marta ishga tushganda o‘zi yaratiladi.

## 3. GitHub’ga yuklash

Repo **Private** bo‘lishi shart: kodda shaxsiy ma’lumot yo‘q, lekin loyiha shaxsiy ma’lumotlar bilan ishlaydi.

GitHub’da yangi private repo oching (README qo‘shmang), keyin loyiha papkasida:

```powershell
git init
git add .
git commit -m "Oila reestri: birinchi versiya"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI/oila-reestri.git
git push -u origin main
```

`boshlangich_malumot.json`, `.env` va zaxira fayllar `.gitignore` orqali Git’ga tushmaydi. `git status` bilan tekshirib oling.

## 4. Render’ga joylash

1. https://render.com da **New → Blueprint** ni tanlang va GitHub repongizni ulang. Render `render.yaml` ni o‘qib, ikkita xizmat taklif qiladi: `oila-reestri-api` va `oila-reestri`.
2. So‘ralgan qiymatlarni kiriting:
   - `DATABASE_URL` — Neon’dan olingan satr
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD` — saytga kirish uchun login va parol (kuchli parol qo‘ying)
   - `CORS_ORIGINS` — hozircha `https://oila-reestri.onrender.com` deb yozing
   - `VITE_API_URL` — hozircha `https://oila-reestri-api.onrender.com` deb yozing
3. **Apply** bosing va ikkala xizmat yashil (Live) bo‘lishini kuting.
4. Render bergan haqiqiy manzillarni tekshiring. Agar nom band bo‘lib, manzil boshqacha chiqsa (masalan `oila-reestri-abcd.onrender.com`):
   - API xizmatida `CORS_ORIGINS` ni saytning haqiqiy manziliga o‘zgartiring (oxirida `/` qo‘ymang).
   - Sayt xizmatida `VITE_API_URL` ni API’ning haqiqiy manziliga o‘zgartiring va **Manual Deploy → Clear build cache & deploy** bosing. Vite bu qiymatni build paytida faylga yozib qo‘yadi, shuning uchun qayta build shart.
5. Tekshirish: `https://API-MANZIL/api/health/db` ochilganda `{"ok":true,"db":"postgresql"}` chiqishi kerak.

## 5. Boshlang‘ich ma’lumotni saytga yuklash

1. Saytga login va parol bilan kiring. Ro‘yxat bo‘sh bo‘ladi.
2. **Sozlamalar (⚙) → Zaxiradan tiklash** ni bosing va `boshlangich_malumot.json` ni tanlang.
3. 51 oila, 222 kishi va rasmlar bazaga yoziladi.

Shu yo‘l bilan keyinchalik yuklab olingan har qanday zaxira nusxani ham tiklash mumkin. Diqqat: tiklash hozirgi ma’lumotlarni to‘liq almashtiradi.

## Bilib qo‘yish kerak

- **Bepul Render** 15 daqiqa so‘rov bo‘lmasa API’ni uxlatadi. Keyingi birinchi kirish 30–60 soniya cho‘ziladi, keyin tez ishlaydi.
- **Neon bepul tarifi** ham bo‘sh turganda bazani to‘xtatadi, birinchi so‘rovda bir-ikki soniyada uyg‘onadi.
- **Parolni almashtirish:** Render’da `ADMIN_PASSWORD` ni o‘zgartiring, xizmat o‘zi qayta ishga tushadi. Allaqachon kirgan qurilmalar 7 kungacha ishlayveradi. Hammani darhol tizimdan chiqarish uchun `JWT_SECRET` ni ham o‘zgartiring.
- **Zaxira:** Sozlamalar → Zaxirani yuklab olish. Haftasiga bir marta olib qo‘yish tavsiya etiladi. Neon’ning o‘zida ham 24 soatlik tiklash nuqtalari bor.
- **JSHSHIR takrorlanmaydi:** bir xil JSHSHIR’ni ikkinchi marta kiritib bo‘lmaydi, server rad etadi.
- **Bazaning tuzilishi** hozircha `create_all` bilan yaratiladi. Keyinchalik jadvallarga ustun qo‘shish kerak bo‘lsa, Alembic migratsiyalarini ulash kerak bo‘ladi. Foydalanuvchi qo‘shadigan qo‘shimcha ustunlar esa `extra` maydonida saqlanadi va migratsiya talab qilmaydi.
