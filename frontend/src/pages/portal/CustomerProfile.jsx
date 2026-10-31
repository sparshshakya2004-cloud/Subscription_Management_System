import React, { useState, useEffect } from 'react';
import { User, Building, Phone, Mail, MapPin, Save, CheckCircle2 } from 'lucide-react';
import { portalService } from '../../services/apiServices';
import { useToast } from '../../context/ToastContext';

export const CustomerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    contact_name: '',
    company_name: '',
    phone: '',
    billing_address: '',
    tax_number: '',
  });

  const { showToast } = useToast();

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await portalService.getProfile();
      setProfile(res.data);
      setFormData({
        contact_name: res.data.contact_name || '',
        company_name: res.data.company_name || '',
        phone: res.data.phone || '',
        billing_address: res.data.billing_address || '',
        tax_number: res.data.tax_number || '',
      });
    } catch (err) {
      showToast('error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await portalService.updateProfile(formData);
      showToast('success', 'Profile information updated successfully!');
      loadProfile();
    } catch (err) {
      showToast('error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organization Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage corporate billing address, statutory tax numbers, and primary representative details.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 card-shadow">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
            <div>
              <span className="text-slate-500">Customer Account Code:</span>{' '}
              <span className="font-mono font-bold text-slate-900">{profile?.customer_code}</span>
            </div>
            <div>
              <span className="text-slate-500">Registered Email:</span>{' '}
              <span className="font-medium text-slate-800">{profile?.email}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Company Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Primary Contact</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">GST / Tax ID</label>
              <input
                type="text"
                value={formData.tax_number}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Billing Address</label>
            <textarea
              rows="3"
              value={formData.billing_address}
              onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Update Organization Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerProfile;
