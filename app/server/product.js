import { prisma } from "@/prisma/prisma.js"
import { getCategories } from "@/app/server/category"
import { getUnitTypes } from "@/app/server/unitType"

/**
 * ชุดฟิลด์สำหรับ "รายการสินค้า" (หน้าแรก/หน้าจัดการ) — ตั้งใจไม่ลาก skus ทั้งก้อนมา
 *
 * หน้าแรกโหลดสินค้าเป็นร้อยรายการ ถ้า include skus เต็ม ๆ ทุกตัว payload จะบวมมาก
 * ทั้งที่การ์ดใช้แค่ยอดรวม (Product.qty ที่ sync ไว้แล้ว) กับจำนวนตัวเลือก
 * รายละเอียด SKU ค่อยดึงตอนเข้าหน้าสินค้าด้วย getProduct()
 */
export const productInclude = {
    baseUnit: true,
    // ยอดของสินค้าที่มีตัวเลือกย่อยคือผลรวมของ SKU ซึ่งนับเป็นหน่วยหลักของ SKU ไม่ใช่ของ
    // Product การ์ดจึงต้องรู้ชื่อหน่วยนั้นด้วย ไม่งั้นหน้าแรกกับหน้าสินค้าจะขึ้นคนละหน่วย
    // distinct + take 2 พอสำหรับแยกว่า "ทุกตัวหน่วยเดียวกัน" หรือ "ปนกัน" โดยไม่ลาก SKU มาทั้งก้อน
    skus: {
        select: { unitTypeId: true, baseUnit: { select: { name: true } } },
        distinct: ["unitTypeId"],
        take: 2,
    },
    ProductUnitType: { include: { unitType: true }, orderBy: { id: "asc" } },
    // ส่งไปถึง client ด้วย เลยเอาเฉพาะฟิลด์ที่ต้องโชว์ ไม่ลากทั้ง user มา
    owner: { select: { id: true, name: true, email: true, image: true } },
    category: { select: { id: true, name: true } },
    _count: { select: { skus: true } },
}

/** ฟิลด์ของหมายเหตุที่ส่งกลับหลังบันทึก — ฝั่ง client เอาไปทับ state ได้เลย */
export const productNoteSelect = {
    id: true,
    note: true,
    noteImageUrls: true,
    noteUpdatedAt: true,
    noteUpdatedBy: { select: { id: true, name: true, email: true, image: true } },
}

/**
 * ดันสินค้าที่ยังมีของขึ้นก่อน ของที่หมดแล้วไปกองล่างสุด
 *
 * เรียงด้วย orderBy ของ Prisma ตรง ๆ ไม่ได้ เพราะเงื่อนไขคือ "qty > 0 หรือไม่" ไม่ใช่ค่า qty
 * (ถ้าเรียงด้วย qty ตรง ๆ ตัวที่มี 5000 ชิ้นจะกระโดดข้ามตัวที่มี 3 ชิ้น ทั้งที่ทั้งคู่ก็มีของ
 * เหมือนกัน — สิ่งที่ต้องการคือแยกแค่ "มี" กับ "หมด")
 *
 * sort ของ JS เสถียร ลำดับเดิมจาก DB (ใหม่สุดขึ้นก่อน) จึงยังอยู่ครบภายในแต่ละกลุ่ม
 */
function inStockFirst(products) {
    return products.sort((a, b) => (b.qty > 0) - (a.qty > 0))
}

/**
 * ประกอบสินค้าหลายตัวจาก query แบน ๆ ให้ได้รูปร่างเดียวกับที่ UI เคยได้จาก include
 *
 * เหตุผลเดียวกับ getProduct(): include ซ้อนชั้น = ไป-กลับ DB ชั้นละรอบและรอกันเป็นทอด ๆ
 * (วัดจริงกับสินค้า 317 รายการ: ของเดิม ~1,500ms / แบบนี้ ~210ms)
 *
 * unitLinks ส่งมาเฉพาะหน้าที่ต้องใช้หน่วยเสริมของสินค้า (หน้าจัดการ) หน้าแรกไม่ต้อง
 */
