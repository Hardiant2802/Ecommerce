import Link from 'next/link';
import { FaFacebookF, FaInstagram, FaYoutube, FaCcVisa, FaCcMastercard } from 'react-icons/fa';
import { Wallet, Landmark } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 text-gray-900">
      <div className="container-custom py-12 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                AH
              </div>
              <div>
                <p className="font-semibold text-base">AH PHONE STORE</p>
                <p className="text-xs text-gray-600">Hệ thống bán lẻ điện thoại chính hãng</p>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <li>144 Xuân Thủy, Cầu Giấy, Hà Nội</li>
            </ul>

            <div className="mt-4 space-y-1 text-sm">
              <p>
                Hotline:{' '}
                <a href="tel:0918317083" className="font-semibold hover:text-red-600 transition-colors">
                  0918317083
                </a>
              </p>
              <p>
                Email:{' '}
                <a href="mailto:anhhuy050908@gmail.com" className="font-semibold hover:text-red-600 transition-colors">
                  anhhuy050908@gmail.com
                </a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">Về chúng tôi</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-700 hover:text-red-600 transition-colors">
                  Giới thiệu công ty
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-gray-700 hover:text-red-600 transition-colors">
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-700 hover:text-red-600 transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-700 hover:text-red-600 transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">Hỗ trợ khách hàng</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/warranty" className="text-gray-700 hover:text-red-600 transition-colors">
                  Chính sách bảo hành
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-gray-700 hover:text-red-600 transition-colors">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-gray-700 hover:text-red-600 transition-colors">
                  Chính sách vận chuyển
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-700 hover:text-red-600 transition-colors">
                  Câu hỏi thường gặp (FAQ)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">Kết nối với chúng tôi</h3>
            <div className="flex items-center flex-wrap gap-3 mb-6">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:text-red-600 hover:border-red-600 transition-colors"
              >
                <FaFacebookF className="w-4 h-4" />
              </a>
              <a
                href="https://zalo.me"
                target="_blank"
                rel="noreferrer"
                aria-label="Zalo"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700 hover:text-red-600 hover:border-red-600 transition-colors"
              >
                Zalo
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:text-red-600 hover:border-red-600 transition-colors"
              >
                <FaYoutube className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:text-red-600 hover:border-red-600 transition-colors"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
            </div>

            <h4 className="font-semibold text-sm mb-3">Phương thức thanh toán</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 text-gray-700">
                <FaCcVisa className="w-4 h-4 text-red-600" />
                <span>Visa</span>
              </div>
              <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 text-gray-700">
                <FaCcMastercard className="w-4 h-4 text-red-600" />
                <span>Mastercard</span>
              </div>
              <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 text-gray-700">
                <Wallet className="w-4 h-4 text-red-600" />
                <span>Momo</span>
              </div>
              <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 text-gray-700">
                <Landmark className="w-4 h-4 text-red-600" />
                <span>VNPay</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 border-t border-gray-200">
        <div className="container-custom py-4 text-center text-sm text-gray-600">
          <p>© 2026 AH PHONE STORE. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
