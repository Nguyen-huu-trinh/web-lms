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
  const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
  return <main className={styles.page}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>THÔNG TIN CHI PHÍ</p><h1>Bảng giá</h1><p>Tra cứu các hạng mục và mức giá được niêm yết.</p></div>{admin && <RecordControls context={{ entity: "menus" }} />}</header>
    <section className={styles.panel} aria-labelledby="pricing-title"><header className={styles.panelHeader}><span className={styles.symbol}><Icon name="pricing" /></span><div><h2 id="pricing-title">Danh sách giá</h2><p>{items.length} hạng mục</p></div><span className={styles.currency}>Đơn vị: VNĐ</span></header>
      {items.length ? <ul className={styles.list}>{items.map((item) => <li key={item.id}><div className={styles.itemName}><span className={styles.itemIcon}><Icon name="pricing" /></span><h3>{item.name}</h3></div><div className={styles.price}><strong>{currency.format(item.price)}</strong>{admin && <RecordControls iconOnly context={{entity:"menus",id:item.id}} values={{name:item.name,price:item.price}} />}</div></li>)}</ul> : <div className={styles.empty}><span className={styles.emptyIcon}><Icon name="pricing" /></span><h3>Bảng giá đang được cập nhật</h3><p>{admin ? "Thêm hạng mục và mức giá để hiển thị tại đây." : "Các hạng mục sẽ xuất hiện tại đây khi có thông tin mới."}</p></div>}
    </section>
  </main>;
}
