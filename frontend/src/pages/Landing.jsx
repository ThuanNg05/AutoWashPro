import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../styles/shared.css';
import '../styles/landing.css';

export const Landing = () => {
  const [scrollingNavbar, setScrollingNavbar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrollingNavbar(true);
      } else {
        setScrollingNavbar(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="landing-wrapper">
      {/* Ambient Background Glow Blobs */}
      <div className="landing-bg-glow-1"></div>
      <div className="landing-bg-glow-2"></div>

      {/* NAVBAR */}
      <nav
        className={`navbar navbar-expand-lg fixed-top landing-nav ${
          scrollingNavbar ? 'shadow-sm py-2 bg-white bg-opacity-95' : 'py-3 bg-white bg-opacity-85'
        }`}
        style={{ transition: 'all 0.3s ease' }}
      >
        <div className="container">
          <a
            className="navbar-brand d-flex align-items-center text-dark fw-bold"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="brand-logo-icon me-2 d-flex align-items-center justify-content-center">
              <i className="fas fa-car-side text-white"></i>
            </div>
            <span style={{ fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
              AutoWash <span className="text-primary-blue" style={{ color: '#0284c7' }}>Pro</span>
            </span>
          </a>

          <button
            className="navbar-toggler border-0 text-dark"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#landingNavbar"
          >
            <i className="fas fa-bars"></i>
          </button>

          <div className="collapse navbar-collapse" id="landingNavbar">
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-1 gap-lg-4 text-center mt-3 mt-lg-0">
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('how-it-works');
                  }}
                >
                  Quy trình
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#services"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('services');
                  }}
                >
                  Dịch vụ
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#loyalty"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('loyalty');
                  }}
                >
                  Hạng VIP
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link text-secondary fw-bold"
                  href="#benefits"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('benefits');
                  }}
                >
                  Đặc quyền
                </a>
              </li>
            </ul>
            <div className="d-flex justify-content-center">
              <Link
                to="/login"
                className="hero-cta-btn-primary w-auto px-4 py-2 fw-bold"
                style={{
                  fontSize: '0.85rem',
                  padding: '11px 22px',
                  borderRadius: '12px',
                }}
              >
                Đăng nhập / Đăng ký <i className="fas fa-sign-in-alt"></i>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO SECTION */}
      <header className="container landing-hero text-center d-flex flex-column align-items-center">
        <div className="row justify-content-center w-100">
          <div className="col-lg-9 text-center animate-up">
            <div className="hero-badge mx-auto">
              <i className="fas fa-magic me-2"></i> Trải nghiệm dịch vụ thế hệ mới
            </div>

            <h1 className="hero-title fw-bold mb-3">
              Hệ Thống Rửa Xe <br />
              <span className="text-primary-blue" style={{ color: '#0284c7' }}>
                Thế Hệ Mới Siêu Tốc
              </span>
            </h1>

            <p className="hero-desc mx-auto">
              Tiết kiệm thời gian chờ đợi với quy trình đặt lịch trực tuyến bảo mật, 
              theo dõi tiến trình thực tế của hàng chờ và phục vụ chuyên nghiệp ngay tại trạm.
            </p>

            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link to="/login" className="hero-cta-btn-primary">
                Bắt đầu ngay <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 2: STATS */}
      <section className="stats-section pb-5 bg-light-gradient">
        <div className="container">
          <div className="row g-4 justify-content-center">
            <div className="col-12 col-md-4 animate-up">
              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="stat-number">100%</div>
                <div className="stat-label">Đúng giờ hẹn đặt lịch</div>
              </div>
            </div>
            <div className="col-12 col-md-4 animate-up" style={{ animationDelay: '0.1s' }}>
              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <i className="fas fa-car-side"></i>
                </div>
                <div className="stat-number">15K+</div>
                <div className="stat-label">Lượt xe hoàn tất</div>
              </div>
            </div>
            <div className="col-12 col-md-4 animate-up" style={{ animationDelay: '0.2s' }}>
              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <i className="fas fa-star"></i>
                </div>
                <div className="stat-number">4.92★</div>
                <div className="stat-label">Đánh giá hài lòng</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS (Timeline 4 Bước Tối Giản Trực Quan) */}
      <section id="how-it-works" className="py-6 bg-white-pure">
        <div className="container">
          <div className="text-center mb-5">
            <small className="section-subtitle">Quy trình vận hành</small>
            <h2 className="section-title">Quy Trình 4 Bước Siêu Tốc</h2>
            <p className="text-secondary mx-auto mt-2" style={{ maxWidth: '560px', fontSize: '0.95rem' }}>
              Trải nghiệm dịch vụ nhanh gọn nhờ sự hỗ trợ của công nghệ nhận diện và quy trình tối ưu.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Bước 1 */}
            <div className="col-md-6 col-lg-3 animate-up">
              <div className="stat-card h-100" style={{ padding: '36px 20px', background: '#f8fafc' }}>
                <div className="stat-icon-wrapper" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.5rem', background: 'rgba(2, 132, 199, 0.1)' }}>
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bước 1</div>
                <h5 className="fw-bold text-dark mt-2 mb-2" style={{ fontSize: '1.1rem' }}>Đặt lịch</h5>
                <p className="text-secondary small mb-0 text-center" style={{ lineHeight: '1.5' }}>
                  Khách hàng chọn gói dịch vụ và đặt khung giờ trực tuyến trước khi đến trạm.
                </p>
              </div>
            </div>
            
            {/* Bước 2 */}
            <div className="col-md-6 col-lg-3 animate-up" style={{ animationDelay: '0.1s' }}>
              <div className="stat-card h-100" style={{ padding: '36px 20px', background: '#f8fafc' }}>
                <div className="stat-icon-wrapper" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.5rem', background: 'rgba(2, 132, 199, 0.1)' }}>
                  <i className="fas fa-id-card"></i>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bước 2</div>
                <h5 className="fw-bold text-dark mt-2 mb-2" style={{ fontSize: '1.1rem' }}>Xác nhận thông tin</h5>
                <p className="text-secondary small mb-0 text-center" style={{ lineHeight: '1.5' }}>
                  Khách hàng đến trạm và nhân viên check-in xe dựa trên biển số đã đăng ký.
                </p>
              </div>
            </div>
            
            {/* Bước 3 */}
            <div className="col-md-6 col-lg-3 animate-up" style={{ animationDelay: '0.2s' }}>
              <div className="stat-card h-100" style={{ padding: '36px 20px', background: '#f8fafc' }}>
                <div className="stat-icon-wrapper" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.5rem', background: 'rgba(2, 132, 199, 0.1)' }}>
                  <i className="fas fa-soap"></i>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bước 3</div>
                <h5 className="fw-bold text-dark mt-2 mb-2" style={{ fontSize: '1.1rem' }}>Chăm sóc xe</h5>
                <p className="text-secondary small mb-0 text-center" style={{ lineHeight: '1.5' }}>
                  Xe được vệ sinh vỏ, hút bụi cabin và thực hiện các gói chuyên sâu theo yêu cầu.
                </p>
              </div>
            </div>
            
            {/* Bước 4 */}
            <div className="col-md-6 col-lg-3 animate-up" style={{ animationDelay: '0.3s' }}>
              <div className="stat-card h-100" style={{ padding: '36px 20px', background: '#f8fafc' }}>
                <div className="stat-icon-wrapper" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.5rem', background: 'rgba(2, 132, 199, 0.1)' }}>
                  <i className="fas fa-credit-card"></i>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bước 4</div>
                <h5 className="fw-bold text-dark mt-2 mb-2" style={{ fontSize: '1.1rem' }}>Thanh toán & Tích điểm</h5>
                <p className="text-secondary small mb-0 text-center" style={{ lineHeight: '1.5' }}>
                  Khách hàng thanh toán nhanh chóng trực tuyến và tự động tích lũy điểm thăng hạng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: SERVICES */}
      <section id="services" className="py-6 bg-light-gradient">
        <div className="container">
          <div className="text-center mb-5">
            <small className="section-subtitle">Dịch vụ & Tính năng</small>
            <h2 className="section-title">Tính Năng Cốt Lõi Của Auto-Wash Pro</h2>
            <p className="text-secondary mx-auto mt-2" style={{ maxWidth: '560px', fontSize: '0.95rem' }}>
              Hệ thống được thiết kế toàn diện nhằm tối ưu hóa trải nghiệm chăm sóc xe của bạn thông qua các giải pháp công nghệ hiện đại.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Card 1: Smart Vehicle Wash */}
            <div className="col-md-6 col-lg-4 animate-up">
              <div className="service-feature-card">
                <div className="service-feature-icon">
                  <i className="fas fa-soap"></i>
                </div>
                <h4 className="service-feature-title">Smart Vehicle Wash</h4>
                <p className="service-feature-desc">
                  Dịch vụ rửa xe máy và ô tô chuyên nghiệp. Làm sạch nhanh chóng, chất lượng cao với nhiều gói dịch vụ đa dạng phù hợp cho từng loại xe.
                </p>
              </div>
            </div>

            {/* Card 2: Online Booking */}
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.05s' }}>
              <div className="service-feature-card">
                <div className="service-feature-icon">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <h4 className="service-feature-title">Online Booking</h4>
                <p className="service-feature-desc">
                  Đặt lịch hẹn rửa xe trực tuyến dễ dàng. Chủ động lựa chọn ngày giờ mong muốn, hỗ trợ thay đổi lịch trình hoặc hủy lịch nhanh chóng.
                </p>
              </div>
            </div>

            {/* Card 3: Queue Management */}
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.1s' }}>
              <div className="service-feature-card">
                <div className="service-feature-icon">
                  <i className="fas fa-list-ol"></i>
                </div>
                <h4 className="service-feature-title">Queue Management</h4>
                <p className="service-feature-desc">
                  Theo dõi danh sách hàng chờ theo thời gian thực. Quy trình check-in tự động nhanh gọn và giám sát chặt chẽ tiến trình rửa xe của bạn.
                </p>
              </div>
            </div>

            {/* Card 4: Loyalty Rewards */}
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.15s' }}>
              <div className="service-feature-card">
                <div className="service-feature-icon">
                  <i className="fas fa-award"></i>
                </div>
                <h4 className="service-feature-title">Loyalty Rewards</h4>
                <p className="service-feature-desc">
                  Tích lũy điểm thưởng tự động sau mỗi lượt sử dụng dịch vụ thành công. Đổi điểm nhận quà và tận hưởng các đặc quyền dành riêng cho thành viên.
                </p>
              </div>
            </div>

            {/* Card 5: Promotions & Vouchers */}
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.2s' }}>
              <div className="service-feature-card">
                <div className="service-feature-icon">
                  <i className="fas fa-tags"></i>
                </div>
                <h4 className="service-feature-title">Promotions & Vouchers</h4>
                <p className="service-feature-desc">
                  Tham gia các chiến dịch ưu đãi theo mùa hấp dẫn. Săn mã giảm giá, voucher dịch vụ và nhận các lời mời chương trình tri ân đặc biệt.
                </p>
              </div>
            </div>

            {/* Card 6: Vehicle Management */}
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.25s' }}>
              <div className="service-feature-card">
                <div className="service-feature-icon">
                  <i className="fas fa-car"></i>
                </div>
                <h4 className="service-feature-title">Vehicle Management</h4>
                <p className="service-feature-desc">
                  Đăng ký và quản lý thông tin của nhiều phương tiện cùng lúc. Cập nhật biển số xe chính xác và tra cứu lịch sử đặt lịch của từng xe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: LOYALTY */}
      <section id="loyalty" className="py-6 bg-white-pure">
        <div className="container">
          <div className="text-center mb-5">
            <small className="section-subtitle">Loyalty Rewards Program</small>
            <h2 className="section-title">Chương Trình Khách Hàng Thân Thiết</h2>
            <p className="text-secondary mx-auto mt-2" style={{ maxWidth: '640px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Mỗi lần sử dụng dịch vụ, khách hàng sẽ tích lũy điểm thưởng để mở khóa nhiều quyền lợi hấp dẫn. 
              Thành viên càng ở hạng cao sẽ càng nhận được nhiều ưu đãi và đặc quyền.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Card 1: Silver */}
            <div className="col-md-4 animate-up">
              <div className="tier-card tier-silver d-flex flex-column h-100">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="tier-badge-pill silver">Silver Member</div>
                  <div className="tier-icon-wrapper silver">
                    <i className="fas fa-award"></i>
                  </div>
                </div>
                
                <h4 className="tier-card-title-new">Thành Viên Bạc</h4>
                <p className="tier-card-subtitle-new text-muted">Hạng thành viên khởi đầu sau khi tích lũy mốc điểm cơ bản.</p>

                <div className="tier-perks-list border-top pt-3 mt-auto">
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Hỗ trợ ưu tiên (Priority support)</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Chương trình khuyến mãi thành viên độc quyền (Exclusive member promotions)</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Tích lũy điểm thưởng đổi voucher (Earn reward points)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Gold */}
            <div className="col-md-4 animate-up" style={{ animationDelay: '0.1s' }}>
              <div className="tier-card tier-gold d-flex flex-column h-100">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="tier-badge-pill gold">Gold Member</div>
                  <div className="tier-icon-wrapper gold">
                    <i className="fas fa-gem"></i>
                  </div>
                </div>
                
                <h4 className="tier-card-title-new">Thành Viên Vàng</h4>
                <p className="tier-card-subtitle-new text-muted">Hạng thành viên trung cấp với nhiều ưu đãi hấp dẫn gia tăng.</p>

                <div className="tier-perks-list border-top pt-3 mt-auto">
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Tỷ lệ tích điểm & giá trị voucher cao hơn (Higher reward benefits)</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Quyền tiếp cận sớm các đợt khuyến mãi lớn (Early access to promotions)</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Cơ hội đặt lịch vào khung giờ cao điểm (Priority booking opportunities)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Platinum */}
            <div className="col-md-4 animate-up" style={{ animationDelay: '0.2s' }}>
              <div className="tier-card tier-platinum d-flex flex-column h-100">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="tier-badge-pill platinum">Platinum Member</div>
                  <div className="tier-icon-wrapper platinum">
                    <i className="fas fa-crown"></i>
                  </div>
                </div>
                
                <h4 className="tier-card-title-new">Thành Viên Bạch Kim</h4>
                <p className="tier-card-subtitle-new text-muted">Hạng thành viên tối cao sở hữu mọi đặc quyền đặc biệt tại trạm.</p>

                <div className="tier-perks-list border-top pt-3 mt-auto">
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Đặc quyền thành viên cao cấp nhất (Premium member privileges)</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Các gói voucher giảm giá tốt nhất (Best promotional offers)</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Điểm thưởng tích lũy tối đa (Maximum loyalty rewards)</span>
                  </div>
                  <div className="tier-perk-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Các chiến dịch và sự kiện tri ân riêng biệt (Exclusive campaigns)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: BENEFITS */}
      <section id="benefits" className="py-6 bg-light-gradient">
        <div className="container">
          <div className="text-center mb-5">
            <small className="section-subtitle">Đặc quyền vượt trội</small>
            <h2 className="section-title">Tại Sao Nên Lựa Chọn AutoWash Pro?</h2>
            <p className="text-secondary mx-auto mt-2" style={{ maxWidth: '560px', fontSize: '0.95rem' }}>
              Chúng tôi tối ưu hóa quy trình rửa xe truyền thống bằng các giải pháp thông minh tự động.
            </p>
          </div>

          <div className="row g-3">
            <div className="col-md-6 col-lg-4 animate-up">
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">Tiết kiệm tới 90% thời gian chờ tại tiệm</span>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.05s' }}>
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">Xác nhận check-in nhanh chóng tại trạm</span>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.1s' }}>
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">Theo dõi trực tiếp tiến trình rửa realtime</span>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.15s' }}>
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">Tích điểm nâng hạng thăng chức thành viên</span>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.2s' }}>
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">Giá niêm yết rõ ràng, hóa đơn điện tử ngay</span>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 animate-up" style={{ animationDelay: '0.25s' }}>
              <div className="benefit-card">
                <div className="benefit-check">
                  <i className="fas fa-check"></i>
                </div>
                <span className="benefit-text">Thanh toán đa ví điện tử bảo mật tuyệt đối</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: CTA BANNER */}
      <section className="container py-5 mb-5">
        <div className="cta-banner text-center py-5">
          <div className="position-relative py-3" style={{ zIndex: 3 }}>
            <h2 className="fw-bold text-white mb-3 fs-2">Sẵn sàng nâng tầm trải nghiệm chăm sóc xe?</h2>
            <p className="text-white opacity-85 mb-4 mx-auto" style={{ maxWidth: '540px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Tạo tài khoản AutoWash Pro ngay hôm nay để nhận ưu đãi giảm giá 20% cho lượt đặt lịch đầu tiên và tích lũy điểm thăng hạng VIP!
            </p>
            <Link to="/login" className="cta-btn-white">
              Đăng ký trải nghiệm ngay <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 8: FOOTER */}
      <footer className="py-5 bg-white-pure border-top">
        <div className="container">
          <div className="row g-5 mb-5 text-start">
            {/* Col 1: Brand Info */}
            <div className="col-lg-5 col-md-6">
              <h5 className="fw-bold text-dark mb-3">
                AutoWash <span className="text-primary-blue" style={{ color: '#0284c7' }}>Pro</span>
              </h5>
              <p className="text-secondary small mb-3" style={{ lineHeight: '1.6' }}>
                Hệ thống quản lý đặt lịch rửa xe thông minh, 
                đem lại trải nghiệm chăm sóc xe hiện đại, siêu tốc và đẳng cấp.
              </p>
              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                SWP391 Project — FPT University Ho Chi Minh
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="col-lg-3 col-md-3 footer-link-group">
              <h6 className="fw-bold text-dark small text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>Khám Phá</h6>
              <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }} className="footer-link">Quy trình</a>
              <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('services'); }} className="footer-link">Gói dịch vụ</a>
              <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('loyalty'); }} className="footer-link">VIP Loyalty</a>
              <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('benefits'); }} className="footer-link">Đặc quyền</a>
            </div>

            {/* Col 3: Company */}
            <div className="col-lg-4 col-md-3 footer-link-group">
              <h6 className="fw-bold text-dark small text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>Trạm Rửa Xe</h6>
              <a href="#" onClick={(e) => e.preventDefault()} className="footer-link">Về chúng tôi</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="footer-link">Liên hệ hỗ trợ</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="footer-link">Tuyển dụng</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="footer-link">Điều khoản dịch vụ</a>
            </div>
          </div>

          <div className="row g-4 align-items-center justify-content-between border-top pt-4">
            <div className="col-md-6 text-start">
              <small className="text-secondary" style={{ fontSize: '0.75rem' }}>
                &copy; {new Date().getFullYear()} AutoWash Pro. Bảo lưu mọi quyền.
              </small>
            </div>
            <div className="col-md-6 text-end">
              <div className="d-flex justify-content-md-end justify-content-start gap-3">
                <a href="#" onClick={(e) => e.preventDefault()} className="text-secondary hover-text-cyan text-decoration-none">
                  <i className="fab fa-facebook fa-lg"></i>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-secondary hover-text-cyan text-decoration-none">
                  <i className="fab fa-twitter fa-lg"></i>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-secondary hover-text-cyan text-decoration-none">
                  <i className="fas fa-envelope fa-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
