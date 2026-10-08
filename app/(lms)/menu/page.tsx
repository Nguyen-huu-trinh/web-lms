import { createLearningReader } from "@/lib/cache/learning";
import styles from "./pricing.module.css";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/services/auth";
import { listMenus } from "@/repositories/lms";
import { RecordControls } from "@/components/admin/record-controls";

export default async function PricingPage() {
  const { client, profile, sessionId } = await requireUser();
  const read = createLearningReader(profile, sessionId);
  const items = await listMenus(client, read);
  const admin = profile.role === "ADMIN";

  const currency = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });

  // Tự động tìm gói nổi bật nhất
  const maxPrice = items.length > 0 ? Math.max(...items.map((i) => i.price)) : 0;
  const featuredItemId = items.find((i) => i.price === maxPrice && maxPrice > 0)?.id;

  return (
    <main className={styles.page}>
      {/* Hiệu ứng nền họa tiết ánh sáng & hoa văn công nghệ chìm */}
      <div className={styles.meshCanvas} aria-hidden="true" />
      <div className={styles.glowAura} aria-hidden="true" />

      <header className={styles.heading}>
        <div>
          <div className={styles.eyebrowTag}>
            <span className={styles.sparkleIcon}>
              <Icon name="sparkles" />
            </span>
            <span className={styles.eyebrow}>BẢNG GIÁ NIÊM YẾT</span>
          </div>
          <h1 className={styles.title}>Gói học & Dịch vụ</h1>
          <p className={styles.subtitle}>
            Biểu phí chính thức cho các khóa luyện thi và tài liệu học tập
          </p>
        </div>

        {admin && (
          <div className={styles.adminAction}>
            <RecordControls context={{ entity: "menus" }} />
          </div>
        )}
      </header>

      <section className={styles.panel} aria-labelledby="pricing-title">
        <header className={styles.panelHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.symbolRing}>
              <Icon name="pricing" />
            </div>
            <div>
              <h2 id="pricing-title">Danh sách khóa học</h2>
              <span className={styles.itemCountBadge}>
                {items.length} hạng mục hoạt động
              </span>
            </div>
          </div>
          <div className={styles.currencyPill}>
            <span className={styles.pillLabel}>ĐƠN VỊ</span>
            <span className={styles.pillUnit}>VNĐ</span>
          </div>
        </header>

        {items.length > 0 ? (
          <div className={styles.listContainer}>
            <ul className={styles.list}>
              {items.map((item, index) => {
                const isFeatured = item.id === featuredItemId && items.length > 1;

                return (
                  <li
                    key={item.id}
                    className={`${styles.cardRow} ${isFeatured ? styles.featuredCard : ""}`}
                    style={{ "--delay": `${index * 0.05}s` } as React.CSSProperties}
                  >
                    {/* Dải sáng chạy ngang khi di chuột */}
                    <div className={styles.shimmerEffect} aria-hidden="true" />

                    {/* Khối bên trái: Icon + Tên gói */}
                    <div className={styles.leftCol}>
                      <div className={styles.iconEmblem}>
                        <Icon name={isFeatured ? "graduation" : "book"} />
                      </div>
                      <div className={styles.titleBox}>
                        <div className={styles.titleWrap}>
                          <h3 className={styles.itemName}>{item.name}</h3>
                          {isFeatured && (
                            <span className={styles.topBadge}>
                              <Icon name="sparkles" />
                              Khuyên dùng
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Khối bên phải: Giá niêm yết + Nút Admin */}
                    <div className={styles.rightCol}>
                      <div className={styles.priceContainer}>
                        <span className={styles.pricePeriod}>TRỌN GÓI</span>
                        <div className={styles.priceValueWrap}>
                          <strong className={styles.priceNumber}>
                            {currency.format(item.price)}
                          </strong>
                        </div>
                      </div>

                      {admin && (
                        <div className={styles.adminCol}>
                          <RecordControls
                            iconOnly
                            context={{ entity: "menus", id: item.id }}
                            values={{ name: item.name, price: item.price }}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Icon name="pricing" />
            </div>
            <h3>Chưa có mục giá nào</h3>
            <p>
              {admin
                ? "Bấm nút phía trên để thêm các gói học phí mới."
                : "Hệ thống sẽ cập nhật danh sách các gói sớm nhất."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}