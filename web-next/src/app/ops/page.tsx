'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

// Port tu algojudge_ui/ops.html: queue, workers, requeue.
export default function Ops() {
  const [rid, setRid] = useState('');
  const [out, setOut] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Hàng đợi & Worker</h3>
        <div className="flex gap-2">
          <button className="bg-slate-700 text-white px-3 py-1 rounded" onClick={() => api('/ops/queue').then((r) => setOut(JSON.stringify(r, null, 2)))}>Xem queue</button>
          <button className="bg-slate-700 text-white px-3 py-1 rounded" onClick={() => api('/ops/workers').then((r) => setOut(JSON.stringify(r, null, 2)))}>Xem workers</button>
        </div>
      </div>
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Requeue run lỗi</h3>
        <div className="flex gap-2">
          <input className="border p-1" placeholder="run id" value={rid} onChange={(e) => setRid(e.target.value)} />
          <button className="border px-3 rounded" onClick={() => api(`/ops/runs/${rid}/requeue`, { method: 'POST' }).then((r) => setOut(JSON.stringify(r, null, 2)))}>Requeue</button>
        </div>
      </div>
      <pre className="bg-white rounded p-4 text-sm whitespace-pre-wrap">{out}</pre>
    </div>
  );
}
