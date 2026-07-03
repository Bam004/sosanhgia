import { Outlet } from 'react-router-dom';
import DauTrangNguoiDung from '../components/user/DauTrangNguoiDung';
import ThanhDanhMuc from '../components/user/ThanhDanhMuc';
import ChanTrangNguoiDung from '../components/user/ChanTrangNguoiDung';
import '../styles/user.css';

export default function BoCucNguoiDung() {
  return (
    <div className="bo-cuc-nguoi-dung">
      <DauTrangNguoiDung />
      <ThanhDanhMuc />
      <Outlet />
      <ChanTrangNguoiDung />
    </div>
  );
}
