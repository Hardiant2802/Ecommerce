import { FooterPageShell, FooterSection } from '@/components/content/FooterPageShell';

export default function PrivacyPage() {
  return (
    <FooterPageShell title="Chính sách bảo mật" subtitle="Chúng tôi tôn trọng quyền riêng tư và xử lý dữ liệu cá nhân theo nguyên tắc minh bạch, giới hạn mục đích và bảo vệ an toàn thông tin.">
      <FooterSection title="1. Thông tin chúng tôi thu thập"><ul className="list-disc space-y-2 pl-5"><li>Họ tên, số điện thoại, email khi đăng ký tài khoản.</li><li>Địa chỉ giao hàng và thông tin người nhận.</li><li>Lịch sử mua hàng, lịch sử duyệt web để tối ưu trải nghiệm.</li></ul></FooterSection>
      <FooterSection title="2. Mục đích sử dụng dữ liệu"><ul className="list-disc space-y-2 pl-5"><li>Xử lý đơn hàng, giao hàng và chăm sóc sau bán.</li><li>Thông báo tình trạng đơn hàng qua email/SMS/cuộc gọi.</li><li>Cải thiện dịch vụ, nội dung và hiệu năng website.</li></ul></FooterSection>
      <FooterSection title="3. Cam kết bảo mật"><p>AH Phone Store không chia sẻ dữ liệu cá nhân cho bên thứ ba vì mục đích thương mại trái phép.</p></FooterSection>
    </FooterPageShell>
  );
}