function assembleProducts({ products, skuRows, unitById, categoryById, unitLinks = null }) {
    const skusByProduct = new Map()
    for (const row of skuRows) {
        const entry = skusByProduct.get(row.productId) ?? { count: 0, unitIds: new Set() }
        entry.count += 1
        entry.unitIds.add(row.unitTypeId)
        skusByProduct.set(row.productId, entry)
    }

    const linksByProduct = new Map()
    for (const link of unitLinks ?? []) {
        const list = linksByProduct.get(link.ProductId)
        if (list) list.push(link)
        else linksByProduct.set(link.ProductId, [link])
    }

    return products.map((product) => {
        const entry = skusByProduct.get(product.id)

        return {
            ...product,
            baseUnit: unitById.get(product.unitTypeId) ?? null,
            category: categoryById.get(product.categoryId) ?? null,
            // การ์ดใช้แค่ "ชื่อหน่วยของ SKU ซ้ำกันไหม" (stockUnitName) ไม่ได้ใช้ SKU เป็นตัว ๆ
            // ส่งไปแค่หน่วยที่ไม่ซ้ำก็พอ payload จะได้ไม่บวมตามจำนวน SKU
            skus: [...(entry?.unitIds ?? [])].map((unitTypeId) => ({
                baseUnit: unitById.get(unitTypeId) ?? null,
            })),
            _count: { skus: entry?.count ?? 0 },
            ...(unitLinks
                ? {
                      ProductUnitType: (linksByProduct.get(product.id) ?? []).map((link) => ({
                          ...link,
                          unitType: unitById.get(link.unitTypeId) ?? null,
                      })),
                  }
                : {}),
        }
    })
}

/** ฟิลด์ของตัวสินค้าเองที่หน้ารายการต้องใช้ — ไม่มี relation สักตัว */
const productListSelect = {
    id: true,
    name: true,
    imageUrl: true,
    qty: true,
    unitTypeId: true,
    categoryId: true,
    ownerId: true,
    note: true,
    noteImageUrls: true,
    createdAt: true,
}

