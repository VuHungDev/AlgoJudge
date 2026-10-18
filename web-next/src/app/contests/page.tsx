'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// Phase 4: danh sach contest + leaderboard + streak + goi y bai + tao contest (GV).
export default function Contests() {
  const { me } = useAuth();
  const canCreate = me?.role === 'teacher' || me?.role === 'admin';
  const [contests, setContests] = useState<any[]>([]);
  const [cid, setCid] = useState('');
  const [board, setBoard] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [rec, setRec] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [problemVersions, setProblemVersions] = useState('1');
  const [createOut, setCreateOut] = useState('');

  useEffect(() => {
    api<{ contests: any[] }>('/contests').then((r) => setContests(r.contests || []));
    api('/me/streak').then(setStreak).catch(() => {});
    api('/me/recommend').then((r: any) => setRec(r.recommend)).catch(() => {});
  }, []);

  const loadBoard = async () => {
    const r = await api<{ leaderboard: any[] }>(`/contests/${cid}/leaderboard`);
    setBoard(r.leaderboard || []);
  };

  const createContest = async () => {
    try {
      const problems = problemVersions.split(',').map((id) => ({ problem_version_id: Number(id.trim()), points: 100 }));
      const r = await api<{ contest_id: number }>('/admin/contests', { method: 'POST', body: JSON.stringify({ title, description, starts_at: startsAt, ends_at: endsAt, problems }) });
      setCreateOut(`Đã tạo contest #${r.contest_id}`);
      const next = await api<{ contests: any[] }>('/contests');
      setContests(next.contests || []);
    } catch (e: any) { setCreateOut(String(e.message || e)); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Streak & Gợi ý</h3>
        {streak && <p>Streak hiện tại: <b>{streak.streak}</b> ngày (tổng {streak.total_days} ngày có bài đúng)</p>}
        {rec && <p>Bài gợi ý tiếp theo: <b>#{rec.id} {rec.title}</b> [{rec.topic}/{rec.difficulty}]</p>}
      </div>
      {canCreate && (
        <div className="bg-white rounded p-4">
          <h3 className="font-bold mb-2">Tạo contest (giảng viên)</h3>
          <div className="grid gap-2">
            <input className="border p-1" placeholder="Tên contest" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="border p-1" placeholder="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className="border p-1" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            <input className="border p-1" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            <input className="border p-1" placeholder="problem_version_id, cách nhau bằng dấu phẩy" value={problemVersions} onChange={(e) => setProblemVersions(e.target.value)} />
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={createContest}>Tạo contest</button>
            {createOut && <pre className="text-sm whitespace-pre-wrap">{createOut}</pre>}
          </div>
        </div>
      )}
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Contests</h3>
        {contests.map((c) => (
          <div key={c.id} className="py-1">#{c.id} {c.title} ({c.starts_at} → {c.ends_at})</div>
        ))}
        <div className="flex gap-2 mt-2">
          <input className="border p-1" placeholder="contest_id" value={cid} onChange={(e) => setCid(e.target.value)} />
          <button className="border px-3 rounded" onClick={loadBoard}>Xem leaderboard</button>
        </div>
      </div>
      {board.length > 0 && (
        <div className="bg-white rounded p-4">
          <h3 className="font-bold mb-2">Bảng xếp hạng</h3>
          <table className="text-sm w-full">
            <thead><tr><th className="text-left">Email</th><th>Điểm</th><th>Bài giải</th></tr></thead>
            <tbody>
              {board.map((b: any) => (
                <tr key={b.user_id}><td>{b.email}</td><td className="text-center">{b.score}</td><td className="text-center">{b.solved}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
