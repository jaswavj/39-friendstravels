import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { usersApi, usersData, usersError } from '../../../api/users/users-api-service';
import '../master/Master.css';
import './Users.css';
import PermissionTiles, { PermissionBar, type PermItem } from './PermissionTiles';

type Kind = 'module' | 'special';
type UserOpt = { id: number; name: string };
type Perms = { userId: number; name: string; all: PermItem[]; selectedIds: number[] };

const PermissionPage: React.FC<{ kind: Kind }> = ({ kind }) => {
  const isModule = kind === 'module';
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<PermItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const current = useMemo(
    () => users.find((u) => String(u.id) === userId),
    [users, userId]
  );

  useEffect(() => {
    usersApi.list()
      .then((res) => setUsers(usersData<UserOpt[]>(res) || []))
      .catch((err) => toast.error(usersError(err, 'Could not load users')));
  }, []);

  const load = async (id: string) => {
    setUserId(id);
    if (!id) {
      setItems([]);
      setSelected([]);
      return;
    }
    try {
      const res = isModule ? await usersApi.permissions(Number(id)) : await usersApi.specialPermissions(Number(id));
      const data = usersData<Perms>(res);
      setItems(data.all || []);
      setSelected((data.selectedIds || []).map(Number));
    } catch (err) {
      toast.error(usersError(err, 'Could not load permissions'));
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (!userId) {
      toast.warning('Choose a user');
      return;
    }
    setBusy(true);
    try {
      if (isModule) {
        await usersApi.savePermissions(Number(userId), selected);
      } else {
        await usersApi.saveSpecialPermissions(Number(userId), selected);
      }
      toast.success('Permissions updated');
    } catch (err) {
      toast.error(usersError(err, 'Could not update permissions'));
    } finally {
      setBusy(false);
    }
  };

  const initial = (current?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className={isModule ? 'fas fa-key' : 'fas fa-unlock'} />
        {isModule ? 'Module Permission' : 'Special Permission'}
      </h2>

      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-h">{isModule ? 'Choose user' : 'Choose user'}</div>
        <div className="mst-card-b">
          <div className="usr-picker">
            <span className="usr-avatar">{userId ? initial : <i className="fas fa-user" />}</span>
            <div className="mst-fg">
              <label>Staff member</label>
              <select className="mst-sel" value={userId} onChange={(e) => load(e.target.value)}>
                <option value="">Select a user to edit access</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {!userId ? (
        <div className="mst-card">
          <div className="usr-empty">
            <i className={isModule ? 'fas fa-layer-group' : 'fas fa-unlock-alt'} />
            <p>Select a user to view and update {isModule ? 'module' : 'special'} permissions.</p>
          </div>
        </div>
      ) : (
        <div className="mst-card">
          <div className="mst-card-h">
            <span>{isModule ? 'Modules' : 'Special permissions'} for {current?.name || 'user'}</span>
          </div>
          <div className="mst-card-b">
            <PermissionBar
              selected={selected.length}
              total={items.length}
              onSelectAll={() => setSelected(items.map((m) => m.id))}
              onClear={() => setSelected([])}
              disabled={busy}
            />
            <PermissionTiles
              items={items}
              selected={selected}
              onToggle={toggle}
              emptyText={isModule ? 'No modules found.' : 'No special permissions found.'}
            />
            <div className="usr-save-row">
              <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ModulePermissionPage: React.FC = () => <PermissionPage kind="module" />;
export const SpecialPermissionPage: React.FC = () => <PermissionPage kind="special" />;

export default ModulePermissionPage;
