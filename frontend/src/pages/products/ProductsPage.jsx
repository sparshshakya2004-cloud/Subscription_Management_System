import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  Calculator,
  Archive,
  CheckCircle2,
  DollarSign,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { productService } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

export const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isPriceCalcModalOpen, setIsPriceCalcModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToArchive, setProductToArchive] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    product_type: 'software',
    sales_price: '',
    cost_price: '',
    product_notes: '',
  });

  const [variantForm, setVariantForm] = useState({
    variant_name: '',
    option_name: '',
    price_adjustment: '',
  });

  // Price calculator states
  const [calcOptions, setCalcOptions] = useState({});
  const [calcResult, setCalcResult] = useState(null);

  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setProducts(res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load products catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, statusFilter]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await productService.create({
        ...formData,
        sales_price: parseFloat(formData.sales_price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
      });
      showToast('success', `Product ${formData.name} created!`);
      setIsAddModalOpen(false);
      setFormData({
        product_code: '',
        name: '',
        product_type: 'software',
        sales_price: '',
        cost_price: '',
        product_notes: '',
      });
      fetchProducts();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to create product.');
    }
  };

  const handleAddVariantOption = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      // Find or create variant
      let variant = selectedProduct.variants.find(
        (v) => v.variant_name.toLowerCase() === variantForm.variant_name.toLowerCase()
      );

      if (!variant) {
        const vRes = await productService.addVariant(selectedProduct.id, {
          variant_name: variantForm.variant_name,
          options: [
            {
              option_name: variantForm.option_name,
              price_adjustment: parseFloat(variantForm.price_adjustment) || 0,
            },
          ],
        });
        showToast('success', `Variant '${variantForm.variant_name}' added!`);
      } else {
        await productService.addVariantOption(variant.id, {
          option_name: variantForm.option_name,
          price_adjustment: parseFloat(variantForm.price_adjustment) || 0,
        });
        showToast('success', `Option '${variantForm.option_name}' added to ${variant.variant_name}!`);
      }

      setIsVariantModalOpen(false);
      setVariantForm({ variant_name: '', option_name: '', price_adjustment: '' });
      fetchProducts();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to configure variant.');
    }
  };

  const handleArchive = async () => {
    if (!productToArchive) return;
    try {
      await productService.archive(productToArchive.id);
      showToast('success', `Product ${productToArchive.name} archived.`);
      setProductToArchive(null);
      fetchProducts();
    } catch (err) {
      showToast('error', 'Failed to archive product.');
    }
  };

  const openCalculator = (prod) => {
    setSelectedProduct(prod);
    setCalcOptions({});
    setCalcResult(null);
    setIsPriceCalcModalOpen(true);
  };

  const calculateDynamicPrice = async () => {
    if (!selectedProduct) return;
    const optionIds = Object.values(calcOptions).filter(Boolean).join(',');
    try {
      const res = await productService.calculatePrice(selectedProduct.id, optionIds);
      setCalcResult(res.data);
    } catch (err) {
      showToast('error', 'Calculation failed.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Products & Dynamic Variants
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage software catalog items, pricing rules, and configurable variants (e.g. Odoo Brand +₹560).
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 card-shadow flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by code or name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Product Code</th>
                <th className="px-6 py-4">Name & Type</th>
                <th className="px-6 py-4">Sales Price</th>
                <th className="px-6 py-4">Cost Price</th>
                <th className="px-6 py-4">Configured Variants</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{prod.product_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{prod.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{prod.product_type}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{Number(prod.sales_price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      ₹{Number(prod.cost_price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      {prod.variants && prod.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {prod.variants.map((v) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              <span>{v.variant_name}:</span>
                              <span className="font-bold">{v.options?.length || 0} opts</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No variants</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={prod.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Dynamic Price Tester */}
                        <button
                          onClick={() => openCalculator(prod)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Interactive Price Calculator"
                        >
                          <Calculator className="w-4 h-4" />
                        </button>

                        {/* Add Variant (Admin only) */}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsVariantModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Add / Configure Variant"
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                            {prod.status === 'active' && (
                              <button
                                onClick={() => setProductToArchive(prod)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Archive Product"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Catalog Product"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Product Code *</label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })}
                placeholder="PROD-SaaS-01"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Brightloop Core Suite"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Product Type</label>
              <select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 capitalize"
              >
                <option value="software">Software</option>
                <option value="service">Service</option>
                <option value="addon">Addon</option>
                <option value="license">License</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Sales Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.sales_price}
                onChange={(e) => setFormData({ ...formData, sales_price: e.target.value })}
                placeholder="1200.00"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cost Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                placeholder="300.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Product Notes</label>
            <textarea
              rows="3"
              value={formData.product_notes}
              onChange={(e) => setFormData({ ...formData, product_notes: e.target.value })}
              placeholder="Technical specifications, SLA details, licensing terms..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all"
            >
              Create Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Variant Option Modal */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        title={`Configure Variant for ${selectedProduct?.name}`}
      >
        <form onSubmit={handleAddVariantOption} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Variant Attribute Name * (e.g. Brand, Tier, Storage)
            </label>
            <input
              type="text"
              value={variantForm.variant_name}
              onChange={(e) => setVariantForm({ ...variantForm, variant_name: e.target.value })}
              placeholder="Brand"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Option Name * (e.g. Odoo Brand)
              </label>
              <input
                type="text"
                value={variantForm.option_name}
                onChange={(e) => setVariantForm({ ...variantForm, option_name: e.target.value })}
                placeholder="Odoo Brand"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Price Adjustment (₹) * (+560.00)
              </label>
              <input
                type="number"
                step="0.01"
                value={variantForm.price_adjustment}
                onChange={(e) => setVariantForm({ ...variantForm, price_adjustment: e.target.value })}
                placeholder="560.00"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
            💡 Selecting this variant option will dynamically adjust the base price when quoting or billing.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsVariantModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all"
            >
              Save Variant Option
            </button>
          </div>
        </form>
      </Modal>

      {/* Dynamic Price Calculator Modal */}
      <Modal
        isOpen={isPriceCalcModalOpen}
        onClose={() => setIsPriceCalcModalOpen(false)}
        title={`Dynamic Price Engine: ${selectedProduct?.name}`}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-sm font-semibold text-slate-700">Base Sales Price:</span>
            <span className="text-base font-bold text-slate-900">
              ₹{Number(selectedProduct?.sales_price || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {selectedProduct?.variants && selectedProduct.variants.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Variant Options:
              </div>
              {selectedProduct.variants.map((v) => (
                <div key={v.id}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{v.variant_name}</label>
                  <select
                    value={calcOptions[v.id] || ''}
                    onChange={(e) => setCalcOptions({ ...calcOptions, [v.id]: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Default (No adjustment)</option>
                    {v.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.option_name} (+₹{Number(opt.price_adjustment).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">This product has no variants configured.</p>
          )}

          <button
            onClick={calculateDynamicPrice}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all cursor-pointer shadow-md shadow-blue-600/20"
          >
            Compute Adjusted Final Price
          </button>

          {calcResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 animate-fade-in space-y-2">
              <div className="flex justify-between text-xs text-emerald-800">
                <span>Base Price:</span>
                <span>₹{calcResult.base_price}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-800">
                <span>Variant Adjustments:</span>
                <span>+₹{calcResult.total_adjustments}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-950 pt-2 border-t border-emerald-200">
                <span>Computed Final Price:</span>
                <span>₹{calcResult.final_price}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Archive Confirm Modal */}
      <ConfirmModal
        isOpen={!!productToArchive}
        onClose={() => setProductToArchive(null)}
        onConfirm={handleArchive}
        title="Archive Catalog Product"
        message={`Are you sure you want to archive '${productToArchive?.name}'? Archived products cannot be added to new plans or quotations.`}
        confirmText="Archive Product"
        danger
      />
    </div>
  );
};

export default ProductsPage;
