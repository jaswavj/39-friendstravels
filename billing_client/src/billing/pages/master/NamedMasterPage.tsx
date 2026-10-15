import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterError, masterPage } from '../../../api/master/master-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import './Master.css';

type Row = { id: number; name: string };

type Props = {
  title: string;
  icon: string;
  load: (page: number, size: number, q?: string) => Promise<any>;
  save: (payload: { id?: number; name: string }) => Promise<any>;
  block: (id: number) => Promise<any>;
  addedMsg: string;
  updatedMsg: string;
  blockedMsg: string;
};

const NamedMasterPage: React.FC<Props> = ({ title, icon, load, save, block, addedMsg, updatedMsg, blockedMsg }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(0);
  const [blockIt, setBlockIt] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async (p = page, q = search) => {
    try {
      const pg = masterPage<Row>(await load(p, DEFAULT_PAGE_SIZE, q.trim() || undefined));
      setRows(pg.items);
      setTotal(pg.total);
    } catch (err) {
      toast.error(masterError(err, 'Could not load list'));
    }
  };

  useEffect(() => {
    setPage(0);
  }, [search]);

  useEffect(() => {
    refresh(page, search);
  }, [page, search]);

  const reset = () => {
    setName('');
    setEditId(0);
    setBlockIt(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning(`${title} name is required`);
      return;
    }
    setBusy(true);
    try {
      if (editId && blockIt) {
        await block(editId);
        toast.info(blockedMsg);
      } else {
        await save({ id: editId || undefined, name: name.trim() });
        toast.success(editId ? updatedMsg : addedMsg);
      }
      reset();
      await refresh(page, search);
    } catch (err) {
      toast.error(masterError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className={icon} /> {title}
      </h2>
      <div className="mst-grid">
        <div className="mst-card">
          <div className="mst-card-h">
            <span>
              <i className="fas fa-plus-circle" /> {editId ? `Edit ${title}` : `Add New ${title}`}
            </span>
          </div>
          <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
            <div className="mst-fg">
              <label>
                {title} Name <span className="req">*</span>
              </label>
              <input className="mst-inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            {editId > 0 && (
              <label className="mst-block mst-check">
                <input type="checkbox" checked={blockIt} onChange={(e) => setBlockIt(e.target.checked)} />
                Block this {title.toLowerCase()}
              </label>
            )}
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
                <i className="fas fa-save" /> {editId ? 'Update' : `Add ${title}`}
              </button>
              {editId > 0 && (
                <button className="mst-btn mst-btn-outline" type="button" onClick={reset}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="mst-card">
          <div className="mst-card-h">
            <span>
              <i className="fas fa-list" /> {title} List
            </span>
            <div className="mst-search">
              <i className="fas fa-search" />
              <input className="mst-inp" placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Name</th>
                  <th style={{ width: 80 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="mst-empty">
                      No records
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                    <td>{row.name}</td>
                    <td>
                      <button
                        className="mst-icon-btn"
                        type="button"
                        title="Edit"
                        onClick={() => {
                          setEditId(row.id);
                          setName(row.name);
                          setBlockIt(false);
                        }}
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
    </div>
  );
};

export const CategoryPage: React.FC<{ label?: string }> = ({ label = 'Category' }) => (
  <NamedMasterPage
    title={label}
    icon="fas fa-layer-group"
    load={masterApi.categories}
    save={masterApi.saveCategory}
    block={masterApi.blockCategory}
    addedMsg={`${label} added successfully`}
    updatedMsg={`${label} updated successfully`}
    blockedMsg={`${label} blocked successfully`}
  />
);

export const BrandsPage: React.FC<{ label?: string }> = ({ label = 'Brands' }) => (
  <NamedMasterPage
    title={label}
    icon="fas fa-tags"
    load={masterApi.brands}
    save={masterApi.saveBrand}
    block={masterApi.blockBrand}
    addedMsg="Brand added successfully"
    updatedMsg="Brand updated successfully"
    blockedMsg="Brand blocked successfully"
  />
);

export default NamedMasterPage;
