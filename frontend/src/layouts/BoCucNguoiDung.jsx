import { Outlet } from 'react-router-dom';
import DauTrangNguoiDung from '../components/user/DauTrangNguoiDung';
import ChanTrangNguoiDung from '../components/user/ChanTrangNguoiDung';
import '../styles/user.css';

export default function BoCucNguoiDung() {
  return (
    <div className="bo-cuc-nguoi-dung">
      <DauTrangNguoiDung />
      <Outlet />
      <ChanTrangNguoiDung />
    </div>
  );
}
