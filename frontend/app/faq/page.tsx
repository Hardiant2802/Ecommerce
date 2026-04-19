import { FooterPageShell, FooterSection } from '@/components/content/FooterPageShell';

const FAQS = [
  { q: 'Sản phẩm có bảo hành không?', a: 'Tất cả sản phẩm tại AH Phone Store đều được bảo hành chính hãng từ 12 đến 24 tháng tùy theo hãng sản xuất.' },
  { q: 'Tôi có thể đổi trả sản phẩm không?', a: 'Bạn có thể đổi trả trong vòng 7 ngày kể từ ngày mua nếu sản phẩm bị lỗi do nhà sản xuất. Xem thêm chính sách đổi trả để biết chi tiết.' },
  { q: 'Phương thức thanh toán nào được chấp nhận?', a: 'Chúng tôi chấp nhận thanh toán qua tiền mặt, chuyển khoản ngân hàng, Visa/Mastercard, Momo và VNPay.' },
  { q: 'Thời gian giao hàng là bao lâu?', a: 'Giao hàng nội thành Hà Nội trong 2-4 giờ. Tỉnh thành khác từ 1-3 ngày làm việc.' },
  { q: 'Tôi có thể đặt hàng online không?', a: 'Có, bạn có thể đặt hàng trực tuyến trên website và chọn giao hàng tận nơi hoặc đến cửa hàng nhận.' },
];

export default function FaqPage() {
  return (
    <FooterPageShell title="Câu hỏi thường gặp" subtitle="Tổng hợp các thắc mắc phổ biến về bảo hành, đổi trả, giao hàng và thanh toán để bạn mua sắm thuận tiện hơn.">
      {FAQS.map((item, idx) => (
        <FooterSection key={idx} title={`Câu ${idx + 1}: ${item.q}`}><p>{item.a}</p></FooterSection>
      ))}
    </FooterPageShell>
  );
}
