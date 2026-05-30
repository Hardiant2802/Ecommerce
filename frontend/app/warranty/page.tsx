import { FooterPageShell, FooterSection } from '@/components/content/FooterPageShell';

export default function WarrantyPage() {
  return (
    <FooterPageShell title="Chính sách bảo hành" subtitle="Tất cả sản phẩm tại AH Phone Store được hỗ trợ bảo hành minh bạch, đúng điều kiện và đúng thời gian cam kết.">
      <FooterSection title="1. Thời hạn bảo hành"><ul className="list-disc space-y-2 pl-5"><li>Điện thoại chính hãng: 12-24 tháng theo chính sách hãng.</li><li>Phụ kiện đi kèm: 3-6 tháng tùy loại sản phẩm.</li></ul></FooterSection>
      <FooterSection title="2. Điều kiện áp dụng"><ul className="list-disc space-y-2 pl-5"><li>Sản phẩm còn trong thời hạn bảo hành.</li><li>Lỗi phát sinh từ nhà sản xuất, không có dấu hiệu tác động vật lý hoặc vào nước.</li></ul></FooterSection>
    </FooterPageShell>
  );
}
