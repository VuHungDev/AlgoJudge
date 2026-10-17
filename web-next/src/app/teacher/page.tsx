'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

// Port tu algojudge_ui/teacher.html: testset, rejudge, compare, similarity, progress.
export default function Teacher() {
  const [pid, setPid] = useState('1');
  const [checker, setChecker] = useState('exact');
  const [cases, setCases] = useState('[{"input":"2 3","expected":"5","is_public":1,"group":"co-ban","weight":1}]');
  const [sid, setSid] = useState('');
  const [ra, setRa] = useState('');
  const [rb, setRb] = useState('');
  const [sa, setSa] = useState('');
  const [sb, setSb] = useState('');
  const [cid, setCid] = useState('');
  const [out, setOut] = useState('');

  const show = (r: unknown) => setOut(JSON.stringify(r, null, 2));

  const mkts = () =>
    api(`/admin/problems/${pid}/testsets`, {
      method: 'POST',
      body: JSON.stringify({ checker, cases: JSON.parse(cases) }),
    }).then(show).catch((e) => setOut(String(e)));

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Tạo bộ dữ liệu mới (&ge; 5 ca)</h3>
        <div className="flex gap-2 mb-2">
          <input className="border p-1" placeholder="problem_id" value={pid} onChange={(e) => setPid(e.target.value)} />
          <select className="border p-1" value={checker} onChange={(e) => setChecker(e.target.value)}>
            <option value="exact">Khớp chính xác</option>
            <option value="float">Sai số (số thực)</option>
          </select>
        </div>
        <textarea className="border w-full font-mono p-1" rows={5} value={cases} onChange={(e) => setCases(e.target.value)} />
        <button className="bg-green-700 text-white px-3 py-1 rounded mt-2" onClick={mkts}>Tạo testset</button>
      </div>
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Chấm lại + Đối chiếu</h3>
        <div className="flex gap-2">
          <input className="border p-1" placeholder="submission_id" value={sid} onChange={(e) => setSid(e.target.value)} />
          <input className="border p-1" placeholder="run a" value={ra} onChange={(e) => setRa(e.target.value)} />
          <input className="border p-1" placeholder="run b" value={rb} onChange={(e) => setRb(e.target.value)} />
          <button className="bg-green-700 text-white px-3 rounded" onClick={() => api(`/admin/submissions/${sid}/rejudge`, { method: 'POST' }).then(show)}>Chấm lại</button>
          <button className="border px-3 rounded" onClick={() => api(`/admin/submissions/${sid}/compare?a=${ra}&b=${rb}`).then(show)}>Đối chiếu</button>
        </div>
      </div>
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Chống đạo văn</h3>
        <div className="flex gap-2">
          <input className="border p-1" placeholder="submission a" value={sa} onChange={(e) => setSa(e.target.value)} />
          <input className="border p-1" placeholder="submission b" value={sb} onChange={(e) => setSb(e.target.value)} />
          <button className="border px-3 rounded" onClick={() => api(`/admin/submissions/${sa}/similarity/${sb}`).then(show)}>So sánh</button>
        </div>
      </div>
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Theo dõi lớp</h3>
        <div className="flex gap-2">
          <input className="border p-1" placeholder="class_id" value={cid} onChange={(e) => setCid(e.target.value)} />
          <button className="border px-3 rounded" onClick={() => api(`/admin/classes/${cid}/progress`).then(show)}>Xem</button>
        </div>
      </div>
      <pre className="bg-white rounded p-4 text-sm whitespace-pre-wrap">{out}</pre>
    </div>
  );
}
