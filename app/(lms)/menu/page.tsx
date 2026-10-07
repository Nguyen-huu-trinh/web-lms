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

  // Tìm gói có giá cao nhất để gắn huy hiệu duy nhất
  const maxPrice = items.length > 0 ? Math.max(...items.map((i) => i.price)) : 0;
  const featuredItemId = items.find((i) => i.price === maxPrice && maxPrice > 0)?.id;

  return (
    <main className={styles.page}>
      <div className={styles.bgGridPattern} />
      <div className={styles.ambientGlow} />

      <header className={styles.heading}>
        <div>
          <div className={styles.eyebrowContainer}>
            <span className={styles.pulseDot} />
            <span className={styles.eyebrow}>BẢNG GIÁ DỊCH VỤ & KHÓA HỌC</span>
          </div>
          <h1 className={styles.title}>Biểu phí niêm yết</h1>
          <p className={styles.subtitle}>
            Minh bạch chi phí cho từng chương trình học tập, tài liệu ôn luyện và các gói combo chuyên đề.
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
              <h2 id="pricing-title">Danh sách hạng mục</h2>
              <div className={styles.metaRow}>
                <span className={styles.counterBadge}>{items.length} gói đang mở</span>
                <span className={styles.dotSeparator}>•</span>
                <span className={styles.subtext}>Cập nhật thời gian thực</span>
              </div>
            </div>
          </div>
          <div className={styles.currencyTag}>
            <span className={styles.currLabel}>Đơn vị</span>
            <span className={styles.currUnit}>VNĐ</span>
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
                    className={`${styles.listItem} ${isFeatured ? styles.featuredItem : ""}`}
                    style={{ "--delay": `${index * 0.06}s` } as React.CSSProperties}
                  >
                    <div className={styles.leftAccentGlow} />

                    <div className={styles.itemMain}>
                      <div className={styles.itemIconBox}>
                        <Icon name={isFeatured ? "graduation" : "book"} />
                      </div>
                      <div className={styles.itemDetails}>
                        <div className={styles.titleWrapper}>
                          <h3 className={styles.itemTitle}>{item.name}</h3>
                          {isFeatured && (
                            <span className={styles.popularBadge}>
                              <Icon name="sparkles" />
                              Ưu đãi nổi bật
                            </span>
                          )}
                        </div>
                        <span className={styles.itemSub}>
                          Bao gồm hệ thống luyện đề, tài liệu PDF & video bài giảng
                        </span>
                      </div>
                    </div>

                    <div className={styles.itemPricing}>
                      <div className={styles.priceColumn}>
                        <span className={styles.priceTerm}>Trọn gói</span>
                        <span className={styles.priceAmount}>{currency.format(item.price)}</span>
                      </div>

                      <div className={styles.actions}>
                        {admin && (
                          <div className={styles.adminControls}>
                            <RecordControls
                              iconOnly
                              context={{ entity: "menus", id: item.id }}
                              values={{ name: item.name, price: item.price }}
                            />
                          </div>
                        )}
                        <span className={styles.chevronIcon}>
                          <Icon name="chevron" />
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIconContainer}>
              <Icon name="pricing" />
            </div>
            <h3>Chưa có dữ liệu bảng giá</h3>
            <p>
              {admin
                ? "Bấm nút thiết lập để thêm các hạng mục học phí mới vào hệ thống."
                : "Hệ thống đang đồng bộ biểu phí. Vui lòng quay lại sau."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}