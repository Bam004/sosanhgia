import { Outlet } from 'react-router-dom';
import DauTrangQuanTri from '../components/admin/DauTrangQuanTri';
import ThanhBenQuanTri from '../components/admin/ThanhBenQuanTri';

export default function BoCucQuanTri() {
  return (
    <div className="bo-cuc-quan-tri">
      <DauTrangQuanTri />
      <div className="noi-dung-quan-tri">
        <ThanhBenQuanTri />
        <section className="khu-vuc-quan-tri">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
