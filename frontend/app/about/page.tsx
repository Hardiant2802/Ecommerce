import { FooterPageShell, FooterSection } from '@/components/content/FooterPageShell';

export default function AboutPage() {
  return (
    <FooterPageShell
      title="Giới thiệu AH Phone Store"
      subtitle="Hệ thống bán lẻ điện thoại chính hãng tập trung vào trải nghiệm mua sắm minh bạch, hỗ trợ nhanh và dịch vụ hậu mãi rõ ràng."
    >
      <FooterSection title="Về chúng tôi">
        <p>
          AH Phone Store cung cấp đa dạng sản phẩm từ Apple, Samsung, Xiaomi, Oppo, Vivo, Asus, Red Magic và nhiều thương hiệu uy tín khác.
          Chúng tôi xây dựng mô hình bán lẻ theo hướng tư vấn đúng nhu cầu, báo giá rõ ràng và hỗ trợ sau bán hàng chủ động.
        </p>
      </FooterSection>

      <FooterSection title="Sứ mệnh">
        <p>
          Mang đến cho khách hàng sản phẩm công nghệ chính hãng, mức giá hợp lý và dịch vụ tận tâm. Mỗi đơn hàng không chỉ là giao dịch,
          mà là cam kết về chất lượng và sự an tâm dài hạn.
        </p>
      </FooterSection>

      <FooterSection title="Thông tin liên hệ">
        <ul className="space-y-2">
          <li><strong>Địa chỉ:</strong> 144 Xuân Thủy, Cầu Giấy, Hà Nội</li>
          <li><strong>Hotline:</strong> 0918317083</li>
          <li><strong>Email:</strong> anhhuy050908@gmail.com</li>
        </ul>
      </FooterSection>
    </FooterPageShell>
  );
}
