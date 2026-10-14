export type Comment = { id: string; name: string; message: string; created_at: string }
const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
const endpoint = url ? `${url}/rest/v1/suhsih_comments` : ''
const headers = key ? { apikey: key, ...(!key.startsWith('sb_publishable_') ? { Authorization: `Bearer ${key}` } : {}) } : undefined

export function commentsReady() { return Boolean(endpoint && headers) }
export async function listComments(): Promise<Comment[]> {
  if (!commentsReady()) return []
  const response = await fetch(`${endpoint}?select=id,name,message,created_at&order=created_at.desc&limit=40`, { headers })
  if (!response.ok) throw new Error('코멘트를 불러오지 못했어요.')
  return await response.json() as Comment[]
}
export async function addComment(name: string, message: string): Promise<Comment> {
  if (!commentsReady()) throw new Error('코멘트 저장 연결이 아직 준비되지 않았어요.')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ name: name.trim(), message: message.trim() }),
  })
  if (!response.ok) throw new Error('전송에 실패했어요. 잠시 후 다시 시도해주세요.')
  const rows = await response.json() as Comment[]
  if (!rows[0]) throw new Error('코멘트가 저장됐는지 확인할 수 없어요.')
  return rows[0]
}