export async function getProducts() {
    try {
        const [products, skuRows, unitTypes, categories] = await Promise.all([
            prisma.product.findMany({
                orderBy: { createdAt: "desc" },
                select: productListSelect,
            }),
            prisma.sku.findMany({ select: { productId: true, unitTypeId: true } }),
            getUnitTypes(),
            getCategories(),
        ])

        return inStockFirst(
            assembleProducts({
                products,
                skuRows,
                unitById: new Map(unitTypes.map((unit) => [unit.id, unit])),
                categoryById: new Map(categories.map((category) => [category.id, category])),
            })
        )
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getProductsByOwner(ownerId) {
    try {
        const [products, skuRows, unitLinks, unitTypes, categories] = await Promise.all([
            prisma.product.findMany({
                where: { ownerId },
                orderBy: { createdAt: "desc" },
                select: {
                    ...productListSelect,
                    // หน้าจัดการโชว์ชื่อเจ้าของในบางจุด และใช้เช็คสิทธิ์ฝั่ง client
                    owner: { select: { id: true, name: true, email: true, image: true } },
                },
            }),
            prisma.sku.findMany({
                where: { product: { ownerId } },
                select: { productId: true, unitTypeId: true },
            }),
            // หน่วยเสริมของสินค้า — กล่องปรับสต็อกกับกล่องแก้ไขต้องใช้
            prisma.productUnitType.findMany({
                where: { product: { ownerId } },
                orderBy: { id: "asc" },
                select: { id: true, ProductId: true, unitTypeId: true },
            }),
            getUnitTypes(),
            getCategories(),
        ])

        return inStockFirst(
            assembleProducts({
                products,
                skuRows,
                unitLinks,
                unitById: new Map(unitTypes.map((unit) => [unit.id, unit])),
                categoryById: new Map(categories.map((category) => [category.id, category])),
            })
        )
    } catch (error) {
        console.error(error)
        return []
    }
}

/**
 * ดึงแถว SKU กับแถวหน่วยเสริมแบบแบน ๆ — ไม่ join หน่วยผ่าน Prisma
 *
 * ประกอบหน่วยเองทีหลัง เพราะ include ซ้อนชั้นแปลว่า
 * ไป-กลับ DB เพิ่มอีกชั้นละรอบ (หน่วยของ SKU + หน่วยของ SkuUnitType = 2 รอบ) ทั้งที่
 * ตาราง UnitType ทั้งตารางมีไม่กี่สิบแถวและถูกแคชไว้แล้ว
 */
function fetchSkuRows(productId) {
    return Promise.all([
        prisma.sku.findMany({
            where: { productId },
            orderBy: { id: "asc" },
            select: {
                id: true,
                productId: true,
                name: true,
                code: true,
                imageUrl: true,
                qty: true,
                unitTypeId: true,
                defaultUnitTypeId: true,
            },
        }),
        prisma.skuUnitType.findMany({
            where: { sku: { productId } },
            orderBy: { id: "asc" },
            select: { id: true, skuId: true, unitTypeId: true },
        }),
    ])
}

/** ประกอบหน่วยเข้ากับ SKU ฝั่ง JS — ไม่มี query เพิ่ม */
function attachUnits(rows, links, unitById) {
    const linksBySku = new Map()
    for (const link of links) {
        const list = linksBySku.get(link.skuId)
        if (list) list.push(link)
        else linksBySku.set(link.skuId, [link])
    }

    return rows.map((sku) => ({
        ...sku,
        baseUnit: unitById.get(sku.unitTypeId) ?? null,
        SkuUnitType: (linksBySku.get(sku.id) ?? []).map((link) => ({
            ...link,
            unitType: unitById.get(link.unitTypeId) ?? null,
        })),
    }))
}

/** ตัวเลือกย่อยของสินค้าหนึ่งชิ้น — ใช้ที่กล่องจัดการตัวเลือก ไม่ต้องลากตัวสินค้ามาด้วย */
export async function getSkusByProduct(productId) {
    try {
        const [unitTypes, [rows, links]] = await Promise.all([
            getUnitTypes(),
            fetchSkuRows(productId),
        ])
        return attachUnits(rows, links, new Map(unitTypes.map((unit) => [unit.id, unit])))
    } catch (error) {
        console.error(error)
        return []
    }
}

/**
 * สินค้าหนึ่งชิ้นพร้อมตัวเลือกย่อยทั้งหมด — ใช้ที่หน้า /product/[id]
 *
 * ยิงหลาย query ขนานกันแล้วประกอบเอง แทนที่จะ include ซ้อนชั้นเดียวจบ
 *
 * Prisma แปลง include แต่ละชั้นเป็น query แยกและรอกันเป็นทอด ๆ ของเดิมจึงกลายเป็น
 * ไป-กลับ DB สิบกว่ารอบต่อการเปิดหน้าเดียว ซึ่งบน Supabase pooler ข้ามภูมิภาค
 * ตกรอบละเกือบร้อยมิลลิวินาที (วัดได้ ~740ms สำหรับสินค้าที่มี 99 ตัวเลือก)
 * พอแยกเป็น query แบน ๆ ที่ไม่ขึ้นต่อกันแล้วยิงพร้อมกัน เหลือ ~200ms
 *
 * หน่วยนับกับหมวดหมู่ดึงจากตัวที่แคชไว้ ปกติจึงไม่แตะ DB เลย
 */
export async function getProduct(id) {
    try {
        const [product, unitTypes, categories, [skuRows, skuLinks]] = await Promise.all([
            prisma.product.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    qty: true,
                    unitTypeId: true,
                    categoryId: true,
                    ownerId: true,
                    createdAt: true,
                    note: true,
                    noteImageUrls: true,
                    noteUpdatedAt: true,
                    owner: { select: { id: true, name: true, email: true, image: true } },
                    noteUpdatedBy: { select: { id: true, name: true, email: true, image: true } },
                },
            }),
            getUnitTypes(),
            getCategories(),
            fetchSkuRows(id),
        ])

        if (!product) return null

        const unitById = new Map(unitTypes.map((unit) => [unit.id, unit]))
        const skus = attachUnits(skuRows, skuLinks, unitById)

        return {
            ...product,
            baseUnit: unitById.get(product.unitTypeId) ?? null,
            // หมวดมาจากลิสต์ที่แคชไว้แล้ว ไม่ต้อง join เพิ่มอีกรอบ
            category: categories.find((item) => item.id === product.categoryId) ?? null,
            skus,
            _count: { skus: skus.length },
        }
    } catch (error) {
        console.error(error)
        return null
    }
}

