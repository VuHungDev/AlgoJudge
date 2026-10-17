'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Phase 4: danh sach contest + leaderboard + streak + goi y bai.
export default function Contests() {
  const [contests, setContests] = useState<any[]>([]);
  const [cid, setCid] = useState('');
  const [board, setBoard] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [rec, setRec] = useState<any>(null);

  useEffect(() => {
    api<{ contests: any[] }>('/contests').then((r) => setContests(r.contests || []));
    api('/me/streak').then(setStreak).catch(() => {});
    api('/me/recommend').then((r: any) => setRec(r.recommend)).catch(() => {});
  }, []);

  const loadBoard = async () => {
    const r = await api<{ leaderboard: any[] }>(`/contests/${cid}/leaderboard`);
    setBoard(r.leaderboard || []);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Streak & Gợi ý</h3>
        {streak && <p>Streak hiện tại: <b>{streak.streak}</b> ngày (tổng {streak.total_days} ngày có bài đúng)</p>}
        {rec && <p>Bài gợi ý tiếp theo: <b>#{rec.id} {rec.title}</b> [{rec.topic}/{rec.difficulty}]</p>}
      </div>
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
