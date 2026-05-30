import { FooterPageShell, FooterSection } from '@/components/content/FooterPageShell';

export default function ReturnsPage() {
  return (
    <FooterPageShell title="Chính sách đổi trả" subtitle="Quy trình đổi trả được thiết kế rõ ràng để bảo vệ quyền lợi khách hàng khi phát sinh lỗi kỹ thuật từ nhà sản xuất.">
      <FooterSection title="1. Điều kiện được hỗ trợ đổi trả"><ul className="list-disc space-y-2 pl-5"><li>Sản phẩm trong vòng 7 ngày từ ngày mua.</li><li>Sản phẩm phát sinh lỗi kỹ thuật từ nhà sản xuất.</li><li>Còn đầy đủ hộp, phụ kiện và hóa đơn mua hàng.</li></ul></FooterSection>
      <FooterSection title="2. Quy trình xử lý"><ol className="list-decimal space-y-2 pl-5"><li>Liên hệ hotline <strong>0918317083</strong> hoặc đến trực tiếp cửa hàng.</li><li>Nhân viên kỹ thuật kiểm tra và xác nhận tình trạng sản phẩm.</li><li>Đổi sản phẩm cùng loại hoặc hoàn tiền trong 3-5 ngày làm việc.</li></ol></FooterSection>
    </FooterPageShell>
  );
}