/**
 * ข้อมูลย่อสำหรับ generateMetadata() — ชื่อ ยอดคงเหลือ รูป หมวด จำนวนตัวเลือก
 *
 * Next เรียก generateMetadata() แยกจากตัวเพจ และ Prisma ไม่ได้ dedupe ให้เหมือน fetch()
 * เดิมตรงนั้นเรียก getProduct() ตัวเต็ม หน้าสินค้าหนึ่งหน้าจึงลาก SKU + หน่วยทุกตัวมาสองรอบ
 * ทั้งที่รอบนั้นใช้แค่ไม่กี่ฟิลด์ไปทำ <title> กับพรีวิวตอนแชร์ลิงก์
 */
export async function getProductMeta(id) {
    try {
        return await prisma.product.findUnique({
            where: { id },
            select: {
                name: true,
                qty: true,
                imageUrl: true,
                baseUnit: { select: { name: true } },
                category: { select: { name: true } },
                _count: { select: { skus: true } },
            },
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

/** ฟิลด์เท่าที่ Server Action ต้องใช้ตรวจสิทธิ์และตรวจค่า ไม่ต้องลากทั้งสินค้า+หน่วยมา */
export async function getProductGuard(id) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            select: { id: true, ownerId: true, unitTypeId: true },
        })
        return product
    } catch (error) {
        console.error(error)
        return null
    }
}

/**
 * สร้างสินค้าพร้อม SKU เริ่มต้นหนึ่งตัวเสมอ
 *
 * หน่วยทั้งหมดอยู่ที่ระดับ SKU แล้ว สินค้าที่ไม่มี SKU เลยจะตัดสต็อกไม่ได้
 * เลยบังคับให้มีอย่างน้อยหนึ่งตัวตั้งแต่ตอนสร้าง — ผู้ใช้ค่อยไปเพิ่มตัวเลือกอื่นทีหลัง
 *
 * Product.unitTypeId กับ Product.qty ยังเขียนไว้เหมือนเดิม เพราะเป็นคอลัมน์ NOT NULL
 * และ syncProductQty() ใช้ qty เป็นยอดรวมของทุก SKU
 *
 * qty ที่รับมาเป็นหน่วยย่อยที่สุด, extraUnitTypeIds = หน่วยเสริมของ SKU เริ่มต้น
 */
export async function createProduct(
    name,
    imageUrl,
    baseUnitTypeId,
    qty = 0,
    extraUnitTypeIds = [],
    ownerId = null
) {
    try {
        const extras = [
            ...new Set(extraUnitTypeIds.filter((unitTypeId) => unitTypeId !== baseUnitTypeId)),
        ]

        const product = await prisma.product.create({
            data: {
                name,
                imageUrl,
                qty,
                unitTypeId: baseUnitTypeId,
                ownerId,
                skus: {
                    create: {
                        // ตั้งชื่อตามสินค้าไปก่อน เปลี่ยนทีหลังได้ที่กล่องจัดการตัวเลือก
                        name,
                        imageUrl,
                        qty,
                        unitTypeId: baseUnitTypeId,
                        SkuUnitType: { create: extras.map((unitTypeId) => ({ unitTypeId })) },
                    },
                },
            },
            include: productInclude,
        })
        return product
    } catch (error) {
        console.error(error)
        return null
    }
}

