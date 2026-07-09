import '../styles/shared.css';
import '../styles/admin/demo-tools.css';

// Demo-only page: browse and edit raw database tables so demo scenarios
// (booking times, statuses...) can be tweaked without opening Supabase.
export const AdminDemoTools = () => {
  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="fas fa-database text-cyan me-2"></i>
            Demo Tool: Database
          </h3>
          <small className="text-muted">
            Chỉnh sửa dữ liệu trực tiếp phục vụ demo — thao tác ghi có hiệu lực thật trên database.
          </small>
        </div>
      </div>
    </div>
  );
};

export default AdminDemoTools;
