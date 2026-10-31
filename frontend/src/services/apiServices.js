import api from './api';

export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  archive: (id) => api.delete(`/products/${id}`),
  addVariant: (productId, data) => api.post(`/products/${productId}/variants`, data),
  addVariantOption: (variantId, data) => api.post(`/products/variants/${variantId}/options`, data),
  calculatePrice: (productId, optionIds) => api.get(`/products/${productId}/calculate-price`, { params: { option_ids: optionIds } }),
};

export const planService = {
  getAll: (params) => api.get('/plans', { params }),
  getById: (id) => api.get(`/plans/${id}`),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  toggleStatus: (id) => api.patch(`/plans/${id}/toggle-status`),
};

export const customerService = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
};

export const quotationService = {
  getAll: (params) => api.get('/quotations', { params }),
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  createFromTemplate: (templateId, customerId) => api.post(`/quotations/from-template/${templateId}?customer_id=${customerId}`),
  updateStatus: (id, status) => api.patch(`/quotations/${id}/status?status=${status}`),
  convertToSubscription: (id, planId) => api.post(`/quotations/${id}/convert-to-subscription`, null, { params: { plan_id: planId } }),
  getTemplates: () => api.get('/quotation-templates'),
  createTemplate: (data) => api.post('/quotation-templates', data),
  deleteTemplate: (id) => api.delete(`/quotation-templates/${id}`),
};

export const subscriptionService = {
  getAll: (params) => api.get('/subscriptions', { params }),
  getById: (id) => api.get(`/subscriptions/${id}`),
  create: (data) => api.post('/subscriptions', data),
  lifecycleAction: (id, data) => api.post(`/subscriptions/${id}/action`, data),
};

export const invoiceService = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, status) => api.patch(`/invoices/${id}/status?status=${status}`),
  runBillingCycle: (targetDate) => api.post('/invoices/run-billing-cycle', null, { params: { target_date: targetDate } }),
  downloadPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

export const paymentService = {
  getAll: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
};

export const taxService = {
  getAll: (params) => api.get('/taxes', { params }),
  create: (data) => api.post('/taxes', data),
  update: (id, data) => api.put(`/taxes/${id}`, data),
  toggleStatus: (id) => api.patch(`/taxes/${id}/toggle-status`),
};

export const discountService = {
  getAll: (params) => api.get('/discounts', { params }),
  create: (data) => api.post('/discounts', data),
  update: (id, data) => api.put(`/discounts/${id}`, data),
  validate: (code, subtotal, quantity = 1) => api.post(`/discounts/validate?code=${code}&subtotal=${subtotal}&quantity=${quantity}`),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export const reportService = {
  getFinanceSummary: (params) => api.get('/reports/finance', { params }),
  exportCsv: (reportType) => api.get('/reports/export', { params: { report_type: reportType }, responseType: 'blob' }),
};

export const portalService = {
  getOverview: () => api.get('/portal/overview'),
  getProfile: () => api.get('/portal/profile'),
  updateProfile: (data) => api.put('/portal/profile', data),
  getSubscriptions: () => api.get('/portal/subscriptions'),
  getInvoices: () => api.get('/portal/invoices'),
  downloadInvoicePdf: (id) => api.get(`/portal/invoices/${id}/pdf`, { responseType: 'blob' }),
  getPayments: () => api.get('/portal/payments'),
  getPlans: () => api.get('/portal/plans'),
};

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  createStaff: (data) => api.post('/users/staff', data),
  toggleStatus: (id, status) => api.patch(`/users/${id}/status?status=${status}`),
};
