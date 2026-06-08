import AccountPage from '../page';

// Route động cho /account/info, /account/orders, /account/password
// Tái sử dụng cùng một component; tab hiển thị được xác định theo đường dẫn.
export default function AccountTabPage() {
  return <AccountPage />;
}
