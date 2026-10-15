import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterError, masterPage } from '../../../api/master/master-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import './Master.css';

type Customer = {
  id: number;
  name: string;
  address: string;
  phone: string;
  gstin: string;
  isGst: number;
  isEligibleForCommission: number;
};

const empty = {
  id: 0,
  name: '',
  phone: '',
  address: '',
  gstin: '',
  isGst: 0,
  isEligibleForCommission: 0,
  blockIt: false,
};

const CustomersPage: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async (p = page) => {
    try {
      const pg = masterPage<Customer>(await masterApi.customers(p, DEFAULT_PAGE_SIZE, search.trim() || undefined));
      setRows(pg.items);
      setTotal(pg.total);
    } catch (err) {
      toast.error(masterError(err, 'Could not load customers'));
    }
  };

  useEffect(() => {
    setPage(0);
  }, [search]);

  useEffect(() => {
    refresh(page);
  }, [page, search]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Customer name is required');
      return;
    }
    if (form.isGst && form.gstin.trim().length !== 15) {
      toast.warning('GSTIN must be exactly 15 characters');
      return;
    }
    setBusy(true);
    try {
      if (form.id && form.blockIt) {
        await masterApi.blockCustomer(form.id);
        toast.info('Customer blocked successfully');
      } else {
        await masterApi.saveCustomer({
          id: form.id || undefined,
          name: form.name.trim(),
          phone: form.phone,
          address: form.address,
          gstin: form.isGst ? form.gstin : '',
          isGst: form.isGst,
          isEligibleForCommission: form.isEligibleForCommission,
        });
        toast.success(form.id ? 'Customer updated successfully' : 'Customer added successfully');
      }
      setForm(empty);
      await refresh();
    } catch (err) {
      toast.error(masterError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-users" /> Customers
      </h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-h">{form.id ? 'Edit Customer' : 'Add Customer'}</div>
        <form className="mst-card-b mst-form" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Customer Name <span className="req">*</span></label>
            <input className="mst-inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Phone Number</label>
            <input className="mst-inp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <label className="mst-check">
            <input type="checkbox" checked={form.isGst === 1} onChange={(e) => setForm({ ...form, isGst: e.target.checked ? 1 : 0, gstin: e.target.checked ? form.gstin : '' })} />
            GST Registered
          </label>
          <div className="mst-fg">
            <label>GSTIN {form.isGst === 1 && <span className="req">*</span>}</label>
            <input className="mst-inp" maxLength={15} disabled={form.isGst !== 1} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
          </div>
          <div className="mst-fg span-2">
            <label>Address</label>
            <textarea className="mst-area" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <label className="mst-check">
            <input type="checkbox" checked={form.isEligibleForCommission === 1} onChange={(e) => setForm({ ...form, isEligibleForCommission: e.target.checked ? 1 : 0 })} />
            Eligible for commission
          </label>
          {form.id > 0 && (
            <label className="mst-block mst-check">
              <input type="checkbox" checked={form.blockIt} onChange={(e) => setForm({ ...form, blockIt: e.target.checked })} />
              Block this customer
            </label>
          )}
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
              {form.id ? 'Update' : 'Add Customer'}
            </button>
            {form.id > 0 && (
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setForm(empty)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="mst-card">
        <div className="mst-card-h">
          <span>Customer List</span>
          <div className="mst-search">
            <i className="fas fa-search" />
            <input className="mst-inp" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>Address</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id}>
                  <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.phone}</td>
                  <td>{row.gstin}</td>
                  <td>{row.address}</td>
                  <td>
                    <button
                      className="mst-icon-btn"
                      type="button"
                      onClick={() =>
                        setForm({
                          id: row.id,
                          name: row.name,
                          phone: row.phone === '-' ? '' : row.phone,
                          address: row.address === '-' ? '' : row.address,
                          gstin: row.gstin === '-' ? '' : row.gstin,
                          isGst: row.isGst,
                          isEligibleForCommission: row.isEligibleForCommission,
                          blockIt: false,
                        })
                      }
                    >
                      <i className="fas fa-edit" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListPagination page={page} size={DEFAULT_PAGE_SIZE} total={total} onChange={setPage} />
      </div>
    </div>
  );
};

export default CustomersPage;
