-- ย้ายจากตาราง "User" ที่ทำเองมาใช้ schema มาตรฐานของ Better Auth
-- (user/session/account/verification — ชื่อตารางเป็นตัวพิมพ์เล็กตามที่ adapter คาดไว้)
-- id เปลี่ยนจาก serial int เป็น text เพราะ Better Auth ออก id เองเป็น string

CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- ยกผู้ใช้เดิมมาก่อนดรอปตารางเก่า ประวัติสต็อกจะได้ไม่ขาดคนบันทึก
-- อีเมลเดิมไม่มีเก็บไว้ ใส่โดเมน .invalid (สงวนไว้ ไม่มีทางชนกับอีเมลจริงจาก OAuth)
-- คนเดิมล็อกอิน Google ครั้งแรกจะได้แถวใหม่ ไม่ทับแถว legacy นี้
INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
SELECT 'legacy-' || "id", "name", 'legacy-' || "id" || '@check-stock.invalid', false, "createdAt", CURRENT_TIMESTAMP
FROM "User";

CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");

ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "account_userId_idx" ON "account"("userId");

ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- ชี้ประวัติสต็อกไปตาราง user ใหม่ แปลง id เดิมด้วยสูตรเดียวกับตอน INSERT ข้างบน
ALTER TABLE "ProductHistory" DROP CONSTRAINT "ProductHistory_userId_fkey";
ALTER TABLE "ProductHistory" ALTER COLUMN "userId" TYPE TEXT USING 'legacy-' || "userId";
ALTER TABLE "ProductHistory" ADD CONSTRAINT "ProductHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "User";
