import { FooterPageShell, FooterSection } from '@/components/content/FooterPageShell';

export default function ShippingPage() {
  return (
    <FooterPageShell title="Chính sách vận chuyển" subtitle="AH Phone Store tối ưu quy trình giao hàng để đơn đến nhanh, đúng hẹn.">
      <FooterSection title="1. Thời gian giao hàng dự kiến"><ul className="list-disc space-y-2 pl-5"><li><strong>Nội thành Hà Nội:</strong> 2-4 giờ sau khi xác nhận đơn.</li><li><strong>Tỉnh thành khác:</strong> 1-3 ngày làm việc.</li><li><strong>Vùng sâu, vùng xa:</strong> 3-5 ngày làm việc.</li></ul></FooterSection>
      <FooterSection title="2. Phí vận chuyển"><ul className="list-disc space-y-2 pl-5"><li>Miễn phí giao hàng cho đơn từ 500.000đ trở lên.</li><li>Đơn dưới 500.000đ: phí 20.000đ-50.000đ tùy khu vực.</li></ul></FooterSection>
    </FooterPageShell>
  );
}
