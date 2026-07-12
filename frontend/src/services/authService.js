import api from './api';

export const authService = {
  login: async (identifier, password) => {
    const response = await api.post('/api/v1/account/login', {
      Identifier: identifier,
      Password: password
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/v1/account/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/v1/account/me');
    return response.data;
  },

  googleLogin: async (email, fullName, googleId) => {
    const response = await api.post('/api/v1/account/google-login', {
      Email: email,
      FullName: fullName,
      GoogleId: googleId
    });
    return response.data;
  },

  completeGoogleSignup: async (email, fullName, googleId, phone, password) => {
    const response = await api.post('/api/v1/account/complete-google-signup', {
      Email: email,
      FullName: fullName,
      GoogleId: googleId,
      Phone: phone,
      Password: password
    });
    return response.data;
  },

  sendRegisterOtp: async (email) => {
    const response = await api.post('/api/v1/account/send-register-otp', {
      Email: email
    });
    return response.data;
  },

  register: async (email, fullName, phone, password, otpCode) => {
    const response = await api.post('/api/v1/account/register', {
      Email: email,
      FullName: fullName,
      Phone: phone,
      Password: password,
      OtpCode: otpCode
    });
    return response.data;
  }
};
