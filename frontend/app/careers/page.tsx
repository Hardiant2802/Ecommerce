import { FooterPageShell, FooterSection } from '@/components/content/FooterPageShell';

const POSITIONS = [
  {
    title: 'Nhân viên kinh doanh',
    type: 'Toàn thời gian',
    desc: 'Tư vấn và bán hàng trực tiếp tại cửa hàng. Yêu cầu: năng động, giao tiếp tốt, đam mê công nghệ.',
  },
  {
    title: 'Kỹ thuật viên sửa chữa',
    type: 'Toàn thời gian',
    desc: 'Chẩn đoán và sửa chữa điện thoại. Yêu cầu: có kinh nghiệm sửa chữa điện thoại từ 1 năm trở lên.',
  },
  {
    title: 'Nhân viên kho & giao hàng',
    type: 'Toàn thời gian',
    desc: 'Quản lý hàng hóa và giao hàng khu vực Hà Nội. Yêu cầu: có xe máy, sức khỏe tốt.',
  },
];

export default function CareersPage() {
  return (
    <FooterPageShell
      title="Tuyển dụng"
      subtitle="Tham gia đội ngũ AH Phone Store, nơi công nghệ và con người cùng phát triển trong môi trường năng động, thực tế và tôn trọng khách hàng."
    >
      {POSITIONS.map((pos, idx) => (
        <FooterSection key={idx} title={pos.title}>
          <p className="mb-2 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{pos.type}</p>
          <p>{pos.desc}</p>
        </FooterSection>
      ))}

      <FooterSection title="Ứng tuyển ngay">
        <p>
          Gửi CV về email <strong>anhhuy050908@gmail.com</strong> với tiêu đề <em>&quot;Ứng tuyển - [Vị trí]&quot;</em> hoặc liên hệ trực
          tiếp <strong>0918317083</strong> để được phản hồi nhanh.
        </p>
      </FooterSection>
    </FooterPageShell>
  );
}
