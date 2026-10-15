import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminData, adminError } from '../../../api/admin/admin-api-service';
import '../master/Master.css';
import '../users/Users.css';

const empty = {
  shopName: '',
  address: '',
  gstin: '',
  printType: 1,
  thermalPrintType: 1,
  thermalTxtFile: 0,
  billingType: 1,
  printerName: '',
  bankDetails: '',
  barcodePrinter: '',
  barcodePerRow: 1,
  barcodeWidthMm: 50,
  barcodeHeightMm: 30,
};

const CompanyDetailsPage: React.FC = () => {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.company()
      .then((res) => {
        const data = adminData<typeof empty>(res) || empty;
        setForm({
          ...empty,
          ...data,
          billingType: data.billingType === 2 ? 2 : 1,
          thermalPrintType: data.thermalPrintType === 2 ? 2 : 1,
          thermalTxtFile: data.thermalTxtFile === 1 ? 1 : 0,
          barcodePerRow: Number(data.barcodePerRow) || 1,
          barcodeWidthMm: Number(data.barcodeWidthMm) || 50,
          barcodeHeightMm: Number(data.barcodeHeightMm) || 30,
        });
      })
      .catch((err) => toast.error(adminError(err, 'Could not load company details')));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName.trim() || !form.address.trim()) {
      toast.warning('Please fill all required fields');
      return;
    }
    if (form.printType === 1 && !form.printerName.trim()) {
      toast.warning('Printer name is required for thermal printing');
      return;
    }
    if (form.gstin && form.gstin.trim().length !== 15) {
      toast.warning('GSTIN must be 15 characters');
      return;
    }
    setBusy(true);
    try {
      await adminApi.saveCompany({
        ...form,
        shopName: form.shopName.trim(),
        address: form.address.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        printerName: form.printType === 1 ? form.printerName.trim() : '',
        thermalPrintType: form.thermalPrintType === 2 ? 2 : 1,
        thermalTxtFile: form.thermalTxtFile === 1 ? 1 : 0,
        bankDetails: form.bankDetails.trim(),
        barcodePrinter: form.barcodePrinter.trim(),
        billingType: form.billingType === 2 ? 2 : 1,
        barcodePerRow: Number(form.barcodePerRow) || 1,
        barcodeWidthMm: Number(form.barcodeWidthMm) || 50,
        barcodeHeightMm: Number(form.barcodeHeightMm) || 30,
      });
      toast.success('Company details saved');
    } catch (err) {
      toast.error(adminError(err, 'Failed to save company details'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-building" /> Company Details</h2>
      <div className="mst-card usr-narrow" style={{ maxWidth: 700 }}>
        <div className="mst-card-h">Shop Settings</div>
        <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Trade Name <span className="req">*</span></label>
            <input className="mst-inp" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Address & Phone Number <span className="req">*</span></label>
            <textarea className="mst-area" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>GSTIN No</label>
            <input className="mst-inp" maxLength={15} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
            <div className="mst-note">15 character GSTIN (optional)</div>
          </div>
          <div className="mst-fg">
            <label>Bank Details</label>
            <textarea className="mst-area" value={form.bankDetails} onChange={(e) => setForm({ ...form, bankDetails: e.target.value })} placeholder="Account Name, Account No, IFSC, Bank, Branch" />
          </div>
          <div className="mst-fg">
            <label>Billing Type <span className="req">*</span></label>
            <select className="mst-sel" value={form.billingType} onChange={(e) => setForm({ ...form, billingType: Number(e.target.value) })}>
              <option value={1}>Type</option>
              <option value={2}>Select</option>
            </select>
            <div className="mst-note">Type uses barcode/search. Select shows categories and products like a cafe menu.</div>
          </div>
          <div className="mst-fg">
            <label>Print Format <span className="req">*</span></label>
            <select className="mst-sel" value={form.printType} onChange={(e) => setForm({ ...form, printType: Number(e.target.value), printerName: Number(e.target.value) === 2 ? '' : form.printerName })}>
              <option value={1}>Thermal Printer (58mm/80mm)</option>
              <option value={2}>A4 Paper</option>
            </select>
          </div>
          {form.printType === 1 && (
            <>
              <div className="mst-fg">
                <label>Thermal Print Type <span className="req">*</span></label>
                <select className="mst-sel" value={form.thermalPrintType} onChange={(e) => setForm({ ...form, thermalPrintType: Number(e.target.value) })}>
                  <option value={1}>Local deploy</option>
                  <option value={2}>Cloud deploy</option>
                </select>
                <div className="mst-note">
                  {form.thermalPrintType === 2
                    ? 'Cloud sends the receipt to the shop PC. Keep start-print-agent.bat open while billing.'
                    : 'Local prints on this machine using the Windows printer name below.'}
                </div>
              </div>
              <div className="mst-fg">
                <label>Printer Name <span className="req">*</span></label>
                <input className="mst-inp" value={form.printerName} onChange={(e) => setForm({ ...form, printerName: e.target.value })} placeholder="Windows printer name" />
                <div className="mst-note">Use the Windows printer name, e.g. POS-80</div>
              </div>
              {form.thermalPrintType === 1 && (
                <div className="mst-fg">
                  <label>Save bill as text if print fails</label>
                  <select className="mst-sel" value={form.thermalTxtFile} onChange={(e) => setForm({ ...form, thermalTxtFile: Number(e.target.value) })}>
                    <option value={0}>No</option>
                    <option value={1}>Yes — save in bills folder</option>
                  </select>
                  <div className="mst-note">If the thermal printer fails, save a .txt copy in the bills folder. Off does not save a file.</div>
                </div>
              )}
            </>
          )}
          <div className="mst-fg">
            <label>Barcode Printer Name</label>
            <input className="mst-inp" value={form.barcodePrinter} onChange={(e) => setForm({ ...form, barcodePrinter: e.target.value })} placeholder="Windows printer name" />
            <div className="mst-note">Used for product barcode labels. Falls back to the bill printer name if empty.</div>
          </div>
          <div className="usr-barcode-layout">
            <div className="mst-fg">
              <label>Labels per row</label>
              <input className="mst-inp" type="number" min={1} max={12} value={form.barcodePerRow} onChange={(e) => setForm({ ...form, barcodePerRow: Number(e.target.value) })} />
            </div>
            <div className="mst-fg">
              <label>Width (mm)</label>
              <input className="mst-inp" type="number" min={20} max={210} value={form.barcodeWidthMm} onChange={(e) => setForm({ ...form, barcodeWidthMm: Number(e.target.value) })} />
            </div>
            <div className="mst-fg">
              <label>Height (mm)</label>
              <input className="mst-inp" type="number" min={15} max={150} value={form.barcodeHeightMm} onChange={(e) => setForm({ ...form, barcodeHeightMm: Number(e.target.value) })} />
            </div>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Details'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyDetailsPage;
