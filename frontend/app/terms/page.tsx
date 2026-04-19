import { FooterPageShell, FooterSection } from '@/components/content/FooterPageShell';

export default function TermsPage() {
  return (
    <FooterPageShell title="Điều khoản sử dụng" subtitle="Các quy định dưới đây giúp đảm bảo môi trường mua sắm trực tuyến công bằng, an toàn và minh bạch.">
      <FooterSection title="1. Chấp nhận điều khoản"><p>Khi truy cập hoặc sử dụng website AH Phone Store, bạn đồng ý tuân thủ các điều khoản và điều kiện được công bố trên trang này.</p></FooterSection>
      <FooterSection title="2. Phạm vi sử dụng hợp lệ"><ul className="list-disc space-y-2 pl-5"><li>Sử dụng website cho mục đích hợp pháp và nhu cầu mua sắm cá nhân.</li><li>Không thực hiện hành vi gian lận, spam, phát tán mã độc hoặc khai thác lỗ hổng hệ thống.</li></ul></FooterSection>
    </FooterPageShell>
  );
}