/**
 * แก้สินค้า + ปรับหน่วยเสริมให้ตรงกับที่เลือก ในทรานแซกชันเดียว
 *
 * extraUnitTypeIds คือชุดหน่วยเสริม "ทั้งหมด" ที่ต้องการหลังบันทึก ไม่ใช่ส่วนต่าง
 * ฝั่งเรียกจึงไม่ต้องรู้ว่าของเดิมมีอะไร (และไม่ต้องถือ ProductUnitType.id ไว้เอง)
 * เรียกซ้ำด้วยค่าเดิมกี่ครั้งผลก็เท่าเดิม
 *
 * ทำในทรานแซกชันเพราะเดิมเพิ่ม/ถอดหน่วยเป็นคนละ request กัน พังกลางทางแล้วค้างครึ่ง ๆ
 */
export async function saveProduct(id, name, imageUrl, baseUnitTypeId, extraUnitTypeIds = []) {
    try {
        return await prisma.$transaction(async (tx) => {
            // หน่วยหลักไม่ต้องมีแถวซ้ำใน ProductUnitType เลยตัดออกจากชุดที่ต้องการ
            const wanted = new Set(
                extraUnitTypeIds.filter((unitTypeId) => unitTypeId !== baseUnitTypeId)
            )
            const current = await tx.productUnitType.findMany({
                where: { ProductId: id },
                select: { id: true, unitTypeId: true },
            })

            const staleIds = current
                .filter((entry) => !wanted.has(entry.unitTypeId))
                .map((entry) => entry.id)
            const kept = new Set(current.map((entry) => entry.unitTypeId))
            const newIds = [...wanted].filter((unitTypeId) => !kept.has(unitTypeId))

            if (staleIds.length > 0) {
                await tx.productUnitType.deleteMany({ where: { id: { in: staleIds } } })
            }
            if (newIds.length > 0) {
                await tx.productUnitType.createMany({
                    data: newIds.map((unitTypeId) => ({ ProductId: id, unitTypeId })),
                })
            }

            // อัปเดตเป็นอย่างสุดท้าย จะได้ product ที่รวมหน่วยล่าสุดกลับไปก้อนเดียว
            return tx.product.update({
                where: { id },
                data: { name, imageUrl, unitTypeId: baseUnitTypeId },
                include: productInclude,
            })
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function deleteProduct(id) {
    try {
        await prisma.product.delete({ where: { id } })
        return true
    } catch (error) {
        console.error(error)
        return false
    }
}

/**
 * หมายเหตุประจำสินค้า — ที่เก็บของ/จุดวาง/ย้ายโกดัง พร้อมรูปถ่าย
 *
 * ทับของเดิมทั้งก้อน (ไม่เก็บประวัติหมายเหตุ) เพราะสิ่งที่คนอ่านต้องการคือ "ตอนนี้ของอยู่ไหน"
 * ไม่ใช่ว่าเคยอยู่ไหนมาบ้าง ส่วนใครแก้ล่าสุดเมื่อไหร่เก็บไว้ให้ตามตัวคนตอบได้
 */
export async function saveProductNote(id, note, imageUrls, userId) {
    const hasContent = Boolean(note || imageUrls.length > 0)

    try {
        return await prisma.product.update({
            where: { id },
            data: {
                note,
                // set ทับทั้งชุดเสมอ — ลำดับที่ส่งมาคือลำดับที่จะโชว์
                noteImageUrls: { set: imageUrls },
                // ล้างหมายเหตุจนไม่เหลืออะไร ก็ไม่ต้องค้างว่าใครแก้ล่าสุด
                noteUpdatedAt: hasContent ? new Date() : null,
                noteUpdatedById: hasContent ? userId : null,
            },
            select: productNoteSelect,
        })
    } catch (error) {
        console.error(error)
        return null
    }
}
