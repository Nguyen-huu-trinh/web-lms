import { PageHeading } from "@/components/ui/page-heading";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/services/auth";
import { listMenus } from "@/repositories/lms";
import { EmptyState } from "@/components/learning/shared";
import { RecordControls } from "@/components/admin/record-controls";
export default async function MenuPage() {
  const { client, profile } = await requireUser();
  const items = await listMenus(client);
  return <main className="menu-page"><PageHeading eyebrow="Dành cho bạn" title="Menu" description="Khám phá thực đơn và giá món tại đây." icon="menu"><span className="badge">{items.length} món</span>{profile.role === "ADMIN" && <RecordControls context={{entity:"menus"}} />}</PageHeading><section className="surface">{items.length ? <table className="menu-table"><caption className="sr-only">Danh sách món và giá bằng đồng Việt Nam</caption><thead><tr><th scope="col">Tên món</th><th scope="col">Giá</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="menu-item-name"><span><Icon name="menu" /></span>{item.name}</div>{profile.role === "ADMIN" && <RecordControls context={{entity:"menus",id:item.id}} values={{name:item.name,price:item.price}} />}</td><td>{new Intl.NumberFormat("vi-VN", { style:"currency",currency:"VND" }).format(item.price)}</td></tr>)}</tbody></table> : <EmptyState title="Chưa có món trong menu." />}</section></main>;
}
