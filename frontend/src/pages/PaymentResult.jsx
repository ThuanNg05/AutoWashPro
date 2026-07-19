import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { useAuth } from '../hooks/useAuth';
import VerifyingCard from './payment-result/VerifyingCard';
import SuccessCard from './payment-result/SuccessCard';
import CancelledCard from './payment-result/CancelledCard';
import TimeoutCard from './payment-result/TimeoutCard';

const STATUS_PAID = 2;
const STATUS_FAILED = 3;
const STATUS_PENDING = 1;

const MAX_RETRIES = 12;
const RETRY_INTERVAL = 3000;

export const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser, isAdmin } = useAuth();

  const payment = searchParams.get('payment') || 'error';
  const bookingId = searchParams.get('bookingId');

  const [phase, setPhase] = useState('verifying'); // verifying, success, cancelled, timeout
  const [paymentData, setPaymentData] = useState(null);

  const abortRef = useRef(false);

  // Helper to extract properties support PascalCase / camelCase
  const getProp = (obj, key) => {
    if (!obj) return null;
    const pascal = key.charAt(0).toUpperCase() + key.slice(1);
    return obj[key] !== undefined ? obj[key] : obj[pascal];
  };

  useEffect(() => {
    if (payment === 'cancel') {
      setPhase('cancelled');
      return;
    }

    if (payment !== 'success' || !bookingId) {
      const target = isAdmin ? '/admin/bookings' : '/customer/bookings';
      navigate(target, { replace: true });
      return;
    }

    abortRef.current = false;
    let attempt = 0;

    const verifyPayment = async () => {
      if (abortRef.current) return;

      attempt++;

      try {
        const res = await fetch(`/api/payment/${bookingId}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const paymentInfo = data?.payment;
        const status = getProp(paymentInfo, 'status');

        if (abortRef.current) return;

        if (status === STATUS_PAID) {
          setPaymentData(paymentInfo);

          // Sync loyalty points
          try {
            const loyalty = await customerService.getLoyaltyStatus();
            if (loyalty && updateUser) {
              updateUser({
                points: loyalty.currentPoints ?? loyalty.points,
                tier: loyalty.tierName ?? loyalty.tier,
              });
            }
          } catch (loyaltyErr) {
            console.warn('Không thể đồng bộ loyalty:', loyaltyErr);
          }

          if (abortRef.current) return;
          setPhase('success');

        } else if (status === STATUS_FAILED) {
          setPaymentData(paymentInfo);
          setPhase('cancelled');

        } else if (status === STATUS_PENDING) {
          if (attempt < MAX_RETRIES) {
            setTimeout(verifyPayment, RETRY_INTERVAL);
          } else {
            setPaymentData(paymentInfo);
            setPhase('timeout');
          }
        } else {
          setPaymentData(paymentInfo);
          setPhase('cancelled');
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra thanh toán:', err);
        if (attempt < MAX_RETRIES) {
          setTimeout(verifyPayment, RETRY_INTERVAL);
        } else {
          setPhase('timeout');
        }
      }
    };

    verifyPayment();

    return () => {
      abortRef.current = true;
    };
  }, [payment, bookingId, navigate, isAdmin, updateUser]);

  const handleViewDetail = () => {
    const target = isAdmin ? '/admin/bookings' : `/customer/bookings/${bookingId}`;
    const state = { selectedBookingId: bookingId ? parseInt(bookingId, 10) : null, paymentStatus: phase };
    navigate(target, { replace: true, state });
  };

  const handleGoDashboard = () => {
    const target = isAdmin ? '/admin/dashboard' : '/customer/dashboard';
    navigate(target, { replace: true });
  };

  // ─── DELEGATE RENDERING TO SUBCOMPONENTS ───

  if (phase === 'verifying') {
    return <VerifyingCard />;
  }

  if (phase === 'success') {
    return (
      <SuccessCard
        bookingId={bookingId}
        paymentData={paymentData}
        onViewDetail={handleViewDetail}
        onGoDashboard={handleGoDashboard}
      />
    );
  }

  if (phase === 'cancelled') {
    return (
      <CancelledCard
        onViewDetail={handleViewDetail}
        onGoDashboard={handleGoDashboard}
      />
    );
  }

  return (
    <TimeoutCard
      onViewDetail={handleViewDetail}
      onGoDashboard={handleGoDashboard}
    />
  );
};

export default PaymentResult;
