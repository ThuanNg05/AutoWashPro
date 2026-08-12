import api from './api';

export const authService = {
    login: async (identifier, password) => {

        console.log("AUTH SERVICE LOGIN");

        const response = await api.post('/api/Account/Login', {
            Identifier: identifier,
            Password: password
        });

        return response.data;
    },


  logout: async () => {
    const response = await api.post('/api/account/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/account/me');
    return response.data;
  },

  googleLogin: async (idToken) => {
    const response = await api.post('/api/Account/GoogleLogin', {
      IdToken: idToken
    });
    return response.data;
  },

  completeGoogleSignup: async (phone, password) => {
    const response = await api.post('/api/Account/CompleteGoogleSignup', {
      Phone: phone,
      Password: password
    });
    return response.data;
  },

  sendRegisterOtp: async (email) => {
    const response = await api.post('/api/Account/SendRegisterOtp', {
      Email: email
    });
    return response.data;
  },

  register: async (email, fullName, phone, password, otpCode) => {
    const response = await api.post('/api/Account/Register', {
      Email: email,
      FullName: fullName,
      Phone: phone,
      Password: password,
      OtpCode: otpCode
    });
    return response.data;
  }
};
