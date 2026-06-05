import Link from 'next/link';
import { FaFacebookF, FaInstagram, FaYoutube, FaCcVisa } from 'react-icons/fa';
import { Wallet, Landmark } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-primary-600 border-t border-primary-700 text-slate-100">
      <div className="container-custom py-12 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-primary-500 text-white flex items-center justify-center font-black text-sm">
                AH
              </div>
              <div>
                <p className="font-semibold text-base">AH PHONE STORE</p>
                <p className="text-xs text-slate-400">Hệ thống bán lẻ điện thoại chính hãng</p>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
              <li>144 Xuân Thủy, Cầu Giấy, Hà Nội</li>
            </ul>

            <div className="mt-4 space-y-1 text-sm">
              <p>
                Hotline:{' '}
                <a href="tel:0918317083" className="font-semibold text-white hover:text-primary-100 transition-colors">
                  0918317083
                </a>
              </p>
              <p>
                Email:{' '}
                <a href="mailto:anhhuy050908@gmail.com" className="font-semibold text-white hover:text-primary-100 transition-colors">
                  anhhuy050908@gmail.com
                </a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">Về chúng tôi</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-slate-300 hover:text-white transition-colors">
                  Giới thiệu công ty
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-slate-300 hover:text-white transition-colors">
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-300 hover:text-white transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-300 hover:text-white transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">Hỗ trợ khách hàng</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/warranty" className="text-slate-300 hover:text-white transition-colors">
                  Chính sách bảo hành
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-slate-300 hover:text-white transition-colors">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-slate-300 hover:text-white transition-colors">
                  Chính sách vận chuyển
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-slate-300 hover:text-white transition-colors">
                  Câu hỏi thường gặp (FAQ)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">Kết nối với chúng tôi</h3>
            <div className="flex items-center flex-wrap gap-3 mb-6">
              <a
                href="https://web.facebook.com/huy080905nd"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-md border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-primary-400 transition-colors"
              >
                <FaFacebookF className="w-4 h-4" />
              </a>
              <a
                href="https://zalo.me/0918317083"
                target="_blank"
                rel="noreferrer"
                aria-label="Zalo"
                className="w-9 h-9 rounded-md border border-white/15 flex items-center justify-center text-xs font-semibold text-slate-300 hover:text-white hover:border-primary-400 transition-colors"
              >
                Zalo
              </a>
              <a
                href="https://www.youtube.com/@SVTB-AHuy"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-md border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-primary-400 transition-colors"
              >
                <FaYoutube className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-md border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-primary-400 transition-colors"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
            </div>

            <h4 className="font-semibold text-sm mb-3">Phương thức thanh toán</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 border border-white/10 rounded-md px-3 py-2 text-slate-300 bg-white/5">
                <Landmark className="w-4 h-4 text-primary-100" />
                <span>Chuyển khoản</span>
              </div>
              <div className="flex items-center gap-2 border border-white/10 rounded-md px-3 py-2 text-slate-300 bg-white/5">
                <FaCcVisa className="w-4 h-4 text-primary-100" />
                <span>VNPay</span>
              </div>
              <div className="flex items-center gap-2 border border-white/10 rounded-md px-3 py-2 text-slate-300 bg-white/5 col-span-2">
                <Wallet className="w-4 h-4 text-primary-100" />
                <span>COD (Thanh toán khi nhận hàng)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-700 border-t border-white/10">
        <div className="container-custom py-4 text-center text-sm text-slate-400">
          <p>© 2026 AH PHONE STORE. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
